
import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const InventoryTab: React.FC<InventoryTabProps> = ({ currentUser, tasks, onAddTask, onUpdateTask, parts, onRequestPart }) => {
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

    // Sledovanie lokálnych zmien (iba localStorage, nie Firebase)
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
        if (!location || !partNumber || !quantity) {
            alert(language === 'sk' ? "Vyplňte kľúčové údaje (Lokácia, Diel, Množstvo)." : "Fill required data (Location, Part, Qty).");
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
        const updated = scannedItems.filter(item => item.id !== id);
        setScannedItems(updated);
        if (updated.length === 0) {
            localStorage.removeItem('inventory_scans');
        }
    };

    const handleClearAll = () => {
        if (window.confirm(language === 'sk' ? "Naozaj chcete vymazať celý zoznam?" : "Really clear all items?")) {
            setScannedItems([]);
            localStorage.removeItem('inventory_scans');
            setLastSaved(null);
        }
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
        } else {
            setBatch('');
        }
    };

    // Štýly pre vstupné polia zjednotené s PartSearchScreen
    const inputBaseClass = "w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 placeholder:font-mono focus:outline-none focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all font-mono uppercase text-lg";

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
                        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
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
                    <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest">Naskenované položky</h3>
                            <span className="bg-gray-700 text-white text-xs px-2 py-0.5 rounded-full font-mono">{scannedItems.length}</span>
                        </div>
                        <div className="flex w-full sm:w-auto gap-3">
                            <button 
                                onClick={handleClearAll} 
                                className="flex-1 sm:flex-none bg-red-900/40 hover:bg-red-800 text-red-100 px-6 py-4 rounded-xl text-sm font-black border-2 border-red-800/50 shadow-lg transition-all active:scale-95 uppercase tracking-wider"
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
                                            <td className="py-3 px-4 text-[10px] text-gray-500 font-mono whitespace-nowrap">{new Date(item.timestamp).toLocaleTimeString('sk-SK')}</td>
                                            <td className="py-3 px-4 font-mono font-bold text-[#4169E1]">{item.location}</td>
                                            <td className="py-3 px-4 font-mono text-white text-xs">{item.partNumber}</td>
                                            <td className={`py-3 px-4 font-mono text-xs ${item.batch === '[CHÝBA ŠTÍTOK]' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                                {item.batch || '-'}
                                            </td>
                                            <td className="py-3 px-4 font-black text-white text-right font-mono text-base">{item.quantity}</td>
                                            <td className="py-3 px-4 text-center">
                                                <button onClick={() => handleDeleteItem(item.id)} className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
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
        </div>
    );
};

export default InventoryTab;
