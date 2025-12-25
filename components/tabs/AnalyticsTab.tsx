import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { Task, SystemBreak } from '../../App';
import { useLanguage } from '../LanguageContext';

declare var XLSX: any;

interface AnalyticsTabProps {
  tasks: Task[];
  onFetchArchivedTasks: () => Promise<Task[]>;
  systemBreaks: SystemBreak[];
  resolveName: (username?: string | null) => string;
}

type FilterMode = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH';
type ShiftFilter = 'ALL' | 'MORNING' | 'AFTERNOON';

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ClockSmallIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ tasks: liveTasks, onFetchArchivedTasks, systemBreaks, resolveName }) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('TODAY');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  
  // Stavy pre archívny export (skrytý report pre Admina)
  const [archiveExportStart, setArchiveExportStart] = useState('');
  const [archiveExportEnd, setArchiveExportEnd] = useState('');
  const [isExportingArchive, setIsExportingArchive] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  
  // Prísne oprávnenie na export
  const [canExport, setCanExport] = useState(false);

  // Cache pre archívne dáta
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const { t, language } = useLanguage();

  // Overenie oprávnenia canExportAnalytics priamo z profilu v DB
  useEffect(() => {
    const checkExportPermission = async () => {
        const storedUser = localStorage.getItem('app_user');
        if (!storedUser) return;
        
        try {
            const q = query(collection(db, 'users'), where('username', '==', storedUser));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                setCanExport(userData.canExportAnalytics === true);
            }
        } catch (error) {
            console.error("Error checking analytics permission:", error);
            setCanExport(false);
        }
    };
    checkExportPermission();
  }, []);

  // Analytika teraz vždy spája live dáta s archívnou cache
  const tasks = useMemo(() => {
      return [...liveTasks, ...archivedTasks];
  }, [liveTasks, archivedTasks]);

  // AUTOMATICKÉ NAČÍTANIE ARCHÍVU S RATE LIMITEROM (5 MINÚT)
  useEffect(() => {
      const FIVE_MINUTES = 5 * 60 * 1000;
      const isStale = Date.now() - lastFetchTime > FIVE_MINUTES;

      // Ak nemáme dáta alebo sú staré, na načítame relevantný rozsah (cca posledný mesiac)
      if (archivedTasks.length === 0 || isStale) {
          const load = async () => {
              setIsLoadingArchive(true);
              try {
                  const results: Task[] = [];
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  
                  // 1. Načítanie z archive_drafts
                  const draftsSnap = await getDocs(query(collection(db, 'archive_drafts'), limit(500)));
                  draftsSnap.forEach(d => {
                      results.push({ ...(d.data() as Task), id: d.id });
                  });

                  // 2. Načítanie týždenných šanónov pre aktuálny mesiac
                  const getISOWeek = (date: Date) => {
                      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                      const dayNum = d.getUTCDay() || 7;
                      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                  };

                  const currentWeek = getISOWeek(now);
                  const monthAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
                  const startWeek = getISOWeek(monthAgo);
                  
                  const weekCollections = [];
                  for (let w = startWeek; w <= currentWeek; w++) {
                      weekCollections.push(`sanon_${currentYear}_${w}`);
                  }

                  for (const colName of [...new Set(weekCollections)]) {
                      try {
                          const s = await getDocs(collection(db, colName));
                          s.forEach(d => {
                              results.push({ ...(d.data() as Task), id: d.id });
                          });
                      } catch (e) { /* Kolekcia nemusí existovať */ }
                  }

                  setArchivedTasks(results);
                  setLastFetchTime(Date.now());
              } catch (err) {
                  console.error("Archive auto-sync error:", err);
              } finally {
                  setIsLoadingArchive(false);
              }
          };
          load();
      }
  }, [lastFetchTime, archivedTasks.length]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return tasks.filter(task => {
        if (!task.createdAt) return false;
        
        const taskDate = new Date(task.createdAt);
        const taskDayStart = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());

        // 1. Časové filtrovanie (Dnes, Týždeň...)
        let passesTimeFilter = false;
        switch(filterMode) {
            case 'TODAY':
                passesTimeFilter = taskDayStart.getTime() === todayStart.getTime();
                break;
            case 'YESTERDAY':
                const yesterdayStart = new Date(todayStart);
                yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                passesTimeFilter = taskDayStart.getTime() === yesterdayStart.getTime();
                break;
            case 'WEEK':
                const weekAgo = todayStart.getTime() - (7 * 86400000);
                passesTimeFilter = taskDate.getTime() >= weekAgo;
                break;
            case 'MONTH':
                passesTimeFilter = taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
                break;
            default:
                passesTimeFilter = true;
        }

        if (!passesTimeFilter) return false;

        // 2. Filtrovanie zmien (Morning/Afternoon)
        if (shiftFilter === 'ALL') return true;

        const hours = taskDate.getHours();
        if (shiftFilter === 'MORNING') {
            return hours >= 4 && hours < 14; // 04:00 - 13:59
        } else if (shiftFilter === 'AFTERNOON') {
            return hours >= 14 && hours < 24; // 14:00 - 23:59
        }

        return true;
    });
  }, [tasks, filterMode, shiftFilter]);

  // Formátovacie helpery
  const formatDate = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (ts?: number) => {
    if (!ts) return '';
    return `${formatDate(ts)} ${formatTime(ts)}`;
  };

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '-';
    const minutes = Math.round(ms / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes > 60) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    }
    return `${minutes} min`;
  };

  const calculateBlockedTime = (history: any[] | undefined, startTime: number, endTime: number): number => {
      let totalBlocked = 0;
      if (history && history.length > 0) {
          history.forEach(session => {
              const blockStart = session.start;
              const blockEnd = session.end || endTime;
              const overlapStart = Math.max(startTime, blockStart);
              const overlapEnd = Math.min(endTime, blockEnd);
              if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
          });
      }
      if (systemBreaks && systemBreaks.length > 0) {
          systemBreaks.forEach(br => {
              const breakStart = br.start;
              const breakEnd = br.end || endTime;
              const overlapStart = Math.max(startTime, breakStart);
              const overlapEnd = Math.min(endTime, breakEnd);
              if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
          });
      }
      return totalBlocked;
  };

  const stats = useMemo(() => {
    const workplaceCounts: Record<string, number> = {};
    const partCounts: Record<string, number> = {};
    const logisticsRefCounts: Record<string, number> = {}; 
    const logisticsOpCounts: Record<string, number> = {}; 
    
    let totalReactionTime = 0;
    let countReactionTime = 0;
    let totalLeadTime = 0;
    let countLeadTime = 0;
    let grandTotalExecutionTime = 0;

    const workerStatsMap: Record<string, any> = {};

    // PERFORMANCE TASKS: Zahŕňajú len reálnu prácu.
    const performanceTasks = filteredTasks.filter(t => 
        t.status !== 'incorrectly_entered' && 
        t.auditResult !== 'NOK'
    );
    
    const total = performanceTasks.length;
    const incorrectlyEntered = filteredTasks.filter(t => t.status === 'incorrectly_entered').length;
    const done = performanceTasks.filter(t => t.isDone).length;
    const missing = performanceTasks.filter(t => t.isMissing).length;
    const urgent = performanceTasks.filter(t => t.priority === 'URGENT' && t.isDone).length;

    const efficiency = total <= 0 ? 0 : Math.round((done / total) * 100);

    performanceTasks.forEach(task => {
        let weight = 1;
        if (task.quantityUnit === 'pallet' && task.quantity) {
             const qty = parseFloat(task.quantity.replace(',', '.'));
             if (!isNaN(qty) && qty > 0) weight = qty;
        }

        if (task.isLogistics) {
            const refLabel = (task.partNumber && task.partNumber !== '-') ? task.partNumber : 'N/A';
            const opLabel = (task.workplace && task.workplace !== '-') ? task.workplace : '';
            const compoundKey = opLabel ? `${refLabel} [${opLabel}]` : refLabel;
            logisticsRefCounts[compoundKey] = (logisticsRefCounts[compoundKey] || 0) + weight;
            if (task.workplace && task.workplace !== '-') logisticsOpCounts[task.workplace] = (logisticsOpCounts[task.workplace] || 0) + 1; 
        } else {
            if (task.partNumber && task.partNumber !== '-') partCounts[task.partNumber] = (partCounts[task.partNumber] || 0) + weight;
            if (task.workplace && task.workplace !== '-') workplaceCounts[task.workplace] = (workplaceCounts[task.workplace] || 0) + weight;
        }

        if (task.createdAt) {
            if (task.startedAt) {
                const reaction = task.startedAt - task.createdAt;
                if (reaction > 0) { totalReactionTime += reaction; countReactionTime++; }
            }
            if (task.isDone && task.completedAt) {
                 const lead = task.completedAt - task.createdAt;
                 if (lead > 0) { totalLeadTime += lead; countLeadTime++; }
            }
        }

        if (task.isDone && task.completedBy) {
            const worker = task.completedBy;
            if (!workerStatsMap[worker]) {
                workerStatsMap[worker] = { 
                    name: resolveName(worker), 
                    count: 0, 
                    totalVolume: 0,
                    totalExecutionMs: 0 
                };
            }
            const ws = workerStatsMap[worker];
            ws.count += 1; 
            ws.totalVolume += weight;

            if (task.createdAt && task.startedAt && task.completedAt) {
                let execution = task.completedAt - task.startedAt;
                const blockedTime = calculateBlockedTime(task.inventoryHistory, task.startedAt, task.completedAt);
                execution -= blockedTime;
                if (execution > 0) { ws.totalExecutionMs += execution; grandTotalExecutionTime += execution; }
            }
        }
    });

    const getTop = (record: Record<string, number>, limit: number) => {
        return Object.entries(record).sort(([, a], [, b]) => b - a).slice(0, limit);
    };

    const workerStats = Object.values(workerStatsMap).sort((a, b) => b.count - a.count);
    const totalVolume = workerStats.reduce((sum, ws) => sum + ws.totalVolume, 0);

    return {
        total, done, missing, urgent, efficiency, totalVolume,
        avgReaction: countReactionTime > 0 ? totalReactionTime / countReactionTime : 0,
        avgLead: countLeadTime > 0 ? totalLeadTime / countLeadTime : 0,
        grandTotalExecutionTime,
        incorrectlyEntered,
        topWorkplaces: getTop(workplaceCounts, 5),
        topParts: getTop(partCounts, 5),
        topLogRefs: getTop(logisticsRefCounts, 10),
        logisticsOpCounts,
        workerStats
    };
  }, [filteredTasks, systemBreaks, resolveName]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in text-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('analytics_title')}</h1>
            {isLoadingArchive && (
                <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                    <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{t('loading_hist')}</span>
                </div>
            )}
        </div>

        {/* ANALYTIKA (VIZUÁLNE FILTRE) */}
        <div className="bg-gray-800/40 p-4 rounded-2xl shadow-md border border-gray-700 flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap gap-2 justify-center">
                    {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] as FilterMode[]).map(mode => (
                        <button 
                            key={mode} 
                            onClick={() => setFilterMode(mode)} 
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterMode === mode ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-800/50 text-gray-400 hover:text-white'}`}
                        >
                            {t(`filter_${mode.toLowerCase()}` as any)}
                        </button>
                    ))}
                </div>

                <div className="bg-slate-900/80 p-1.5 rounded-2xl flex border border-slate-700 shadow-inner h-14 min-w-[300px]">
                    <button 
                        onClick={() => setShiftFilter('ALL')} 
                        className={`flex-1 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${shiftFilter === 'ALL' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {language === 'sk' ? 'Všetky' : 'All'}
                    </button>
                    <button 
                        onClick={() => setShiftFilter('MORNING')} 
                        className={`flex-1 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${shiftFilter === 'MORNING' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {language === 'sk' ? 'Ranná' : 'Morning'}
                    </button>
                    <button 
                        onClick={() => setShiftFilter('AFTERNOON')} 
                        className={`flex-1 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${shiftFilter === 'AFTERNOON' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {language === 'sk' ? 'Poobedná' : 'Afternoon'}
                    </button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-blue-500">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_total')}</p>
                <p className="text-3xl font-black text-white mt-2 font-mono leading-none">{stats.total}</p>
                <p className="text-xs font-bold text-blue-400/80 mt-1 uppercase tracking-widest">{stats.totalVolume.toFixed(1)} {language === 'sk' ? 'pal/ks' : 'pal/pcs'}</p>
            </div>
            <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-emerald-500">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_worked')}</p>
                <p className="text-3xl font-black text-emerald-400 mt-2 font-mono">{formatDuration(stats.grandTotalExecutionTime)}</p>
            </div>
            <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-purple-500">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_lead')}</p>
                <p className="text-3xl font-black text-purple-400 mt-2 font-mono">{formatDuration(stats.avgLead)}</p>
            </div>
             <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-amber-500">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_react')}</p>
                <p className="text-3xl font-black text-amber-400 mt-2 font-mono">{formatDuration(stats.avgReaction)}</p>
            </div>
            <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-teal-500">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{language === 'sk' ? 'EFEKTIVITA' : 'EFFICIENCY'}</p>
                <p className="text-3xl font-black text-teal-400 mt-2 font-mono">{stats.efficiency} %</p>
            </div>
        </div>

        {/* TABUĽKA VÝKONNOSTI - REDIZAJN */}
        <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
             <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('table_title')}</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-teal-500"></div> Top Výkon
                    </div>
                </div>
             </div>

             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-y-3 min-w-[700px]">
                    <thead>
                        <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                            <th className="pb-4 px-6">{t('th_rank')}</th>
                            <th className="pb-4 px-2">{t('th_name')}</th>
                            <th className="pb-4 px-2 text-right">{t('th_done')}</th>
                            <th className="pb-4 px-2 text-right text-sky-400">📦 {language === 'sk' ? 'OBJEM' : 'VOLUME'}</th>
                            <th className="pb-4 px-2 text-right text-purple-400"><div className="flex items-center justify-end gap-1.5"><ClockSmallIcon className="w-3 h-3" /> {language === 'sk' ? 'PRIEMER' : 'AVG'}</div></th>
                            <th className="pb-4 px-6 text-right text-emerald-400">{t('th_work_time')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.workerStats.map((ws: any, idx: number) => {
                            const isWinner = idx === 0;
                            const rowBg = isWinner ? 'bg-slate-800/40' : 'bg-slate-900/40';
                            const winnerBorder = isWinner ? 'border-y border-teal-500/30' : '';
                            
                            return (
                                <tr key={ws.name} className={`group transition-all hover:bg-slate-800/60 ${isWinner ? 'shadow-[0_0_20px_rgba(20,184,166,0.1)]' : ''}`}>
                                    <td className={`py-5 px-6 first:rounded-l-2xl text-slate-500 font-mono text-base ${rowBg} ${winnerBorder} ${isWinner ? 'border-l border-teal-500/30' : ''}`}>
                                        {idx + 1}
                                    </td>
                                    <td className={`py-5 px-2 font-black text-lg uppercase tracking-tight ${rowBg} ${winnerBorder} ${isWinner ? 'text-teal-400' : 'text-slate-200'}`}>
                                        <div className="flex items-center gap-3">
                                            {isWinner && <span className="text-amber-400 animate-pulse text-xl">★</span>}
                                            {ws.name}
                                        </div>
                                    </td>
                                    <td className={`py-5 px-2 text-right text-teal-500 font-black font-mono text-lg ${rowBg} ${winnerBorder}`}>
                                        {ws.count}
                                    </td>
                                    <td className={`py-5 px-2 text-right text-sky-400 font-black font-mono text-lg ${rowBg} ${winnerBorder}`}>
                                        {Number(ws.totalVolume.toFixed(1))}
                                    </td>
                                    <td className={`py-5 px-2 text-right text-purple-400 font-black font-mono text-base ${rowBg} ${winnerBorder}`}>
                                        {formatDuration(ws.totalExecutionMs / ws.count)}
                                    </td>
                                    <td className={`py-5 px-6 last:rounded-r-2xl text-right text-emerald-400 font-black font-mono text-base ${rowBg} ${winnerBorder} ${isWinner ? 'border-r border-teal-500/30' : ''}`}>
                                        {formatDuration(ws.totalExecutionMs)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-xl">
                <h3 className="text-xs font-black text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-4">{t('chart_wp')}</h3>
                <div className="space-y-5">
                    {stats.topWorkplaces.map(([name, count], idx) => (
                        <div key={name} className="relative">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                <span className="text-slate-400">{idx + 1}. {name}</span>
                                <span className="text-teal-400">{Number(count.toFixed(1))}</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-teal-600 to-teal-400 h-full rounded-full" style={{ width: `${(count / (stats.topWorkplaces[0]?.[1] || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-xl">
                <h3 className="text-xs font-black text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-4">{t('chart_parts')}</h3>
                <div className="space-y-5">
                     {stats.topParts.map(([name, count], idx) => (
                        <div key={name} className="relative">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                <span className="text-slate-400">{idx + 1}. {name}</span>
                                <span className="text-blue-400">{Number(count.toFixed(1))}</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full" style={{ width: `${(count / (stats.topParts[0]?.[1] || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-xl sm:col-span-2">
                <h3 className="text-xs font-black text-sky-400 mb-6 uppercase tracking-widest border-b border-sky-900/30 pb-4">{t('chart_log_refs')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                     {stats.topLogRefs.map(([name, count], idx) => (
                        <div key={name} className="relative">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                <span className="text-slate-400 truncate max-w-[250px]">{idx + 1}. {name}</span>
                                <span className="text-sky-400">{Number(count.toFixed(1))}</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-sky-600 to-sky-400 h-full rounded-full" style={{ width: `${(count / (stats.topLogRefs[0]?.[1] || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

const Icons = {
  Archive: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
};

export default AnalyticsTab;