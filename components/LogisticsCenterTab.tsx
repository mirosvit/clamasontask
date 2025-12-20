
import React, { useState, useMemo } from 'react';
import { Task } from '../App';
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface LogisticsCenterTabProps {
    tasks: Task[];
    onDeleteTask: (id: string) => void;
    hasPermission: (perm: string) => boolean;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
);

const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const LogisticsCenterTab: React.FC<LogisticsCenterTabProps> = ({ tasks, onDeleteTask, hasPermission }) => {
    const { t, language } = useLanguage();
    const [filterQuery, setFilterQuery] = useState('');
    const [quickFilter, setQuickFilter] = useState<'ALL' | 'INBOUND' | 'OUTBOUND' | 'PENDING'>('ALL');
    
    // Filtrovanie iba LOGISTICKÝCH úloh
    const logisticsTasks = useMemo(() => {
        return tasks.filter(task => task.type === 'logistics').sort((a, b) => {
            const timeA = a.createdAt || 0;
            const timeB = b.createdAt || 0;
            return timeB - timeA; 
        });
    }, [tasks]);

    // Výpočet KPI štatistík
    const stats = useMemo(() => {
        let inbound = 0;
        let outbound = 0;
        let pending = 0;

        logisticsTasks.forEach(task => {
            const qty = parseFloat(task.quantity || '0');
            const op = (task.workplace || '').toUpperCase();
            
            // Logika pre sčítanie Príjmu/Expedície (podľa jednotných prekladových kľúčov)
            if (op.includes('VYKLÁDKA') || op.includes('UNLOADING') || op.includes('PRÍJEM')) {
                inbound += qty;
            } else if (op.includes('NAKLÁDKA') || op.includes('LOADING') || op.includes('EXPEDÍCIA')) {
                outbound += qty;
            }

            if (!task.isDone) {
                pending++;
            }
        });

        return { inbound, outbound, pending };
    }, [logisticsTasks]);

    const filteredItems = useMemo(() => {
        let items = logisticsTasks;

        if (quickFilter === 'INBOUND') {
            items = items.filter(t => (t.workplace || '').toUpperCase().includes('VYKLÁDKA') || (t.workplace || '').toUpperCase().includes('UNLOADING'));
        } else if (quickFilter === 'OUTBOUND') {
            items = items.filter(t => (t.workplace || '').toUpperCase().includes('NAKLÁDKA') || (t.workplace || '').toUpperCase().includes('LOADING'));
        } else if (quickFilter === 'PENDING') {
            items = items.filter(t => !t.isDone);
        }

        if (!filterQuery) return items;
        const q = filterQuery.toLowerCase();
        return items.filter(task => 
            (task.partNumber && task.partNumber.toLowerCase().includes(q)) || 
            (task.workplace && task.workplace.toLowerCase().includes(q)) || 
            (task.createdBy && task.createdBy.toLowerCase().includes(q)) ||
            (task.completedBy && task.completedBy.toLowerCase().includes(q))
        );
    }, [logisticsTasks, filterQuery, quickFilter]);

    const formatTime = (ts?: number) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const getQuantityString = (task: Task) => {
        if (!task.quantity) return '-';
        let unitLabel = task.quantityUnit || '';
        if (unitLabel === 'pcs') unitLabel = t('unit_pcs_short');
        if (unitLabel === 'boxes') unitLabel = t('unit_boxes_short');
        if (unitLabel === 'pallet') unitLabel = t('unit_pallet_short');
        return `${task.quantity} ${unitLabel}`;
    };

    const handleExport = () => {
        if (typeof XLSX === 'undefined') {
            alert('Export library missing.');
            return;
        }
        const data = filteredItems.map(item => ({
            [t('miss_th_created')]: formatTime(item.createdAt),
            [t('miss_th_creator')]: item.createdBy || '-',
            [t('log_th_reference')]: item.partNumber || '-',
            [t('log_th_operation')]: item.workplace || '-',
            [t('log_th_quantity')]: getQuantityString(item),
            [t('log_th_priority')]: item.priority || 'NORMAL',
            [t('log_th_status')]: item.isDone ? t('status_completed') : t('status_open'),
            [t('log_th_completed_by')]: item.completedBy || '-',
            [t('miss_th_when')]: formatTime(item.completedAt)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('log_sheet_name'));
        XLSX.writeFile(wb, `Logisticke_Centrum_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('miss_delete_confirm'))) {
            onDeleteTask(id);
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
            {/* KPI DASHBOARD HEADER */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div onClick={() => setQuickFilter('INBOUND')} className={`cursor-pointer bg-gray-800 p-5 rounded-2xl border transition-all hover:scale-[1.02] ${quickFilter === 'INBOUND' ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-gray-700 shadow-lg'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{language === 'sk' ? 'PRÍJEM (Vykládka)' : 'INBOUND'}</p>
                            <p className="text-3xl font-black text-green-400 mt-1">{stats.inbound} <span className="text-xs font-normal text-gray-500">pal</span></p>
                        </div>
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                            <ArrowDownIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div onClick={() => setQuickFilter('OUTBOUND')} className={`cursor-pointer bg-gray-800 p-5 rounded-2xl border transition-all hover:scale-[1.02] ${quickFilter === 'OUTBOUND' ? 'border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'border-gray-700 shadow-lg'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{language === 'sk' ? 'EXPEDÍCIA (Nakládka)' : 'OUTBOUND'}</p>
                            <p className="text-3xl font-black text-sky-400 mt-1">{stats.outbound} <span className="text-xs font-normal text-gray-500">pal</span></p>
                        </div>
                        <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
                            <ArrowUpIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div onClick={() => setQuickFilter('PENDING')} className={`cursor-pointer bg-gray-800 p-5 rounded-2xl border transition-all hover:scale-[1.02] ${quickFilter === 'PENDING' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-gray-700 shadow-lg'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{language === 'sk' ? 'V ČAKANÍ' : 'PENDING'}</p>
                            <p className="text-3xl font-black text-orange-400 mt-1">{stats.pending} <span className="text-xs font-normal text-gray-500">úloh</span></p>
                        </div>
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                            <ClockIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
                {/* TOOLBAR */}
                <div className="p-4 sm:p-6 bg-gray-900/40 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-grow md:flex-grow-0 md:w-80">
                            <input 
                                type="text" 
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder={t('task_search_placeholder')}
                                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all pl-10"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="hidden sm:flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                            <button onClick={() => setQuickFilter('ALL')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${quickFilter === 'ALL' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>{t('filter_all')}</button>
                            <button onClick={() => setQuickFilter('PENDING')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${quickFilter === 'PENDING' ? 'bg-orange-600/20 text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>{language === 'sk' ? 'Otvorené' : 'Open'}</button>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleExport}
                        className="w-full md:w-auto bg-green-700 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {t('export_excel')}
                    </button>
                </div>

                {/* TABLE SECTION */}
                <div className="overflow-x-auto custom-scrollbar"> 
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-900/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-700">
                                <th className="py-4 px-6">{t('miss_th_created')}</th>
                                <th className="py-4 px-6">{t('log_th_reference')}</th>
                                <th className="py-4 px-6">{t('log_th_operation')}</th>
                                <th className="py-4 px-6 text-center">{t('log_th_quantity')}</th>
                                <th className="py-4 px-6 text-center">{t('log_th_priority')}</th>
                                <th className="py-4 px-6">{t('log_th_status')}</th>
                                <th className="py-4 px-6">{t('log_th_completed_by')}</th>
                                <th className="py-4 px-6 text-right">{t('miss_th_when')}</th>
                                {hasPermission('perm_btn_delete') && <th className="py-4 px-6"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {filteredItems.length > 0 ? (
                                filteredItems.map(item => {
                                    const op = (item.workplace || '').toUpperCase();
                                    const isInbound = op.includes('VYKLÁDKA') || op.includes('UNLOADING');
                                    const isOutbound = op.includes('NAKLÁDKA') || op.includes('LOADING');

                                    return (
                                        <tr key={item.id} className={`transition-all ${item.isDone ? 'opacity-60 bg-gray-900/10' : 'hover:bg-gray-700/30'}`}>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <p className="text-xs text-white font-mono">{formatTime(item.createdAt).split(',')[1]}</p>
                                                <p className="text-[10px] text-gray-500">{formatTime(item.createdAt).split(',')[0]}</p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm font-black font-mono text-white bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700">
                                                    {item.partNumber}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md ${isInbound ? 'bg-green-500/10 text-green-500' : isOutbound ? 'bg-sky-500/10 text-sky-500' : 'bg-gray-700 text-gray-400'}`}>
                                                        {isInbound ? <ArrowDownIcon className="w-4 h-4" /> : isOutbound ? <ArrowUpIcon className="w-4 h-4" /> : <TruckIcon className="w-4 h-4" />}
                                                    </div>
                                                    <span className={`text-xs font-bold uppercase tracking-wide ${isInbound ? 'text-green-400' : isOutbound ? 'text-sky-400' : 'text-gray-300'}`}>
                                                        {item.workplace}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="text-sm font-bold text-white">{getQuantityString(item)}</span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${item.priority === 'URGENT' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-gray-700/30 text-gray-400 border-gray-600/30'}`}>
                                                    {t(item.priority === 'URGENT' ? 'prio_urgent' : item.priority === 'LOW' ? 'prio_low' : 'prio_normal')}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {item.isDone ? (
                                                    <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-bold">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                                                        {t('status_completed')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-orange-400 text-xs font-bold animate-pulse">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                        {t('status_open')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                        {(item.completedBy || item.createdBy || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs text-gray-300 font-medium">{item.completedBy || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right whitespace-nowrap">
                                                <p className="text-[10px] text-gray-500 font-mono">{formatTime(item.completedAt)}</p>
                                            </td>
                                            {hasPermission('perm_btn_delete') && (
                                                <td className="py-4 px-6 text-center">
                                                    <button onClick={() => handleDelete(item.id)} className="text-gray-600 hover:text-red-500 p-2 transition-colors">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={hasPermission('perm_btn_delete') ? 10 : 9} className="py-20 text-center text-gray-600 italic">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
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

// Pomocná komponenta pre Truck ikonu (ak nie je importovaná z App.tsx)
const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
);

export default LogisticsCenterTab;
