
import React, { useState, useMemo, useEffect } from 'react';
import { Task } from '../../App';
import { useLanguage } from '../LanguageContext';

declare var XLSX: any;

interface MissingItemsTabProps {
    tasks: Task[];
    onDeleteMissingItem: (id: string) => void;
    hasPermission: (perm: string) => boolean;
    resolveName: (username?: string | null) => string;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>;
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;

const MissingItemsTab: React.FC<MissingItemsTabProps> = ({ tasks, onDeleteMissingItem, hasPermission, resolveName }) => {
    const { t, language } = useLanguage();
    const [filterQuery, setFilterQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showOkAudits, setShowOkAudits] = useState(false);
    
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const missingTasks = useMemo(() => {
        return tasks.filter(task => {
            const isActiveMissing = task.isMissing === true;
            const isOkAudit = task.auditResult === 'OK';
            return isActiveMissing || (showOkAudits && isOkAudit);
        }).sort((a, b) => {
            const timeA = a.completedAt || a.createdAt || 0;
            const timeB = b.completedAt || b.createdAt || 0;
            return timeB - timeA; 
        });
    }, [tasks, showOkAudits]);

    const filteredItems = useMemo(() => {
        if (!filterQuery) return missingTasks;
        const q = filterQuery.toLowerCase();
        return missingTasks.filter(task => 
            (task.partNumber && task.partNumber.toLowerCase().includes(q)) ||
            (task.workplace && task.workplace.toLowerCase().includes(q)) ||
            (task.missingReportedBy && task.missingReportedBy.toLowerCase().includes(q)) ||
            (task.missingReason && task.missingReason.toLowerCase().includes(q))
        );
    }, [missingTasks, filterQuery]);

    const formatAgeing = (ts?: number, isAudited?: boolean) => {
        if (isAudited) return language === 'sk' ? 'Auditované' : 'Audited';
        if (!ts) return null;
        const diffMs = currentTime - ts;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return t('miss_reported_just_now');
        return t('miss_reported_ago', { min: diffMin });
    };

    const getAgeingColor = (ts?: number, isAudited?: boolean) => {
        if (isAudited) return 'text-slate-500 font-bold';
        if (!ts) return 'text-slate-500';
        const diffMin = Math.floor((currentTime - ts) / 60000);
        if (diffMin > 120) return 'text-red-500 font-black animate-pulse';
        if (diffMin > 30) return 'text-orange-400 font-bold';
        return 'text-slate-400';
    };

    const getRowClass = (item: Task) => {
        const isOk = item.auditResult === 'OK';
        const reportTime = item.completedAt || item.createdAt || 0;
        let base = "transition-all cursor-pointer border-l-[6px] ";
        
        if (isOk) return base + "border-l-green-500 bg-green-500/5 opacity-70 hover:opacity-100 hover:bg-green-500/10";
        if (item.auditResult === 'NOK') return base + "border-l-slate-700 opacity-80 bg-slate-900/20";
        
        const diffMin = Math.floor((currentTime - reportTime) / 60000);
        if (diffMin > 120) return base + "border-l-red-600 hover:bg-teal-500/[0.04]";
        if (diffMin > 30) return base + "border-l-orange-500 hover:bg-teal-500/[0.04]";
        return base + "border-l-teal-500 hover:bg-teal-500/[0.04]";
    };

    const formatDateShort = (ts?: number) => {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' }) + ' ' + 
               d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in px-2 md:px-0 text-slate-200">
            <div className="bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden ring-1 ring-white/5">
                <div className="p-5 sm:p-8 bg-slate-900/40 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-[350px]">
                            <input 
                                type="text" 
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder={t('task_search_placeholder')}
                                className="w-full h-12 bg-slate-800 border border-slate-700 rounded-xl px-4 pl-12 text-base text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all font-medium uppercase placeholder-gray-500 shadow-inner"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <button 
                            onClick={() => setShowOkAudits(!showOkAudits)}
                            className={`h-12 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${showOkAudits ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                        >
                            {showOkAudits && <CheckIcon className="w-4 h-4" />}
                            {language === 'sk' ? 'Zobraziť OK audity' : 'Show OK audits'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar max-h-[750px]"> 
                    <table className="w-full text-left border-collapse min-w-[1100px] table-fixed">
                        <thead className="sticky top-0 z-20 shadow-md">
                            <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                <th className="py-6 px-8 w-[280px]">DIEL & PRACOVISKO</th>
                                <th className="py-6 px-8 w-[350px]">HLÁSENIE (DÔVOD & AGEING)</th>
                                <th className="py-6 px-8 w-[180px] text-center">VÝSLEDOK AUDITU</th>
                                <th className="py-6 px-8 w-20"></th>
                                {hasPermission('perm_btn_delete') && <th className="py-6 px-8 w-20"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredItems.length > 0 ? (
                                filteredItems.map(item => {
                                    const reportTime = item.completedAt || item.createdAt || 0;
                                    const isAudited = !!item.auditResult;
                                    const isOk = item.auditResult === 'OK';
                                    const isExpanded = expandedId === item.id;
                                    
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr onClick={() => setExpandedId(isExpanded ? null : item.id)} className={getRowClass(item)}>
                                                <td className="py-6 px-8">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-base font-black font-mono text-white bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-700 w-fit shadow-md uppercase tracking-wide">
                                                            {item.partNumber}
                                                        </span>
                                                        <span className="text-[10px] font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 uppercase tracking-[0.15em] w-fit">
                                                            {item.workplace}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-6 px-8">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={`text-base font-black tracking-tight leading-snug ${isOk ? 'text-slate-500' : 'text-amber-500'}`}>
                                                            {item.missingReason}
                                                        </span>
                                                        <div className="flex items-center gap-2.5">
                                                            {!isAudited && (
                                                                <div className={`w-2 h-2 rounded-full ${Math.floor((currentTime - reportTime)/60000) > 120 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-teal-500'}`}></div>
                                                            )}
                                                            {isOk && <CheckIcon className="w-3 h-3 text-green-500" />}
                                                            <span className={`text-[11px] font-black uppercase tracking-widest ${getAgeingColor(reportTime, isAudited)}`}>
                                                                {formatAgeing(reportTime, isAudited)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-6 px-8 text-center">
                                                    {item.auditResult ? (
                                                        <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block border-2 ${item.auditResult === 'OK' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                                                            {item.auditResult}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest opacity-40 italic">Čaká na audit</span>
                                                    )}
                                                </td>

                                                <td className="py-6 px-8 text-center">
                                                    <ChevronDownIcon className={`w-6 h-6 text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-teal-500' : ''}`} />
                                                </td>

                                                {hasPermission('perm_btn_delete') && (
                                                    <td className="py-6 px-8 text-center" onClick={(e) => { e.stopPropagation(); if (window.confirm(t('miss_delete_confirm'))) onDeleteMissingItem(item.id); }}>
                                                        <button className="text-slate-700 hover:text-red-500 p-3 transition-all bg-slate-800/50 rounded-xl group-hover:opacity-100">
                                                            <TrashIcon className="h-6 w-6" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>

                                            {isExpanded && (
                                                <tr className="bg-slate-950/40 border-l-[6px] border-slate-800 animate-fade-in shadow-inner">
                                                    <td colSpan={hasPermission('perm_btn_delete') ? 5 : 4} className="p-10">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                                            <div className="space-y-6">
                                                                <h4 className="text-xs font-black text-teal-500 uppercase tracking-[0.25em] border-b-2 border-teal-900/50 pb-3">História záznamu</h4>
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vytvoril (Zadal):</p>
                                                                        <p className="text-base font-black text-slate-200 uppercase truncate">{resolveName(item.createdBy)}</p>
                                                                        <p className="text-xs text-slate-500 font-mono italic">{formatDateShort(item.createdAt)}</p>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nahlásil (Missing):</p>
                                                                        <p className="text-base font-black text-slate-200 uppercase truncate">{resolveName(item.missingReportedBy)}</p>
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
                                                                                <p className="text-base font-black text-amber-400 uppercase truncate">{resolveName(item.auditedBy)}</p>
                                                                                <p className="text-xs text-slate-500 font-mono italic">{formatDateShort(item.auditedAt || 0)}</p>
                                                                            </div>
                                                                            <div className={`px-6 py-3 rounded-2xl border-2 font-black text-sm tracking-[0.2em] shadow-lg ${item.auditResult === 'OK' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                                                                                AUDIT {item.auditResult}
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-inner">
                                                                            <p className="text-sm text-slate-300 italic">{item.auditNote || 'Bez poznámky'}</p>
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
                                <tr><td colSpan={hasPermission('perm_btn_delete') ? 5 : 4} className="py-40 text-center text-slate-600 uppercase tracking-widest font-black">Žiadne položky na zobrazenie</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MissingItemsTab;
