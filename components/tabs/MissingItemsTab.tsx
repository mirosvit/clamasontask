
import React, { useState, useMemo, useEffect } from 'react';
import { Task } from '../../App';
import { useLanguage } from '../LanguageContext';

declare var XLSX: any;

interface MissingItemsTabProps {
    tasks: Task[];
    onDeleteMissingItem: (id: string) => void;
    hasPermission: (perm: string) => boolean;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>;

const MissingItemsTab: React.FC<MissingItemsTabProps> = ({ tasks, onDeleteMissingItem, hasPermission }) => {
    const { t, language } = useLanguage();
    const [filterQuery, setFilterQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [expandedId, setExpandedId] = useState<string | null>(null);
    
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const missingTasks = useMemo(() => {
        return tasks.filter(task => task.isMissing).sort((a, b) => {
            const timeA = a.completedAt || a.createdAt || 0;
            const timeB = b.completedAt || b.createdAt || 0;
            return timeB - timeA; 
        });
    }, [tasks]);

    const stats = useMemo(() => {
        const now = Date.now();
        const criticalLimit = 120 * 60 * 1000; 
        const criticalCount = missingTasks.filter(t => (now - (t.completedAt || t.createdAt || 0)) > criticalLimit).length;
        
        const reasons: Record<string, number> = {};
        missingTasks.forEach(t => { if(t.missingReason) reasons[t.missingReason] = (reasons[t.missingReason] || 0) + 1; });
        const topReason = Object.entries(reasons).sort((a,b) => b[1] - a[1])[0]?.[0] || '-';

        return {
            total: missingTasks.length,
            critical: criticalCount,
            topReason
        };
    }, [missingTasks]);

    const filteredItems = useMemo(() => {
        if (!filterQuery) return missingTasks;
        const q = filterQuery.toLowerCase();
        return missingTasks.filter(task => 
            (task.partNumber && task.partNumber.toLowerCase().includes(q)) ||
            (task.workplace && task.workplace.toLowerCase().includes(q)) ||
            (task.missingReportedBy && task.missingReportedBy.toLowerCase().includes(q)) ||
            (task.missingReason && task.missingReason.toLowerCase().includes(q)) ||
            (task.createdBy && task.createdBy.toLowerCase().includes(q))
        );
    }, [missingTasks, filterQuery]);

    const formatAgeing = (ts?: number) => {
        if (!ts) return null;
        const diffMs = currentTime - ts;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return t('miss_reported_just_now');
        return t('miss_reported_ago', { min: diffMin });
    };

    const getAgeingColor = (ts?: number) => {
        if (!ts) return 'text-slate-500';
        const diffMin = Math.floor((currentTime - ts) / 60000);
        if (diffMin > 120) return 'text-red-500 font-black animate-pulse';
        if (diffMin > 30) return 'text-orange-400 font-bold';
        return 'text-slate-400';
    };

    const getRowPriorityClass = (ts?: number) => {
        if (!ts) return 'border-transparent';
        const diffMin = Math.floor((currentTime - ts) / 60000);
        if (diffMin > 120) return 'border-l-red-600';
        if (diffMin > 30) return 'border-l-orange-500';
        return 'border-l-teal-500';
    };

    const formatDateShort = (ts?: number) => {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' }) + ' ' + 
               d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
    };

    const handleExport = () => {
        if (typeof XLSX === 'undefined') { alert('Export library missing.'); return; }
        const data = filteredItems.map(item => ({
            "ID": item.id,
            "Part_Number": item.partNumber || '-',
            "Workplace": item.workplace || '-',
            "Created_By": item.createdBy || '-',
            "Created_At": item.createdAt ? new Date(item.createdAt).toLocaleString('sk-SK') : '-',
            "Missing_Reason": item.missingReason || '-',
            "Reported_By": item.missingReportedBy || '-',
            "Reported_At": item.completedAt ? new Date(item.completedAt).toLocaleString('sk-SK') : '-',
            "Audited_By": item.auditedBy || '-',
            "Audited_At": item.auditedAt ? new Date(item.auditedAt).toLocaleString('sk-SK') : '-',
            "Audit_Result": item.auditResult || '-',
            "Audit_Note": item.auditNote || '-'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Raw_Data_Export");
        XLSX.writeFile(wb, `Missing_Items_Full_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('miss_delete_confirm'))) {
            onDeleteMissingItem(id);
        }
    }

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const industrialCardBase = "bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-lg transition-all duration-300 hover:border-slate-700 overflow-hidden relative group";

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in px-2 md:px-0 text-slate-200">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className={industrialCardBase}>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('miss_kpi_total')}</p>
                    <div className="flex items-end justify-between mt-4">
                        <span className="text-4xl font-black text-white">{stats.total}</span>
                        <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400 shadow-inner">
                             <AlertTriangleIcon className="h-8 w-8" />
                        </div>
                    </div>
                </div>

                <div className={`${industrialCardBase} ${stats.critical > 0 ? 'border-red-900/50 ring-2 ring-red-500/10' : ''}`}>
                    {stats.critical > 0 && <div className="absolute inset-0 bg-red-600/5 animate-pulse"></div>}
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">{t('miss_kpi_critical')}</p>
                    <div className="flex items-end justify-between mt-4 relative z-10">
                        <span className={`text-4xl font-black ${stats.critical > 0 ? 'text-red-500' : 'text-slate-600'}`}>{stats.critical}</span>
                        <div className={`p-3 rounded-xl border transition-colors shadow-inner ${stats.critical > 0 ? 'bg-red-500/20 border-red-500/30 text-red-500 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                             <ClockIcon className="h-8 w-8" />
                        </div>
                    </div>
                </div>

                <div className={industrialCardBase}>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('miss_kpi_top_reason')}</p>
                    <div className="flex items-end justify-between mt-4">
                        <span className="text-lg font-black text-amber-400 uppercase tracking-tight truncate max-w-[180px]">{stats.topReason}</span>
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500 shadow-inner">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden ring-1 ring-white/5">
                <div className="p-5 sm:p-8 bg-slate-900/40 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="relative w-full md:w-[450px]">
                        <input 
                            type="text" 
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            placeholder={t('task_search_placeholder')}
                            className="w-full h-12 bg-slate-800 border border-slate-700 rounded-xl px-4 pl-12 text-base text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all font-medium uppercase placeholder-gray-500 shadow-inner"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    
                    <button onClick={handleExport} className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        EXPORT RAW DATA
                    </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar max-h-[750px]"> 
                    <table className="w-full text-left border-collapse min-w-[1100px] table-fixed">
                        <thead className="sticky top-0 z-20 shadow-md">
                            <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                <th className="py-6 px-8 w-[280px]">DIEL & PRACOVISKO</th>
                                <th className="py-6 px-8 w-[250px]">DÔVOD</th>
                                <th className="py-6 px-8 w-[200px]">STARNUTIE</th>
                                <th className="py-6 px-8 w-[180px]">AUDIT VÝSLEDOK</th>
                                <th className="py-6 px-8 w-20"></th>
                                {hasPermission('perm_btn_delete') && <th className="py-6 px-8 w-20"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredItems.length > 0 ? (
                                filteredItems.map(item => {
                                    const reportTime = item.completedAt || item.createdAt || 0;
                                    const isNok = item.auditResult === 'NOK';
                                    const isExpanded = expandedId === item.id;
                                    
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr 
                                                onClick={() => toggleExpand(item.id)}
                                                className={`transition-all cursor-pointer border-l-[6px] ${getRowPriorityClass(reportTime)} ${isNok ? 'bg-red-500/5' : 'hover:bg-teal-500/[0.04]'}`}
                                            >
                                                <td className="py-6 px-8">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-base font-black font-mono text-white bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-700 w-fit shadow-md uppercase tracking-wide">
                                                            {item.partNumber}
                                                        </span>
                                                        <span className="text-xs font-black text-teal-400 uppercase tracking-[0.15em]">
                                                            {item.workplace}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-6 px-8">
                                                    <span className="text-base font-black text-amber-500 tracking-tight leading-snug block">
                                                        {item.missingReason}
                                                    </span>
                                                </td>

                                                <td className="py-6 px-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${getAgeingColor(reportTime).includes('red') ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-teal-500'}`}></div>
                                                        <span className={`text-sm font-black uppercase tracking-widest ${getAgeingColor(reportTime)}`}>
                                                            {formatAgeing(reportTime)}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-6 px-8">
                                                    {item.auditResult ? (
                                                        <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit border-2 ${item.auditResult === 'OK' ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-inner' : 'bg-red-600/10 text-red-500 border-red-600/20 shadow-inner'}`}>
                                                            {item.auditResult}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-600 font-bold uppercase tracking-widest opacity-40 italic">Čaká na audit</span>
                                                    )}
                                                </td>

                                                <td className="py-6 px-8 text-center">
                                                    <ChevronDownIcon className={`w-6 h-6 text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-teal-500' : ''}`} />
                                                </td>

                                                {hasPermission('perm_btn_delete') && (
                                                    <td className="py-6 px-8 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => handleDelete(item.id)} className="text-slate-700 hover:text-red-500 p-3 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-90 bg-slate-800/50 rounded-xl">
                                                            <TrashIcon className="h-6 w-6" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>

                                            {isExpanded && (
                                                <tr className="bg-slate-950/40 border-l-[6px] border-slate-800 animate-fade-in shadow-inner">
                                                    <td colSpan={hasPermission('perm_btn_delete') ? 6 : 5} className="p-10">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                                            
                                                            <div className="space-y-6">
                                                                <h4 className="text-xs font-black text-teal-500 uppercase tracking-[0.25em] border-b-2 border-teal-900/50 pb-3">História záznamu</h4>
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vytvoril (Zadal):</p>
                                                                        <p className="text-base font-black text-slate-200 uppercase">{item.createdBy || '-'}</p>
                                                                        <p className="text-xs text-slate-500 font-mono italic">{formatDateShort(item.createdAt)}</p>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nahlásil (Missing):</p>
                                                                        <p className="text-base font-black text-slate-200 uppercase">{item.missingReportedBy || '-'}</p>
                                                                        <p className="text-xs text-slate-500 font-mono italic">{formatDateShort(item.completedAt)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.25em] border-b-2 border-amber-900/50 pb-3">Detail auditu</h4>
                                                                {item.auditedBy ? (
                                                                    <div className="space-y-5">
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="space-y-2">
                                                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Audítor:</p>
                                                                                <p className="text-base font-black text-amber-400 uppercase tracking-tight">{item.auditedBy}</p>
                                                                                <p className="text-xs text-slate-500 font-mono italic">{formatDateShort(item.auditedAt || 0)}</p>
                                                                            </div>
                                                                            <div className={`px-6 py-3 rounded-2xl border-2 font-black text-sm tracking-[0.2em] shadow-lg ${item.auditResult === 'OK' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                                                                                AUDIT {item.auditResult}
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-inner">
                                                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Interná poznámka:</p>
                                                                            <p className="text-sm text-slate-300 italic font-medium leading-relaxed">
                                                                                {item.auditNote || 'Bez poznámky'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                                                        <ClockIcon className="w-10 h-10 text-slate-800 mb-3" />
                                                                        <p className="text-xs text-slate-700 font-black uppercase tracking-[0.15em]">Tento záznam ešte nebol auditovaný</p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={hasPermission('perm_btn_delete') ? 6 : 5} className="py-40 text-center text-slate-600">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="p-8 bg-slate-900 rounded-full border-2 border-slate-800 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-2xl font-black text-slate-700 uppercase tracking-[0.3em]">{language === 'sk' ? 'VŠETKO KOMPLETNÉ' : 'ALL CLEAR'}</h4>
                                                <p className="text-xs font-bold text-slate-800 uppercase tracking-widest">{t('no_data')}</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="bg-slate-950 p-5 px-8 border-t border-slate-800 flex justify-between items-center shadow-inner">
                    <span className="text-[11px] text-slate-600 font-black uppercase tracking-widest">{filteredItems.length} {language === 'sk' ? 'POLOŽIEK NÁJDENÝCH' : 'ITEMS FOUND'}</span>
                    <span className="text-[11px] text-slate-700 font-mono italic">Industrial Deep Tracker • v1.4 Tablet Optimized</span>
                </div>
            </div>
        </div>
    );
};

export default MissingItemsTab;
