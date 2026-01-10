
import { Task, SystemBreak, MapSector, DBItem, SystemConfig, MapObstacle } from '../types/appTypes';
import { calculateAStarDistance } from './pathfinding';

// Add missing type exports for analytics filters
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
    fullDist: number;
    emptyDist: number;
    fullRides: number;
    emptyRides: number;
    efficiency: number;
}

export interface WorkerStats {
    id: string;
    name: string;
    index: number;
    tasksDone: number;
    pureWorkMinutes: number;
    utilizationPercent: number;
    performanceRatio: number;
    avgReactionSeconds: number;
    fullDistMeters: number;
    emptyDistMeters: number;
    logEfficiency: number;
    confidenceRating: number;
    totalRides: number;
    invalidTasksCount: number;
}

/**
 * Vypočíta čas, ktorý bol počas trvania úlohy blokovaný prestávkami alebo inventúrou.
 */
export const calculateBlockedTime = (
    startTime: number, 
    endTime: number, 
    systemBreaks: SystemBreak[], 
    inventoryHistory?: { start: number; end?: number }[]
): number => {
    let totalBlocked = 0;
    
    // 1. Systémové prestávky
    systemBreaks.forEach(br => {
        const overlapStart = Math.max(startTime, br.start);
        const overlapEnd = Math.min(endTime, br.end || endTime);
        if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
    });

    // 2. História blokovania inventúrou (ak existuje)
    if (inventoryHistory && inventoryHistory.length > 0) {
        inventoryHistory.forEach(session => {
            const overlapStart = Math.max(startTime, session.start);
            const overlapEnd = Math.min(endTime, session.end || endTime);
            if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
        });
    }

    return totalBlocked;
};

/**
 * Hlavné jadro analytického výpočtu (Pure JS function).
 * Oddelené od Reactu pre maximálny výkon a stabilitu.
 */
