
import React, { useState, useMemo, useEffect } from 'react';
import { Task } from '../App';
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface MissingItemsTabProps {
    tasks: Task[];
    onDeleteMissingItem: (id: string) => void;
    hasPermission: (perm: string) => boolean;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const MissingItemsTab: React.FC<MissingItemsTabProps> = ({ tasks, onDeleteMissingItem, hasPermission }) => {
    const { t, language } = useLanguage();
    const [filterQuery, setFilterQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now());
    
    // Živý update pre Ageing každú minútu
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
        const criticalLimit = 120 * 60 * 1000; // 2 hodiny
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
        if (!ts) return 'text-gray-500';
        const diffMin = Math.floor((currentTime - ts) / 60000);
        if (diffMin > 120) return 'text-red-500 font-black animate-pulse';
        if (diffMin > 30) return 'text-orange-400 font-bold';
        return 'text-gray-400';
    };

    const formatTime = (ts?: number) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleString('sk-SK', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'});
    };

    const handleExport = () => {
        if (typeof XLSX === 'undefined') {
            alert('Export library missing.');
            return;
        }
        const data = filteredItems.map(item => ({
            [t('miss_th_created')]: formatTime(item.createdAt),
            [t('miss_th_creator')]: item.createdBy || '-',
            [t('miss_th_part')]: item.partNumber || '-',
            [t('miss_th_wp')]: item.workplace || '-',
            [t('miss_th_reason')]: item.missingReason || '-',
            [t('miss_th_who')]: item.missingReportedBy || '-',
            [t('miss_th_when')]: formatTime(item.completedAt)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('missing_items_sheet_name'));
        XLSX.writeFile(wb, `Missing_Items_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('miss_delete_confirm'))) {
            onDeleteMissingItem(id);
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
            
            {/* KPI DASHBOARD CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl flex flex-col justify-between">
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('miss_kpi_total')}</p>
                    <div className="flex items-end justify-between mt-2">
                        <span className="text-4xl font-black text-white">{stats.total}</span>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 4-8-4" /></svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 p-5 rounded-2xl border border-red-900/50 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('miss_kpi_critical')}</p>
                    <div className="flex items-end justify-between mt-2 relative z-10">
                        <span className={`text-4xl font-black ${stats.critical > 0 ? 'text-red-500' : 'text-gray-400'}`}>{stats.critical}</span>
                        <div className={`p-2 rounded-lg ${stats.critical > 0 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-gray-700 text-gray-500'}`}>
                             <ClockIcon className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl flex flex-col justify-between">
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('miss_kpi_top_reason')}</p>
                    <div className="flex items-end justify-between mt-2">
                        <span className="text-lg font-bold text-teal-400 truncate max-w-[200px] leading-tight">{stats.topReason}</span>
                        <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN LIST SECTION */}
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
                <div className="p-6 bg-gray-900/40 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <input 
                            type="text" 
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            placeholder={t('task_search_placeholder')}
                            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all pl-10"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    
                    <button 
                        onClick={handleExport}
                        className="w-full md:w-auto bg-green-700 hover:bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {t('export_excel')}
                    </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar"> 
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-900/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-700">
                                <th className="py-4 px-6">{t('miss_th_part')}</th>
                                <th className="py-4 px-6">{t('miss_th_wp')}</th>
                                <th className="py-4 px-6">{t('miss_th_reason')}</th>
                                <th className="py-4 px-6">{t('miss_th_who')}</th>
                                <th className="py-4 px-6">Starnutie (Ageing)</th>
                                <th className="py-4 px-6 text-right">{t('miss_th_when')}</th>
                                {hasPermission('perm_btn_delete') && <th className="py-4 px-6"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {filteredItems.length > 0 ? (
                                filteredItems.map(item => {
                                    const reportTime = item.completedAt || item.createdAt || 0;
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-700/30 transition-all group">
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black font-mono text-white bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 w-fit">
                                                        {item.partNumber}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{t('miss_th_creator')}: {item.createdBy}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-xs font-black text-teal-400 uppercase tracking-wide px-2 py-1 rounded bg-teal-500/10 border border-teal-500/20">
                                                    {item.workplace}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-xs text-red-300 font-semibold italic">
                                                    "{item.missingReason}"
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                        {(item.missingReportedBy || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs text-gray-300 font-medium">{item.missingReportedBy}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${getAgeingColor(reportTime).includes('red') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : getAgeingColor(reportTime).includes('orange') ? 'bg-orange-500' : 'bg-gray-600'}`}></div>
                                                    <span className={`text-xs font-mono ${getAgeingColor(reportTime)}`}>
                                                        {formatAgeing(reportTime)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right whitespace-nowrap">
                                                <p className="text-xs text-gray-400 font-mono">{formatTime(reportTime)}</p>
                                            </td>
                                            {hasPermission('perm_btn_delete') && (
                                                <td className="py-4 px-6 text-center">
                                                    <button onClick={() => handleDelete(item.id)} className="text-gray-600 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={hasPermission('perm_btn_delete') ? 7 : 6} className="py-20 text-center text-gray-600 italic">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            {t('no_data')}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MissingItemsTab;
