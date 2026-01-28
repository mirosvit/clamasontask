import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../LanguageContext';
import { useData } from '../../context/DataContext';
import { QuickActionConfig } from '../../types/appTypes';
import PartNumberInput from '../PartNumberInput';

const QuickActionTab: React.FC = () => {
    const { t, language } = useLanguage();
    const data = useData();

    const [activeAction, setActiveAction] = useState<QuickActionConfig | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [partnerSearch, setPartnerSearch] = useState('');
    const [qty, setQty] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter and SORT partners alphabetically based on search input
    const filteredPartners = useMemo(() => {
        if (!activeAction) return [];
        const items = activeAction.inputType === 'CUSTOMER' ? data.customers : data.suppliers;
        
        // 1. Filtrácia
        const q = partnerSearch.toLowerCase().trim();
        const filtered = q 
            ? items.filter(i => 
                i.name.toLowerCase().includes(q) || 
                (i.description && i.description.toLowerCase().includes(q))
              )
            : [...items];

        // 2. Abecedné zoradenie (A-Z)
        return filtered.sort((a, b) => a.name.localeCompare(b.name, language === 'sk' ? 'sk' : 'en'));
    }, [activeAction, partnerSearch, data.customers, data.suppliers, language]);

    const handleActionClick = (action: QuickActionConfig) => {
        // AK IDE O ACTIVITY - Vynechávame modal a hneď ukladáme
        if (action.inputType === 'ACTIVITY') {
            handleImmediateSubmit(action);
            return;
        }

        setActiveAction(action);
        setInputValue(action.defaultText || '');
        setPartnerSearch('');
        setQty('1');
    };

    const handleClose = () => {
        setActiveAction(null);
        setInputValue('');
        setPartnerSearch('');
        setQty('1');
    };

    const handleImmediateSubmit = async (action: QuickActionConfig) => {
        setIsSubmitting(true);
        try {
            const op = data.logisticsOperations.find(o => o.id === action.logisticsOpId);
            await data.onAddTask(
                (action.defaultText || action.label).toUpperCase(),
                op?.value || 'Support Activity',
                '1',
                'pcs',
                'NORMAL',
                true,
                action.label, 
                false,
                action.sourceSectorId || op?.defaultSourceSectorId,
                action.targetSectorId || op?.defaultTargetSectorId,
                true, // startNow
                true  // isActivity
            );
            // Alert odstránený na žiadosť používateľa
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        if (!activeAction || !inputValue || !qty) {
            alert(t('fill_all_fields'));
            return;
        }

        setIsSubmitting(true);
        try {
            const op = data.logisticsOperations.find(o => o.id === activeAction.logisticsOpId);
            
            await data.onAddTask(
                inputValue.toUpperCase(),
                op?.value || 'LOGISTIKA',
                qty,
                'pallet',
                'NORMAL',
                true,
                activeAction.label, 
                false,
                activeAction.sourceSectorId || op?.defaultSourceSectorId,
                activeAction.targetSectorId || op?.defaultTargetSectorId,
                true, // startNow parameter
                false // isActivity
            );

            handleClose();
        } catch (e) {
            console.error(e);
            alert("Chyba pri vytváraní rýchlej akcie.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
            {/* HERO SECTION */}
            <div className="bg-slate-900 border border-slate-700 rounded-[2.5rem] p-8 shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
                <div className="w-20 h-20 bg-fuchsia-500/10 rounded-3xl flex items-center justify-center border-2 border-fuchsia-500/30 flex-shrink-0 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{t('tab_quick_action')}</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Bleskové vytváranie a preberanie logistických úloh</p>
                </div>
            </div>

            {/* BUTTON GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.quickActions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        disabled={isSubmitting}
                        className={`group relative h-44 rounded-[2rem] border-2 border-white/5 ${action.color} shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center p-8 text-center`}
                    >
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity rounded-[2rem]"></div>
                        <span className="text-xl font-black text-white uppercase leading-tight tracking-tighter group-hover:scale-110 transition-transform drop-shadow-lg">
                            {action.label}
                        </span>
                        <div className="mt-4 flex items-center gap-2">
                             <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest">
                                {data.logisticsOperations.find(o => o.id === action.logisticsOpId)?.value || 'Logistika'}
                             </span>
                             {action.inputType === 'ACTIVITY' && (
                                <span className="bg-black/40 px-2 py-0.5 rounded text-[8px] font-black text-white uppercase">Support Activity</span>
                             )}
                        </div>
                        <div className="absolute bottom-4 opacity-30 text-white group-hover:opacity-100 transition-opacity">
                            {action.inputType === 'ACTIVITY' ? (
                                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                            )}
                        </div>
                    </button>
                ))}

                {data.quickActions.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] opacity-40">
                         <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Žiadne definované akcie. Kontaktujte Administrátora.</p>
                    </div>
                )}
            </div>

            {/* ACTION MODAL */}
            {activeAction && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" onClick={handleClose}>
                    <div className="bg-slate-900 border-2 border-slate-700 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <div className={`h-4 ${activeAction.color} border-b border-white/10`}></div>
                        
                        <div className="p-8 sm:p-10 space-y-8 sm:space-y-10">
                            <div className="text-center">
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">{activeAction.label}</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Vytvoriť a spustiť úlohu</p>
                            </div>

                            <div className="space-y-8">
                                {/* DYNAMIC INPUT */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">
                                        {activeAction.inputType === 'PART' ? 'ČÍSLO DIELU' : 
                                         activeAction.inputType === 'CUSTOMER' ? 'VÝBER ZÁKAZNÍKA' :
                                         activeAction.inputType === 'SUPPLIER' ? 'VÝBER DODÁVATEĽA' : 'TEXTOVÁ REFERENCIA'}
                                    </label>
                                    
                                    {activeAction.inputType === 'PART' ? (
                                        <PartNumberInput 
                                            parts={Object.keys(data.partsMap)}
                                            value={inputValue}
                                            onPartSelect={(v) => setInputValue(v || '')}
                                            onInputChange={(v) => setInputValue(v.toUpperCase())}
                                            placeholder="NAPR. 3323..."
                                        />
                                    ) : activeAction.inputType === 'CUSTOMER' || activeAction.inputType === 'SUPPLIER' ? (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    value={partnerSearch}
                                                    onChange={e => setPartnerSearch(e.target.value.toUpperCase())}
                                                    placeholder="HĽADAŤ V ZOZNAME..."
                                                    className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 pl-12 text-white font-bold uppercase focus:border-fuchsia-500 outline-none transition-all"
                                                    autoFocus
                                                />
                                                <svg className="absolute left-4 top-3.5 h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                            
                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar border-2 border-slate-800 rounded-2xl bg-slate-950 p-2 space-y-1">
                                                {filteredPartners.map(item => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => setInputValue(item.name)}
                                                        className={`w-full py-5 px-6 rounded-xl font-black uppercase text-sm transition-all text-left flex items-center justify-between border-2 ${inputValue === item.name ? `text-white ${activeAction.color} border-white/20 shadow-lg scale-[1.02]` : 'bg-slate-900 text-white border-white/5 hover:bg-slate-800 hover:border-white/10'}`}
                                                    >
                                                        <span className="truncate">{item.name}</span>
                                                        {inputValue === item.name && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                                    </button>
                                                ))}
                                                {filteredPartners.length === 0 && (
                                                    <div className="py-10 text-center opacity-30">
                                                        <p className="text-xs font-black uppercase tracking-widest">Nič sa nenašlo</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <input 
                                            value={inputValue} 
                                            onChange={e => setInputValue(e.target.value.toUpperCase())}
                                            className="w-full h-16 bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 text-white font-black uppercase text-xl focus:border-fuchsia-500 outline-none transition-all shadow-inner"
                                            placeholder="..."
                                            autoFocus
                                        />
                                    )}
                                </div>

                                {/* QUANTITY */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">POČET PALIET</label>
                                    <div className="flex gap-4">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button 
                                                key={n} 
                                                onClick={() => setQty(String(n))}
                                                className={`flex-1 h-14 rounded-xl font-black text-xl transition-all border-2 ${qty === String(n) ? 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                        <input 
                                            type="number"
                                            value={qty}
                                            onChange={e => setQty(e.target.value)}
                                            className="w-20 h-14 bg-slate-950 border-2 border-slate-800 rounded-xl px-2 text-center text-white font-black text-xl focus:border-fuchsia-500 outline-none"
                                            placeholder="+"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6">
                                <button 
                                    onClick={handleClose}
                                    className="h-16 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all active:scale-95"
                                >
                                    ZRUŠIŤ
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !inputValue}
                                    className={`h-16 ${activeAction.color} hover:brightness-110 disabled:opacity-30 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] border-b-4 border-black/30 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3`}
                                >
                                    {isSubmitting ? '...' : <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> ODOSLAŤ A SPUSTIŤ</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default QuickActionTab;