import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { useData } from '../../context/DataContext';
import { QuickActionConfig } from '../../types/appTypes';

const COLORS = [
    { id: 'bg-teal-600', label: 'Teal' },
    { id: 'bg-blue-600', label: 'Blue' },
    { id: 'bg-sky-600', label: 'Sky' },
    { id: 'bg-indigo-600', label: 'Indigo' },
    { id: 'bg-fuchsia-600', label: 'Fuchsia' },
    { id: 'bg-rose-600', label: 'Rose' },
    { id: 'bg-amber-600', label: 'Amber' },
    { id: 'bg-emerald-600', label: 'Emerald' }
];

const QuickActionArchitectSection: React.FC = () => {
    const { t } = useLanguage();
    const data = useData();

    const [label, setLabel] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0].id);
    const [inputType, setInputType] = useState<QuickActionConfig['inputType']>('TEXT');
    const [logisticsOpId, setLogisticsOpId] = useState('');
    const [sourceSectorId, setSourceSectorId] = useState('');
    const [targetSectorId, setTargetSectorId] = useState('');
    const [defaultText, setDefaultText] = useState('');

    const handleSave = async () => {
        if (!label || !logisticsOpId) {
            alert("Vyplňte názov a operáciu.");
            return;
        }

        await data.onAddQuickAction({
            label: label.toUpperCase(),
            color: selectedColor,
            inputType,
            logisticsOpId,
            sourceSectorId: sourceSectorId || null,
            targetSectorId: targetSectorId || null,
            defaultText: defaultText || null
        });

        // Reset
        setLabel(''); setLogisticsOpId(''); setSourceSectorId(''); setTargetSectorId(''); setDefaultText('');
    };

    const cardClass = "bg-slate-900/60 border border-slate-700/50 rounded-3xl p-6 shadow-xl";
    const labelClass = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2";
    const inputClass = "w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white text-sm font-bold focus:border-fuchsia-500 outline-none transition-all uppercase";

    return (
        <div className="space-y-8 animate-fade-in text-slate-200">
            {/* EDITOR */}
            <div className="bg-gray-800/40 border border-slate-700/50 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-8">
                    <div className="p-4 bg-fuchsia-500/10 rounded-2xl border border-fuchsia-500/30 text-fuchsia-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">ARCHITECT</h3>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Definujte nové tlačidlá pre rýchle akcie</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className={labelClass}>Názov tlačidla (Zobrazí sa skladníkovi)</label>
                            <input value={label} onChange={e => setLabel(e.target.value)} className={inputClass} placeholder="NAPR. VYKLÁDKA KAMIÓNU" />
                        </div>
                        <div>
                            <label className={labelClass}>Vizuálna farba</label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map(c => (
                                    <button 
                                        key={c.id} 
                                        onClick={() => setSelectedColor(c.id)}
                                        className={`w-10 h-10 rounded-xl transition-all border-4 ${c.id} ${selectedColor === c.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className={labelClass}>Logistická Operácia (Priradená norma)</label>
                            <select value={logisticsOpId} onChange={e => setLogisticsOpId(e.target.value)} className={inputClass}>
                                <option value="">-- VÝBER --</option>
                                {data.logisticsOperations.map(op => <option key={op.id} value={op.id}>{op.value}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Typ vstupu (Čo bude skladník zadávať?)</label>
                            <select value={inputType} onChange={e => setInputType(e.target.value as any)} className={inputClass}>
                                <option value="TEXT">VOĽNÝ TEXT</option>
                                <option value="PART">ČÍSLO DIELU (KATALÓG)</option>
                                <option value="CUSTOMER">VÝBER ZÁKAZNÍKA (CSDB)</option>
                                <option value="SUPPLIER">VÝBER DODÁVATEĽA (CSDB)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Predvolený Zdroj</label>
                                <select value={sourceSectorId} onChange={e => setSourceSectorId(e.target.value)} className={inputClass}>
                                    <option value="">-- AUTO --</option>
                                    {data.mapSectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Predvolený Cieľ</label>
                                <select value={targetSectorId} onChange={e => setTargetSectorId(e.target.value)} className={inputClass}>
                                    <option value="">-- AUTO --</option>
                                    {data.mapSectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Prednastavený Text (Voliteľné)</label>
                            <input value={defaultText} onChange={e => setDefaultText(e.target.value)} className={inputClass} placeholder="NAPR. URGENT" />
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex justify-end">
                    <button 
                        onClick={handleSave}
                        className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black px-12 py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-[0.2em] text-xs border-b-4 border-fuchsia-800"
                    >
                        Vytvoriť akciu
                    </button>
                </div>
            </div>

            {/* LIST OF ACTIONS */}
            <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Existujúce rýchle akcie ({data.quickActions.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.quickActions.map(action => (
                        <div key={action.id} className="bg-slate-900 border border-slate-700 p-5 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-10 rounded-full ${action.color}`}></div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase">{action.label}</p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{action.inputType} • {data.logisticsOperations.find(o => o.id === action.logisticsOpId)?.value || 'Neznáma op.'}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => data.onDeleteQuickAction(action.id)}
                                className="p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuickActionArchitectSection;