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
    onUpdateScrapArchive: (sanonId: string, updates: any) => Promise<void>;
    onDeleteArchivedItem: (sanonId: string, itemId: string) => Promise<void>;
    onDeleteArchive: (id: string) => Promise<void>;
    onDeleteAllArchives?: () => Promise<void>;
    onFetchArchives: (from: string, to: string) => Promise<any[]>;
    resolveName: (username?: string | null) => string;
    hasPermission: (perm: string) => boolean;
}

declare var XLSX: any;
declare var jspdf: any;

const Icons = {
    Archive: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    Edit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    ChevronDown: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
    Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    Download: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    FileText: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    Dollar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Refresh: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    Sort: ({ active, direction }: { active: boolean, direction: 'asc' | 'desc' }) => (
        <svg className={`w-3 h-3 transition-all ${active ? 'text-teal-400' : 'text-slate-600 opacity-30 group-hover:opacity-100'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {active && direction === 'asc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
            ) : active && direction === 'desc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 10l5-5 5 5M7 14l5 5 5-5" />
            )}
        </svg>
    )
};

const ScrapArchiveTab: React.FC<ScrapArchiveTabProps> = (props) => {
    const { t, language } = useLanguage();
    
    // State pre filtre šanónov
    const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // State pre interakciu s položkami
    const [expandedSanonId, setExpandedSanonId] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<{ sanonId: string, item: ScrapRecord } | null>(null);
    const [editGross, setEditGross] = useState('');
    const [editMetalId, setEditMetalId] = useState('');
    const [editBinId, setEditBinId] = useState('');

    // State pre lokálne zoradenie a filtrovanie položiek v detaile
    const [itemSortConfig, setItemSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [itemFilters, setItemFilters] = useState<Record<string, string>>({
        worker: '',
        material: '',
        bin: '',
        netto: ''
    });

    // State pre úpravu ceny odberateľa
    const [isExternalValueModalOpen, setIsExternalValueModalOpen] = useState(false);
    const [targetSanonId, setTargetSanonId] = useState<string | null>(null);
    const [externalValInput, setExternalValInput] = useState('');

    const sortedArchives = useMemo(() => {
        return [...props.scrapArchives].sort((a, b) => {
            const dateA = new Date(a.dispatchDate).getTime();
            const dateB = new Date(b.dispatchDate).getTime();
            return dateB - dateA;
        });
    }, [props.scrapArchives]);

    // Reset filtrov pri prepnutí šanónu
    const handleExpandSanon = (id: string) => {
        if (expandedSanonId === id) {
            setExpandedSanonId(null);
        } else {
            setExpandedSanonId(id);
            setItemSortConfig(null);
            setItemFilters({ worker: '', material: '', bin: '', netto: '' });
        }
    };

    const handleLoadArchives = async () => {
        setIsLoading(true);
        try {
            await props.onFetchArchives(dateFrom, dateTo);
            setHasLoaded(true);
        } finally {
            setIsLoading(false);
        }
    };

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

    const getProcessedItems = (items: ScrapRecord[]) => {
        let result = [...(items || [])];

        // 1. Filtrovanie
        if (itemFilters.worker) {
            const q = itemFilters.worker.toLowerCase();
            result = result.filter(item => props.resolveName(item.worker).toLowerCase().includes(q));
        }
        if (itemFilters.material) {
            const q = itemFilters.material.toLowerCase();
            result = result.filter(item => {
                const metal = props.metals.find(m => m.id === item.metalId);
                return (metal?.type || '').toLowerCase().includes(q);
            });
        }
        if (itemFilters.bin) {
            const q = itemFilters.bin.toLowerCase();
            result = result.filter(item => {
                const bin = props.bins.find(b => b.id === item.binId);
                return (bin?.name || '').toLowerCase().includes(q);
            });
        }
        if (itemFilters.netto) {
            const q = itemFilters.netto.toLowerCase();
            result = result.filter(item => item.netto.toString().includes(q));
        }

        // 2. Zoradenie
        if (itemSortConfig) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (itemSortConfig.key) {
                    case 'time': aVal = a.timestamp; bVal = b.timestamp; break;
                    case 'worker': aVal = props.resolveName(a.worker); bVal = props.resolveName(b.worker); break;
                    case 'material': 
                        aVal = props.metals.find(m => m.id === a.metalId)?.type || ''; 
                        bVal = props.metals.find(m => m.id === b.metalId)?.type || ''; 
                        break;
                    case 'bin': 
                        aVal = props.bins.find(bn => bn.id === a.binId)?.name || ''; 
                        bVal = props.bins.find(bn => bn.id === b.binId)?.name || ''; 
                        break;
                    case 'netto': aVal = a.netto; bVal = b.netto; break;
                    default: return 0;
                }
                if (aVal < bVal) return itemSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return itemSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    };

    const requestItemSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (itemSortConfig && itemSortConfig.key === key && itemSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setItemSortConfig({ key, direction });
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

    const handleOpenExternalValue = (sanon: any) => {
        setTargetSanonId(sanon.id);
        setExternalValInput(String(sanon.externalValue || ''));
        setIsExternalValueModalOpen(true);
    };

    const handleSaveExternalValue = async () => {
        if (!targetSanonId) return;
        await props.onUpdateScrapArchive(targetSanonId, {
            externalValue: parseFloat(externalValInput) || 0
        });
        setIsExternalValueModalOpen(false);
        setTargetSanonId(null);
    };

    const handleDownloadPDF = (archive: any) => {
        if (!archive.items || archive.items.length === 0 || typeof jspdf === 'undefined') return;
        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        // Hlavička
        doc.setFontSize(22); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
        doc.text("CLAMASON SLOVAKIA", 20, 25);
        doc.setFontSize(12); doc.text("DODACI LIST - KOVOVY ODPAD (ARCHIV)", 20, 32);
        
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        const dispatchDateStr = new Date(archive.dispatchDate).toLocaleDateString('sk-SK');
        const finalizedDateStr = new Date(archive.finalizedAt || Date.now()).toLocaleDateString('sk-SK');
        
        doc.text(`Datum expedicie: ${dispatchDateStr}`, 140, 25);
        doc.text(`Datum finalizacie: ${finalizedDateStr}`, 140, 30);
        doc.text(`Zodpovedny: ${props.resolveName(archive.finalizedBy)}`, 140, 35);
        doc.setLineWidth(0.5); doc.line(20, 40, 190, 40);

        const tableBody = archive.items.map((r: ScrapRecord) => {
            const metal = props.metals.find(m => m.id === r.metalId);
            const bin = props.bins.find(b => b.id === r.binId);
            return [
                new Date(r.timestamp).toLocaleDateString('sk-SK'),
                metal?.type || '???',
                bin?.name || '???',
                r.gross.toString(),
                r.tara.toString(),
                r.netto.toString()
            ];
        });

        (doc as any).autoTable({
            startY: 50,
            head: [['Datum vazenia', 'Material', 'Kontajner', 'Brutto (kg)', 'Tara (kg)', 'Netto (kg)']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
        });

        doc.addPage();
        doc.setFontSize(18); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
        doc.text("SUMAR DOKUMENTU (ARCHIV)", 20, 25);
        doc.setLineWidth(0.5); doc.line(20, 30, 190, 30);

        const metalSummaryMap: Record<string, { weight: number, desc: string }> = {};
        archive.items.forEach((r: ScrapRecord) => {
            const metal = props.metals.find(m => m.id === r.metalId);
            const name = metal?.type || 'Neznamy';
            const desc = metal?.description || '';
            if (!metalSummaryMap[name]) metalSummaryMap[name] = { weight: 0, desc };
            metalSummaryMap[name].weight += r.netto;
        });

        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text("SUMAR CISTEJ VAHY PODLA MATERIALU (NETTO):", 20, 45);
        doc.setFont("helvetica", "normal");
        let summaryY = 55;
        Object.entries(metalSummaryMap).forEach(([name, data]) => {
            doc.text(data.desc ? `${name} (${data.desc}):` : `${name}:`, 20, summaryY);
            doc.setFont("helvetica", "bold");
            doc.text(`${data.weight} kg`, 190, summaryY, { align: 'right' });
            doc.setFont("helvetica", "normal");
            summaryY += 8;
        });

        doc.setLineWidth(0.2); doc.line(20, summaryY + 4, 190, summaryY + 4);
        summaryY += 15;
        
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        const totalBrutto = archive.items.reduce((acc: number, curr: ScrapRecord) => acc + curr.gross, 0);
        doc.text(`CELKOVA HMOTNOST BRUTTO:`, 20, summaryY);
        doc.text(`${totalBrutto} kg`, 190, summaryY, { align: 'right' });
        
        summaryY += 8;
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`POCET POLOZIEK CELKOM:`, 20, summaryY);
        doc.text(`${archive.items.length}`, 190, summaryY, { align: 'right' });

        summaryY += 20;
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("DOPLNKOVE INFORMACIE:", 20, summaryY);
        doc.setDrawColor(200, 200, 200); doc.rect(20, summaryY + 4, 170, 25);
        
        summaryY += 50;
        doc.setFontSize(11); doc.setTextColor(0, 0, 0); doc.text(`DATUM EXPEDICIE: ...........................................................`, 20, summaryY);
        
        const signatureY = 240;
        doc.setLineWidth(0.2); doc.line(20, signatureY, 80, signatureY); doc.line(120, signatureY, 180, signatureY);
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("Odovzdal (Clamason Slovakia)", 30, signatureY + 5); doc.text("Prevzal (Dopravca / Sklad)", 135, signatureY + 5);
        
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
            doc.text("Vygenerovane systemom Clamason Task Manager Intelligence - ARCHIV", 105, 285, { align: 'center' });
            doc.text(`Strana ${i} / ${totalPages}`, 190, 285, { align: 'right' });
        }
        
        doc.save(`Dodaci_list_srot_ARCHIV_${archive.dispatchDate}.pdf`);
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
                "Popis materialu": metal?.description || '-',
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
    const filterInputClass = "w-full h-8 bg-slate-950/60 border border-slate-800 rounded-lg px-2 text-[10px] text-white focus:outline-none focus:border-teal-500/50 transition-all uppercase placeholder:text-slate-700 font-bold";

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                    <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                        <Icons.Archive />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{t('scrap_archive_title')}</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">História expedícií a vývozov</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Dátum Od</label>
                            <input 
                                type="date" 
                                value={dateFrom} 
                                onChange={e => setDateFrom(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 transition-all" 
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Dátum Do</label>
                            <input 
                                type="date" 
                                value={dateTo} 
                                onChange={e => setDateTo(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 transition-all" 
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleLoadArchives}
                        disabled={isLoading}
                        className={`w-full md:w-auto h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-3 shadow-lg active:scale-95 ${isLoading ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait' : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-indigo-900/20'}`}
                    >
                        {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icons.Refresh />}
                        {isLoading ? 'NAČÍTAVAM...' : 'NAČÍTAŤ ARCHÍV'}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {!hasLoaded ? (
                    <div className="py-32 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-slate-800/50 rounded-full text-slate-600 animate-pulse"><Icons.Calendar /></div>
                            <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-xs">Zvoľte obdobie a načítajte dáta</p>
                        </div>
                    </div>
                ) : sortedArchives.length > 0 ? (
                    sortedArchives.map(archive => {
                        const isExpanded = expandedSanonId === archive.id;
                        const items = archive.items || [];
                        const processedItems = isExpanded ? getProcessedItems(items) : [];
                        const totalWeight = items.reduce((acc: number, curr: ScrapRecord) => acc + curr.netto, 0);
                        const totalValue = calculateSanonValue(items, archive.dispatchDate);
                        const externalValue = archive.externalValue || 0;
                        const displayDate = new Date(archive.dispatchDate).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        
                        return (
                            <div key={archive.id} className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden transition-all shadow-xl">
                                <div className="flex flex-col md:flex-row items-center w-full">
                                    <button 
                                        onClick={() => handleExpandSanon(archive.id)}
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

                                        <div className="flex items-center gap-8">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">POLOŽIEK</p>
                                                <p className="text-xl font-black text-white font-mono">{items.length}</p>
                                            </div>

                                            <div className="text-center border-l border-white/5 pl-8">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">HMOTNOSŤ</p>
                                                <p className="text-xl font-black text-teal-400 font-mono">{totalWeight} <span className="text-xs font-normal text-slate-600">kg</span></p>
                                            </div>
                                            
                                            <div className="text-center border-l border-white/5 pl-8">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">INTERNÝ ODHAD</p>
                                                <p className="text-xl font-black text-amber-400 font-mono">{totalValue.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-600">€</span></p>
                                            </div>

                                            <div className="text-center border-l border-white/5 pl-8">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">CENA ODBERATEĽA</p>
                                                <p className={`text-xl font-black font-mono ${externalValue > 0 ? 'text-green-500' : 'text-slate-700'}`}>
                                                    {externalValue > 0 ? externalValue.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'} 
                                                    <span className="text-xs font-normal text-slate-600 ml-1">€</span>
                                                </p>
                                            </div>

                                            <div className={`transition-transform duration-300 ml-4 ${isExpanded ? 'rotate-180 text-teal-500' : 'text-slate-600'}`}>
                                                <Icons.ChevronDown />
                                            </div>
                                        </div>
                                    </button>
                                    
                                    <div className="p-4 md:border-l border-slate-800 flex justify-center items-center gap-2 w-full md:w-auto">
                                        {props.hasPermission('perm_scrap_edit') && (
                                            <button 
                                                onClick={() => handleOpenExternalValue(archive)}
                                                className="p-3 bg-amber-900/20 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Zadať cenu od odberateľa"
                                            >
                                                <Icons.Dollar />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDownloadPDF(archive)}
                                            className="p-3 bg-rose-900/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm"
                                            title="Stiahnuť PDF Dodací list"
                                        >
                                            <Icons.FileText />
                                        </button>
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
                                                        <th className="py-4 px-4 min-w-[120px]">
                                                            <button 
                                                                onClick={() => requestItemSort('time')}
                                                                className="flex items-center gap-2 group hover:text-teal-400 transition-colors uppercase tracking-widest"
                                                            >
                                                                Čas váženia <Icons.Sort active={itemSortConfig?.key === 'time'} direction={itemSortConfig?.direction || 'asc'} />
                                                            </button>
                                                        </th>
                                                        <th className="py-4 px-4 min-w-[150px]">
                                                            <div className="space-y-2">
                                                                <button 
                                                                    onClick={() => requestItemSort('worker')}
                                                                    className="flex items-center gap-2 group hover:text-teal-400 transition-colors uppercase tracking-widest"
                                                                >
                                                                    Skladník <Icons.Sort active={itemSortConfig?.key === 'worker'} direction={itemSortConfig?.direction || 'asc'} />
                                                                </button>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="FILTER..." 
                                                                    className={filterInputClass} 
                                                                    value={itemFilters.worker}
                                                                    onChange={e => setItemFilters(prev => ({...prev, worker: e.target.value}))}
                                                                />
                                                            </div>
                                                        </th>
                                                        <th className="py-4 px-4 min-w-[150px]">
                                                            <div className="space-y-2">
                                                                <button 
                                                                    onClick={() => requestItemSort('material')}
                                                                    className="flex items-center gap-2 group hover:text-teal-400 transition-colors uppercase tracking-widest"
                                                                >
                                                                    Materiál <Icons.Sort active={itemSortConfig?.key === 'material'} direction={itemSortConfig?.direction || 'asc'} />
                                                                </button>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="FILTER..." 
                                                                    className={filterInputClass} 
                                                                    value={itemFilters.material}
                                                                    onChange={e => setItemFilters(prev => ({...prev, material: e.target.value}))}
                                                                />
                                                            </div>
                                                        </th>
                                                        <th className="py-4 px-4 min-w-[150px]">
                                                            <div className="space-y-2">
                                                                <button 
                                                                    onClick={() => requestItemSort('bin')}
                                                                    className="flex items-center gap-2 group hover:text-teal-400 transition-colors uppercase tracking-widest"
                                                                >
                                                                    Kontajner <Icons.Sort active={itemSortConfig?.key === 'bin'} direction={itemSortConfig?.direction || 'asc'} />
                                                                </button>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="FILTER..." 
                                                                    className={filterInputClass} 
                                                                    value={itemFilters.bin}
                                                                    onChange={e => setItemFilters(prev => ({...prev, bin: e.target.value}))}
                                                                />
                                                            </div>
                                                        </th>
                                                        <th className="py-4 px-4 text-right min-w-[120px]">
                                                            <div className="space-y-2">
                                                                <button 
                                                                    onClick={() => requestItemSort('netto')}
                                                                    className="flex items-center justify-end gap-2 group hover:text-teal-400 transition-colors uppercase tracking-widest w-full"
                                                                >
                                                                    Netto (kg) <Icons.Sort active={itemSortConfig?.key === 'netto'} direction={itemSortConfig?.direction || 'asc'} />
                                                                </button>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="FILTER..." 
                                                                    className={filterInputClass + " text-right"} 
                                                                    value={itemFilters.netto}
                                                                    onChange={e => setItemFilters(prev => ({...prev, netto: e.target.value}))}
                                                                />
                                                            </div>
                                                        </th>
                                                        {props.hasPermission('perm_scrap_edit') && <th className="py-4 px-4"></th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/30">
                                                    {processedItems.length > 0 ? (
                                                        processedItems.map((item: ScrapRecord) => {
                                                            const metal = props.metals.find(m => m.id === item.metalId);
                                                            const bin = props.bins.find(b => b.id === item.binId);
                                                            return (
                                                                <tr key={item.id} className="text-sm hover:bg-white/[0.01] group">
                                                                    <td className="py-4 px-4 text-slate-500 font-mono">{new Date(item.timestamp).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</td>
                                                                    <td className="py-4 px-4 font-bold text-slate-400 uppercase">{props.resolveName(item.worker)}</td>
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
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="py-10 text-center text-slate-600 italic font-bold uppercase tracking-widest text-xs">
                                                                {items.length > 0 ? "Žiadne položky nevyhovujú filtru" : "V tomto šanóne nie sú žiadne položky"}
                                                            </td>
                                                        </tr>
                                                    )}
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
                        <p className="mt-4 text-slate-600 font-black uppercase tracking-[0.3em] text-sm">Žiadne záznamy pre vybraný filter.</p>
                    </div>
                )}
            </div>

            {/* MODAL: ZADANIE CENY ODBERATEĽA */}
            {isExternalValueModalOpen && createPortal(
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setIsExternalValueModalOpen(false)}>
                    <div className="bg-slate-900 border-2 border-amber-500/50 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                            <Icons.Dollar />
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Cena od odberateľa</h3>
                        <p className="text-sm text-slate-400 font-bold uppercase leading-relaxed mb-8">Zadajte finálnu sumu, ktorú za tento vývoz potvrdil odberateľ.</p>
                        
                        <div className="relative mb-10">
                            <input 
                                type="number" 
                                value={externalValInput} 
                                onChange={e => setExternalValInput(e.target.value)} 
                                className={`${inputClass} !text-4xl text-amber-400`}
                                placeholder="0.00"
                                autoFocus
                            />
                            <span className="absolute right-6 bottom-4 text-xl font-black text-slate-700">€</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setIsExternalValueModalOpen(false)} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all">ZRUŠIŤ</button>
                            <button onClick={handleSaveExternalValue} className="h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-amber-800 shadow-xl transition-all active:scale-95">ULOŽIŤ SUMU</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* EDIT MODAL: POLOŽKA ARCHÍVU */}
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