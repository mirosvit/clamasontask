import React, { useMemo, useState, useEffect } from 'react';
import { Task, SystemConfig } from '../../../types/appTypes';
import { useLanguage } from '../../LanguageContext';
import AnalyticsExportPanel from './AnalyticsExportPanel';
import HighRunnerSection from './HighRunnerSection';
import HourlyChartSection from './HourlyChartSection';
import QualityAuditSection from './QualityAuditSection';
import WorkerDetailModal from './WorkerDetailModal';
import DrivingMetrics from './DrivingMetrics';
import { useAnalyticsEngine, FilterMode, SourceFilter, ShiftFilter } from '../../../hooks/useAnalyticsEngine';
import { useData } from '../../../context/DataContext';

interface AnalyticsTabProps {
  systemConfig: SystemConfig;
  currentUser: string;
  currentUserRole: string;
  hasPermission: (permName: string) => boolean;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ 
  systemConfig, currentUser, currentUserRole 
}) => {
  const data = useData(); 
  
  const [filterMode, setFilterMode] = useState<FilterMode>('TODAY');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [historicalArchive, setHistoricalArchive] = useState<Task[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedWorkerData, setSelectedWorkerData] = useState<{ name: string; tasks: Task[] } | null>(null);
  const { t, language } = useLanguage();

  const resolveName = (username?: string | null) => {
      if (!username) return '-';
      const u = data.users.find(x => x.username === username);
      return (u?.nickname || username).toUpperCase();
  };

  const canExport = useMemo(() => {
    return currentUserRole === 'ADMIN' || (data.users?.find(u => u.username === currentUser)?.canExportAnalytics === true);
  }, [currentUser, currentUserRole, data.users]);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const sanons = await data.fetchSanons();
        const allArchivedTasks: Task[] = [];
        sanons.forEach(sanon => {
          if (sanon.tasks && Array.isArray(sanon.tasks)) {
            allArchivedTasks.push(...sanon.tasks);
          }
        });
        setHistoricalArchive(allArchivedTasks);
      } catch (err) {
        console.error("Failed to load historical archives", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [data.fetchSanons]);

  const masterDataset = useMemo(() => {
    const live = Array.isArray(data.tasks) ? data.tasks : [];
    const draft = Array.isArray(data.draftTasks) ? data.draftTasks : [];
    const archive = Array.isArray(historicalArchive) ? historicalArchive : [];
    const combined = [...live, ...draft, ...archive];
    const uniqueMap = new Map();
    combined.forEach(task => { if (task && task.id) uniqueMap.set(task.id, task); });
    return Array.from(uniqueMap.values());
  }, [data.tasks, data.draftTasks, historicalArchive]);

  const engine = useAnalyticsEngine(
    masterDataset,
    [],
    data.systemBreaks,
    data.mapSectors,
    data.workplaces,
    data.logisticsOperations,
    data.mapObstacles,
    systemConfig,
    {
      mode: filterMode,
      source: sourceFilter,
      shift: shiftFilter,
      customStart,
      customEnd
    },
    resolveName
  );

  const { filteredTasks, globalStats, qualityStats, drivingStats } = engine;

  const calculateBlockedTime = (startTime: number, endTime: number): number => {
    let totalBlocked = 0;
    data.systemBreaks.forEach(br => {
      const overlapStart = Math.max(startTime, br.start);
      const overlapEnd = Math.min(endTime, br.end || endTime);
      if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
    });
    return totalBlocked;
  };

  const workerTableData = useMemo(() => {
    const workers: Record<string, { id: string; netMs: number; rides: number; sumPerf: number; countPerf: number }> = {};
    filteredTasks.forEach(task => {
        if (!task.isDone || !task.completedBy) return;
        if (!workers[task.completedBy]) workers[task.completedBy] = { id: task.completedBy, netMs: 0, rides: 0, sumPerf: 0, countPerf: 0 };
        const w = workers[task.completedBy];
        w.rides++; 
        if (task.startedAt && task.completedAt) {
            const rawDurationMs = task.completedAt - task.startedAt;
            const blockedMs = calculateBlockedTime(task.startedAt, task.completedAt);
            const pureMs = Math.max(rawDurationMs - blockedMs, 0);
            w.netMs += pureMs;
            const targetMin = task.standardTime || 2.0;
            const durationMin = pureMs / 60000;
            let adjMin = durationMin < 0.5 ? 2 : Math.max(durationMin, 1);
            if (targetMin > 0) {
                w.sumPerf += Math.min((targetMin / adjMin) * 100, 200);
                w.countPerf++;
            }
        }
    });
    return Object.values(workers).map(w => ({
        id: w.id, name: resolveName(w.id), netMs: w.netMs, rides: w.rides,
        efficiency: w.countPerf > 0 ? w.sumPerf / w.countPerf : 0
    })).sort((a, b) => b.efficiency - a.efficiency);
  }, [filteredTasks]);

  const formatNetTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('analytics_title')}</h1>
        {isLoadingHistory && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full animate-pulse">
            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
            <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">{t('loading_hist')}</span>
          </div>
        )}
      </div>

      <AnalyticsExportPanel canExport={canExport} tasks={filteredTasks} systemBreaks={data.systemBreaks} resolveName={resolveName} t={t} language={language} />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden mb-8 flex flex-col">
        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="w-full flex items-center justify-between p-6 bg-slate-800/40 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{t('filter_title')}</h3>
          </div>
          <div className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></div>
        </button>

        {isFilterOpen && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{t('time_range_label')}</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'CUSTOM'] as FilterMode[]).map(m => (
                  <button key={m} onClick={() => setFilterMode(m)} className={`h-11 px-4 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterMode === m ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10' : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-300'}`}>{t(`filter_${m.toLowerCase()}` as any)}</button>
                ))}
              </div>
              {filterMode === 'CUSTOM' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fade-in">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 text-white text-sm focus:border-amber-500 transition-all outline-none" />
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 text-white text-sm focus:border-amber-500 transition-all outline-none" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI TILES GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-blue-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_total')}</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.totalTasks}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-purple-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_total_rides')}</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.totalPhysicalRides}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-amber-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_astar_dist')}</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{(globalStats.totalFullDist/1000).toFixed(1)} km</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-teal-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_route_effic')}</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.globalEfficiency.toFixed(1)}%</p>
        </div>
      </div>

      {/* WORKER PERFORMANCE TABLE */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
              <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('table_title')}</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                      <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                          <th className="py-4 px-6 text-center w-16">{t('th_rank')}</th>
                          <th className="py-4 px-6">{t('username')}</th>
                          <th className="py-4 px-6 text-center">{t('th_work_time')}</th>
                          <th className="py-4 px-6 text-center">{t('th_rides')}</th>
                          <th className="py-4 px-6 text-right">{t('kpi_effic')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                      {workerTableData.map((w, idx) => (
                          <tr key={w.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-5 px-6 text-center"><div className="w-10 h-10 rounded-lg font-black text-xl bg-slate-800 border border-slate-700 text-slate-500 flex items-center justify-center mx-auto">{idx + 1}</div></td>
                              <td className="py-5 px-6">
                                  <button onClick={() => setSelectedWorkerData({ name: w.name, tasks: masterDataset.filter(t => t.completedBy === w.id) })} className="text-base font-black text-teal-400 hover:underline uppercase">{w.name}</button>
                              </td>
                              <td className="py-5 px-6 text-center font-mono text-slate-300">{formatNetTime(w.netMs)}</td>
                              <td className="py-5 px-6 text-center font-black text-white">{w.rides}</td>
                              <td className="py-5 px-6 text-right font-black font-mono text-teal-400">{w.efficiency.toFixed(1)}%</td>
                          </tr>
                      ))}
                      {workerTableData.length === 0 && (
                          <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">{t('no_data')}</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      <HighRunnerSection topHighRunners={engine.charts.highRunners} topWorkplaces={engine.charts.workplaces} t={t} />
      <HourlyChartSection hourlyData={engine.charts.hourly} t={t} />
      <DrivingMetrics productionStats={drivingStats.production} logisticsStats={drivingStats.logistics} vzvSpeed={systemConfig.vzvSpeed || 8} />
      <QualityAuditSection data={qualityStats} t={t} />
      
      {selectedWorkerData && (
        <WorkerDetailModal name={selectedWorkerData.name} tasks={selectedWorkerData.tasks} periodLabel={filterMode} systemBreaks={data.systemBreaks} onClose={() => setSelectedWorkerData(null)} mapSectors={data.mapSectors} workplaces={data.workplaces} systemConfig={systemConfig} logisticsOperations={data.logisticsOperations} />
      )}
    </div>
  );
};

export default AnalyticsTab;