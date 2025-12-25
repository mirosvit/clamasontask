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

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ tasks: liveTasks, onFetchArchivedTasks, systemBreaks, resolveName }) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('TODAY');
  
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

        switch(filterMode) {
            case 'TODAY':
                return taskDayStart.getTime() === todayStart.getTime();
            case 'YESTERDAY':
                const yesterdayStart = new Date(todayStart);
                yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                return taskDayStart.getTime() === yesterdayStart.getTime();
            case 'WEEK':
                const weekAgo = todayStart.getTime() - (7 * 86400000);
                return taskDate.getTime() >= weekAgo;
            case 'MONTH':
                return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
            default:
                return true;
        }
    });
  }, [tasks, filterMode]);

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

    const performanceTasks = filteredTasks.filter(t => t.status !== 'incorrectly_entered');
    const total = filteredTasks.length;
    const incorrectlyEntered = filteredTasks.filter(t => t.status === 'incorrectly_entered').length;
    const done = performanceTasks.filter(t => t.isDone).length;
    const missing = performanceTasks.filter(t => t.isMissing).length;
    const urgent = performanceTasks.filter(t => t.priority === 'URGENT' && t.isDone).length;
    const efficiency = performanceTasks.length === 0 ? 0 : Math.round((done / performanceTasks.length) * 100);

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

    return {
        total, done, missing, urgent, efficiency,
        avgReaction: countReactionTime > 0 ? totalReactionTime / countReactionTime : 0,
        avgLead: countLeadTime > 0 ? totalLeadTime / countLeadTime : 0,
        grandTotalExecutionTime,
        incorrectlyEntered,
        topWorkplaces: getTop(workplaceCounts, 5),
        topParts: getTop(partCounts, 5),
        topLogRefs: getTop(logisticsRefCounts, 10),
        logisticsOpCounts,
        workerStats: Object.values(workerStatsMap).sort((a, b) => b.count - a.count)
    };
  }, [filteredTasks, systemBreaks, resolveName]);

  const generateExcelFromTasks = (allTasks: any[], fileName: string) => {
      const excelData = allTasks.map(item => {
        let searchResult = '';
        if (item.searchedBy) {
          if (item.searchExhausted || item.auditResult) {
            searchResult = 'Nie';
          } else if (item.isMissing === false) {
            searchResult = 'Áno';
          } else {
            searchResult = 'Prebieha';
          }
        }

        let statusText = 'Otvorené';
        if (item.status === 'incorrectly_entered') {
            statusText = 'Chybne zadané';
        } else if (item.auditResult) {
            statusText = 'Auditované';
        } else if (item.isDone) {
            statusText = 'Dokončené';
        }

        return {
          'Dátum pridania': formatDate(item.createdAt),
          'Čas pridania': formatTime(item.createdAt),
          'Kto pridal': resolveName(item.createdBy),
          'Diel / Referencia': item.partNumber || '',
          'Pracovisko / Operácia': item.workplace || '',
          'SPZ / Prepravca': item.isLogistics ? (item.note || '') : '',
          'Počet': item.quantity || '',
          'Jednotka': item.quantityUnit || '',
          'Poznámka': !item.isLogistics ? (item.note || '') : '',
          'Skladník': resolveName(item.completedBy),
          'Dátum dokončenia': formatDate(item.completedAt),
          'Čas dokončenia': formatTime(item.completedAt),
          'Status': statusText,
          'Nahlásil chýbajúce': resolveName(item.missingReportedBy),
          'Dôvod chýbania': item.missingReason || '',
          'Čas nahlásenia chyby': item.missingReportedBy ? formatTime(item.completedAt || item.createdAt) : '',
          'Kto hľadal': item.searchedBy || '',
          'Výsledok hľadania': searchResult,
          'Audit (Výsledok)': item.auditResult || '',
          'Poznámka k auditu': item.auditNote || '',
          'Audit vykonal': resolveName(item.auditedBy) || item.auditBy || '',
          'Dátum a čas auditu': formatDateTime(item.auditedAt)
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wscols = [
        {wch: 15}, {wch: 12}, {wch: 20}, {wch: 20}, {wch: 25}, 
        {wch: 20}, {wch: 10}, {wch: 10}, {wch: 25}, {wch: 20}, 
        {wch: 15}, {wch: 12}, {wch: 18}, {wch: 20}, {wch: 25}, 
        {wch: 15}, {wch: 20}, {wch: 18}, {wch: 15}, {wch: 35},
        {wch: 20}, {wch: 20}
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "REPORT_OBDOBIE");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleArchiveExport = async () => {
      if (!archiveExportStart || !archiveExportEnd) {
          alert(language === 'sk' ? 'Zvoľte prosím rozsah dátumov.' : 'Please select date range.');
          return;
      }

      setIsExportingArchive(true);
      setExportProgress(language === 'sk' ? 'Prehľadávam archív...' : 'Searching archive...');

      try {
          const startDate = new Date(archiveExportStart).setHours(0,0,0,0);
          const endDate = new Date(archiveExportEnd).setHours(23,59,59,999);
          
          const results: any[] = [];
          
          const startYear = new Date(startDate).getFullYear();
          const endYear = new Date(endDate).getFullYear();
          
          const collectionsToTry = ['tasks', 'archive_drafts'];
          for (let y = startYear; y <= endYear; y++) {
              for (let w = 1; w <= 53; w++) {
                  collectionsToTry.push(`sanon_${y}_${w}`);
              }
          }

          for (const colName of collectionsToTry) {
              setExportProgress(`${language === 'sk' ? 'Sťahujem' : 'Fetching'} ${colName}...`);
              const snap = await getDocs(collection(db, colName));
              snap.forEach(d => {
                  const data = d.data() as Task;
                  const ts = data.createdAt || 0;
                  if (ts >= startDate && ts <= endDate) {
                      results.push({ ...data, id: d.id });
                  }
              });
          }

          if (results.length === 0) {
              alert(language === 'sk' ? 'V tomto období sa nenašli žiadne záznamy.' : 'No records found in this period.');
          } else {
              setExportProgress(language === 'sk' ? 'Generujem súbor...' : 'Generating file...');
              generateExcelFromTasks(results, `REPORT_ARCHIV_${archiveExportStart}_${archiveExportEnd}`);
          }

      } catch (err) {
          console.error(err);
          alert('Chyba pri exporte archívu.');
      } finally {
          setIsExportingArchive(false);
          setExportProgress('');
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('analytics_title')}</h1>
            {isLoadingArchive && (
                <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                    <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{t('loading_hist')}</span>
                </div>
            )}
        </div>

        {/* SEKČIA: EXPORT DÁT PRE REPORT (VIDITEĽNÉ LEN PRE ADMINA S PERMISIOU) */}
        {canExport && (
            <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-3xl shadow-2xl space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500"><Icons.Archive /></div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Export dát pre report</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Od</label>
                        <input 
                            type="date" 
                            value={archiveExportStart}
                            onChange={(e) => setArchiveExportStart(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 h-12 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Do</label>
                        <input 
                            type="date" 
                            value={archiveExportEnd}
                            onChange={(e) => setArchiveExportEnd(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 h-12 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                    <button 
                        onClick={handleArchiveExport}
                        disabled={isExportingArchive}
                        className={`h-12 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 border-2 shadow-lg ${
                            isExportingArchive ? 'bg-slate-700 border-slate-600 text-slate-400 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                        }`}
                    >
                        {isExportingArchive ? '...' : (
                            <><DownloadIcon className="w-5 h-5" /> STIAHNUŤ REPORT (.xlsx)</>
                        )}
                    </button>
                </div>
                {exportProgress && (
                    <p className="text-center text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/5 py-1.5 rounded-lg border border-emerald-400/20 uppercase tracking-widest">{exportProgress}</p>
                )}
            </div>
        )}

        {/* ANALYTIKA (VIZUÁLNE FILTRE) */}
        <div className="bg-gray-800/40 p-5 rounded-2xl shadow-md border border-gray-700 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap gap-2 justify-center">
                {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] as FilterMode[]).map(mode => (
                    <button key={mode} onClick={() => setFilterMode(mode)} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterMode === mode ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-800/50 text-gray-400 hover:text-white'}`}>{t(`filter_${mode.toLowerCase()}` as any)}</button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-blue-500">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_total')}</p>
                <p className="text-3xl font-black text-white mt-2 font-mono">{stats.total}</p>
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
        </div>

        <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-xl overflow-hidden">
             <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-4">{t('table_title')}</h3>
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            <th className="py-4 px-2">{t('th_rank')}</th>
                            <th className="py-4 px-2">{t('th_name')}</th>
                            <th className="py-4 px-2 text-right">{t('th_done')}</th>
                            <th className="py-4 px-2 text-right text-sky-400">{language === 'sk' ? 'Objem (pal/ks)' : 'Volume'}</th>
                            <th className="py-4 px-2 text-right text-emerald-400">{t('th_work_time')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {stats.workerStats.map((ws: any, idx: number) => (
                            <tr key={ws.name} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                <td className="py-4 px-2 text-slate-600 font-mono text-xs">{idx + 1}</td>
                                <td className="py-4 px-2 font-black text-slate-200 uppercase tracking-tight group-hover:text-teal-400 transition-colors">{ws.name}</td>
                                <td className="py-4 px-2 text-right text-teal-500 font-black font-mono">{ws.count}</td>
                                <td className="py-4 px-2 text-right text-sky-400 font-black font-mono">{Number(ws.totalVolume.toFixed(1))}</td>
                                <td className="py-4 px-2 text-right text-emerald-400 font-black font-mono">{formatDuration(ws.totalExecutionMs)}</td>
                            </tr>
                        ))}
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