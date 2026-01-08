
import React, { useState, useMemo } from 'react';
import { Task, UserData } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

declare var XLSX: any;

interface LogisticsCenterTabProps {
    tasks: Task[];
    draftTasks: Task[];
    users: UserData[];
    fetchSanons: () => Promise<any[]>;
    onDeleteTask: (id: string) => void;
    hasPermission: (perm: string) => boolean;
    resolveName: (username?: string | null) => string;
}

const Icons = {
    Trash: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    ),
    ArrowDown: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
    ),
    ArrowUp: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
    ),
    Clock: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    Filter: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
    ),
    Stack: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )
};

const LogisticsCenterTab: React.FC<LogisticsCenterTabProps> = ({ tasks, draftTasks, users, fetchSanons, onDeleteTask, hasPermission, resolveName }) => {
    const { t, language } = useLanguage();

    // Filtre - State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [timeFrom, setTimeFrom] = useState('00:00');
    const [timeTo, setTimeTo] = useState('23:59');
    const [selectedUser, setSelectedUser] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [tileFilter, setTileFilter] = useState<'ALL' | 'INBOUND' | 'OUTBOUND' | 'WAITING'>('ALL');

    // Dáta z archívu
    const [historicalData, setHistoricalData] = useState<Task[]>([]);
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);

    // Načítanie šanónov (úspora čítaní - iba na klik)
    const handleLoadArchive = async () => {
        setIsLoadingArchive(true);
        try {
            const sanony = await fetchSanons();
            const allArchived: Task[] = [];
            sanony.forEach(s => {
                if (s.tasks && Array.isArray(s.tasks)) allArchived.push(...s.tasks);
            });
            setHistoricalData(allArchived);
        } catch (e) {
            console.error("Failed to load sanons", e);
        } finally {
            setIsLoadingArchive(false);
        }
    };

    // Agregácia a filtrovanie
    const filteredData = useMemo(() => {
        // Spojenie zdrojov a deduplikácia podľa ID
        const combined = [...tasks, ...draftTasks, ...historicalData];
        const uniqueMap = new Map<string, Task>();
        combined.forEach(item => {
            if (item.isLogistics) uniqueMap.set(item.id, item);
        });
        const logisticsOnly = Array.from(uniqueMap.values());

        // Prevod filtrov na timestampy
        const startLimit = new Date(`${dateFrom}T${timeFrom}`).getTime();
        const endLimit = new Date(`${dateTo}T${timeTo}`).getTime();

        return logisticsOnly.filter(t => {
            const refTime = t.completedAt || t.createdAt || 0;
            
            // 1. Časový rozsah
            if (refTime < startLimit || refTime > endLimit) return false;

            // 2. Užívateľ
            if (selectedUser && t.completedBy !== selectedUser && t.createdBy !== selectedUser) return false;

            // 3. Search query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match = (t.partNumber || '').toLowerCase().includes(q) || 
                              (t.workplace || '').toLowerCase().includes(q) ||
                              (t.note || '').toLowerCase().includes(q);
                if (!match) return false;
            }

            return true;
        }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [tasks, draftTasks, historicalData, dateFrom, dateTo, timeFrom, timeTo, selectedUser, searchQuery]);

    // Sub-filter podľa dlaždíc
    const displayTasks = useMemo(() => {
        if (tileFilter === 'ALL') return filteredData;
        return filteredData.filter(t => {
            const op = (t.workplace || '').toUpperCase();
            if (tileFilter === 'INBOUND') return op.includes('VYKL') || op.includes('UNLOAD') || op.includes('PRÍJEM');
            if (tileFilter === 'OUTBOUND') return op.includes('NAKL') || op.includes('LOAD') || op.includes('EXPED');
            if (tileFilter === 'WAITING') return !t.isDone;
            return true;
        });
    }, [filteredData, tileFilter]);

    // Štatistiky pre dlaždice
    const stats = useMemo(() => {
        let inbound = 0;
        let outbound = 0;
        let waiting = 0;

        filteredData.forEach(t => {
            const qty = parseFloat((t.quantity || '0').replace(',', '.'));
            const op = (t.workplace || '').toUpperCase();
            
            if (!t.isDone) waiting++;
            
            if (op.includes('VYKL') || op.includes('UNLOAD') || op.includes('PRÍJEM')) inbound += qty;
            else if (op.includes('NAKL') || op.includes('LOAD') || op.includes('EXPED')) outbound += qty;
        });

        return { inbound, outbound, waiting, all: filteredData.length };
    }, [filteredData]);

    const formatTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : '-';

    const handleExport = () => {
        if (typeof XLSX === 'undefined') return;
        const data = displayTasks.map(item => ({
            [t('miss_th_created')]: new Date(item.createdAt || 0).toLocaleString('sk-SK'),
            [t('log_th_reference')]: item.partNumber || '-',
            [language === 'sk' ? 'ŠPZ' : 'PLATE']: item.note || '-',
            [t('log_th_operation')]: item.workplace || '-',
            [t('log_th_quantity')]: item.quantity + ' ' + (item.quantityUnit === 'pallet' ? 'pal' : item.quantityUnit),
            [t('log_th_priority')]: item.priority || 'NORMAL',
            [t('status_label')]: item.isDone ? 'DOKONČENÉ' : 'V ČAKANÍ'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Logistika");
        XLSX.writeFile(wb, `Logistika_Filtrovane_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const tileBaseClass = "relative overflow-hidden p-6 rounded-3xl border-2 transition-all cursor-pointer active:scale-95 shadow-xl group";
    const tileActiveRing = "ring-4 ring-white/20 scale-[1.02]";

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in px-2 md:px-0">
            
            {/* HLAVNÝ PANEL OVLÁDANIA */}
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col md:row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-grow md:w-80">
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('task_search_placeholder')}
                                className="w-full h-12 bg-slate-800 border border-slate-700 rounded-2xl px-4 pl-12 text-white focus:ring-2 focus:ring-sky-500 transition-all font-mono uppercase"
                            />
                            <svg className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${isFilterOpen ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <Icons.Filter className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleLoadArchive}
                            disabled={isLoadingArchive || historicalData.length > 0}
                            className={`flex-1 md:flex-none h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${historicalData.length > 0 ? 'bg-slate-800 border-slate-700 text-slate-500 opacity-50' : 'bg-indigo-600 border-indigo-500 text-white shadow-lg hover:bg-indigo-500'}`}
                        >
                            {isLoadingArchive ? '...' : (historicalData.length > 0 ? 'ARCHÍV NAČÍTANÝ' : 'NAČÍTAŤ ARCHÍV')}
                        </button>
                        <button onClick={handleExport} className="flex-1 md:flex-none h-12 bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 border-emerald-500 shadow-lg flex items-center justify-center gap-2">
                            <Icons.ArrowDown className="w-5 h-5" /> EXPORT
                        </button>
                    </div>
                </div>

                {/* ROZBALITEĽNÝ FILTRAČNÝ PANEL */}
                {isFilterOpen && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-800 animate-fade-in">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Dátum Od</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-sky-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Dátum Do</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-sky-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Čas Od</label>
                            <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-sky-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Čas Do</label>
                            <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-sky-500" />
                        </div>
                        <div className="space-y-1 col-span-2 md:col-span-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Užívateľ</label>
                            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-sky-500">
                                <option value="">VŠETCI</option>
                                {users.map(u => <option key={u.username} value={u.username}>{u.nickname || u.username}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* KPI DLAŽDICE (4-grid) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                    onClick={() => setTileFilter('INBOUND')}
                    className={`${tileBaseClass} border-emerald-500/30 bg-emerald-500/10 ${tileFilter === 'INBOUND' ? tileActiveRing : ''}`}
                >
                    <Icons.ArrowDown className={`absolute -right-2 -bottom-2 w-24 h-24 text-emerald-500 opacity-10 group-hover:scale-110 transition-transform`} />
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Príjem / Vykládka</p>
                    <p className="text-4xl font-black text-white">{stats.inbound} <span className="text-sm font-normal text-emerald-600">pal</span></p>
                </div>

                <div 
                    onClick={() => setTileFilter('OUTBOUND')}
                    className={`${tileBaseClass} border-sky-500/30 bg-sky-500/10 ${tileFilter === 'OUTBOUND' ? tileActiveRing : ''}`}
                >
                    <Icons.ArrowUp className={`absolute -right-2 -bottom-2 w-24 h-24 text-sky-500 opacity-10 group-hover:scale-110 transition-transform`} />
                    <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em] mb-1">Expedícia / Nakládka</p>
                    <p className="text-4xl font-black text-white">{stats.outbound} <span className="text-sm font-normal text-sky-600">pal</span></p>
                </div>

                <div 
                    onClick={() => setTileFilter('WAITING')}
                    className={`${tileBaseClass} border-amber-500/30 bg-amber-500/10 ${tileFilter === 'WAITING' ? tileActiveRing : ''}`}
                >
                    <Icons.Clock className={`absolute -right-2 -bottom-2 w-24 h-24 text-amber-500 opacity-10 group-hover:scale-110 transition-transform`} />
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">V čakaní</p>
                    <p className="text-4xl font-black text-white">{stats.waiting} <span className="text-sm font-normal text-amber-600">úloh</span></p>
                </div>

                <div 
                    onClick={() => setTileFilter('ALL')}
                    className={`${tileBaseClass} border-indigo-500/30 bg-indigo-500/10 ${tileFilter === 'ALL' ? tileActiveRing : ''}`}
                >
                    <Icons.Stack className={`absolute -right-2 -bottom-2 w-24 h-24 text-indigo-500 opacity-10 group-hover:scale-110 transition-transform`} />
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Všetko spolu</p>
                    <p className="text-4xl font-black text-white">{stats.all} <span className="text-sm font-normal text-indigo-600">záznamov</span></p>
                </div>
            </div>

            {/* TABUĽKA DÁT */}
            <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar"> 
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                                <th className="py-5 px-6">DÁTUM / ČAS</th>
                                <th className="py-5 px-6">DIEL / REF</th>
                                <th className="py-5 px-6">ŠPZ / POZNÁMKA</th>
                                <th className="py-5 px-6">OPERÁCIA</th>
                                <th className="py-5 px-6 text-center">MNOŽSTVO</th>
                                <th className="py-5 px-6 text-center">STAV</th>
                                {hasPermission('perm_btn_delete') && <th className="py-5 px-6"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {displayTasks.length > 0 ? (
                                displayTasks.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-5 px-6">
                                            <div className="text-xs text-slate-300 font-bold">{new Date(item.completedAt || item.createdAt || 0).toLocaleDateString('sk-SK')}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{formatTime(item.completedAt || item.createdAt)}</div>
                                        </td>
                                        <td className="py-5 px-6 font-mono font-black text-white uppercase tracking-tight">{item.partNumber}</td>
                                        <td className="py-5 px-6 text-xs text-sky-400 font-bold uppercase">{item.note || item.plate || '-'}</td>
                                        <td className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-wide">{item.workplace}</td>
                                        <td className="py-5 px-6 text-center text-sm font-black text-white">
                                            {item.quantity} <span className="text-[10px] font-normal text-slate-600 uppercase">{item.quantityUnit === 'pallet' ? 'pal' : item.quantityUnit}</span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${item.isDone ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'}`}>
                                                {item.isDone ? 'Dokončené' : 'V čakaní'}
                                            </span>
                                        </td>
                                        {hasPermission('perm_btn_delete') && (
                                            <td className="py-5 px-6 text-center">
                                                <button onClick={() => { if(window.confirm(t('miss_delete_confirm'))) onDeleteTask(item.id); }} className="text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 p-2 bg-slate-800 rounded-lg"><Icons.Trash className="w-4 h-4" /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={7} className="py-32 text-center text-slate-700 uppercase font-black tracking-[0.3em] text-xs">Nenašli sa žiadne logistické záznamy</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LogisticsCenterTab;
