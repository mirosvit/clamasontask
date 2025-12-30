
import { useMemo } from 'react';
import { Task, SystemBreak, MapSector, DBItem, SystemConfig, PriorityLevel } from '../types/appTypes';

export type FilterMode = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
export type SourceFilter = 'ALL' | 'PROD' | 'LOG';
export type ShiftFilter = 'ALL' | 'DAY' | 'NIGHT';

export interface AnalyticsFilters {
  mode: FilterMode;
  source: SourceFilter;
  shift: ShiftFilter;
  customStart?: string;
  customEnd?: string;
}

export interface DrivingStats {
    fullDist: number;   // metre
    emptyDist: number;  // metre
    fullRides: number;  // počet jázd s nákladom
    emptyRides: number; // počet jázd naprázdno (vrátane tranzitov)
    efficiency: number; // %
}

export interface WorkerStats {
  id: string;
  name: string;
  index: number; // WPI 0-10
  tasksDone: number;
  pureWorkMinutes: number;
  utilizationPercent: number;
  performanceRatio: number; // Performance (Tempo) %
  avgReactionSeconds: number;
  fullDistMeters: number;
  emptyDistMeters: number;
  logEfficiency: number;
  confidenceRating: number;
  totalRides: number; 
  invalidTasksCount: number; // Nové: Počet invalidných (rýchlych) úloh
}

