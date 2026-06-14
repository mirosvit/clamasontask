import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface ScannedItem {
    id: string;
    location: string;
    partNumber: string;
    batch: string;
    quantity: string;
    timestamp: number;
    worker: string;
}

interface TempInventoryDoc {
    id: string;
    taskId: string;
    location: string;
    partNumber: string;
    completedAt: number;
    completedBy: string;
    scannedItems: ScannedItem[];
}

interface TempInventoriesSectionProps {
    resolveName: (username?: string | null) => string;
}

declare var XLSX: any;

const TempInventoriesSection: React.FC<TempInventoriesSectionProps> = ({ resolveName }) => {
    const { language } = useLanguage();
    const [inventories, setInventories] = useState<TempInventoryDoc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = collection(db, 'temp_inventories');
        return onSnapshot(q, (snapshot) => {
            const list: TempInventoryDoc[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as TempInventoryDoc));
            list.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
            setInventories(list);
            setLoading(false);
        }, (error) => {
            console.error("Failed to load temporary inventories", error);
            setLoading(false);
        });
    }, []);

    const handleDownloadAndClear = async (inv: TempInventoryDoc) => {
        if (typeof XLSX === 'undefined') {
            alert(language === 'sk' ? "Chyba: Knižnica XLSX nie je načítaná." : "Error: XLSX library not loaded.");
            return;
        }

        if (!inv.scannedItems || inv.scannedItems.length === 0) {
            alert(language === 'sk' ? "Táto inventúra neobsahuje žiadne položky." : "This inventory has no items.");
            return;
        }

        const data = inv.scannedItems.map(item => ({
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
        XLSX.writeFile(wb, `Inventura_${inv.location}_${inv.partNumber}_${new Date(inv.completedAt).toISOString().slice(0, 10)}.xlsx`);

        try {
            await deleteDoc(doc(db, 'temp_inventories', inv.id));
        } catch (err) {
            console.error("Failed to delete temp inventory document after download", err);
            alert(language === 'sk' ? "Chyba pri odstraňovaní dočasného súboru z Firebase." : "Error deleting temporary file from Firebase.");
        }
    };

    const handleClearWithoutDownload = async (id: string) => {
        if (window.confirm(language === 'sk' ? "Naozaj chcete vymazať túto inventúru bez stiahnutia?" : "Are you sure you want to delete this inventory without downloading?")) {
            try {
                await deleteDoc(doc(db, 'temp_inventories', id));
            } catch (err) {
                console.error("Failed to delete temp inventory document", err);
            }
        }
    };

    return (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
                <h2 className="text-2xl font-extrabold text-white uppercase tracking-wider">
                    {language === 'sk' ? "Dočasne uložené inventúry" : "Temporary Stored Inventories"}
                </h2>
                <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                    {language === 'sk' 
                        ? "Zoznam ukončených inventúr uložených na Firebase. Po stiahnutí do formátu Excel sa súbor automaticky odstráni z cloudu."
                        : "List of finished inventories stored on Firebase. After downloading as an Excel file, the file will be deleted from the cloud automatically."
                    }
                </p>
            </div>

            {loading ? (
                <div className="text-center py-10">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 text-sm">{language === 'sk' ? "Načítavanie..." : "Loading..."}</p>
                </div>
            ) : inventories.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl italic font-semibold text-lg">
                    {language === 'sk' ? "Žiadne dočasné súbory inventúry na stiahnutie." : "No temporary inventory files to download."}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 uppercase text-xs tracking-widest font-black">
                                <th className="p-4">{language === 'sk' ? "Dátum" : "Date"}</th>
                                <th className="p-4">{language === 'sk' ? "Lokácia" : "Location"}</th>
                                <th className="p-4">{language === 'sk' ? "Diel" : "Part"}</th>
                                <th className="p-4">{language === 'sk' ? "Skladník" : "Worker"}</th>
                                <th className="p-4 text-center">{language === 'sk' ? "Počet položiek" : "Items count"}</th>
                                <th className="p-4 text-right">{language === 'sk' ? "Akcia" : "Action"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {inventories.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-mono text-xs">
                                        {new Date(inv.completedAt).toLocaleString('sk-SK')}
                                    </td>
                                    <td className="p-4 font-bold text-teal-400 uppercase font-mono">
                                        {inv.location || 'N/A'}
                                    </td>
                                    <td className="p-4 font-mono">
                                        {inv.partNumber || 'INVENTÚRA POZÍCIE'}
                                    </td>
                                    <td className="p-4">
                                        {resolveName(inv.completedBy)}
                                    </td>
                                    <td className="p-4 text-center font-bold text-stone-200">
                                        {inv.scannedItems?.length || 0}
                                    </td>
                                    <td className="p-4 flex justify-end gap-3">
                                        <button
                                            onClick={() => handleDownloadAndClear(inv)}
                                            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold uppercase text-xs rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                            📥 {language === 'sk' ? "Stiahnuť a zmazať" : "Download & Delete"}
                                        </button>
                                        <button
                                            onClick={() => handleClearWithoutDownload(inv.id)}
                                            className="px-3 py-2 bg-red-950/40 hover:bg-red-800 border border-red-900/50 text-red-400 hover:text-white font-extrabold uppercase text-xs rounded-lg transition-all active:scale-95"
                                        >
                                            🗑️ {language === 'sk' ? "Zmazať" : "Delete"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TempInventoriesSection;
