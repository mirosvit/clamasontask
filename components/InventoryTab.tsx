
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import PartNumberInput from './PartNumberInput';

interface ScannedItem {
    id: string;
    location: string;
    partNumber: string;
    batch: string;
    quantity: string;
    timestamp: number;
    worker: string; // Sledovanie užívateľa
}

interface InventoryTabProps {
    currentUser: string; // Meno prihláseného užívateľa
    tasks: any[];
    onDeleteTask: (id: string) => void;
    hasPermission: (perm: string) => boolean;
    parts: string[];
    onRequestPart: (part: string) => Promise<boolean>;
}

declare var XLSX: any;

const InventoryTab: React.FC<InventoryTabProps> = ({ currentUser, parts, onRequestPart }) => {
    const { t, language } = useLanguage();
    
    // Refs for focus management
    const locationRef = useRef<HTMLInputElement>(null);
    const partRef = useRef<HTMLInputElement>(null);
    const batchRef = useRef<HTMLInputElement>(null);
    const quantityRef = useRef<HTMLInputElement>(null);

    // Form States
    const [location, setLocation] = useState('');
    const [partNumber, setPartNumber] = useState('');
    const [batch, setBatch] = useState('');
    const [quantity, setQuantity] = useState('');
    const [lastSaved, setLastSaved] = useState<number | null>(null);

    // Persistence State
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('inventory_scans');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setScannedItems(parsed);
                if (parsed.length > 0) {
                    setLastSaved(parsed[0].timestamp);
                }
            } catch (e) {
                console.error("Failed to parse inventory scans", e);
            }
        }
    }, []);

    // Save to localStorage whenever scannedItems changes
    useEffect(() => {
        localStorage.setItem('inventory_scans', JSON.stringify(scannedItems));
        if (scannedItems.length > 0) {
            setLastSaved(Date.now());
        }
    }, [scannedItems]);

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocation(e.target.value.toUpperCase());
    };

    const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ''); // Only numbers
        if (val.length <= 7) {
            setBatch(val);
        }
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9.,]/g, ''); // Decimal numbers
        if (val.length <= 8) {
            setQuantity(val);
        }
    };

    const handleAddItem = () => {
        if (!location || !partNumber || !quantity) {
            const msg = language === 'sk' ? "Vyplňte kľúčové údaje (Lokácia, Diel, Množstvo)." : "Fill required data (Location, Part, Qty).";
            alert(msg);
            return;
        }

        const newItem: ScannedItem = {
            id: crypto.randomUUID(),
            location,
            partNumber,
            batch,
            quantity,
            timestamp: Date.now(),
            worker: currentUser // Pridanie aktuálneho užívateľa
        };

        setScannedItems([newItem, ...scannedItems]);
        
        // Reset all 4 fields as requested
        setLocation('');
        setPartNumber('');
        setBatch('');
        setQuantity('');
        
        // Reset focus to Location field
        setTimeout(() => {
            locationRef.current?.focus();
        }, 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement | null>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef.current?.focus();
        }
    };

    const handleDeleteItem = (id: string) => {
        setScannedItems(scannedItems.filter(item => item.id !== id));
    };

    const handleClearAll = () => {
        const confirmMsg = language === 'sk' ? "Naozaj chcete vymazať celý zoznam?" : "Really clear all items?";
        if (window.confirm(confirmMsg)) {
            setScannedItems([]);
            localStorage.removeItem('inventory_scans');
            setLastSaved(null);
        }
    };

    const handleExport = () => {
        if (scannedItems.length === 0) return;

        if (typeof XLSX === 'undefined') {
            alert("Library Error");
            return;
        }

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

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
            {/* Entry Section */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#4169E1] uppercase tracking-widest leading-none">
                            {t('tab_inventory')}
                        </h1>
                        <div className="flex gap-4 items-center mt-2">
                            {lastSaved && (
                                <p className="text-[10px] text-gray-500 uppercase font-mono">
                                    {language === 'sk' ? 'Uložené:' : 'Saved:'} {new Date(lastSaved).toLocaleTimeString()}
                                </p>
                            )}
                            <p className="text-[10px] text-teal-500 uppercase font-mono">
                                {language === 'sk' ? 'Užívateľ:' : 'User:'} {currentUser}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-tighter">Lokácia</label>
                        <input 
                            ref={locationRef}
                            type="text"
                            value={location}
                            onChange={handleLocationChange}
                            onKeyDown={(e) => handleKeyDown(e, partRef)}
                            placeholder={language === 'sk' ? "Zadaj lokáciu..." : "Enter location..."}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition-all font-mono uppercase"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-tighter">Číslo dielu</label>
                        <PartNumberInput 
                            inputRef={partRef}
                            parts={parts}
                            onPartSelect={(p) => setPartNumber(p || '')}
                            onInputChange={(val) => setPartNumber(val.toUpperCase())}
                            onKeyDown={(e) => handleKeyDown(e, batchRef)}
                            placeholder={t('part_placeholder')}
                            value={partNumber}
                            onRequestPart={onRequestPart}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-tighter">Batch</label>
                        <input 
                            ref={batchRef}
                            type="text"
                            inputMode="numeric"
                            value={batch}
                            onChange={handleBatchChange}
                            onKeyDown={(e) => handleKeyDown(e, quantityRef)}
                            placeholder={language === 'sk' ? "Zadaj batch..." : "Enter batch..."}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition-all font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-tighter">Množstvo</label>
                        <input 
                            ref={quantityRef}
                            type="text"
                            inputMode="decimal"
                            value={quantity}
                            onChange={handleQuantityChange}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            placeholder={t('pcs_placeholder')}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4169E1] transition-all font-mono"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleAddItem}
                    className="w-full mt-8 bg-[#4169E1] hover:bg-[#3151b1] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest"
                >
                    Pridať do zoznamu
                </button>
            </div>

            {/* Summary Table */}
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h3 className="text-gray-400 font-bold uppercase text-sm tracking-widest">Naskenované položky</h3>
                        <span className="bg-gray-700 text-white text-xs px-2 py-1 rounded-full font-mono">{scannedItems.length}</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleClearAll}
                            className="bg-red-900/50 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-800 transition-colors"
                        >
                            Vymazať zoznam
                        </button>
                        <button 
                            onClick={handleExport}
                            className="bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t('export_excel')}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900/30 text-gray-500 border-b border-gray-700">
                            <tr>
                                <th className="py-3 px-4">Dátum</th>
                                <th className="py-3 px-4">Užívateľ</th>
                                <th className="py-3 px-4">Lokácia</th>
                                <th className="py-3 px-4">Diel</th>
                                <th className="py-3 px-4">Batch</th>
                                <th className="py-3 px-4 text-right">Množstvo</th>
                                <th className="py-3 px-4 text-center">Akcia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {scannedItems.length > 0 ? (
                                scannedItems.map(item => (
                                    <tr key={item.id} className="text-gray-300 hover:bg-gray-700/30 transition-colors">
                                        <td className="py-3 px-4 text-[10px] text-gray-500 whitespace-nowrap">
                                            {new Date(item.timestamp).toLocaleDateString('sk-SK')}<br/>
                                            {new Date(item.timestamp).toLocaleTimeString('sk-SK')}
                                        </td>
                                        <td className="py-3 px-4 text-xs font-bold text-teal-500">{item.worker}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-teal-400">{item.location}</td>
                                        <td className="py-3 px-4 font-mono">{item.partNumber}</td>
                                        <td className="py-3 px-4 font-mono">{item.batch || '-'}</td>
                                        <td className="py-3 px-4 font-bold text-white text-right">{item.quantity}</td>
                                        <td className="py-3 px-4 text-center">
                                            <button 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="text-red-500 hover:text-red-400 p-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-600 italic">Zoznam je prázdny. Začnite skenovať.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryTab;
