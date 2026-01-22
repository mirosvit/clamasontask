import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScrapRecord, ScrapBin, ScrapMetal, ScrapPrice } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface ScrapWarehouseTabProps {
    currentUser: string;
    actualScrap: ScrapRecord[];
    bins: ScrapBin[];
    metals: ScrapMetal[];
    prices: ScrapPrice[];
    onDeleteRecord: (id: string) => Promise<void>;
    onUpdateRecord: (id: string, updates: Partial<ScrapRecord>) => Promise<void>;
    onExpedite: (worker: string, dispatchDate: string) => Promise<string | undefined>;
    resolveName: (username?: string | null) => string;
}

declare var jspdf: any;

const Icons = {
    Dispatch: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Edit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
    Box: () => <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    FileText: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    Alert: () => <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    Check: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>,
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

const ScrapWarehouseTab: React.FC<ScrapWarehouseTabProps> = (props) => {
    const { t, language } = useLanguage();
    
    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Modals state
    const [isExpediteModalOpen, setIsExpediteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeliveryNoteModalOpen, setIsDeliveryNoteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeliveryNoteGenerated, setIsDeliveryNoteGenerated] = useState(false);
    
    const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);

    const [editingItem, setEditingItem] = useState<ScrapRecord | null>(null);
    const [editGross, setEditGross] = useState('');
    const [editMetalId, setEditMetalId] = useState('');
    const [editBinId, setEditBinId] = useState('');

    useEffect(() => {
        setIsDeliveryNoteGenerated(false);
    }, [props.actualScrap.length]);

    // SORTING LOGIC
    const sortedScrap = useMemo(() => {
        let items = [...props.actualScrap];
        if (sortConfig !== null) {
            items.sort((a, b) => {
                let aVal: any;
                let bVal: any;

                switch (sortConfig.key) {
                    case 'time':
                        aVal = a.timestamp;
                        bVal = b.timestamp;
                        break;
                    case 'worker':
                        aVal = props.resolveName(a.worker).toLowerCase();
                        bVal = props.resolveName(b.worker).toLowerCase();
                        break;
                    case 'metal':
                        aVal = (props.metals.find(m => m.id === a.metalId)?.type || '').toLowerCase();
                        bVal = (props.metals.find(m => m.id === b.metalId)?.type || '').toLowerCase();
                        break;
                    case 'bin':
                        aVal = (props.bins.find(bin => bin.id === a.binId)?.name || '').toLowerCase();
                        bVal = (props.bins.find(bin => bin.id === b.binId)?.name || '').toLowerCase();
                        break;
                    case 'netto':
                        aVal = a.netto;
                        bVal = b.netto;
                        break;
                    default:
                        aVal = 0; bVal = 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [props.actualScrap, sortConfig, props.metals, props.bins, props.resolveName]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const currentWarehouseValue = useMemo(() => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        return props.actualScrap.reduce((acc, item) => {
            const priceObj = props.prices.find(p => p.metalId === item.metalId && p.month === month && p.year === year);
            const price = priceObj?.price || 0;
            return acc + (item.netto * price);
        }, 0);
    }, [props.actualScrap, props.prices]);

    const handleOpenEdit = (item: ScrapRecord) => {
        setEditingItem(item);
        setEditGross(String(item.gross ?? '0'));
        setEditMetalId(item.metalId || '');
        setEditBinId(item.binId || '');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingItem || !editGross || !editMetalId || !editBinId) return;
        const bin = props.bins.find(b => b.id === editBinId);
        const grossVal = parseFloat(editGross) || 0;
        const taraVal = bin ? bin.tara : 0;
        await props.onUpdateRecord(editingItem.id, {
            metalId: editMetalId,
            binId: editBinId,
            gross: grossVal,
            tara: taraVal,
            netto: Math.max(grossVal - taraVal, 0)
        });
        setIsEditModalOpen(false);
        setEditingItem(null);
    };

    const confirmDeliveryNote = () => {
        if (props.actualScrap.length === 0 || typeof jspdf === 'undefined') return;
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        doc.setFontSize(22); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
        doc.text("CLAMASON SLOVAKIA", 20, 25);
        doc.setFontSize(12); doc.text("DODACI LIST - KOVOVY ODPAD", 20, 32);
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        const dateStr = new Date().toLocaleDateString('sk-SK');
        const timeStr = new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Datum vystavenia: ${dateStr}`, 140, 25);
        doc.text(`Cas vystavenia: ${timeStr}`, 140, 30);
        doc.text(`Vystavil: ${props.resolveName(props.currentUser)}`, 140, 35);
        doc.setLineWidth(0.5); doc.line(20, 40, 190, 40);

        const tableBody = props.actualScrap.map(r => {
            const metal = props.metals.find(m => m.id === r.metalId);
            const bin = props.bins.find(b => b.id === r.binId);
            return [new Date(r.timestamp).toLocaleDateString('sk-SK'), metal?.type || '???', bin?.name || '???', r.gross.toString(), r.tara.toString(), r.netto.toString()];
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

        // VŽDY NOVÁ STRANA PRE SUMÁR
        doc.addPage();
        doc.setFontSize(18); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
        doc.text("SUMAR DOKUMENTU", 20, 25);
        doc.setLineWidth(0.5); doc.line(20, 30, 190, 30);

        const metalSummaryMap: Record<string, { weight: number, desc: string }> = {};
        props.actualScrap.forEach(r => {
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
        doc.text(`CELKOVA HMOTNOST BRUTTO:`, 20, summaryY);
        doc.text(`${props.actualScrap.reduce((acc, curr) => acc + curr.gross, 0)} kg`, 190, summaryY, { align: 'right' });
        
        summaryY += 8;
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`POCET POLOZIEK CELKOM:`, 20, summaryY);
        doc.text(`${props.actualScrap.length}`, 190, summaryY, { align: 'right' });

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
            doc.text("Vygenerovane systemom Clamason Task Manager Intelligence", 105, 285, { align: 'center' });
            doc.text(`Strana ${i} / ${totalPages}`, 190, 285, { align: 'right' });
        }
        doc.save(`Dodaci_list_srot_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsDeliveryNoteGenerated(true);
        setIsDeliveryNoteModalOpen(false);
    };

    const handleExpediteConfirm = async () => {
        if (!dispatchDate) { alert(language === 'sk' ? "Vyberte dátum expedície." : "Select dispatch date."); return; }
        setIsSubmitting(true);
        try {
            const sanonId = await props.onExpedite(props.currentUser, dispatchDate);
            if (sanonId) {
                alert(language === 'sk' ? `Expedícia úspešná. Archív: ${sanonId}` : `Expedition successful. Archive: ${sanonId}`);
                setIsExpediteModalOpen(false);
                setIsDeliveryNoteGenerated(false);
            }
        } catch (e) { alert("Chyba pri expedícii."); } finally { setIsSubmitting(false); }
    };

    const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden";
    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
    const inputClass = "w-full h-14 bg-slate-900/80 border-2 border-slate-700 rounded-xl px-4 text-white text-lg font-black focus:outline-none focus:border-teal-500/50 transition-all font-mono uppercase text-center";

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{t('scrap_warehouse_title')}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-black px-3 py-1 rounded-full border border-indigo-500/30 uppercase tracking-widest">AKTUÁLNY SKLAD</span>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Položiek: <span className="text-white">{props.actualScrap.length}</span></p>
                        <div className="w-1 h-1 rounded-full bg-slate-700 mx-1"></div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Odhadovaná hodnota: <span className="text-amber-400 font-black">{currentWarehouseValue.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span></p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <button disabled={props.actualScrap.length === 0} onClick={() => setIsDeliveryNoteModalOpen(true)} className="w-full sm:w-auto h-14 px-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest border-b-4 border-emerald-900 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                        <Icons.FileText /> {t('scrap_btn_delivery_note')}
                    </button>
                    <button disabled={props.actualScrap.length === 0 || !isDeliveryNoteGenerated} onClick={() => setIsExpediteModalOpen(true)} className={`w-full sm:w-auto h-14 px-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest border-b-4 border-indigo-900 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${!isDeliveryNoteGenerated && props.actualScrap.length > 0 ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-gray-900 animate-pulse' : ''}`}>
                        <Icons.Dispatch /> {t('scrap_btn_dispatch')}
                    </button>
                </div>
            </div>

            <div className={`${cardClass} no-print`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                                <th className="p-4 cursor-pointer hover:text-teal-400 transition-colors group" onClick={() => requestSort('time')}>
                                    <div className="flex items-center gap-2">Dátum / Čas <Icons.Sort active={sortConfig?.key === 'time'} direction={sortConfig?.direction || 'asc'} /></div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-teal-400 transition-colors group" onClick={() => requestSort('worker')}>
                                    <div className="flex items-center gap-2">Skladník <Icons.Sort active={sortConfig?.key === 'worker'} direction={sortConfig?.direction || 'asc'} /></div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-teal-400 transition-colors group" onClick={() => requestSort('metal')}>
                                    <div className="flex items-center gap-2">Typ kovu <Icons.Sort active={sortConfig?.key === 'metal'} direction={sortConfig?.direction || 'asc'} /></div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-teal-400 transition-colors group" onClick={() => requestSort('bin')}>
                                    <div className="flex items-center gap-2">Kontajner <Icons.Sort active={sortConfig?.key === 'bin'} direction={sortConfig?.direction || 'asc'} /></div>
                                </th>
                                <th className="p-4 text-right cursor-pointer hover:text-teal-400 transition-colors group" onClick={() => requestSort('netto')}>
                                    <div className="flex items-center justify-end gap-2">Netto (kg) <Icons.Sort active={sortConfig?.key === 'netto'} direction={sortConfig?.direction || 'asc'} /></div>
                                </th>
                                <th className="p-4 w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {sortedScrap.length > 0 ? (
                                sortedScrap.map(r => {
                                    const metal = props.metals.find(m => m.id === r.metalId);
                                    const bin = props.bins.find(b => b.id === r.binId);
                                    return (
                                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group text-sm">
                                            <td className="p-4">
                                                <div className="text-white font-bold">{new Date(r.timestamp).toLocaleDateString('sk-SK')}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{new Date(r.timestamp).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="p-4 text-slate-300 font-bold uppercase">{props.resolveName(r.worker)}</td>
                                            <td className="p-4 font-black text-white uppercase">{metal?.type || '???'}</td>
                                            <td className="p-4 text-slate-400 font-bold uppercase">{bin?.name || '???'}</td>
                                            <td className="p-4 text-right font-black text-teal-400 font-mono text-lg">{r.netto} kg</td>
                                            <td className="p-4 text-center">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenEdit(r)} className="p-2 bg-slate-800 text-teal-400 hover:text-white hover:bg-teal-600 rounded-lg transition-all"><Icons.Edit /></button>
                                                    <button onClick={() => { if(window.confirm(t('confirm_delete_msg'))) props.onDeleteRecord(r.id); }} className="p-2 bg-slate-800 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-all"><Icons.Trash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={6} className="py-32 text-center text-slate-700"><div className="flex flex-col items-center gap-4"><Icons.Box /><p className="font-black uppercase tracking-[0.3em] text-xs italic">{t('scrap_empty_warehouse')}</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDeliveryNoteModalOpen && createPortal(
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in no-print" onClick={() => setIsDeliveryNoteModalOpen(false)}>
                    <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500"><Icons.FileText /></div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">{language === 'sk' ? 'STIAHNUŤ DODACÍ LIST?' : 'DOWNLOAD DELIVERY NOTE?'}</h3>
                        <p className="text-sm text-slate-400 font-bold uppercase leading-relaxed mb-10">{language === 'sk' ? "Systém vygeneruje a stiahne profesionálny PDF dokument. Po stiahnutí sa odomkne možnosť finálnej expedície šrotu do archívu." : "The system will generate and download a professional PDF document. After downloading, the option for final scrap expedition to archive will be unlocked."}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setIsDeliveryNoteModalOpen(false)} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all">{t('btn_cancel')}</button>
                            <button onClick={confirmDeliveryNote} className="h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-emerald-800 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"><Icons.Check /> {language === 'sk' ? 'STIAHNUŤ PDF' : 'DOWNLOAD PDF'}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isExpediteModalOpen && createPortal(
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in no-print" onClick={() => !isSubmitting && setIsExpediteModalOpen(false)}>
                    <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500"><Icons.Dispatch /></div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">{t('scrap_dispatch_modal_title')}</h3>
                        <div className="space-y-4 mb-10"><p className="text-sm text-slate-400 font-bold uppercase leading-relaxed">{t('scrap_dispatch_modal_desc')}<br /><span className="text-white text-lg font-black">{props.actualScrap.length} položiek</span></p><div className="mt-6"><label className={labelClass}>{t('scrap_dispatch_date')}</label><input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className={inputClass} /><p className="text-[10px] text-slate-500 mt-2 font-bold uppercase italic">* Tento dátum určí názov archívneho šanónu.</p></div></div>
                        <div className="grid grid-cols-2 gap-4">
                            <button disabled={isSubmitting} onClick={() => setIsExpediteModalOpen(false)} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all disabled:opacity-30">ZRUŠIŤ</button>
                            <button disabled={isSubmitting} onClick={handleExpediteConfirm} className="h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-indigo-800 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:border-slate-800">{isSubmitting ? '...' : 'POTVRDIŤ EXPEDÍCIU'}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isEditModalOpen && editingItem && createPortal(
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in no-print" onClick={() => setIsEditModalOpen(false)}>
                    <div className="bg-slate-900 border-2 border-teal-500/50 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3"><Icons.Edit /> {t('scrap_edit_title')}</h3>
                        <div className="space-y-6 mb-10"><div><label className={labelClass}>{t('scrap_metal_select')}</label><select value={editMetalId} onChange={e => setEditMetalId(e.target.value)} className={inputClass}>{props.metals.map(m => <option key={m.id} value={m.id}>{m.type}</option>)}</select></div><div><label className={labelClass}>{t('scrap_bin_select')}</label><select value={editBinId} onChange={e => setEditBinId(e.target.value)} className={inputClass}>{props.bins.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><label className={labelClass}>{t('scrap_gross')}</label><input type="number" value={editGross} onChange={e => setEditGross(e.target.value)} className={`${inputClass} !text-3xl text-teal-400`} /></div></div>
                        <div className="grid grid-cols-2 gap-4"><button onClick={() => setIsEditModalOpen(false)} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all">ZRUŠIŤ</button><button onClick={handleSaveEdit} className="h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-teal-800 shadow-xl transition-all active:scale-95">ULOŽIŤ ZMENY</button></div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ScrapWarehouseTab;