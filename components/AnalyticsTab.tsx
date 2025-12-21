
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ tasks: liveTasks, onFetchArchivedTasks, systemBreaks }) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [includeArchive, setIncludeArchive] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

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

  const getEfficiencyColor = (eff: number) => {
      if (eff <= 0) return 'text-gray-500';
      if (eff < 85) return 'text-red-500';
      if (eff >= 90 && eff <= 110) return 'text-green-400';
      if (eff > 115) return 'text-yellow-400 font-black'; // "Gold"
      return 'text-white';
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
    
    let totalReactionTime = 0;
    let countReactionTime = 0;
    let totalLeadTime = 0;
    let countLeadTime = 0;
    let grandTotalExecutionTime = 0;

    const workerStatsMap: Record<string, any> = {};

    // Audit (Inventory) specific stats
    const auditTasks = filteredTasks.filter(t => t.partNumber === "Počítanie zásob" && t.isDone);
    const auditSessionsCount = auditTasks.length;
    const auditTotalItems = auditTasks.reduce((acc, t) => acc + (parseFloat(t.quantity || '0')), 0);
    const auditAvgItems = auditSessionsCount > 0 ? Math.round(auditTotalItems / auditSessionsCount) : 0;
    const recentAudits = auditTasks.sort((a,b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, 5);

    const performanceTasks = filteredTasks.filter(t => t.status !== 'incorrectly_entered' && t.partNumber !== "Počítanie zásob");
    const total = filteredTasks.length;
    const incorrectlyEntered = filteredTasks.filter(t => t.status === 'incorrectly_entered').length;
    const done = performanceTasks.filter(t => t.isDone).length;
    const missing = performanceTasks.filter(t => t.isMissing).length;
    const urgent = performanceTasks.filter(t => t.priority === 'URGENT' && t.isDone).length;
    const efficiencySummary = performanceTasks.length === 0 ? 0 : Math.round((done / performanceTasks.length) * 100);

    filteredTasks.forEach(task => {
        let weight = 1;
        if (task.quantityUnit === 'pallet' && task.quantity) {
             const qty = parseFloat(task.quantity.replace(',', '.'));
             if (!isNaN(qty) && qty > 0) weight = qty;
        }

        if (task.partNumber !== "Počítanie zásob") {
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
                    name: worker, 
                    count: 0, 
                    totalVolume: 0,
                    totalLeadMs: 0, 
                    countLead: 0, 
                    totalReactionMs: 0, 
                    countReaction: 0, 
                    totalExecutionMs: 0, 
                    totalStandardMinutes: 0,
                    incorrectCount: 0,
                    inventoryCount: 0,
                    productionCount: 0,
                    logisticsCount: 0
                };
            }
            const ws = workerStatsMap[worker];
            
            if (task.status === 'incorrectly_entered') {
                ws.incorrectCount++;
            } else {
                ws.count++;
                ws.totalVolume += weight;
                if (task.partNumber === "Počítanie zásob") ws.inventoryCount++;
                else if (task.type === 'logistics') ws.logisticsCount++;
                else ws.productionCount++;

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
        }
    });

    // Final worker stats with derived metrics
    const workerStats = Object.values(workerStatsMap).map((ws: any) => {
        const executionMin = ws.totalExecutionMs / 60000;
        return {
            ...ws,
            efficiency: executionMin > 0 ? Math.round((ws.totalStandardMinutes / executionMin) * 100) : 0,
            qi: ws.count > 0 ? Math.round((ws.count / (ws.count + ws.incorrectCount)) * 100) : 100
        };
    }).sort((a, b) => b.count - a.count);

    const getTop = (record: Record<string, number>, limit: number) => {
        return Object.entries(record).sort(([, a], [, b]) => b - a).slice(0, limit);
    };

    return {
        total, done, missing, urgent, efficiencySummary,
        avgReaction: countReactionTime > 0 ? totalReactionTime / countReactionTime : 0,
        avgLead: countLeadTime > 0 ? totalLeadTime / countLeadTime : 0,
        grandTotalExecutionTime,
        incorrectlyEntered,
        topWorkplaces: getTop(workplaceCounts, 5),
        topParts: getTop(partCounts, 5),
        workerStats,
        audit: {
            sessions: auditSessionsCount,
            totalItems: auditTotalItems,
            avgItems: auditAvgItems,
            recent: recentAudits
        }
    };
  }, [filteredTasks, systemBreaks]);

  const handleExportReport = () => {
    if (typeof XLSX === 'undefined') return;
    const wb = XLSX.utils.book_new();
    
    // --- SHEET 1: KPI SUMMARY ---
    const kpiData = [
        { Metrika: t('kpi_total'), Hodnota: stats.total },
        { Metrika: t('kpi_worked'), Hodnota: (stats.grandTotalExecutionTime / 3600000).toFixed(2) + " h" },
        { Metrika: t('kpi_lead'), Hodnota: (stats.avgLead / 60000).toFixed(2) + " min" },
        { Metrika: t('kpi_react'), Hodnota: (stats.avgReaction / 60000).toFixed(2) + " min" },
        { Metrika: t('kpi_effic'), Hodnota: stats.efficiencySummary + " %" },
        { Metrika: t('kpi_urgent'), Hodnota: stats.urgent },
        { Metrika: t('kpi_missing'), Hodnota: stats.missing },
        { Metrika: t('kpi_incorrect'), Hodnota: stats.incorrectlyEntered },
    ];
    const wsKPI = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKPI, "KPI Summary");

    // --- SHEET 2: RAW DATA (ZDROJOVÉ DATA) ---
    const rawData = filteredTasks.map(task => {
        const reactionTime = task.startedAt && task.createdAt ? Math.round((task.startedAt - task.createdAt) / 60000) : null;
        const leadTime = task.completedAt && task.createdAt ? Math.round((task.completedAt - task.createdAt) / 60000) : null;
        const executionTime = task.completedAt && task.startedAt ? Math.round((task.completedAt - task.startedAt) / 60000) : null;

        return {
            "Dátum zadania": task.createdAt ? new Date(task.createdAt).toLocaleString('sk-SK') : '-',
            "Zadal": task.createdBy || '-',
            "Diel / Referencia": task.partNumber || task.text,
            "Pracovisko": task.workplace || '-',
            "Množstvo": task.quantity || '0',
            "Jednotka": task.quantityUnit || '-',
            "Typ": task.type === 'logistics' ? 'Logistika' : 'Výroba',
            "Priorita": task.priority || 'NORMAL',
            "Stav": task.status === 'incorrectly_entered' ? 'Chybne zadaná' : (task.isDone ? 'Dokončená' : 'Otvorená'),
            "Začal (čas)": task.startedAt ? new Date(task.startedAt).toLocaleString('sk-SK') : '-',
            "Dokončil (meno)": task.completedBy || '-',
            "Dokončené (čas)": task.completedAt ? new Date(task.completedAt).toLocaleString('sk-SK') : '-',
            "Reakcia (min)": reactionTime,
            "Lead Time (min)": leadTime,
            "Čistý čas práce (min)": executionTime,
            "Normo-minúty": task.standardTime || 0,
            "Poznámka": task.note || ''
        };
    });
    const wsRaw = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, wsRaw, "Raw Data");

    XLSX.writeFile(wb, `Audit_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportWorkerKPI = (ws: any) => {
    if (typeof XLSX === 'undefined' || !ws) return;
    const wb = XLSX.utils.book_new();
    const data = [
        { "KPI Pasport": ws.name, "Hodnota": "" },
        { "KPI Pasport": "-------------------", "Hodnota": "----------" },
        { "KPI Pasport": "Vybavené úlohy", "Hodnota": ws.count },
        { "KPI Pasport": "Chybne zadané", "Hodnota": ws.incorrectCount },
        { "KPI Pasport": "Quality Index (QI %)", "Hodnota": ws.qi + " %" },
        { "KPI Pasport": "Efektivita (%)", "Hodnota": ws.efficiency + " %" },
        { "KPI Pasport": "Odpracovaný čistý čas", "Hodnota": formatDuration(ws.totalExecutionMs) },
        { "KPI Pasport": "Súčet normo-minút", "Hodnota": Math.round(ws.totalStandardMinutes) + " min" },
        { "KPI Pasport": "Priem. Reakcia", "Hodnota": formatDuration(ws.countReaction > 0 ? ws.totalReactionMs / ws.countReaction : 0) },
        { "KPI Pasport": "Priem. Vybavenie", "Hodnota": formatDuration(ws.countLead > 0 ? ws.totalLeadMs / ws.countLead : 0) },
        { "KPI Pasport": "Spracovaný objem (pal/ks)", "Hodnota": Number(ws.totalVolume.toFixed(1)) },
        { "KPI Pasport": "Výroba (%)", "Hodnota": ws.count > 0 ? Math.round((ws.productionCount / ws.count) * 100) : 0 },
        { "KPI Pasport": "Logistika (%)", "Hodnota": ws.count > 0 ? Math.round((ws.logisticsCount / ws.count) * 100) : 0 },
        { "KPI Pasport": "Inventúry (%)", "Hodnota": ws.count > 0 ? Math.round((ws.inventoryCount / ws.count) * 100) : 0 },
    ];
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, sheet, "Worker KPI");
    XLSX.writeFile(wb, `KPI_${ws.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
        <h1 className="text-center text-3xl font-black text-white uppercase tracking-[0.2em] mb-4">
            {t('analytics_title')}
        </h1>

        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
            <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                {(['ALL', 'TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as FilterMode[]).map(mode => (
                    <button key={mode} onClick={() => setFilterMode(mode)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all tracking-wider ${filterMode === mode ? 'bg-[#4169E1] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
                        {t(`filter_${mode.toLowerCase()}` as any)}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <label className="flex items-center cursor-pointer gap-2 bg-gray-800 px-4 py-2 rounded-xl border border-gray-700 hover:border-gray-500 transition-colors">
                    <input type="checkbox" checked={includeArchive} onChange={() => setIncludeArchive(!includeArchive)} className="form-checkbox h-4 w-4 text-[#4169E1] rounded focus:ring-[#4169E1] bg-gray-700 border-gray-600"/>
                    <span className="text-xs font-bold text-gray-400">{isLoadingArchive ? t('loading_hist') : t('include_archive')}</span>
                </label>
                <button onClick={handleExportReport} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 uppercase tracking-widest border-2 border-green-500">
                    <DownloadIcon className="w-4 h-4" />{t('download_report')}
                </button>
            </div>
        </div>

        {filterMode === 'CUSTOM' && (
            <div className="flex items-center justify-center gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700 animate-fade-in">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-gray-700 text-white text-sm rounded-lg px-4 py-2 border border-gray-600 focus:border-[#4169E1] outline-none font-mono"/>
                <span className="text-gray-500 font-bold">>>></span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-gray-700 text-white text-sm rounded-lg px-4 py-2 border border-gray-600 focus:border-[#4169E1] outline-none font-mono"/>
            </div>
        )}

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { label: t('kpi_total'), val: stats.total, color: 'border-blue-500', icon: '📋' },
                { label: t('kpi_worked'), val: formatDuration(stats.grandTotalExecutionTime), color: 'border-green-500', icon: '⏱️' },
                { label: t('kpi_lead'), val: formatDuration(stats.avgLead), color: 'border-purple-500', icon: '🚀' },
                { label: t('kpi_react'), val: formatDuration(stats.avgReaction), color: 'border-yellow-500', icon: '⚡' }
            ].map(card => (
                <div key={card.label} className={`bg-gray-800 p-6 rounded-2xl shadow-xl border-t-4 ${card.color} flex flex-col justify-between hover:scale-[1.02] transition-transform`}>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">{card.label}</p>
                    <div className="flex items-baseline justify-between mt-1">
                        <span className="text-3xl font-black text-white truncate">{card.val}</span>
                        <span className="text-2xl">{card.icon}</span>
                    </div>
                </div>
            ))}
        </div>

        {/* WORKER KPI TABLE */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
             <div className="p-6 border-b border-gray-700 bg-gray-900/40 flex justify-between items-center">
                 <h3 className="text-xl font-black text-white uppercase tracking-widest">{t('table_title')}</h3>
                 <span className="text-[10px] text-gray-500 uppercase font-bold italic">Kliknite na meno pre detaily</span>
             </div>
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-900/60 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-700">
                        <tr>
                            <th className="py-4 px-6">Meno</th>
                            <th className="py-4 px-6 text-right">Vybavené</th>
                            <th className="py-4 px-6 text-right">{t('th_accuracy')}</th>
                            <th className="py-4 px-6 text-right">{t('th_efficiency')}</th>
                            <th className="py-4 px-6 text-right text-sky-400">Objem (pal/ks)</th>
                            <th className="py-4 px-6 text-right text-green-400">Čistý Čas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {stats.workerStats.map((ws: any) => {
                            return (
                                <tr key={ws.name} onClick={() => setSelectedWorker(ws)} className="hover:bg-[#4169E1]/10 transition-all cursor-pointer group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-black text-[#4169E1] group-hover:bg-[#4169E1] group-hover:text-white transition-colors uppercase">
                                                {ws.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-white tracking-wide">{ws.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right text-gray-300 font-mono font-bold">{ws.count}</td>
                                    <td className="py-4 px-6 text-right">
                                        <span className={`font-mono font-black ${ws.qi < 90 ? 'text-red-500' : 'text-teal-400'}`}>
                                            {ws.qi}%
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className={`font-mono font-black ${getEfficiencyColor(ws.efficiency)}`}>
                                            {ws.efficiency}%
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right text-sky-400 font-black font-mono">{Number(ws.totalVolume.toFixed(1))}</td>
                                    <td className="py-4 px-6 text-right text-green-400 font-black font-mono">{formatDuration(ws.totalExecutionMs)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
        </div>

        {/* AUDIT & INVENTORY SECTION */}
        <div className="bg-gray-800 border border-[#4169E1]/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-700 bg-[#4169E1]/10 flex items-center gap-4">
                <div className="p-3 bg-[#4169E1] rounded-xl shadow-lg">
                    <ClipboardListIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest">{t('audit_title')}</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Audit KPIs */}
                <div className="lg:col-span-4 p-8 border-r border-gray-700 space-y-8 bg-gray-900/20">
                    {[
                        { label: t('audit_sessions'), val: stats.audit.sessions, icon: '📅' },
                        { label: t('audit_total_items'), val: stats.audit.totalItems, icon: '📦' },
                        { label: t('audit_avg_items'), val: stats.audit.avgItems, icon: '📈' }
                    ].map(aud => (
                        <div key={aud.label} className="flex flex-col">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{aud.label}</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-[#4169E1]">{aud.val}</span>
                                <span className="text-gray-600 text-sm font-bold uppercase">{aud.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Audit History */}
                <div className="lg:col-span-8 p-0">
                    <div className="p-4 bg-gray-900/40 border-b border-gray-700">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('audit_history')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/20 text-gray-500 text-[9px] uppercase tracking-tighter">
                                <tr>
                                    <th className="py-3 px-6">Dátum</th>
                                    <th className="py-3 px-6">Auditor</th>
                                    <th className="py-3 px-6 text-right">Položiek</th>
                                    <th className="py-3 px-6 text-right">Trvanie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {stats.audit.recent.map(audit => (
                                    <tr key={audit.id} className="hover:bg-gray-700/20">
                                        <td className="py-4 px-6 text-xs text-gray-400 font-mono">
                                            {new Date(audit.completedAt || 0).toLocaleDateString('sk-SK')}
                                        </td>
                                        <td className="py-4 px-6 text-xs font-bold text-white uppercase">{audit.completedBy}</td>
                                        <td className="py-4 px-6 text-right text-[#4169E1] font-black">{audit.quantity}</td>
                                        <td className="py-4 px-6 text-right text-xs text-gray-500">
                                            {formatDuration((audit.completedAt || 0) - (audit.startedAt || 0))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        {/* TOP CHARTS (MODERNIZED) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-xl">
                <h3 className="text-sm font-black text-gray-400 mb-6 uppercase tracking-widest border-b border-gray-700 pb-2">{t('chart_wp')}</h3>
                <div className="space-y-6">
                    {stats.topWorkplaces.map(([name, count], idx) => (
                        <div key={name} className="relative">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-gray-300 font-bold">{idx + 1}. {name}</span>
                                <span className="text-[#4169E1] font-black">{Number(count.toFixed(1))}</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-2 shadow-inner overflow-hidden">
                                <div className="bg-[#4169E1] h-full rounded-full shadow-[0_0_10px_rgba(65,105,225,0.4)]" style={{ width: `${(count / (stats.topWorkplaces[0]?.[1] || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-xl">
                <h3 className="text-sm font-black text-gray-400 mb-6 uppercase tracking-widest border-b border-gray-700 pb-2">{t('chart_parts')}</h3>
                <div className="space-y-6">
                     {stats.topParts.map(([name, count], idx) => (
                        <div key={name} className="relative">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-gray-300 font-bold">{idx + 1}. {name}</span>
                                <span className="text-teal-400 font-black">{Number(count.toFixed(1))}</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-2 shadow-inner overflow-hidden">
                                <div className="bg-teal-600 h-full rounded-full shadow-[0_0_10px_rgba(20,184,166,0.4)]" style={{ width: `${(count / (stats.topParts[0]?.[1] || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* WORKER PASSPORT MODAL */}
        {selectedWorker && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" onClick={() => setSelectedWorker(null)}>
                <div className="bg-gray-800 border-2 border-[#4169E1] rounded-3xl shadow-[0_0_50px_rgba(65,105,225,0.3)] w-full max-w-2xl p-0 overflow-hidden relative" onClick={e => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div className="bg-[#4169E1] p-8 text-white flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-24 opacity-10 rotate-12">
                            <UserIcon className="w-64 h-64" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-70">Detailný KPI Pasport</p>
                            <h2 className="text-4xl font-black uppercase tracking-widest leading-none">{selectedWorker.name}</h2>
                        </div>
                        <button onClick={() => setSelectedWorker(null)} className="relative z-10 bg-white/20 hover:bg-white/40 p-2 rounded-full transition-all">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { l: "Quality Index", v: selectedWorker.qi + "%", c: "text-teal-400" },
                                { l: "Efektivita", v: selectedWorker.efficiency + "%", c: getEfficiencyColor(selectedWorker.efficiency) },
                                { l: "Vybavené", v: selectedWorker.count, c: "text-[#4169E1]" },
                                { l: "Chybné", v: selectedWorker.incorrectCount, c: "text-red-500" }
                            ].map(m => (
                                <div key={m.l} className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">{m.l}</p>
                                    <p className={`text-xl font-black ${m.c} tracking-tight`}>{m.v}</p>
                                </div>
                            ))}
                        </div>

                        {/* Work Mix */}
                        <div>
                             <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-l-4 border-teal-500 pl-3">{t('work_mix')}</h3>
                             <div className="flex h-12 w-full rounded-xl overflow-hidden shadow-inner bg-gray-900/50">
                                 {selectedWorker.count > 0 ? (
                                     <>
                                        <div className="bg-teal-500 flex items-center justify-center transition-all hover:brightness-110" style={{ width: `${(selectedWorker.productionCount / selectedWorker.count) * 100}%` }} title="Výroba">
                                            {selectedWorker.productionCount > 0 && <span className="text-[10px] font-black text-black">V</span>}
                                        </div>
                                        <div className="bg-sky-500 flex items-center justify-center transition-all hover:brightness-110" style={{ width: `${(selectedWorker.logisticsCount / selectedWorker.count) * 100}%` }} title="Logistika">
                                            {selectedWorker.logisticsCount > 0 && <span className="text-[10px] font-black text-black">L</span>}
                                        </div>
                                        <div className="bg-[#4169E1] flex items-center justify-center transition-all hover:brightness-110" style={{ width: `${(selectedWorker.inventoryCount / selectedWorker.count) * 100}%` }} title="Inventúra">
                                            {selectedWorker.inventoryCount > 0 && <span className="text-[10px] font-black text-white">I</span>}
                                        </div>
                                     </>
                                 ) : (
                                     <div className="flex-1 flex items-center justify-center text-gray-700 text-xs italic uppercase">Žiadne dáta</div>
                                 )}
                             </div>
                             <div className="flex gap-4 mt-3 text-[9px] font-black uppercase text-gray-500">
                                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-teal-500"></div>Výroba ({selectedWorker.productionCount})</div>
                                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-sky-500"></div>Logistika ({selectedWorker.logisticsCount})</div>
                                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-[#4169E1]"></div>Inventúra ({selectedWorker.inventoryCount})</div>
                             </div>
                        </div>

                        {/* Performance Details */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-l-4 border-yellow-500 pl-3">Efektivita a objem</h3>
                            <div className="space-y-4 bg-gray-900/30 p-6 rounded-2xl border border-gray-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400 font-bold">Celkovo norma minút:</span>
                                    <span className="text-lg font-black text-teal-400 font-mono">{Math.round(selectedWorker.totalStandardMinutes)} min</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400 font-bold">Čistý odpracovaný čas:</span>
                                    <span className="text-lg font-black text-white font-mono">{formatDuration(selectedWorker.totalExecutionMs)}</span>
                                </div>
                                <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
                                    <span className="text-sm text-gray-400 font-bold">Priemerná reakcia:</span>
                                    <span className="text-lg font-black text-yellow-500 font-mono">{formatDuration(selectedWorker.countReaction > 0 ? selectedWorker.totalReactionMs / selectedWorker.countReaction : 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer / Export */}
                    <div className="p-8 bg-gray-900/60 flex flex-col sm:flex-row gap-4 border-t border-gray-700">
                        <button 
                            onClick={() => handleExportWorkerKPI(selectedWorker)}
                            className="flex-1 bg-green-700 hover:bg-green-600 text-white font-black py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3 border-b-4 border-green-900"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            {t('export_worker_kpi')}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};

// Re-using defined icons or creating local ones
const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

export default AnalyticsTab;
