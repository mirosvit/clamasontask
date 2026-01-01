
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
  const data = useData(); // CONTEXT
  
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

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

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
    combined.forEach(task => {
        if (task && task.id) uniqueMap.set(task.id, task);
    });
    return Array.from(uniqueMap.values());
  }, [data.tasks, data.draftTasks, historicalArchive]);

  const engine = useAnalyticsEngine(
    masterDataset,
    [],
    data.systemBreaks,
    data.mapSectors,
    data.workplaces,
    data.logisticsOperations,
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

  // POMOCNÁ FUNKCIA PRE BLOKOVANÝ ČAS
  const calculateBlockedTime = (startTime: number, endTime: number): number => {
    let totalBlocked = 0;
    data.systemBreaks.forEach(br => {
      const overlapStart = Math.max(startTime, br.start);
      const overlapEnd = Math.min(endTime, br.end || endTime);
      if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
    });
    return totalBlocked;
  };

  // PRÍPRAVA DÁT PRE TABUĽKU (ANTI-CHEAT LOGIKA)
  const workerTableData = useMemo(() => {
    const workers: Record<string, { id: string; netMs: number; rides: number; sumPerf: number; countPerf: number }> = {};

    filteredTasks.forEach(task => {
        if (!task.isDone || !task.completedBy) return;
        
        if (!workers[task.completedBy]) {
            workers[task.completedBy] = { id: task.completedBy, netMs: 0, rides: 0, sumPerf: 0, countPerf: 0 };
        }
        
        const w = workers[task.completedBy];
        w.rides++; 

        if (task.startedAt && task.completedAt) {
            const rawDurationMs = task.completedAt - task.startedAt;
            const blockedMs = calculateBlockedTime(task.startedAt, task.completedAt);
            const pureMs = Math.max(rawDurationMs - blockedMs, 0);
            w.netMs += pureMs;

            const norm = task.isLogistics 
                ? (data.logisticsOperations.find(o => o.value === task.workplace)?.standardTime || 0)
                : (data.workplaces.find(w => w.value === task.workplace)?.standardTime || 0);
            
            const qtyVal = parseFloat((task.quantity || '1').replace(',', '.'));
            const targetMin = norm * qtyVal;
            const durationMin = pureMs / 60000;

            // Anti-Cheat Adjusted Time
            let adjMin;
            if (durationMin < 0.5) adjMin = (targetMin * 2) || 2;
            else if (durationMin < 1) adjMin = 1;
            else adjMin = durationMin;

            if (targetMin > 0) {
                const taskPerf = (targetMin / adjMin) * 100;
                w.sumPerf += Math.min(taskPerf, 200);
                w.countPerf++;
            }
        }
    });

    return Object.values(workers).map(w => ({
        id: w.id,
        name: resolveName(w.id),
        netMs: w.netMs,
        rides: w.rides,
        efficiency: w.countPerf > 0 ? w.sumPerf / w.countPerf : 0
    })).sort((a, b) => b.efficiency - a.efficiency);
  }, [filteredTasks, data.logisticsOperations, data.workplaces, data.systemBreaks]);

  const formatNetTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const kpiMetrics = useMemo(() => {
    const logDone = filteredTasks.filter(t => t.isLogistics && t.isDone).length;
    const prodDone = filteredTasks.filter(t => !t.isLogistics && t.isDone).length;
    const totalKm = (globalStats.totalFullDist + globalStats.totalEmptyDist) / 1000;

    const totalNetMs = filteredTasks.reduce((acc, t) => {
      if (t.isDone && t.startedAt && t.completedAt && t.completedAt > t.startedAt) {
          const blocked = calculateBlockedTime(t.startedAt, t.completedAt);
          return acc + Math.max(t.completedAt - t.startedAt - blocked, 0);
      }
      return acc;
    }, 0);
    
    const hours = Math.floor(totalNetMs / 3600000);
    const minutes = Math.floor((totalNetMs % 3600000) / 60000);
    const seconds = Math.floor((totalNetMs % 60000) / 1000);
    const netTimeString = `${hours}h ${minutes}m ${seconds}s`;

    return { logDone, prodDone, totalKm, netTimeString };
  }, [filteredTasks, globalStats, data.systemBreaks]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('analytics_title')}</h1>
        {isLoadingHistory && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full animate-pulse">
            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
            <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Načítavam archívy...</span>
          </div>
        )}
      </div>

      <AnalyticsExportPanel 
        canExport={canExport} 
        tasks={filteredTasks} 
        systemBreaks={data.systemBreaks} 
        resolveName={resolveName} 
        t={t} 
        language={language} 
      />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden mb-8 flex flex-col">
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)} 
          className="w-full flex items-center justify-between p-6 bg-slate-800/40 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50"
        >
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">FILTRÁCIA DÁT</h3>
          </div>
          <div className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isFilterOpen && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Časový Rozsah</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'CUSTOM'] as FilterMode[]).map(m => (
                  <button 
                    key={m} 
                    onClick={() => setFilterMode(m)} 
                    className={`h-11 px-4 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                      filterMode === m ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10' : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t(`filter_${m.toLowerCase()}` as any)}
                  </button>
                ))}
              </div>
              
              {filterMode === 'CUSTOM' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Od</span>
                    <input 
                      type="date" 
                      min={firstDayOfMonth} 
                      max={lastDayOfMonth} 
                      value={customStart} 
                      onChange={e => setCustomStart(e.target.value)} 
                      className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 text-white text-sm focus:border-amber-500 transition-all outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Do</span>
                    <input 
                      type="date" 
                      min={firstDayOfMonth} 
                      max={lastDayOfMonth} 
                      value={customEnd} 
                      onChange={e => setCustomEnd(e.target.value)} 
                      className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 text-white text-sm focus:border-amber-500 transition-all outline-none" 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800/50">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Zdroj Dát</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['ALL', 'PROD', 'LOG'] as SourceFilter[]).map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSourceFilter(s)} 
                      className={`flex-1 h-10 rounded-lg text-[10px] font-black uppercase transition-all ${
                        sourceFilter === s ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {s === 'ALL' ? 'Všetko' : s === 'PROD' ? 'Výroba' : 'Logistika'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Smena</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['ALL', 'DAY', 'NIGHT'] as ShiftFilter[]).map(sh => (
                    <button 
                      key={sh} 
                      onClick={() => setShiftFilter(sh)} 
                      className={`flex-1 h-10 rounded-lg text-[10px] font-black uppercase transition-all ${
                        shiftFilter === sh ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {sh === 'ALL' ? 'Všetky' : sh === 'DAY' ? 'Denná' : 'Nočná'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI CARDS - REMAIN UNCHANGED IN STRUCTURE, JUST DATA BINDING */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-blue-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">CELKOVO ÚLOH</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.totalTasks}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-purple-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">LOGISTICKÉ ÚLOHY</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{kpiMetrics.logDone}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-amber-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">VÝROBNÉ ÚLOHY</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{kpiMetrics.prodDone}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-teal-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">EFEKTIVITA JÁZD</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.globalEfficiency.toFixed(1)}%</p>
        </div>
      </div>

      {/* WORKER TABLE */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
              <div className="w-1.5 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('table_title')}</h3>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                      <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
                          <th className="py-4 px-6 text-center w-16">{t('th_rank')}</th>
                          <th className="py-4 px-6">{t('username')} (NICKNAME)</th>
                          <th className="py-4 px-6 text-center">{t('th_work_time')}</th>
                          <th className="py-4 px-6 text-center">{language === 'sk' ? 'ÚLOHY SPOLU' : 'TOTAL TASKS'}</th>
                          <th className="py-4 px-6 text-right">{t('kpi_effic')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                      {workerTableData.length > 0 ? (
                          workerTableData.map((w, idx) => (
                              <tr key={w.id} className="hover:bg-white/[0.03] transition-colors group">
                                  <td className="py-5 px-6 text-center">
                                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-black text-xl border ${
                                          idx === 0 ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                                          idx === 1 ? 'bg-slate-400/20 border-slate-400 text-slate-400' :
                                          idx === 2 ? 'bg-orange-700/20 border-orange-700 text-orange-600' :
                                          'bg-slate-800 border-slate-700 text-slate-500'
                                      }`}>
                                          {idx + 1}
                                      </div>
                                  </td>
                                  <td className="py-5 px-6">
                                      <button 
                                          onClick={() => setSelectedWorkerData({ name: w.name, tasks: masterDataset.filter(t => t.completedBy === w.id) })}
                                          className="text-base font-black text-teal-400 hover:text-teal-300 hover:underline transition-all uppercase tracking-tight"
                                      >
                                          {w.name}
                                      </button>
                                  </td>
                                  <td className="py-5 px-6 text-center">
                                      <span className="text-xl font-black text-slate-300 font-mono">{formatNetTime(w.netMs)}</span>
                                  </td>
                                  <td className="py-5 px-6 text-center">
                                      <span className="text-xl font-black text-white bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">{w.rides}</span>
                                  </td>
                                  <td className="py-5 px-6 text-right">
                                      <span className={`text-xl font-black font-mono ${
                                          w.efficiency > 100 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]' :
                                          w.efficiency > 80 ? 'text-amber-400' :
                                          'text-red-500'
                                      }`}>
                                          {w.efficiency.toFixed(1)}%
                                      </span>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={5} className="py-20 text-center text-slate-600 italic uppercase tracking-widest font-black opacity-30">
                                  {t('no_data')}
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      <HighRunnerSection topHighRunners={engine.charts.highRunners} topWorkplaces={engine.charts.workplaces} t={t} />
      
      <HourlyChartSection hourlyData={engine.charts.hourly} t={t} />
      
      <DrivingMetrics 
        productionStats={drivingStats.production}
        logisticsStats={drivingStats.logistics}
        vzvSpeed={systemConfig.vzvSpeed || 8} 
      />

      <QualityAuditSection data={qualityStats} t={t} />
      
      {selectedWorkerData && (
        <WorkerDetailModal 
          name={selectedWorkerData.name} 
          tasks={selectedWorkerData.tasks} 
          periodLabel={filterMode} 
          systemBreaks={data.systemBreaks} 
          onClose={() => setSelectedWorkerData(null)} 
          mapSectors={data.mapSectors} 
          workplaces={data.workplaces} 
          systemConfig={systemConfig} 
          logisticsOperations={data.logisticsOperations} 
        />
      )}
    </div>
  );
};

export default AnalyticsTab;
