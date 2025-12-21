
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from './LanguageContext';
import PartNumberInput from './PartNumberInput';
import { Task, PriorityLevel } from '../App';

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
    onAddTask: (pn: string, wp: string | null, qty: string | null, unit: string | null, prio: PriorityLevel, type?: 'production' | 'logistics') => void;
    onUpdateTask: (id: string, updates: Partial<Task>) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    hasPermission: (perm: string) => boolean;
    parts: string[];
    onRequestPart: (part: string) => Promise<boolean>;
}

declare var XLSX: any;

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const InventoryTab: React.FC<InventoryTabProps> = ({ currentUser, tasks, onAddTask, onUpdateTask, onDeleteTask, parts, onRequestPart }) => {
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
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

    // Modal state
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

    // --- LOGIKA AKTÍVNEJ ÚLOHY ---
    const activeInventoryTask = useMemo(() => {
        return tasks.find(t => 
            t.partNumber === "Počítanie zásob" && 
            !t.isDone && 
            t.inProgressBy === currentUser
        );
    }, [tasks, currentUser]);

    useEffect(() => {
        const saved = localStorage.getItem('inventory_scans');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setScannedItems(parsed);
                if (parsed.length > 0) setLastSaved(parsed[0].timestamp);
            } catch (e) {
                console.error("Failed to parse inventory scans", e);
            }
        }
    }, []);

    useEffect(() => {
        if (scannedItems.length > 0) {
            localStorage.setItem('inventory_scans', JSON.stringify(scannedItems));
            setLastSaved(Date.now());
        }
    }, [scannedItems]);

    const handleStartInventory = () => {
        onAddTask("Počítanie zásob", "Inventúra", "0", "pallet", "NORMAL", "logistics");
    };

    const handleAddItem = () => {
        const isLocEmpty = !location.trim();
        const isPartEmpty = !partNumber.trim();
        const isQtyEmpty = !quantity.trim();
        const isBatchRequiredAndEmpty = !isBatchMissing && !batch.trim();

        if (isLocEmpty || isPartEmpty || isQtyEmpty || isBatchRequiredAndEmpty) {
            const missingFields = [];
            if (isLocEmpty) missingFields.push(language === 'sk' ? "Lokácia" : "Location");
            if (isPartEmpty) missingFields.push(language === 'sk' ? "Diel" : "Part");
            if (isBatchRequiredAndEmpty) missingFields.push("Batch");
            if (isQtyEmpty) missingFields.push(language === 'sk' ? "Množstvo" : "Quantity");

            const errorMsg = language === 'sk' 
                ? `Prosím, vyplňte povinné polia: ${missingFields.join(', ')}.` 
                : `Please fill required fields: ${missingFields.join(', ')}.`;
            
            alert(errorMsg);
            return;
        }

        const newItem: ScannedItem = {
            id: crypto.randomUUID(),
            location,
            partNumber,
            batch: isBatchMissing ? '[CHÝBA ŠTÍTOK]' : batch,
            quantity,
            timestamp: Date.now(),
            worker: currentUser
        };
        setScannedItems([newItem, ...scannedItems]);

        setLocation(''); 
        setPartNumber(''); 
        setBatch(''); 
        setIsBatchMissing(false);
        setQuantity('');
        setTimeout(() => locationRef.current?.focus(), 10);
    };

    const handleDeleteItem = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: language === 'sk' ? "Vymazať položku?" : "Delete item?",
            message: language === 'sk' ? "Naozaj chcete vymazať túto naskenovanú položku?" : "Are you sure you want to delete this scanned item?",
            type: 'danger',
            onConfirm: () => {
                const updated = scannedItems.filter(item => item.id !== id);
                setScannedItems(updated);
                if (updated.length === 0) {
                    localStorage.removeItem('inventory_scans');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleClearAll = () => {
        setConfirmModal({
            isOpen: true,
            title: language === 'sk' ? "Vymazať všetko?" : "Clear all?",
            message: language === 'sk' ? "Naozaj chcete vymazať celý zoznam naskenovaných položiek? Táto akcia je nevratná." : "Are you sure you want to clear the entire list? This action cannot be undone.",
            type: 'danger',
            onConfirm: () => {
                setScannedItems([]);
                localStorage.removeItem('inventory_scans');
                setLastSaved(null);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleCancelInventory = () => {
        setConfirmModal({
            isOpen: true,
            title: language === 'sk' ? "Zrušiť reláciu inventúry?" : "Cancel inventory session?",
            message: (
                <div className="space-y-4">
                    <p className="font-bold text-red-500">
                        {language === 'sk' 
                            ? "Pozor! Táto akcia vymaže všetky naskenované dáta a ukončí inventúru bez uloženia do systému." 
                            : "Warning! This action will delete all scanned data and end the inventory without saving to the system."}
                    </p>
                    <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 text-xs">
                        <p className="text-gray-300">
                            {language === 'sk'
                                ? "Ak chcete dáta uložiť a vygenerovať report, použite zelené tlačidlo"
                                : "If you want to save data and generate a report, use the green button"}
                            <span className="text-green-400 font-black ml-1">"EXPORT & UKONČIŤ"</span>.
                        </p>
                    </div>
                </div>
            ),
            type: 'danger',
            onConfirm: () => {
                if (activeInventoryTask) {
                    onDeleteTask(activeInventoryTask.id);
                }
                setScannedItems([]);
                localStorage.removeItem('inventory_scans');
                setLastSaved(null);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleExportAndFinish = () => {
        if (scannedItems.length === 0) {
            alert(language === 'sk' ? "Zoznam je prázdny." : "List is empty.");
            return;
        }
        
        handleExport();

        const finalCount = scannedItems.length.toString();

        if (activeInventoryTask) {
            onUpdateTask(activeInventoryTask.id, { 
                isDone: true, 
                status: 'completed', 
                completionTime: new Date().toLocaleTimeString('sk-SK'),
                completedBy: currentUser,
                completedAt: Date.now(),
                isInProgress: false,
                inProgressBy: null,
                quantity: finalCount
            });
        }

        setScannedItems([]);
        localStorage.removeItem('inventory_scans');
        setLastSaved(null);
    };

    const handleExport = () => {
        if (scannedItems.length === 0) return;
        if (typeof XLSX === 'undefined') { alert("Library Error"); return; }
        const data = scannedItems.map(item => ({
            "Dátum inventúry": new Date(item.timestamp).toLocaleDateString('sk-SK'),
            "Užívateľ": item.worker,
            "Lokácia": item.location,
            "Číslo dielu": item.partNumber,
            "Batch": item.batch,
            "Množstvo": item.quantity,
            "Presný čas": new Date(item.timestamp).toLocaleTimeString('sk-SK')
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventúra");
        XLSX.writeFile(wb, `Inventura_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const toggleBatchMissing = () => {
        const newState = !isBatchMissing;
        setIsBatchMissing(newState);
        if (newState) {
            setBatch('[CHÝBA ŠTÍTOK]');
            setTimeout(() => quantityRef.current?.focus(), 10);
        } else {
            setBatch('');
            setTimeout(() => batchRef.current?.focus(), 10);
        }
    };

    const inputBaseClass = "w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 placeholder:font-mono focus:outline-none focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all font-mono uppercase text-lg";
    const dangerButtonClass = "bg-red-900/40 hover:bg-red-800 text-red-100 px-6 py-4 rounded-xl text-sm font-black border-2 border-red-800/50 shadow-lg transition-all active:scale-95 uppercase tracking-wider flex items-center justify-center gap-2";

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
            {/* Entry Section */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 relative overflow-hidden">
                {!activeInventoryTask ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white uppercase tracking-widest">{language === 'sk' ? 'Inventúra nie je spustená' : 'Inventory not started'}</h2>
                            <p className="text-gray-400 text-sm mt-2">{language === 'sk' ? 'Kliknutím začnete reláciu počítania.' : 'Click to start a counting session.'}</p>
                        </div>
                        <button 
                            onClick={handleStartInventory}
                            className="bg-[#4169E1] hover:bg-[#3151b1] text-white font-black py-6 px-12 rounded-2xl shadow-[0_0_20px_rgba(65,105,225,0.4)] transition-all active:scale-95 uppercase tracking-[0.2em] text-xl border-2 border-[#5a81f3]"
                        >
                            📋 {language === 'sk' ? 'Spustiť Inventúru' : 'Start Inventory'}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start sm:items-center mb-8 border-b border-gray-700 pb-4">
                            <div>
                                <h1 className="text-3xl font-extrabold text-[#4169E1] uppercase tracking-widest leading-none">
                                    {t('tab_inventory')}
                                </h1>
                                <div className="flex gap-4 items-center mt-2">
                                    <span className="bg-[#4169E1]/20 text-[#4169E1] text-[10px] font-black px-2 py-0.5 rounded border border-[#4169E1]/40 animate-pulse uppercase">Aktívna relácia</span>
                                    <p className="text-[10px] text-gray-500 uppercase font-mono">
                                        Položiek: <span className="text-white font-bold">{scannedItems.length}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleCancelInventory}
                                className={dangerButtonClass.replace('px-6 py-4', 'px-4 py-3 text-[11px]')}
                            >
                                🛑 {language === 'sk' ? 'Zrušiť reláciu' : 'Cancel session'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">Skladová Lokácia</label>
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
                                <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">Číslo dielu</label>
                                <PartNumberInput 
                                    inputRef={partRef}
                                    parts={parts}
                                    onPartSelect={(p) => setPartNumber(p || '')}
                                    onInputChange={(val) => setPartNumber(val.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && batchRef.current?.focus()}
                                    placeholder={t('part_placeholder')}
                                    value={partNumber}
                                    onRequestPart={onRequestPart}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">Batch / Číslo várky</label>
                                <div className="flex gap-2">
                                    <input 
                                        ref={batchRef}
                                        type="text"
                                        readOnly={isBatchMissing}
                                        value={batch}
                                        onChange={(e) => !isBatchMissing && setBatch(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && quantityRef.current?.focus()}
                                        placeholder={isBatchMissing ? '' : "NAPR. 489523"}
                                        className={`${inputBaseClass.replace('w-full', 'w-1/2')} ${isBatchMissing ? 'text-red-500 border-red-900/50 bg-red-900/10' : ''}`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={toggleBatchMissing}
                                        className={`w-1/2 py-3 rounded-lg border-2 font-black uppercase text-sm text-white transition-all flex items-center justify-center gap-2 ${isBatchMissing ? 'bg-red-600 border-red-500 shadow-lg' : 'bg-[#4169E1]/20 border-[#4169E1] hover:bg-[#4169E1]/40'}`}
                                    >
                                        🏷️ {language === 'sk' ? 'Chýba štítok' : 'Label missing'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">Množstvo</label>
                                <input 
                                    ref={quantityRef}
                                    type="text"
                                    inputMode="decimal"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.,]/g, ''))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                    placeholder="0"
                                    className={`${inputBaseClass} font-black text-xl`}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleAddItem}
                            className="w-full mt-8 bg-[#4169E1] hover:bg-[#3151b1] text-white font-black py-5 rounded-2xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-lg"
                        >
                            Pridať do zoznamu
                        </button>
                    </>
                )}
            </div>

            {/* Summary List */}
            {activeInventoryTask && (
                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-gray-700 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <h3 className="text-gray-400 font-black uppercase text-sm tracking-[0.15em] leading-none">
                                {language === 'sk' ? 'SÚPIS POLOŽIEK' : 'ITEM INVENTORY'}
                            </h3>
                            <span className="bg-[#4169E1]/20 text-white border-2 border-[#4169E1] text-lg px-3 py-1 rounded-lg font-black font-mono leading-none shadow-lg">
                                {scannedItems.length}
                            </span>
                        </div>
                        <div className="flex flex-wrap w-full sm:w-auto gap-3">
                            <button 
                                onClick={handleClearAll} 
                                className={dangerButtonClass}
                            >
                                {language === 'sk' ? 'Zmazať všetko' : 'Clear all'}
                            </button>
                            <button 
                                onClick={handleExportAndFinish}
                                className="flex-1 sm:flex-none bg-green-700 hover:bg-green-600 text-white px-8 py-4 rounded-xl text-base font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-green-500 uppercase tracking-widest"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                EXPORT & UKONČIŤ
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-gray-900/30 text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-700">
                                <tr>
                                    <th className="py-4 px-4">Čas</th>
                                    <th className="py-4 px-4">Lokácia</th>
                                    <th className="py-4 px-4">Číslo dielu</th>
                                    <th className="py-4 px-4">Batch</th>
                                    <th className="py-4 px-4 text-right">Počet (ks)</th>
                                    <th className="py-4 px-4 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {scannedItems.length > 0 ? (
                                    scannedItems.map(item => (
                                        <tr key={item.id} className="text-gray-300 hover:bg-gray-700/30 transition-colors group">
                                            <td className="py-4 px-4 text-[10px] text-gray-500 font-mono whitespace-nowrap">{new Date(item.timestamp).toLocaleTimeString('sk-SK')}</td>
                                            <td className="py-4 px-4 font-mono font-bold text-[#4169E1]">{item.location}</td>
                                            <td className="py-4 px-4 font-mono text-white text-xs">{item.partNumber}</td>
                                            <td className={`py-4 px-4 font-mono text-xs ${item.batch === '[CHÝBA ŠTÍTOK]' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                                {item.batch || '-'}
                                            </td>
                                            <td className="py-4 px-4 font-black text-white text-right font-mono text-base">{item.quantity}</td>
                                            <td className="py-4 px-4 text-center w-20">
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
                                    <tr><td colSpan={6} className="py-12 text-center text-gray-600 italic font-medium">Zoznam je prázdny. Začnite pridávať položky.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Confirmation Modal Portal */}
            {confirmModal.isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="bg-gray-800 border-2 border-red-600 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">{confirmModal.title}</h3>
                            <div className="text-gray-400 text-sm">{confirmModal.message}</div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                                className="flex-1 py-4 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 font-bold transition-colors uppercase text-xs"
                            >
                                {t('btn_cancel')}
                            </button>
                            <button 
                                onClick={confirmModal.onConfirm} 
                                className="flex-1 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold transition-colors shadow-lg flex items-center justify-center gap-2 uppercase text-xs"
                            >
                                {language === 'sk' ? 'Potvrdiť' : 'Confirm'}
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
