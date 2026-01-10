
import { useMemo } from 'react';
import { Task, SystemBreak, MapSector, DBItem, SystemConfig, MapObstacle } from '../types/appTypes';
import { runAnalyticsEngine, AnalyticsFilters, FilterMode, SourceFilter, ShiftFilter } from '../utils/analyticsUtils';

export type { FilterMode, SourceFilter, ShiftFilter, AnalyticsFilters };

export const useAnalyticsEngine = (
  tasks: Task[],
  archivedTasks: Task[],
  systemBreaks: SystemBreak[],
  mapSectors: MapSector[],
  workplaces: DBItem[],
  logisticsOperations: DBItem[],
  mapObstacles: MapObstacle[],
  systemConfig: SystemConfig,
  filters: AnalyticsFilters,
  resolveName: (username?: string | null) => string
) => {

  // 1. FILTRÁCIA DÁT (Zostáva v hooku pre reaktivitu na zmenu filtrov v UI)
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

  // 2. SPUSTENIE ANALYTICKÉHO JADRA
  const engineResult = useMemo(() => {
      return runAnalyticsEngine(
          combinedData,
          systemBreaks,
          mapSectors,
          workplaces,
          logisticsOperations,
          mapObstacles,
          systemConfig,
          resolveName
      );
  }, [combinedData, systemBreaks, mapSectors, workplaces, logisticsOperations, mapObstacles, systemConfig, resolveName]);

  return {
      filteredTasks: combinedData,
      ...engineResult
  };
};
