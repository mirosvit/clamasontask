
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../LanguageContext';
import PartNumberInput from '../PartNumberInput';
import { Task, PriorityLevel } from '../../types/appTypes';

interface ScannedItem {
    id: string;
    location: string;
    partNumber: string;
    batch: string;
    quantity: string;
    timestamp: number;
    worker: string;
}

interface InventoryTabProps {
    currentUser: string;
    tasks: Task[];
    onAddTask: (pn: string, wp: string | null, qty: string | null, unit: string | null, prio: PriorityLevel, isLogistics?: boolean) => void;
    onUpdateTask: (id: string, updates: Partial<Task>) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    hasPermission: (perm: string) => boolean;
    parts: string[];
    onRequestPart: (part: string) => Promise<boolean>;
    resolveName: (username?: string | null) => string;
}

declare var XLSX: any;

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
);

const InventoryTab: React.FC<InventoryTabProps> = ({ currentUser, tasks, onAddTask, onUpdateTask, onDeleteTask, parts, onRequestPart, resolveName }) => {
    const { t, language } = useLanguage();
    
    const locationRef = useRef<HTMLInputElement>(null);
    const partRef = useRef<HTMLInputElement>(null);
    const batchRef = useRef<HTMLInputElement>(null);
    const quantityRef = useRef<HTMLInputElement>(null);

    const [location, setLocation] = useState('');
    const [partNumber, setPartNumber] = useState('');
    const [batch, setBatch] = useState('');
    const [isBatchMissing, setIsBatchMissing] = useState(false);
    const [quantity, setQuantity] = useState('');
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        type: 'danger' | 'warning';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'danger'
    });

    const activeInventoryTask = useMemo(() => {
        return (tasks || []).find(t => 
            t.partNumber === "Počítanie zásob" && 
            !t.isDone && 
            (t.inProgressBy === currentUser || t.createdBy === currentUser)
        );
    }, [tasks, currentUser]);

    // Focus na lokáciu pri spustení novej relácie
    useEffect(() => {
        if (activeInventoryTask) {
            setTimeout(() => locationRef.current?.focus(), 100);
        }
    }, [activeInventoryTask?.id]);

    // Načítanie dát viazané na konkrétne ID úlohy
    useEffect(() => {
        if (!activeInventoryTask) {
            setScannedItems([]);
            return;
        }

        const storageKey = `inventory_scans_${activeInventoryTask.id}`;
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setScannedItems(parsed);
                }
            } catch (e) {
                console.error("Failed to parse inventory scans", e);
            }
        } else {
            const legacySaved = localStorage.getItem('inventory_scans');
            if (legacySaved) {
                try {
                    const parsed = JSON.parse(legacySaved);
                    setScannedItems(parsed);
                    localStorage.setItem(storageKey, legacySaved);
                    localStorage.removeItem('inventory_scans');
                } catch(e) {}
            } else {
                setScannedItems([]);
            }
        }
    }, [activeInventoryTask?.id]);

    // Ukladanie dát pri zmene zoznamu
    useEffect(() => {
        if (activeInventoryTask && scannedItems.length >= 0) {
            const storageKey = `inventory_scans_${activeInventoryTask.id}`;
            localStorage.setItem(storageKey, JSON.stringify(scannedItems));
        }
    }, [scannedItems, activeInventoryTask?.id]);

    const handleStartInventory = () => {
        onAddTask("Počítanie zásob", "Inventúra", "0", "pallet", "NORMAL", true);
    };

    const handleAddItem = () => {
        const normalizedQty = quantity.replace(',', '.').trim();
        const isLocEmpty = !location.trim();
        const isPartEmpty = !partNumber.trim();
        const isQtyEmpty = !normalizedQty || isNaN(Number(normalizedQty));
        const isBatchRequiredAndEmpty = !isBatchMissing && !batch.trim();

        if (isLocEmpty || isPartEmpty || isQtyEmpty || isBatchRequiredAndEmpty) {
            const missingFields = [];
            if (isLocEmpty) missingFields.push(t('inv_th_loc'));
            if (isPartEmpty) missingFields.push(t('inv_th_part'));
            if (isBatchRequiredAndEmpty) missingFields.push(t('inv_th_batch'));
            if (isQtyEmpty) missingFields.push(t('inv_th_qty'));

            const errorMsg = language === 'sk' 
                ? `Chyba: Vyplňte ${missingFields.join(', ')}.` 
                : `Error: Fill ${missingFields.join(', ')}.`;
            
            alert(errorMsg);
            return;
        }

        const newItem: ScannedItem = {
            id: crypto.randomUUID(),
            location: location.trim().toUpperCase(),
            partNumber: partNumber.trim().toUpperCase(),
            batch: isBatchMissing ? `[${t('inv_missing_label').toUpperCase()}]` : batch.trim(),
            quantity: normalizedQty,
            timestamp: Date.now(),
            worker: currentUser
        };
        
        setScannedItems(prev => [newItem, ...prev]);

        // Reset všetkých polí pre novú položku (vrátene lokácie)
        setLocation('');
        setPartNumber(''); 
        setBatch(''); 
        setIsBatchMissing(false);
        setQuantity('');
        
        // Vrátenie focusu na Lokáciu pre ďalší sken
        setTimeout(() => locationRef.current?.focus(), 50);
    };

    const handleDeleteItem = (id: string) => {
        setScannedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleClearAll = () => {
        setConfirmModal({
            isOpen: true,
            title: t('confirm_clear_all'),
            message: t('confirm_clear_all_msg'),
            type: 'danger',
            onConfirm: () => {
                setScannedItems([]);
                if (activeInventoryTask) {
                    localStorage.removeItem(`inventory_scans_${activeInventoryTask.id}`);
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleCancelInventory = () => {
        setConfirmModal({
            isOpen: true,
            title: language === 'sk' ? "Zrušiť reláciu inventúry?" : "Cancel inventory session?",
            message: language === 'sk' 
                ? "Dáta tejto relácie budú natrvalo odstránené z pamäte tabletu." 
                : "Data for this session will be permanently removed from tablet storage.",
            type: 'danger',
            onConfirm: () => {
                if (activeInventoryTask) {
                    localStorage.removeItem(`inventory_scans_${activeInventoryTask.id}`);
                    onDeleteTask(activeInventoryTask.id);
                }
                setScannedItems([]);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleExportAndFinish = () => {
        if (scannedItems.length === 0) {
            alert(language === 'sk' ? "Nemožno ukončiť prázdnu inventúru." : "Cannot finish empty inventory.");
            return;
        }
        
        handleExport();

        if (activeInventoryTask) {
            onUpdateTask(activeInventoryTask.id, { 
                isDone: true, 
                status: 'completed', 
                completedBy: currentUser,
                completedAt: Date.now(),
                isInProgress: false,
                inProgressBy: null,
                quantity: scannedItems.length.toString()
            });
            localStorage.removeItem(`inventory_scans_${activeInventoryTask.id}`);
        }
        setScannedItems([]);
    };

    const handleExport = () => {
        if (scannedItems.length === 0 || typeof XLSX === 'undefined') return;
        
        const data = scannedItems.map(item => ({
            "Dátum": new Date(item.timestamp).toLocaleDateString('sk-SK'),
            "Skladník": resolveName(item.worker),
            "Lokácia": item.location,
            "Číslo dielu": item.partNumber,
            "Batch": item.batch,
            "Množstvo": item.quantity.replace('.', ','),
            "Čas": new Date(item.timestamp).toLocaleTimeString('sk-SK')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventúra");
        XLSX.writeFile(wb, `Inventura_${activeInventoryTask?.id || 'export'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const toggleBatchMissing = () => {
        const newState = !isBatchMissing;
        setIsBatchMissing(newState);
        if (newState) {
            setBatch(`[${t('inv_missing_label').toUpperCase()}]`);
            setTimeout(() => quantityRef.current?.focus(), 50);
        } else {
            setBatch('');
            setTimeout(() => batchRef.current?.focus(), 50);
        }
    };

    const inputBaseClass = "w-full h-12 bg-gray-700 border border-gray-600 rounded-lg px-4 text-white text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition-all font-mono uppercase text-base";
    const dangerButtonClass = "bg-red-900/40 hover:bg-red-800 text-red-100 px-6 py-5 rounded-xl text-base font-black border-2 border-red-800/50 shadow-lg transition-all active:scale-95 uppercase tracking-wider flex items-center justify-center gap-2";

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">
            <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-700">
                {!activeInventoryTask ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-8">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold text-white uppercase tracking-widest">{t('inv_not_started')}</h2>
                            <p className="text-gray-400 text-base mt-3">{t('inv_start_hint')}</p>
                        </div>
                        <button 
                            onClick={handleStartInventory}
                            className="bg-[#4169E1] hover:bg-[#3151b1] text-white font-black py-8 px-16 rounded-2xl shadow-[0_0_25px_rgba(65,105,225,0.4)] transition-all active:scale-95 uppercase tracking-[0.25em] text-2xl border-2 border-[#5a81f3]"
                        >
                            📋 {t('inv_start_btn')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start sm:items-center mb-10 border-b border-gray-700 pb-6">
                            <div>
                                <h1 className="text-4xl font-extrabold text-[#4169E1] uppercase tracking-widest leading-none">
                                    {t('tab_inventory')}
                                </h1>
                                <div className="flex gap-6 items-center mt-3">
                                    <span className="bg-[#4169E1]/20 text-[#4169E1] text-xs font-black px-3 py-1 rounded-md border border-[#4169E1]/40 animate-pulse uppercase">{t('inv_active_session')}</span>
                                    <p className="text-xs text-gray-500 uppercase font-mono">
                                        {t('inv_items_count')}: <span className="text-white font-bold">{scannedItems.length}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleCancelInventory}
                                className={dangerButtonClass.replace('px-6 py-5', 'px-5 py-3 text-xs')}
                            >
                                🛑 {t('inv_cancel_session')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">{t('inv_loc_label')}</label>
                                <input 
                                    ref={locationRef}
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && partRef.current?.focus()}
                                    placeholder="NAPR. MA123"
                                    className={inputBaseClass}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">{t('inv_th_part')}</label>
                                <PartNumberInput 
                                    inputRef={partRef}
                                    parts={parts}
                                    onPartSelect={(p) => { if(p) { setPartNumber(p); setTimeout(() => batchRef.current?.focus(), 50); } }}
                                    onInputChange={(val) => setPartNumber(val.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && batchRef.current?.focus()}
                                    placeholder={t('part_placeholder')}
                                    value={partNumber}
                                    onRequestPart={onRequestPart}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">{t('inv_batch_label')}</label>
                                <div className="flex gap-3">
                                    <input 
                                        ref={batchRef}
                                        type="text"
                                        inputMode="numeric"
                                        readOnly={isBatchMissing}
                                        value={batch}
                                        onChange={(e) => {
                                            if (!isBatchMissing) {
                                                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                                setBatch(val);
                                            }
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && quantityRef.current?.focus()}
                                        placeholder={isBatchMissing ? '' : "BATCH / LOT"}
                                        className={`${inputBaseClass.replace('w-full', 'w-1/2')} ${isBatchMissing ? 'text-red-500 border-red-900/50 bg-red-900/10' : ''}`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={toggleBatchMissing}
                                        className={`w-1/2 h-12 rounded-lg border-2 font-black uppercase text-xs text-white transition-all flex items-center justify-center gap-2 ${isBatchMissing ? 'bg-red-600 border-red-500 shadow-lg' : 'bg-[#4169E1]/20 border-[#4169E1] hover:bg-[#4169E1]/40'}`}
                                    >
                                        🏷️ {t('inv_missing_label')}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">{t('inv_qty_label')}</label>
                                <input 
                                    ref={quantityRef}
                                    type="text"
                                    inputMode="decimal"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 10))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                    placeholder="0"
                                    className={`${inputBaseClass} font-black text-lg`}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleAddItem}
                            className="w-full mt-10 bg-[#4169E1] hover:bg-[#3151b1] text-white font-black py-6 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xl border-2 border-[#5a81f3]"
                        >
                            {t('inv_add_btn')}
                        </button>
                    </>
                )}
            </div>

            {activeInventoryTask && (
                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                    <div className="p-5 sm:p-8 border-b border-gray-700 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-6">
                            <h3 className="text-gray-400 font-black uppercase text-base tracking-[0.2em] leading-none">
                                {t('inv_summary_title')}
                            </h3>
                            <span className="bg-[#4169E1]/20 text-white border-2 border-[#4169E1] text-2xl px-5 py-2 rounded-xl font-black font-mono leading-none shadow-lg">
                                {scannedItems.length}
                            </span>
                        </div>
                        <div className="flex flex-wrap w-full sm:w-auto gap-4">
                            <button 
                                onClick={handleClearAll} 
                                className={dangerButtonClass}
                            >
                                {language === 'sk' ? 'Zmazať všetko' : 'Clear all'}
                            </button>
                            <button 
                                onClick={handleExportAndFinish}
                                className="flex-1 sm:flex-none bg-green-700 hover:bg-green-600 text-white px-10 py-5 rounded-xl text-lg font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border-2 border-green-500 uppercase tracking-widest"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {t('inv_finish_btn')}
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-base border-collapse">
                            <thead className="bg-gray-900/30 text-gray-500 text-xs font-black uppercase tracking-widest border-b border-gray-700">
                                <tr>
                                    <th className="py-5 px-6">{t('inv_th_time')}</th>
                                    <th className="py-5 px-6">{t('inv_th_loc')}</th>
                                    <th className="py-5 px-6">{t('inv_th_part')}</th>
                                    <th className="py-5 px-6">{t('inv_th_batch')}</th>
                                    <th className="py-5 px-6 text-right">{t('inv_th_qty')}</th>
                                    <th className="py-5 px-6 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {scannedItems.length > 0 ? (
                                    scannedItems.map(item => (
                                        <tr key={item.id} className="text-gray-300 hover:bg-gray-700/30 transition-colors group">
                                            <td className="py-5 px-6 text-xs text-gray-500 font-mono whitespace-nowrap">{new Date(item.timestamp).toLocaleTimeString('sk-SK')}</td>
                                            <td className="py-5 px-6 font-mono font-bold text-[#4169E1] text-lg">{item.location}</td>
                                            <td className="py-5 px-6 font-mono text-white text-base">{item.partNumber}</td>
                                            <td className={`py-5 px-6 font-mono text-base ${item.batch.includes('[') ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                                {item.batch}
                                            </td>
                                            <td className="py-5 px-6 font-black text-white text-right font-mono text-xl">{item.quantity}</td>
                                            <td className="py-5 px-6 text-center w-24">
                                                <button 
                                                    onClick={() => handleDeleteItem(item.id)} 
                                                    className="w-16 h-16 flex items-center justify-center rounded-lg bg-red-900/30 text-red-500 hover:bg-red-800 hover:text-white border border-red-800/50 transition-all active:scale-90"
                                                >
                                                    <TrashIcon className="w-8 h-8" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={6} className="py-16 text-center text-gray-600 italic font-bold text-lg">{t('inv_empty_list')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {confirmModal.isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setConfirmModal(prev => ({...prev, isOpen: false}))}>
                    <div className="bg-gray-800 border-2 border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-8">
                            <h3 className={`text-2xl font-black mb-3 uppercase tracking-tighter ${confirmModal.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`}>
                                {confirmModal.title}
                            </h3>
                            <div className="text-gray-300 text-base leading-relaxed">
                                {confirmModal.message}
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmModal(prev => ({...prev, isOpen: false}))} className="flex-1 py-4 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 font-black transition-all uppercase text-xs">
                                {t('btn_cancel')}
                            </button>
                            <button onClick={confirmModal.onConfirm} className={`flex-1 py-4 text-white rounded-xl font-black transition-all shadow-xl uppercase text-xs border-2 ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700 border-red-500' : 'bg-amber-600 hover:bg-amber-700 border-amber-500'}`}>
                                {t('btn_confirm')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default InventoryTab;
