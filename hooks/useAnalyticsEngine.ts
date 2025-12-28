
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
    const VZV_SPEED_MPS = (systemConfig.vzvSpeed || 8) / 3.6;
    const SHIFT_MINUTES = 450;

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
      const daysWorked = new Set<string>();

      let lastCoords: { x: number, y: number } | null = null;

      sorted.forEach(task => {
        if (task.completedAt) daysWorked.add(new Date(task.completedAt).toLocaleDateString());
        
        const qtyVal = parseFloat((task.quantity || '1').replace(',', '.'));
        const points = (task.quantityUnit === 'pallet') ? qtyVal : 1;

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

        if (task.startedAt && task.completedAt) {
          const rawExecMs = task.completedAt - task.startedAt;
          const blockedMs = calculateBlockedTime(task.inventoryHistory, task.startedAt, task.completedAt);
          let actualMin = (rawExecMs - blockedMs) / 60000;
          const norm = task.isLogistics 
            ? (logisticsOperations.find(o => o.value === task.workplace)?.standardTime || 0)
            : (workplaces.find(w => w.value === task.workplace)?.standardTime || 0);
          const targetMin = norm * qtyVal;

          if (actualMin < 0.5) {
              actualMin = (targetMin * 2) || 2; 
          } else {
              actualMin = Math.max(actualMin, 1);
          }

          wActualMinTotal += actualMin;
          wTargetMinTotal += targetMin;
          wExecMs += Math.max(rawExecMs - blockedMs, 0);
          globalTotalActualMin += actualMin;
          globalTotalTargetMin += targetMin;
        }

        // --- DISTANCE LOGIC WITH SEGMENT SPLIT ---
        let oneWayD = 0;
        if (task.isLogistics) {
          const logOp = logisticsOperations.find(o => o.value === task.workplace);
          if (logOp?.distancePx) {
            oneWayD = logOp.distancePx;
            const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
            const possibleTrips = Math.round(((durationMs / 1000) * VZV_SPEED_MPS) / (2 * oneWayD));
            const maxQty = Math.max(1, Math.floor(qtyVal));
            const validatedTrips = Math.min(maxQty, Math.max(1, possibleTrips));
            
            const fullD = validatedTrips * oneWayD;
            const emptyD = (validatedTrips > 1 ? (validatedTrips - 1) * oneWayD : 0);
            
            wFullDist += fullD;
            wEmptyDist += emptyD;
            wRides += (validatedTrips * 2 - 1); 

            // Accumulate Global Logistics Driving Stats
            logDriving.fullDist += fullD;
            logDriving.emptyDist += emptyD;
            logDriving.fullRides += validatedTrips;
            logDriving.emptyRides += (validatedTrips > 1 ? validatedTrips - 1 : 0);

            lastCoords = null; // Break chain for logistics
          }
        } 
        else if (task.pickedFromSectorId && task.workplace) {
          const sector = mapSectors.find(s => s.id === task.pickedFromSectorId);
          const wp = workplaces.find(w => w.value === task.workplace);
          if (sector && wp) {
            const pickup = { x: sector.coordX, y: sector.coordY };
            const dropoff = { x: wp.coordX || 0, y: wp.coordY || 0 };
            oneWayD = Math.sqrt(Math.pow(dropoff.x - pickup.x, 2) + Math.pow(dropoff.y - pickup.y, 2)) / 10;
            
            let currentTransitD = 0;
            if (lastCoords) {
              currentTransitD = Math.sqrt(Math.pow(pickup.x - lastCoords.x, 2) + Math.pow(pickup.y - lastCoords.y, 2)) / 10;
              wTransitDist += currentTransitD;
              wRides++; 
              // Transit is always an empty ride
              prodDriving.emptyRides += 1;
              prodDriving.emptyDist += currentTransitD;
            } else {
              wRides++;
            }

            const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
            const possibleTrips = Math.round(((durationMs / 1000) * VZV_SPEED_MPS) / (2 * oneWayD));
            const maxQty = Math.max(1, Math.floor(qtyVal));
            const validatedTrips = Math.min(maxQty, Math.max(1, possibleTrips));
            
            if (validatedTrips > 0) {
              const fullD = validatedTrips * oneWayD;
              const emptyD = (validatedTrips > 1 ? (validatedTrips - 1) * oneWayD : 0);
              
              wFullDist += fullD;
              wEmptyDist += emptyD;
              wRides += (validatedTrips * 2 - 1);

              // Accumulate Global Production Driving Stats
              prodDriving.fullDist += fullD;
              prodDriving.emptyDist += emptyD; // This task's internal returns
              prodDriving.fullRides += validatedTrips;
              prodDriving.emptyRides += (validatedTrips > 1 ? validatedTrips - 1 : 0);
            }
            lastCoords = dropoff;
          }
        }

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
        totalRides: wRides
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
