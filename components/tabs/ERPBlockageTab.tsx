
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { ERPBlockage, DBItem } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';
import { useData } from '../../context/DataContext';
import PartNumberInput from '../PartNumberInput';

declare var XLSX: any;

interface ERPBlockageTabProps {
    currentUser: string;
    currentUserRole: string;
    parts: DBItem[];
    resolveName: (username?: string | null) => string;
}

const Icons = {
    Warning: () => <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Excel: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
};

const ERPBlockageTab: React.FC<ERPBlockageTabProps> = ({ currentUser, currentUserRole, parts, resolveName }) => {
    const { t, language } = useLanguage();
    const { onAddNotification } = useData();

    // State
    const [blockages, setBlockages] = useState<ERPBlockage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timer, setTimer] = useState(Date.now());

    // Form State
    const [partNumber, setPartNumber] = useState('');
    const [quantity, setQuantity] = useState('');
    const [userNote, setUserNote] = useState('');

    // Modal State
    const [finishModal, setFinishModal] = useState<{ isOpen: boolean; id: string | null; note: string }>({ isOpen: false, id: null, note: '' });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; desc: string; onConfirm: () => void; type: 'danger' | 'warning' }>({ isOpen: false, title: '', desc: '', onConfirm: () => {}, type: 'danger' });

    // REALTIME SYNC (Single Doc pattern)
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'erp_blockages'), (s) => {
            if (s.exists()) setBlockages(s.data().items || []);
            else setBlockages([]);
            setLoading(false);
        });
        const interval = setInterval(() => setTimer(Date.now()), 60000);
        return () => { unsub(); clearInterval(interval); };
    }, []);

    const sortedList = useMemo(() => {
        const score = { waiting: 0, resolving: 1, ready: 2 };
        return [...blockages].sort((a, b) => {
            if (score[a.status] !== score[b.status]) return score[a.status] - score[b.status];
            return b.timestamp - a.timestamp;
        });
    }, [blockages]);

    // HANDLERS
    const handleAdd = async () => {
        if (!partNumber || !quantity || !userNote) {
            alert(t('fill_all_fields'));
            return;
        }
        setIsSubmitting(true);
        try {
            const newItem: ERPBlockage = {
                id: crypto.randomUUID(),
                partNumber,
                quantity,
                userNote,
                status: 'waiting',
                createdBy: currentUser,
                timestamp: Date.now()
            };
            const ref = doc(db, 'settings', 'erp_blockages');
            await setDoc(ref, { items: [newItem, ...blockages] }, { merge: true });
            
            // Vyčistenie formulára
            setPartNumber(''); setQuantity(''); setUserNote('');
        } catch (e) { console.error(e); }
        finally { setIsSubmitting(false); }
    };

    const updateStatus = async (id: string, updates: Partial<ERPBlockage>) => {
        try {
            const newList = blockages.map(item => item.id === id ? { ...item, ...updates } : item);
            await updateDoc(doc(db, 'settings', 'erp_blockages'), { items: newList });
        } catch (e) { console.error(e); }
    };

    const handleResolve = (id: string) => {
        updateStatus(id, { status: 'resolving', resolvedBy: currentUser });
    };

    const openFinishModal = (id: string) => {
        setFinishModal({ isOpen: true, id, note: '' });
    };

    const handleConfirmFinish = async () => {
        if (!finishModal.id || !finishModal.note.trim()) return;
        const item = blockages.find(b => b.id === finishModal.id);
        if (!item) return;

        const updates: Partial<ERPBlockage> = {
            status: 'ready',
            adminNote: finishModal.note,
            resolvedAt: Date.now(),
            resolvedBy: currentUser
        };

        await updateStatus(finishModal.id, updates);

        // Notifikácia operátorovi
        onAddNotification({
            partNumber: item.partNumber,
            reason: finishModal.note,
            reportedBy: currentUser,
            targetUser: item.createdBy,
            timestamp: Date.now()
        });

        setFinishModal({ isOpen: false, id: null, note: '' });
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: t('erp_delete_confirm'),
            desc: language === 'sk' ? "Táto akcia je nevratná a záznam bude odstránený zo zoznamu." : "This action is irreversible.",
            type: 'danger',
            onConfirm: async () => {
                const newList = blockages.filter(b => b.id !== id);
                await updateDoc(doc(db, 'settings', 'erp_blockages'), { items: newList });
                setConfirmModal(p => ({ ...p, isOpen: false }));
            }
        });
    };

    const handleClearReady = () => {
        setConfirmModal({
            isOpen: true,
            title: t('erp_clear_confirm'),
            desc: language === 'sk' ? "Všetky záznamy v stave OPRAVENÉ budú natrvalo vymazané." : "All fixed records will be deleted.",
            type: 'danger',
            onConfirm: async () => {
                const newList = blockages.filter(b => b.status !== 'ready');
                await updateDoc(doc(db, 'settings', 'erp_blockages'), { items: newList });
                setConfirmModal(p => ({ ...p, isOpen: false }));
            }
        });
    };

    const handleExport = () => {
        if (typeof XLSX === 'undefined') return;
        const data = sortedList.map(b => ({
            "Dátum": new Date(b.timestamp).toLocaleDateString(),
            "Čas": new Date(b.timestamp).toLocaleTimeString(),
            "Diel": b.partNumber,
            "Množstvo": b.quantity,
            "Nahlásil": resolveName(b.createdBy),
            "Dôvod (User)": b.userNote,
            "Stav": b.status.toUpperCase(),
            "Riešiteľ": resolveName(b.resolvedBy),
            "Spätná väzba (Admin)": b.adminNote || ""
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Chyby_Odvodu");
        XLSX.writeFile(wb, `Chyby_Odvodu_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getAgeingText = (ts: number) => {
        const diff = Math.floor((timer - ts) / 60000);
        return diff < 1 ? t('erp_ageing_now') : t('erp_ageing_min', { n: diff });
    };

    const isAdmin = currentUserRole === 'ADMIN';

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24 animate-fade-in text-slate-200">
            
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-500/20 rounded-2xl border border-orange-500/30">
                        <Icons.Warning />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{t('erp_report_title')}</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{t('erp_report_subtitle')}</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={handleExport} className="flex-1 md:flex-none h-12 px-6 bg-teal-600/10 hover:bg-teal-600/20 text-teal-500 border border-teal-500/30 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2">
                        <Icons.Excel /> {t('erp_btn_excel')}
                    </button>
                    {isAdmin && (
                        <button onClick={handleClearReady} className="flex-1 md:flex-none h-12 px-6 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2">
                            <Icons.Trash /> {t('erp_btn_clear')}
                        </button>
                    )}
                </div>
            </div>

            {/* INPUT FORM SECTION */}
            <div className="bg-slate-900/60 border-2 border-slate-800 rounded-[2rem] p-8 shadow-2xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-[100px] pointer-events-none"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end relative z-10">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t('part_number')}</label>
                            <PartNumberInput 
                                parts={parts.map(p => p.value)} 
                                value={partNumber} 
                                onPartSelect={(v) => setPartNumber(v || '')}
                                onInputChange={(v) => setPartNumber(v.toUpperCase())}
                                placeholder="33..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t('quantity')}</label>
                            <input 
                                type="number" 
                                value={quantity} 
                                onChange={e => setQuantity(e.target.value)}
                                className="w-full h-14 bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 text-white font-mono text-2xl focus:border-teal-500 outline-none transition-all" 
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">POZNÁMKA / DÔVOD CHYBY</label>
                            <textarea 
                                value={userNote}
                                onChange={e => setUserNote(e.target.value)}
                                className="w-full h-[132px] bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-teal-500 outline-none transition-all resize-none font-medium placeholder:text-slate-700"
                                placeholder={t('erp_placeholder_note')}
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-3 pt-2">
                        <button 
                            onClick={handleAdd}
                            disabled={isSubmitting}
                            className="w-full h-16 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-900/20 transition-all active:scale-[0.98] border-b-4 border-teal-800 hover:border-teal-700 text-lg flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? '...' : t('erp_submit_btn')}
                        </button>
                    </div>
                </div>
            </div>

            {/* LIST SECTION */}
            <div className="space-y-4">
                {loading ? (
                    <div className="h-64 flex items-center justify-center"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : sortedList.length > 0 ? (
                    sortedList.map((item) => {
                        const isWaiting = item.status === 'waiting';
                        const isResolving = item.status === 'resolving';
                        const isReady = item.status === 'ready';
                        
                        const statusColors = isWaiting 
                            ? "border-red-500/20 bg-slate-900/40" 
                            : isResolving 
                                ? "border-orange-500/30 bg-slate-900/80 shadow-[0_0_40px_rgba(245,158,11,0.1)]" 
                                : "opacity-50 grayscale-[0.5] border-teal-500/10 bg-slate-900/20";

                        const badgeColors = isWaiting 
                            ? "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse" 
                            : isResolving 
                                ? "bg-orange-500 text-white border-orange-400" 
                                : "bg-teal-500/10 text-teal-500 border-teal-500/30";

                        return (
                            <div key={item.id} className={`group relative flex flex-col md:flex-row items-stretch rounded-[2rem] border-2 transition-all duration-300 p-6 gap-6 ${statusColors}`}>
                                {/* Left Side: Part Info */}
                                <div className="md:w-64 flex-shrink-0 flex flex-col justify-center">
                                    <h4 className="text-2xl font-black text-white font-mono tracking-tight break-all leading-tight">{item.partNumber}</h4>
                                    <div className="mt-3 bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Množstvo:</span>
                                        <span className="text-xl font-black text-teal-400 font-mono">{item.quantity}</span>
                                    </div>
                                </div>

                                {/* Middle: Content */}
                                <div className="flex-grow flex flex-col justify-center space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 ${badgeColors}`}>
                                            {t(`erp_status_${item.status}` as any)}
                                        </span>
                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Nahlásil: <span className="text-slate-300 ml-1">{resolveName(item.createdBy)}</span></span>
                                        <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                            {getAgeingText(item.timestamp)}
                                        </span>
                                    </div>
                                    <div className="bg-slate-950/40 p-4 rounded-2xl border-l-4 border-slate-700 italic text-slate-300 text-sm leading-relaxed">
                                        "{item.userNote}"
                                    </div>
                                    {item.adminNote && (
                                        <div className="bg-teal-500/5 p-4 rounded-2xl border border-teal-500/20 text-teal-400 text-sm font-bold flex gap-3 items-start animate-fade-in">
                                            <span className="mt-0.5 text-lg">✅</span>
                                            <p>{item.adminNote}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: Actions */}
                                <div className="md:w-48 flex-shrink-0 flex md:flex-col items-center justify-center gap-3">
                                    {isAdmin && (
                                        <>
                                            {!isReady && (
                                                <>
                                                    {isWaiting && (
                                                        <button 
                                                            onClick={() => handleResolve(item.id)}
                                                            className="w-full h-14 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-orange-800 shadow-lg transition-all active:scale-95"
                                                        >
                                                            {t('erp_btn_resolve')}
                                                        </button>
                                                    )}
                                                    {isResolving && (
                                                        <button 
                                                            onClick={() => openFinishModal(item.id)}
                                                            className="w-full h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-teal-800 shadow-lg transition-all active:scale-95"
                                                        >
                                                            {t('erp_btn_finish')}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-950 border-2 border-slate-800 text-slate-600 hover:text-red-500 hover:border-red-500/40 transition-all active:scale-95 shadow-lg"
                                            >
                                                <Icons.Trash />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-32 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20"><Icons.Check /></div>
                        <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-lg">{t('erp_empty_list')}</p>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {finishModal.isOpen && createPortal(
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in">
                    <div className="bg-slate-900 border-2 border-teal-500/50 rounded-[2.5rem] shadow-[0_0_100px_rgba(20,184,166,0.2)] w-full max-w-lg p-10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">{t('erp_finish_modal_title')}</h3>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-8 leading-relaxed">{t('erp_finish_modal_desc')}</p>
                        
                        <textarea 
                            value={finishModal.note}
                            onChange={e => setFinishModal(p => ({ ...p, note: e.target.value }))}
                            className="w-full h-40 bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-teal-500 outline-none transition-all resize-none mb-8 font-medium shadow-inner"
                            placeholder="NAPR. CHYBA OPRAVENÁ V EFACS..."
                            autoFocus
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setFinishModal({ isOpen: false, id: null, note: '' })} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all">ZRUŠIŤ</button>
                            <button onClick={handleConfirmFinish} className="h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-teal-800 shadow-xl transition-all active:scale-95">POTVRDIŤ</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {confirmModal.isOpen && createPortal(
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in">
                    <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center" onClick={e => e.stopPropagation()}>
                        <div className={`w-20 h-20 rounded-3xl mx-auto mb-8 flex items-center justify-center border-2 ${confirmModal.type === 'danger' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-orange-500/10 border-orange-500/30 text-orange-500'}`}>
                            <Icons.Warning />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">{confirmModal.title}</h3>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-10 leading-relaxed">{confirmModal.desc}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all">ZRUŠIŤ</button>
                            <button onClick={confirmModal.onConfirm} className={`h-14 rounded-2xl font-black uppercase text-xs tracking-widest text-white shadow-xl transition-all active:scale-95 border-b-4 ${confirmModal.type === 'danger' ? 'bg-red-600 border-red-800 hover:bg-red-500' : 'bg-orange-600 border-orange-800 hover:bg-orange-500'}`}>POTVRDIŤ</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ERPBlockageTab;