export const useAnalyticsEngine = (
  tasks: Task[],
  archivedTasks: Task[],
  systemBreaks: SystemBreak[],
  mapSectors: MapSector[],
  workplaces: DBItem[],
  logisticsOperations: DBItem[],
  systemConfig: SystemConfig,
  filters: AnalyticsFilters,
  resolveName: (username?: string | null) => string
) => {

  const combinedData = useMemo(() => {
    const allTasks = [...tasks, ...archivedTasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();

    return allTasks.filter(task => {
      const referenceTime = task.completedAt || task.createdAt || 0;
      if (!referenceTime) return false;

      let timeMatch = false;
      switch (filters.mode) {
        case 'TODAY': timeMatch = referenceTime >= todayTs; break;
        case 'YESTERDAY': timeMatch = referenceTime >= (todayTs - 86400000) && referenceTime < todayTs; break;
        case 'WEEK': timeMatch = referenceTime >= (todayTs - (today.getDay() || 7 - 1) * 86400000); break;
        case 'MONTH': timeMatch = referenceTime >= new Date(today.getFullYear(), today.getMonth(), 1).getTime(); break;
        case 'CUSTOM':
          if (!filters.customStart || !filters.customEnd) return false;
          const startTs = new Date(filters.customStart).getTime();
          const endTs = new Date(filters.customEnd).getTime() + 86399999;
          timeMatch = referenceTime >= startTs && referenceTime <= endTs;
          break;
        default: timeMatch = true;
      }
      if (!timeMatch) return false;

      if (filters.source === 'PROD' && !task.isProduction && task.isLogistics) return false;
      if (filters.source === 'LOG' && !task.isLogistics) return false;

      if (filters.shift !== 'ALL') {
        const hour = new Date(referenceTime).getHours();
        const isDay = hour >= 6 && hour < 18;
        if (filters.shift === 'DAY' && !isDay) return false;
        if (filters.shift === 'NIGHT' && isDay) return false;
      }

      return true;
    });
  }, [tasks, archivedTasks, filters]);

  const engineResult = useMemo(() => {
    const VZV_SPEED_KMH = systemConfig.vzvSpeed || 8;
    const VZV_SPEED_MPM = (VZV_SPEED_KMH * 1000) / 60; // Metre za minútu (pre normovanie)
    const VZV_SPEED_MPS = VZV_SPEED_KMH / 3.6; // Metre za sekundu (pre driving stats)
    
    const SHIFT_MINUTES = 450;
    const DISTANCE_SCALE = 10; // 10px = 1 meter

    const workerTaskMap: Record<string, Task[]> = {};
    const hourlyLoad: Record<number, { prod: number, log: number }> = {};
    for (let h = 5; h <= 23; h++) { hourlyLoad[h] = { prod: 0, log: 0 }; }

    const workplaceLoad: Record<string, { load: number, pal: number, req: number }> = {};
    const highRunnerLoad: Record<string, { load: number, pal: number, req: number }> = {};
    const missingPartsMap: Record<string, number> = {};

    let globalRealErrors = 0;
    let globalFalseAlarms = 0;
    let globalAuditedCount = 0;

    let globalTotalTargetMin = 0;
    let globalTotalActualMin = 0;

    // --- NEW DETAILED DRIVING STATS INITIALIZATION ---
    const prodDriving: DrivingStats = { fullDist: 0, emptyDist: 0, fullRides: 0, emptyRides: 0, efficiency: 0 };
    const logDriving: DrivingStats = { fullDist: 0, emptyDist: 0, fullRides: 0, emptyRides: 0, efficiency: 0 };

    combinedData.forEach(t => {
      if (t.isDone && t.completedBy) {
        if (!workerTaskMap[t.completedBy]) workerTaskMap[t.completedBy] = [];
        workerTaskMap[t.completedBy].push(t);
      }

      const refTime = t.completedAt || t.createdAt || 0;
      const hour = new Date(refTime).getHours();
      
      if (hour >= 5 && hour <= 23) {
        const points = (t.quantityUnit === 'pallet' ? parseFloat((t.quantity || '0').replace(',', '.')) : 1) || 1;
        if (t.isLogistics) hourlyLoad[hour].log += points; 
        else hourlyLoad[hour].prod += points;
      }

      if (t.auditResult) {
        globalAuditedCount++;
        if (t.auditResult === 'NOK') globalRealErrors++;
        else globalFalseAlarms++;
      }
      if (t.isMissing && t.partNumber) {
        missingPartsMap[t.partNumber] = (missingPartsMap[t.partNumber] || 0) + 1;
      }
    });

    const calculateBlockedTime = (history: any[] | undefined, startTime: number, endTime: number): number => {
      let totalBlocked = 0;
      systemBreaks.forEach(br => {
        const overlapStart = Math.max(startTime, br.start);
        const overlapEnd = Math.min(endTime, br.end || endTime);
        if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
      });
      return totalBlocked;
    };

    const workerStatsList: WorkerStats[] = Object.entries(workerTaskMap).map(([uid, workerTasks]) => {
      const sorted = [...workerTasks].sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
      
      let wFullDist = 0;
      let wEmptyDist = 0;
      let wTransitDist = 0;
      let wExecMs = 0;
      let wTargetMinTotal = 0;
      let wActualMinTotal = 0;
      let wReactMs = 0;
      let wReactCount = 0;
      let wMissingReported = 0;
      let wRealErrors = 0;
      let wRides = 0; 
      let wInvalidTasks = 0; // Nová metrika pre Anti-Cheat
      const daysWorked = new Set<string>();

      let lastCoords: { x: number, y: number } | null = null;

      sorted.forEach(task => {
        if (task.completedAt) daysWorked.add(new Date(task.completedAt).toLocaleDateString());
        
        const qtyVal = parseFloat((task.quantity || '1').replace(',', '.'));
        
        // --- LOGIKA LOAD MULTIPLIER ---
        // Ak je to paleta, násobíme množstvom. Ak sú to kusy/boxy, je to 1 úkon.
        const loadMultiplier = (task.quantityUnit === 'pallet') ? qtyVal : 1;
        const points = loadMultiplier; // Pre účely štatistík náporu

        if (!task.isLogistics) {
            if (task.workplace) {
              if (!workplaceLoad[task.workplace]) workplaceLoad[task.workplace] = { load: 0, pal: 0, req: 0 };
              workplaceLoad[task.workplace].load += points; workplaceLoad[task.workplace].req++;
              if (task.quantityUnit === 'pallet') workplaceLoad[task.workplace].pal += qtyVal;
            }
            if (task.partNumber) {
              if (!highRunnerLoad[task.partNumber]) highRunnerLoad[task.partNumber] = { load: 0, pal: 0, req: 0 };
              highRunnerLoad[task.partNumber].load += points; highRunnerLoad[task.partNumber].req++;
              if (task.quantityUnit === 'pallet') highRunnerLoad[task.partNumber].pal += qtyVal;
            }
        }

        // --- AUTOMOTIVE STANDARD (MOST/RE) CALCULATION ---
        let targetMin = 0;
        let oneWayD = 0; // Metre

        // 1. Zistenie Vzdialenosti a Normy
        if (task.isLogistics) {
            const logOp = logisticsOperations.find(o => o.value === task.workplace);
            if (logOp) {
                // Fixná cesta pre logistiku
                const distPx = logOp.distancePx || 0;
                oneWayD = distPx / DISTANCE_SCALE; 
                
                // Norma = (StandardTime * loadMultiplier) + TravelTime
                // Setup Time a Unit Time sa už nepoužíva, všetko je v Standard Time (Norma na pracovisko)
                const standardTime = logOp.standardTime || 2.0;
                const travelTimeMin = oneWayD / VZV_SPEED_MPM; 
                
                // loadMultiplier zabezpečí, že 5 paliet = 5x norma, ale 500ks = 1x norma
                targetMin = (standardTime * loadMultiplier) + travelTimeMin;
                
                // Update Coords reset (logistika preruší chain)
                lastCoords = null;
            }
        } else {
            // Výrobná úloha
            const wp = workplaces.find(w => w.value === task.workplace);
            if (wp) {
                // Dynamický Travel Time
                let distMeters = 0;
                if (task.pickedFromSectorId) {
                    const sector = mapSectors.find(s => s.id === task.pickedFromSectorId);
                    if (sector) {
                        const dx = Math.abs((wp.coordX || 0) - sector.coordX);
                        const dy = Math.abs((wp.coordY || 0) - sector.coordY);
                        distMeters = (dx + dy) / DISTANCE_SCALE;
                    }
                }
                oneWayD = distMeters;

                const standardTime = wp.standardTime || 2.0;
                const travelTimeMin = distMeters / VZV_SPEED_MPM;

                targetMin = (standardTime * loadMultiplier) + travelTimeMin;

                // Update last coords
                lastCoords = { x: wp.coordX || 0, y: wp.coordY || 0 };
            } else {
                // Fallback ak WP neexistuje v DB
                targetMin = 2 * loadMultiplier; // Default odhad
            }
        }

        // 2. Výpočet času a Anti-Cheat
        if (task.startedAt && task.completedAt) {
          const rawExecMs = task.completedAt - task.startedAt;
          const blockedMs = calculateBlockedTime(task.inventoryHistory, task.startedAt, task.completedAt);
          const realExecMs = Math.max(rawExecMs - blockedMs, 0);
          const actualMin = realExecMs / 60000;

          // --- NOVÝ ANTI-CHEAT (Invalid Task) ---
          if (actualMin < 0.5) {
              // Task je príliš krátky (< 30s) -> INVALID
              // Nezapočítava sa do výkonu (ani menovateľ, ani čitateľ)
              // Ale započítava sa do "Total Rides" lebo fyzicky prebehol
              task.isInvalid = true; 
              wInvalidTasks++;
              // wExecMs sa pripočíta, aby sedela dochádzka, ale výkon sa nepočíta
              wExecMs += realExecMs;
          } else {
              // Valid Task
              const flooredActual = Math.max(actualMin, 1.0); // Soft floor 1 min
              wActualMinTotal += flooredActual;
              wTargetMinTotal += targetMin;
              globalTotalActualMin += flooredActual;
              globalTotalTargetMin += targetMin;
              wExecMs += realExecMs;
          }
        }

        // --- DISTANCE STATS (DRIVING METRICS) ---
        // Používa oneWayD vypočítané vyššie
        if (oneWayD > 0) {
            const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
            // Validácia počtu jázd na základe času (fyzikálny limit)
            const possibleTrips = Math.round(((durationMs / 1000) * VZV_SPEED_MPS) / (2 * oneWayD)); // Cesta tam a späť
            // Počet jázd je tiež odvodený od loadMultiplier (ak je 1 box, je to 1 jazda)
            const validatedTrips = Math.min(Math.max(1, Math.floor(loadMultiplier)), Math.max(1, possibleTrips));

            if (validatedTrips > 0) {
                const fullD = validatedTrips * oneWayD;
                const emptyD = (validatedTrips > 1 ? (validatedTrips - 1) * oneWayD : 0);
                
                wFullDist += fullD;
                wEmptyDist += emptyD;
                wRides += (validatedTrips * 2 - 1);

                if (task.isLogistics) {
                    logDriving.fullDist += fullD;
                    logDriving.emptyDist += emptyD;
                    logDriving.fullRides += validatedTrips;
                    logDriving.emptyRides += (validatedTrips > 1 ? validatedTrips - 1 : 0);
                } else {
                    prodDriving.fullDist += fullD;
                    prodDriving.emptyDist += emptyD;
                    prodDriving.fullRides += validatedTrips;
                    prodDriving.emptyRides += (validatedTrips > 1 ? validatedTrips - 1 : 0);
                }
            }
        } else {
            // Ak nemáme vzdialenosť, rátame aspoň jazdu
            wRides++;
        }

        // --- TRANSIT CALCULATION (Tieňová logistika) ---
        // Ak ideme z úlohy A do úlohy B, je to "empty ride"
        // (Už sme v cykle vyššie nastavili lastCoords)
        // Toto je len aproximácia, keďže nevieme presne poradie jázd v čase ak sa prekrývajú,
        // ale 'sorted' je podľa completedAt, čo je dobrá aproximácia.

        if (task.createdAt && task.startedAt) {
          const react = task.startedAt - task.createdAt;
          if (react > 0) { wReactMs += react; wReactCount++; }
        }
        if (task.isMissing) {
          wMissingReported++;
          if (task.auditResult === 'NOK') wRealErrors++;
        }
      });

      const nDays = Math.max(daysWorked.size, 1);
      const pureMin = wExecMs / 60000;
      const utilization = (pureMin * 1.15 / (nDays * SHIFT_MINUTES)) * 100;
      // Performance (Tempo) - teraz očistené o Invalid Tasks
      const perf = wActualMinTotal > 0 ? Math.min((wTargetMinTotal / wActualMinTotal) * 100, 200) : 0;
      
      const reactSec = wReactCount > 0 ? (wReactMs / wReactCount) / 1000 : 0;
      const conf = wMissingReported > 0 ? ((wMissingReported - wRealErrors) / wMissingReported) * 100 : 100;
      const totalEmpty = wEmptyDist + wTransitDist;
      const logEff = (wFullDist + totalEmpty) > 0 ? (wFullDist / (wFullDist + totalEmpty)) * 100 : 50;

      const sQual = (conf / 100) * 3.0;
      const sUtil = (Math.min(utilization, 100) / 100) * 2.5;
      const sStd = Math.min(perf, 200) / 200 * 2.0;
      const sReac = reactSec > 0 ? (reactSec < 60 ? 1.0 : reactSec < 180 ? 0.5 : 0) : 0.5;
      const sLog = (logEff / 100) * 1.0;
      const wpi = parseFloat((sQual + sUtil + sStd + sReac + sLog).toFixed(1));

      return {
        id: uid, name: resolveName(uid), index: wpi,
        tasksDone: workerTasks.length, pureWorkMinutes: pureMin,
        utilizationPercent: utilization, performanceRatio: perf,
        avgReactionSeconds: reactSec, fullDistMeters: wFullDist,
        emptyDistMeters: totalEmpty, logEfficiency: logEff, confidenceRating: conf,
        totalRides: wRides,
        invalidTasksCount: wInvalidTasks
      };
    });

    // --- CALCULATE FINAL EFFICIENCIES ---
    prodDriving.efficiency = (prodDriving.fullDist + prodDriving.emptyDist) > 0 ? (prodDriving.fullDist / (prodDriving.fullDist + prodDriving.emptyDist)) * 100 : 0;
    logDriving.efficiency = (logDriving.fullDist + logDriving.emptyDist) > 0 ? (logDriving.fullDist / (logDriving.fullDist + logDriving.emptyDist)) * 100 : 0;

    const totalFullDistGlobal = prodDriving.fullDist + logDriving.fullDist;
    const totalEmptyDistGlobal = prodDriving.emptyDist + logDriving.emptyDist;
    const totalPhysicalRidesGlobal = workerStatsList.reduce((a, b) => a + b.totalRides, 0);
    const globalPerformanceRatio = globalTotalActualMin > 0 ? Math.min((globalTotalTargetMin / globalTotalActualMin) * 100, 200) : 0;

    return {
      filteredTasks: combinedData,
      globalStats: {
        totalTasks: combinedData.length,
        totalDone: combinedData.filter(t => t.isDone).length,
        totalFullDist: totalFullDistGlobal,
        totalEmptyDist: totalEmptyDistGlobal,
        globalEfficiency: (totalFullDistGlobal + totalEmptyDistGlobal) > 0 ? (totalFullDistGlobal / (totalFullDistGlobal + totalEmptyDistGlobal)) * 100 : 0,
        globalPerformanceRatio: globalPerformanceRatio,
        totalVolume: combinedData.reduce((a, b) => a + (parseFloat((b.quantity || '0').replace(',', '.')) || 0), 0),
        totalPhysicalRides: totalPhysicalRidesGlobal
      },
      drivingStats: {
        production: prodDriving,
        logistics: logDriving
      },
      workerStats: workerStatsList,
      charts: {
        hourly: Object.entries(hourlyLoad).map(([h, d]) => ({ 
          hour: parseInt(h), 
          label: `${h}h`, 
          production: d.prod, 
          logistics: d.log 
        })).sort((a,b) => a.hour - b.hour),
        highRunners: Object.entries(highRunnerLoad).map(([k, v]) => ({ partNumber: k, ...v, totalTasks: v.req, taskRequests: v.req })).sort((a,b) => b.load - a.load).slice(0, 3),
        workplaces: Object.entries(workplaceLoad).map(([k, v]) => ({ workplace: k, ...v, totalTasks: v.req, taskRequests: v.req })).sort((a,b) => b.load - a.load).slice(0, 3)
      },
      qualityStats: {
        realErrorsCount: globalRealErrors,
        falseAlarmsCount: globalFalseAlarms,
        totalAuditedMissing: globalAuditedCount,
        topMissingParts: Object.entries(missingPartsMap).map(([p, c]) => ({ partNumber: p, count: c })).sort((a,b) => b.count - a.count).slice(0, 3)
      }
    };
  }, [combinedData, systemBreaks, mapSectors, workplaces, logisticsOperations, systemConfig, resolveName]);

  return engineResult;
};