export const runAnalyticsEngine = (
    dataset: Task[],
    systemBreaks: SystemBreak[],
    mapSectors: MapSector[],
    workplaces: DBItem[],
    logisticsOperations: DBItem[],
    mapObstacles: MapObstacle[],
    systemConfig: SystemConfig,
    resolveName: (username?: string | null) => string
) => {
    const VZV_SPEED_KMH = systemConfig.vzvSpeed || 8;
    const VZV_SPEED_MPM = (VZV_SPEED_KMH * 1000) / 60;
    const VZV_SPEED_MPS = VZV_SPEED_KMH / 3.6;
    const SHIFT_MINUTES = 450;

    // Cache pre A* výpočty - kritické pre plynulosť UI
    const distanceCache = new Map<string, number>();
    const getCachedAStar = (p1: {x: number, y: number}, p2: {x: number, y: number}, id1: string, id2: string) => {
        const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
        if (distanceCache.has(key)) return distanceCache.get(key)!;
        const d = calculateAStarDistance(p1, p2, mapObstacles);
        distanceCache.set(key, d);
        return d;
    };

    const workerTaskMap: Record<string, Task[]> = {};
    const hourlyLoad: Record<number, { prod: number, log: number }> = {};
    for (let h = 5; h <= 23; h++) { hourlyLoad[h] = { prod: 0, log: 0 }; }

    const workplaceLoad: Record<string, { load: number, pal: number, req: number }> = {};
    const highRunnerLoad: Record<string, { load: number, pal: number, req: number }> = {};
    const missingPartsMap: Record<string, number> = {};

    let globalRealErrors = 0, globalFalseAlarms = 0, globalAuditedCount = 0;
    let globalTotalTargetMin = 0, globalTotalActualMin = 0;

    const prodDriving: DrivingStats = { fullDist: 0, emptyDist: 0, fullRides: 0, emptyRides: 0, efficiency: 0 };
    const logDriving: DrivingStats = { fullDist: 0, emptyDist: 0, fullRides: 0, emptyRides: 0, efficiency: 0 };

    // 1. Prvotná agregácia
    dataset.forEach(t => {
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
            if (t.auditResult === 'NOK') globalRealErrors++; else globalFalseAlarms++;
        }
        if (t.isMissing && t.partNumber) {
            missingPartsMap[t.partNumber] = (missingPartsMap[t.partNumber] || 0) + 1;
        }
    });

    // 2. Výpočet štatistík pre každého pracovníka
    const workerStatsList: WorkerStats[] = Object.entries(workerTaskMap).map(([uid, workerTasks]) => {
        const sorted = [...workerTasks].sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
        let wFull = 0, wEmpty = 0, wTransit = 0, wExecMs = 0, wTargetMin = 0, wActualMin = 0, wReactMs = 0, wReactCount = 0, wMissing = 0, wRealErr = 0, wRides = 0, wInvalid = 0;
        const daysWorked = new Set<string>();
        let lastPoint: { x: number, y: number, id: string } | null = null;

        sorted.forEach(task => {
            if (task.completedAt) daysWorked.add(new Date(task.completedAt).toLocaleDateString());
            const loadMultiplier = (task.quantityUnit === 'pallet') ? parseFloat((task.quantity || '1').replace(',', '.')) : 1;

            if (!task.isLogistics && task.workplace) {
                if (!workplaceLoad[task.workplace]) workplaceLoad[task.workplace] = { load: 0, pal: 0, req: 0 };
                workplaceLoad[task.workplace].load += loadMultiplier; workplaceLoad[task.workplace].req++;
                if (task.quantityUnit === 'pallet') workplaceLoad[task.workplace].pal += loadMultiplier;
                if (task.partNumber) {
                    if (!highRunnerLoad[task.partNumber]) highRunnerLoad[task.partNumber] = { load: 0, pal: 0, req: 0 };
                    highRunnerLoad[task.partNumber].load += loadMultiplier; highRunnerLoad[task.partNumber].req++;
                    if (task.quantityUnit === 'pallet') highRunnerLoad[task.partNumber].pal += loadMultiplier;
                }
            }

            let oneWayD = 0;
            if (task.isLogistics) {
                const op = logisticsOperations.find(o => o.value === task.workplace);
                if (op) {
                    oneWayD = op.distancePx ? (op.distancePx / 10) : 0;
                    if (lastPoint && op.coordX !== undefined) {
                        wTransit += getCachedAStar({x: lastPoint.x, y: lastPoint.y}, {x: op.coordX, y: op.coordY || 0}, lastPoint.id, op.id);
                    }
                    if (op.coordX !== undefined) lastPoint = { x: op.coordX, y: op.coordY || 0, id: op.id };
                    wTargetMin += ((op.standardTime || 2.0) * loadMultiplier) + (oneWayD / VZV_SPEED_MPM);
                }
            } else {
                const wp = workplaces.find(w => w.value === task.workplace);
                if (wp) {
                    let startPt: {x: number, y: number, id: string} | null = null;
                    if (task.pickedFromSectorId) {
                        const s = mapSectors.find(sx => sx.id === task.pickedFromSectorId);
                        if (s) startPt = { x: s.coordX, y: s.coordY, id: s.id };
                    }
                    if (lastPoint && startPt) {
                        wTransit += getCachedAStar({x: lastPoint.x, y: lastPoint.y}, {x: startPt.x, y: startPt.y}, lastPoint.id, startPt.id);
                    }
                    if (startPt) {
                        oneWayD = getCachedAStar({x: startPt.x, y: startPt.y}, {x: wp.coordX || 0, y: wp.coordY || 0}, startPt.id, wp.id);
                    }
                    wTargetMin += ((wp.standardTime || 2.0) * loadMultiplier) + (oneWayD / VZV_SPEED_MPM);
                    lastPoint = { x: wp.coordX || 0, y: wp.coordY || 0, id: wp.id };
                }
            }

            if (task.startedAt && task.completedAt) {
                const realMs = Math.max((task.completedAt - task.startedAt) - calculateBlockedTime(task.startedAt, task.completedAt, systemBreaks, task.inventoryHistory), 0);
                const actualMin = realMs / 60000;
                if (actualMin < 0.5) wInvalid++;
                else {
                    const floored = Math.max(actualMin, 1.0);
                    wActualMin += floored;
                    wExecMs += realMs;
                }
            }

            if (oneWayD > 0) {
                const durS = ((task.completedAt || 0) - (task.startedAt || task.createdAt || 0)) / 1000;
                const trips = Math.min(Math.max(1, Math.floor(loadMultiplier)), Math.max(1, Math.round((durS * VZV_SPEED_MPS) / (2 * oneWayD))));
                const fD = trips * oneWayD, eD = (trips > 1 ? (trips - 1) * oneWayD : 0);
                wFull += fD; wEmpty += eD; wRides += (trips * 2 - 1);
                const targetDrive = task.isLogistics ? logDriving : prodDriving;
                targetDrive.fullDist += fD; targetDrive.emptyDist += eD; targetDrive.fullRides += trips; targetDrive.emptyRides += (trips > 1 ? trips - 1 : 0);
            } else wRides++;

            if (task.createdAt && task.startedAt && task.startedAt > task.createdAt) { wReactMs += (task.startedAt - task.createdAt); wReactCount++; }
            if (task.isMissing) { wMissing++; if (task.auditResult === 'NOK') wRealErr++; }
        });

        const nDays = Math.max(daysWorked.size, 1), pureM = wExecMs / 60000;
        const util = (pureM * 1.15 / (nDays * SHIFT_MINUTES)) * 100;
        const perf = wActualMin > 0 ? Math.min((wTargetMin / wActualMin) * 100, 200) : 0;
        const conf = wMissing > 0 ? ((wMissing - wRealErr) / wMissing) * 100 : 100;
        const logEff = (wFull + wEmpty + wTransit) > 0 ? (wFull / (wFull + wEmpty + wTransit)) * 100 : 50;

        return {
            id: uid, name: resolveName(uid), tasksDone: workerTasks.length, pureWorkMinutes: pureM, utilizationPercent: util,
            performanceRatio: perf, avgReactionSeconds: wReactCount > 0 ? (wReactMs / wReactCount) / 1000 : 0,
            fullDistMeters: wFull, emptyDistMeters: wEmpty + wTransit, logEfficiency: logEff, confidenceRating: conf,
            totalRides: wRides, invalidTasksCount: wInvalid,
            index: parseFloat(((conf/100)*3 + (Math.min(util,100)/100)*2.5 + (Math.min(perf,200)/200)*2 + (logEff/100)*1).toFixed(1))
        };
    });

    prodDriving.efficiency = (prodDriving.fullDist + prodDriving.emptyDist) > 0 ? (prodDriving.fullDist / (prodDriving.fullDist + prodDriving.emptyDist)) * 100 : 0;
    logDriving.efficiency = (logDriving.fullDist + logDriving.emptyDist) > 0 ? (logDriving.fullDist / (logDriving.fullDist + logDriving.emptyDist)) * 100 : 0;

    return {
        globalStats: {
            totalTasks: dataset.length,
            totalPhysicalRides: workerStatsList.reduce((a, b) => a + b.totalRides, 0),
            totalFullDist: prodDriving.fullDist + logDriving.fullDist,
            totalEmptyDist: prodDriving.emptyDist + logDriving.emptyDist,
            globalEfficiency: (prodDriving.fullDist + logDriving.fullDist + prodDriving.emptyDist + logDriving.emptyDist) > 0 ? ((prodDriving.fullDist + logDriving.fullDist) / (prodDriving.fullDist + logDriving.fullDist + prodDriving.emptyDist + logDriving.emptyDist)) * 100 : 0
        },
        workerStats: workerStatsList,
        charts: {
            hourly: Object.entries(hourlyLoad).map(([h, d]) => ({ hour: parseInt(h), label: `${h}h`, production: d.prod, logistics: d.log })),
            highRunners: Object.entries(highRunnerLoad).map(([k, v]) => ({ partNumber: k, ...v })).sort((a,b) => b.load - a.load).slice(0, 3),
            workplaces: Object.entries(workplaceLoad).map(([k, v]) => ({ workplace: k, ...v })).sort((a,b) => b.load - a.load).slice(0, 3)
        },
        qualityStats: {
            realErrorsCount: globalRealErrors, falseAlarmsCount: globalFalseAlarms, totalAuditedMissing: globalAuditedCount,
            topMissingParts: Object.entries(missingPartsMap).map(([p, c]) => ({ partNumber: p, count: c })).sort((a,b) => b.count - a.count).slice(0, 3)
        },
        drivingStats: { production: prodDriving, logistics: logDriving }
    };
};
