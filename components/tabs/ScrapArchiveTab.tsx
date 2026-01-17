import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ScrapRecord, ScrapBin, ScrapMetal, ScrapPrice } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface ScrapArchiveTabProps {
    scrapArchives: any[];
    bins: ScrapBin[];
    metals: ScrapMetal[];
    prices: ScrapPrice[];
    onUpdateArchivedItem: (sanonId: string, itemId: string, updates: Partial<ScrapRecord>) => Promise<void>;
    onDeleteArchivedItem: (sanonId: string, itemId: string) => Promise<void>;
    onDeleteArchive: (id: string) => Promise<void>;
    resolveName: (username?: string | null) => string;
    hasPermission: (perm: string) => boolean;
}

declare var XLSX: any;

const Icons = {
    Archive: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    Edit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    ChevronDown: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
    Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    Download: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
};

const ScrapArchiveTab: React.FC<ScrapArchiveTabProps> = (props) => {
    const { t, language } = useLanguage();
    const [expandedSanonId, setExpandedSanonId] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<{ sanonId: string, item: ScrapRecord } | null>(null);
    const [editGross, setEditGross] = useState('');
    const [editMetalId, setEditMetalId] = useState('');
    const [editBinId, setEditBinId] = useState('');

    const sortedArchives = useMemo(() => {
        return [...props.scrapArchives].sort((a, b) => {
            const dateA = new Date(a.dispatchDate).getTime();
            const dateB = new Date(b.dispatchDate).getTime();
            return dateB - dateA;
        });
    }, [props.scrapArchives]);

    // Pomocná funkcia na výpočet hodnoty šanónu
    const calculateSanonValue = (items: ScrapRecord[], dispatchDate: string) => {
        const dateObj = new Date(dispatchDate);
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        
        return items.reduce((acc, item) => {
            const priceObj = props.prices.find(p => p.metalId === item.metalId && p.month === month && p.year === year);
            const price = priceObj?.price || 0;
            return acc + (item.netto * price);
        }, 0);
    };

    const handleOpenEdit = (sanonId: string, item: ScrapRecord) => {
        setEditingItem({ sanonId, item });
        setEditGross(String(item.gross));
        setEditMetalId(item.metalId);
        setEditBinId(item.binId);
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        const bin = props.bins.find(b => b.id === editBinId);
        const grossVal = parseFloat(editGross) || 0;
        const taraVal = bin ? bin.tara : 0;
        
        await props.onUpdateArchivedItem(editingItem.sanonId, editingItem.item.id, {
            metalId: editMetalId,
            binId: editBinId,
            gross: grossVal,
            tara: taraVal,
            netto: Math.max(grossVal - taraVal, 0)
        });
        setEditingItem(null);
    };

    const handleExportSanon = (archive: any) => {
        if (typeof XLSX === 'undefined') return;

        const data = (archive.items || []).map((item: ScrapRecord) => {
            const metal = props.metals.find(m => m.id === item.metalId);
            const bin = props.bins.find(b => b.id === item.binId);
            return {
                "Datum expedicie": new Date(archive.dispatchDate).toLocaleDateString('sk-SK'),
                "Datum vazenia": new Date(item.timestamp).toLocaleDateString('sk-SK'),
                "Cas vazenia": new Date(item.timestamp).toLocaleTimeString('sk-SK'),
                "Material": metal?.type || '???',
                "Kontajner": bin?.name || '???',
                "Brutto (kg)": item.gross,
                "Tara (kg)": item.tara,
                "Netto (kg)": item.netto,
                "Vystavil (Worker)": props.resolveName(item.worker)
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Export");
        XLSX.writeFile(wb, `Srot_Export_${archive.id}_${archive.dispatchDate}.xlsx`);
    };

    const handleConfirmDeleteSanon = (id: string, date: string) => {
        const msg = language === 'sk' 
            ? `Naozaj chcete vymazať celý archívny šanón zo dňa ${date}? Táto akcia je nevratná.` 
            : `Are you sure you want to delete the entire archive from ${date}? This action is irreversible.`;
        if (window.confirm(msg)) {
            props.onDeleteArchive(id);
        }
    };

    const handleConfirmDeleteItem = (sanonId: string, itemId: string) => {
        const msg = language === 'sk' 
            ? "Naozaj chcete vymazať túto položku z archívu?" 
            : "Are you sure you want to delete this item from the archive?";
        if (window.confirm(msg)) {
            props.onDeleteArchivedItem(sanonId, itemId);
        }
    };

    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
    const inputClass = "w-full h-14 bg-slate-900/80 border-2 border-slate-700 rounded-xl px-4 text-white text-lg font-black focus:outline-none focus:border-teal-500/50 transition-all font-mono uppercase text-center";

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                    <Icons.Archive />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{t('scrap_archive_title')}</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">História expedícií a vývozov</p>
                </div>
            </div>

            <div className="space-y-4">
                {sortedArchives.length > 0 ? (
                    sortedArchives.map(archive => {
                        const isExpanded = expandedSanonId === archive.id;
                        const items = archive.items || [];
                        const totalWeight = items.reduce((acc: number, curr: ScrapRecord) => acc + curr.netto, 0);
                        const totalValue = calculateSanonValue(items, archive.dispatchDate);
                        const displayDate = new Date(archive.dispatchDate).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        
                        return (
                            <div key={archive.id} className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden transition-all shadow-xl">
                                <div className="flex flex-col md:flex-row items-center w-full">
                                    <button 
                                        onClick={() => setExpandedSanonId(isExpanded ? null : archive.id)}
                                        className="flex-grow p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="p-3 bg-slate-800 rounded-xl text-slate-400">
                                                <Icons.Calendar />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-lg font-black text-white uppercase tracking-tight">{displayDate}</p>
                                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{archive.id}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">HMOTNOSŤ</p>
                                                <p className="text-xl font-black text-teal-400 font-mono">{totalWeight} <span className="text-xs font-normal text-slate-600">kg</span></p>
                                            </div>
                                            
                                            {/* NOVÝ BLOK: HODNOTA */}
                                            <div className="text-center border-l border-white/5 pl-10">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">ODHADOVANÁ HODNOTA</p>
                                                <p className="text-xl font-black text-amber-400 font-mono">{totalValue.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-600">€</span></p>
                                            </div>

                                            <div className="text-center border-l border-white/5 pl-10">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">VYSTAVIL</p>
                                                <p className="text-xs font-bold text-slate-300 uppercase">{props.resolveName(archive.finalizedBy)}</p>
                                            </div>
                                            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-teal-500' : 'text-slate-600'}`}>
                                                <Icons.ChevronDown />
                                            </div>
                                        </div>
                                    </button>
                                    
                                    <div className="p-4 md:border-l border-slate-800 flex justify-center items-center gap-2 w-full md:w-auto">
                                        <button 
                                            onClick={() => handleExportSanon(archive)}
                                            className="p-3 bg-emerald-900/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm"
                                            title="Export do Excelu"
                                        >
                                            <Icons.Download />
                                        </button>
                                        {props.hasPermission('perm_scrap_edit') && (
                                            <button 
                                                onClick={() => handleConfirmDeleteSanon(archive.id, displayDate)}
                                                className="p-3 bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Vymazať celý šanón"
                                            >
                                                <Icons.Trash />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-6 pt-0 border-t border-slate-800/50 animate-fade-in bg-slate-950/20">
                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-800">
                                                        <th className="py-4 px-4">Čas váženia</th>
                                                        <th className="py-4 px-4">Materiál</th>
                                                        <th className="py-4 px-4">Kontajner</th>
                                                        <th className="py-4 px-4 text-right">Netto (kg)</th>
                                                        {props.hasPermission('perm_scrap_edit') && <th className="py-4 px-4"></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/30">
                                                    {(archive.items || []).map((item: ScrapRecord) => {
                                                        const metal = props.metals.find(m => m.id === item.metalId);
                                                        const bin = props.bins.find(b => b.id === item.binId);
                                                        return (
                                                            <tr key={item.id} className="text-sm hover:bg-white/[0.01] group">
                                                                <td className="py-4 px-4 text-slate-500 font-mono">{new Date(item.timestamp).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</td>
                                                                <td className="py-4 px-4 font-bold text-slate-300 uppercase">{metal?.type || '???'}</td>
                                                                <td className="py-4 px-4 text-slate-500 uppercase">{bin?.name || '???'}</td>
                                                                <td className="py-4 px-4 text-right font-black text-white font-mono">{item.netto} kg</td>
                                                                {props.hasPermission('perm_scrap_edit') && (
                                                                    <td className="py-4 px-4 text-right">
                                                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button 
                                                                                onClick={() => handleOpenEdit(archive.id, item)}
                                                                                className="p-2 bg-slate-800 text-teal-500 hover:text-white hover:bg-teal-600 rounded-lg transition-all"
                                                                            >
                                                                                <Icons.Edit />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleConfirmDeleteItem(archive.id, item.id)}
                                                                                className="p-2 bg-slate-800 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all"
                                                                            >
                                                                                <Icons.Trash />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="py-32 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800">
                        <Icons.Archive />
                        <p className="mt-4 text-slate-600 font-black uppercase tracking-[0.3em] text-sm">{t('scrap_archive_empty')}</p>
                    </div>
                )}
            </div>

            {/* EDIT MODAL */}
            {editingItem && createPortal(
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setEditingItem(null)}>
                    <div className="bg-slate-900 border-2 border-teal-500/50 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <Icons.Edit /> UPRAVIŤ ARCHÍV
                        </h3>
                        
                        <div className="space-y-6 mb-10">
                            <div>
                                <label className={labelClass}>{t('scrap_metal_select')}</label>
                                <select value={editMetalId} onChange={e => setEditMetalId(e.target.value)} className={inputClass}>
                                    {props.metals.map(m => <option key={m.id} value={m.id}>{m.type}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>{t('scrap_bin_select')}</label>
                                <select value={editBinId} onChange={e => setEditBinId(e.target.value)} className={inputClass}>
                                    {props.bins.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>{t('scrap_gross')}</label>
                                <input type="number" value={editGross} onChange={e => setEditGross(e.target.value)} className={`${inputClass} !text-3xl text-teal-400`} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setEditingItem(null)} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all">ZRUŠIŤ</button>
                            <button onClick={handleSaveEdit} className="h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-teal-800 shadow-xl transition-all active:scale-95">ULOŽIŤ ZMENY</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ScrapArchiveTab;