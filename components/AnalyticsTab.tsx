
import React, { useMemo, useState, useEffect } from 'react';
import { Task, SystemBreak } from '../App';
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface AnalyticsTabProps {
  tasks: Task[];
  onFetchArchivedTasks: () => Promise<Task[]>;
  systemBreaks: SystemBreak[];
}

type FilterMode = 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ tasks: liveTasks, onFetchArchivedTasks, systemBreaks }) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [includeArchive, setIncludeArchive] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const { t, language } = useLanguage();

  const tasks = useMemo(() => {
      return includeArchive ? [...liveTasks, ...archivedTasks] : liveTasks;
  }, [liveTasks, archivedTasks, includeArchive]);

  useEffect(() => {
      if (includeArchive && archivedTasks.length === 0) {
          const load = async () => {
              setIsLoadingArchive(true);
              const data = await onFetchArchivedTasks();
              setArchivedTasks(data);
              setIsLoadingArchive(false);
          };
          load();
      } else if (!includeArchive && archivedTasks.length > 0) {
        setArchivedTasks([]);
      }
  }, [includeArchive]);

  const filteredTasks = useMemo(() => {
    if (filterMode === 'ALL') return tasks;

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

            case 'CUSTOM':
                if (!customStart) return true;
                const start = new Date(customStart).setHours(0,0,0,0);
                const end = customEnd ? new Date(customEnd).setHours(23,59,59,999) : Infinity;
                return taskDate.getTime() >= start && taskDate.getTime() <= end;
                
            default:
                return true;
        }
    });
  }, [tasks, filterMode, customStart, customEnd]);

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
        let part = task.partNumber;
        let wp = task.workplace;
        let weight = 1;
        
        if (task.quantityUnit === 'pallet' && task.quantity) {
             const qty = parseFloat(task.quantity.replace(',', '.'));
             if (!isNaN(qty) && qty > 0) weight = qty;
        }

        if (task.type === 'logistics') {
            const refLabel = (part && part !== '-') ? part : 'N/A';
            const opLabel = (wp && wp !== '-') ? wp : '';
            const compoundKey = opLabel ? `${refLabel} [${opLabel}]` : refLabel;
            logisticsRefCounts[compoundKey] = (logisticsRefCounts[compoundKey] || 0) + weight;
            if (wp && wp !== '-') logisticsOpCounts[wp] = (logisticsOpCounts[wp] || 0) + 1; 
        } else {
            if (part && part !== '-') partCounts[part] = (partCounts[part] || 0) + weight;
            if (wp && wp !== '-') workplaceCounts[wp] = (workplaceCounts[wp] || 0) + weight;
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
                workerStatsMap[worker] = { name: worker, count: 0, totalLeadMs: 0, countLead: 0, totalReactionMs: 0, countReaction: 0, totalExecutionMs: 0, totalStandardMinutes: 0 };
            }
            const ws = workerStatsMap[worker];
            ws.count += weight; 
            if (task.standardTime) ws.totalStandardMinutes += task.standardTime;

            if (task.createdAt) {
                 if (task.completedAt) {
                     const lead = task.completedAt - task.createdAt;
                     if (lead > 0) { ws.totalLeadMs += lead; ws.countLead++; }
                 }
                 if (task.startedAt && task.completedAt) {
                     const reaction = task.startedAt - task.createdAt;
                     if (reaction > 0) { ws.totalReactionMs += reaction; ws.countReaction++; }
                     let execution = task.completedAt - task.startedAt;
                     const blockedTime = calculateBlockedTime(task.inventoryHistory, task.startedAt, task.completedAt);
                     execution -= blockedTime;
                     if (execution > 0) { ws.totalExecutionMs += execution; grandTotalExecutionTime += execution; }
                 }
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
  }, [filteredTasks, systemBreaks]);

  const handleExportReport = () => {
    if (typeof XLSX === 'undefined') return;
    const wb = XLSX.utils.book_new();
    
    const kpiData = [
        { Metrika: t('kpi_total'), Hodnota: stats.total },
        { Metrika: t('kpi_worked'), Hodnota: (stats.grandTotalExecutionTime / 3600000).toFixed(2) },
        { Metrika: t('kpi_lead'), Hodnota: (stats.avgLead / 60000).toFixed(2) },
        { Metrika: t('kpi_react'), Hodnota: (stats.avgReaction / 60000).toFixed(2) },
        { Metrika: t('kpi_effic'), Hodnota: stats.efficiency },
        { Metrika: t('kpi_urgent'), Hodnota: stats.urgent },
        { Metrika: t('kpi_missing'), Hodnota: stats.missing },
        { Metrika: t('kpi_incorrect'), Hodnota: stats.incorrectlyEntered },
    ];
    const wsKPI = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKPI, "KPI");
    XLSX.writeFile(wb, `Report_Analytika_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8 animate-fade-in">
        <h1 className="text-center text-2xl sm:text-3xl font-bold text-teal-400 mb-2">{t('analytics_title')}</h1>
        <div className="flex flex-col sm:flex-row justify-end gap-3 mb-2">
            <label className="flex items-center cursor-pointer gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700">
                <input type="checkbox" checked={includeArchive} onChange={() => setIncludeArchive(!includeArchive)} className="form-checkbox h-5 w-5 text-teal-500 rounded focus:ring-teal-500 bg-gray-700 border-gray-600"/>
                <span className="text-sm font-bold text-teal-400">{isLoadingArchive ? t('loading_hist') : t('include_archive')}</span>
            </label>
            <button onClick={handleExportReport} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors">
                <DownloadIcon className="w-5 h-5" />{t('download_report')}
            </button>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl shadow-md border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 justify-center">
                {(['ALL', 'TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'CUSTOM'] as FilterMode[]).map(mode => (
                    <button key={mode} onClick={() => setFilterMode(mode)} className={`px-4 py-2 rounded text-sm font-bold transition-colors ${filterMode === mode ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{t(`filter_${mode.toLowerCase()}` as any)}</button>
                ))}
            </div>
            {filterMode === 'CUSTOM' && (
                <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg border border-gray-600">
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-teal-500 outline-none"/>
                    <span className="text-gray-400">-</span>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-teal-500 outline-none"/>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-700 p-4 rounded-xl shadow-lg border-l-4 border-blue-500">
                <p className="text-gray-400 text-sm font-bold uppercase">{t('kpi_total')}</p>
                <p className="text-3xl font-extrabold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-xl shadow-lg border-l-4 border-green-500">
                <p className="text-gray-400 text-sm font-bold uppercase">{t('kpi_worked')}</p>
                <p className="text-3xl font-extrabold text-green-400 mt-1">{formatDuration(stats.grandTotalExecutionTime)}</p>
            </div>
            <div className="bg-gray-700 p-4 rounded-xl shadow-lg border-l-4 border-purple-500">
                <p className="text-gray-400 text-sm font-bold uppercase">{t('kpi_lead')}</p>
                <p className="text-3xl font-extrabold text-purple-400 mt-1">{formatDuration(stats.avgLead)}</p>
            </div>
             <div className="bg-gray-700 p-4 rounded-xl shadow-lg border-l-4 border-yellow-500">
                <p className="text-gray-400 text-sm font-bold uppercase">{t('kpi_react')}</p>
                <p className="text-3xl font-extrabold text-yellow-400 mt-1">{formatDuration(stats.avgReaction)}</p>
            </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-lg">
             <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">{t('table_title')}</h3>
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="text-gray-400 text-sm border-b border-gray-700">
                            <th className="py-2 px-2">{t('th_rank')}</th>
                            <th className="py-2 px-2">{t('th_name')}</th>
                            <th className="py-2 px-2 text-right">{t('th_done')}</th>
                            <th className="py-2 px-2 text-right text-green-400">{t('th_work_time')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {stats.workerStats.map((ws: any, idx: number) => (
                            <tr key={ws.name} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                <td className="py-3 px-2 text-gray-500 font-mono">{idx + 1}</td>
                                <td className="py-3 px-2 font-bold text-white">{ws.name}</td>
                                <td className="py-3 px-2 text-right text-teal-400 font-bold">{Number(ws.count.toFixed(1))}</td>
                                <td className="py-3 px-2 text-right text-green-400 font-bold font-mono">{formatDuration(ws.totalExecutionMs)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>

        {/* ÚPRAVA: Grafy vedľa seba už od šírky 'sm' */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">{t('chart_wp')}</h3>
                <div className="space-y-4">
                    {stats.topWorkplaces.map(([name, count], idx) => (
                        <div key={name} className="relative">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300 font-mono">{idx + 1}. {name}</span>
                                <span className="text-teal-400 font-bold">{Number(count.toFixed(1))}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: `${(count / (stats.topWorkplaces[0]?.[1] || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">{t('chart_parts')}</h3>
                <div className="space-y-4">
                     {stats.topParts.map(([name, count], idx) => (
                        <div key={name} className="relative">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300 font-mono">{idx + 1}. {name}</span>
                                <span className="text-blue-400 font-bold">{Number(count.toFixed(1))}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(count / (stats.topParts[0]?.[1] || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg sm:col-span-2">
                <h3 className="text-lg font-bold text-sky-400 mb-4 border-b border-gray-700 pb-2">{t('chart_log_refs')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                     {stats.topLogRefs.map(([name, count], idx) => (
                        <div key={name} className="relative">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300 font-mono">{idx + 1}. {name}</span>
                                <span className="text-sky-400 font-bold">{Number(count.toFixed(1))}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: `${(count / (stats.topLogRefs[0]?.[1] || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AnalyticsTab;
