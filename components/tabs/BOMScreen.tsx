
import React, { useState, useMemo } from 'react';
import PartNumberInput from '../PartNumberInput';
import { DBItem, BOMItem, PriorityLevel } from '../../App';

interface BOMScreenProps {
  parts: DBItem[];
  workplaces: DBItem[];
  bomItems: BOMItem[];
  onAddTask: (partNumber: string, workplace: string | null, quantity: string | null, quantityUnit: string | null, priority: PriorityLevel, isLogistics?: boolean) => void;
  onRequestBOM: (parent: string) => Promise<boolean>;
  t: (key: any, params?: any) => string;
  language: string;
}

const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const BOMScreen: React.FC<BOMScreenProps> = ({ 
  parts, 
  workplaces, 
  bomItems, 
  onAddTask, 
  onRequestBOM, 
  t, 
  language 
}) => {
  const [bomParentQuery, setBomParentQuery] = useState('');
  const [bomQuantity, setBomQuantity] = useState('');
  const [bomSelectedWorkplace, setBomSelectedWorkplace] = useState<string | null>(null);
  const [clickedBOMTasks, setClickedBOMTasks] = useState<Set<string>>(new Set());
  const [bomRequestStatus, setBomRequestStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [displayedBomParent, setDisplayedBomParent] = useState<string | null>(null);
  const [displayedBomQuantity, setDisplayedBomQuantity] = useState<number | null>(null);

  const handleCalculateBOM = () => {
    if (!bomParentQuery || !bomQuantity || parseFloat(bomQuantity) <= 0) {
        alert(t('bom_invalid_input')); 
        return;
    }
    setDisplayedBomParent(bomParentQuery);
    setDisplayedBomQuantity(parseFloat(bomQuantity));
    setClickedBOMTasks(new Set());
  };

  const handleCreateBOMTask = (childPart: string, qty: number) => {
    if (!bomSelectedWorkplace) {
        alert(t('select_bom_workplace'));
        return;
    }
    onAddTask(childPart, bomSelectedWorkplace, qty.toString(), 'pcs', 'NORMAL', false);
    setClickedBOMTasks(prev => new Set(prev).add(childPart));
  };

  const handleCreateAllBOMTasks = (results: any[]) => {
      if (!bomSelectedWorkplace) {
          alert(t('select_bom_workplace'));
          return;
      }
      results.forEach(res => {
          if (!clickedBOMTasks.has(res.childPart)) {
              handleCreateBOMTask(res.childPart, res.requiredQty);
          }
      });
  };

  const handleRequestNewBOM = async () => {
      if (!bomParentQuery) return;
      setBomRequestStatus('loading');
      const success = await onRequestBOM(bomParentQuery);
      if (success) {
          setBomRequestStatus('success');
          setTimeout(() => setBomRequestStatus('idle'), 3000);
      } else {
          setBomRequestStatus('idle');
      }
  };

  const bomResults = useMemo(() => {
    if (!displayedBomParent || !displayedBomQuantity) return [];
    return bomItems
        .filter(item => item.parentPart === displayedBomParent)
        .map(item => ({
            ...item,
            requiredQty: Math.ceil(item.quantity * displayedBomQuantity)
        }));
  }, [displayedBomParent, displayedBomQuantity, bomItems]);

  return (
    <div className="h-full animate-fade-in pb-20">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-teal-500/20 rounded-lg">
                                <ClipboardListIcon className="w-8 h-8 text-teal-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{t('bom_title')}</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">{t('bom_parent')}</label>
                                <PartNumberInput 
                                    parts={parts.map(p => p.value)} 
                                    value={bomParentQuery} 
                                    onInputChange={(val) => setBomParentQuery(val)} 
                                    onPartSelect={(val) => { if (val) setBomParentQuery(val); }} 
                                    placeholder={t('part_placeholder')} 
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">{t('bom_qty')}</label>
                                <input 
                                    type="number" 
                                    inputMode="numeric"
                                    value={bomQuantity} 
                                    onChange={(e) => setBomQuantity(e.target.value)} 
                                    className="w-full h-12 px-4 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-base uppercase" 
                                    placeholder="500" 
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">{t('bom_select_wp')}</label>
                                <select 
                                    value={bomSelectedWorkplace || ''} 
                                    onChange={(e) => setBomSelectedWorkplace(e.target.value)} 
                                    className="w-full h-12 px-4 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono uppercase text-base"
                                >
                                    <option value="" className="font-sans normal-case">{t('workplace_placeholder')}</option>
                                    {workplaces.map(wp => <option key={wp.id} value={wp.value}>{wp.value}</option>)}
                                </select>
                            </div>
                            
                            <button 
                                onClick={handleCalculateBOM} 
                                className="w-full h-14 bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-900/20 transform transition-all active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
                            >
                                <ActivityIcon className="h-6 w-6" />
                                {t('bom_calc_btn')}
                            </button>

                            {bomParentQuery && bomResults.length === 0 && (
                                <button 
                                    onClick={handleRequestNewBOM}
                                    disabled={bomRequestStatus !== 'idle'}
                                    className={`w-full h-12 rounded-xl border text-base font-bold transition-all uppercase tracking-wide ${
                                        bomRequestStatus === 'success' ? 'bg-green-600 border-green-500 text-white' : 
                                        bomRequestStatus === 'loading' ? 'bg-gray-700 border-gray-600 text-gray-400 animate-pulse' :
                                        'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {bomRequestStatus === 'loading' ? '...' : bomRequestStatus === 'success' ? t('bom_req_success') : t('bom_request_btn')}
                                </button>
                            )}
                        </div>
                    </div>

                    {bomResults.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md">
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{language === 'sk' ? 'Komponenty' : 'Components'}</p>
                                <p className="text-3xl font-black text-white mt-1">{bomResults.length}</p>
                            </div>
                            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md">
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{language === 'sk' ? 'Zostáva' : 'Remaining'}</p>
                                <p className="text-3xl font-black text-orange-400 mt-1">{bomResults.length - clickedBOMTasks.size}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-8">
                    {bomResults.length > 0 ? (
                        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden flex flex-col h-full">
                            <div className="p-6 sm:p-8 border-b border-gray-700 flex justify-between items-center bg-gray-900/40">
                                <div>
                                    <h3 className="text-2xl font-black text-white font-mono uppercase tracking-tight">
                                        {displayedBomParent}
                                    </h3>
                                    <p className="text-base text-gray-500 mt-1">
                                        {t('bom_results')} <span className="text-teal-400 font-black">{displayedBomQuantity} ks</span>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleCreateAllBOMTasks(bomResults)}
                                    className="bg-sky-600 hover:bg-sky-500 text-white px-8 py-3.5 rounded-xl text-base font-black shadow-lg transition-all active:scale-95 flex items-center gap-3 uppercase tracking-widest border-2 border-sky-500"
                                >
                                    🚀 {language === 'sk' ? 'Odoslať Všetko' : 'Send All'}
                                </button>
                            </div>

                            <div className="overflow-x-auto flex-grow custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-900/50 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-700">
                                        <tr>
                                            <th className="py-5 px-8">{t('bom_child')}</th>
                                            <th className="py-5 px-8 text-center">{language === 'sk' ? 'Spotreba/ks' : 'Usage/pc'}</th>
                                            <th className="py-5 px-8 text-right">{t('bom_req_qty')}</th>
                                            <th className="py-5 px-8 text-center">{language === 'sk' ? 'Akcia' : 'Action'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {bomResults.map((res) => {
                                            const isSent = clickedBOMTasks.has(res.childPart);
                                            return (
                                                <tr key={res.childPart} className={`transition-colors ${isSent ? 'bg-teal-500/5 opacity-60' : 'hover:bg-gray-700/30'}`}>
                                                    <td className="py-6 px-8">
                                                        <p className={`font-mono font-bold text-base ${isSent ? 'text-gray-500' : 'text-white'}`}>{res.childPart}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Standard Component</p>
                                                    </td>
                                                    <td className="py-6 px-8 text-center text-gray-400 font-mono text-sm">
                                                        {res.quantity}
                                                    </td>
                                                    <td className="py-6 px-8 text-right">
                                                        <span className={`text-xl font-black font-mono ${isSent ? 'text-gray-500' : 'text-teal-400'}`}>
                                                            {res.requiredQty} <span className="text-xs font-normal opacity-70">ks</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-6 px-8 text-center">
                                                        <button 
                                                            onClick={() => !isSent && handleCreateBOMTask(res.childPart, res.requiredQty)}
                                                            disabled={isSent}
                                                            className={`inline-flex items-center justify-center h-14 w-14 rounded-xl transition-all shadow-lg border-2 ${
                                                                isSent ? 'bg-gray-700 text-teal-500 border-gray-600' : 'bg-teal-600/20 text-teal-400 hover:bg-teal-600 hover:text-white border-teal-500/30 active:scale-90'
                                                            }`}
                                                        >
                                                            {isSent ? <CheckCircleIcon className="w-8 h-8" /> : <PlusIcon className="w-8 h-8" />}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700 p-12 text-center shadow-inner">
                            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-6 shadow-xl border border-gray-600">
                                <SearchIcon className="w-12 h-12 text-gray-500" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-400 mb-3 uppercase tracking-tighter">{language === 'sk' ? 'Žiadne dáta na zobrazenie' : 'No data to display'}</h3>
                            <p className="text-gray-500 max-w-xs text-base font-medium leading-relaxed">{language === 'sk' ? 'Zadajte číslo výrobku a plánované množstvo pre výpočet potrebného materiálu.' : 'Enter product number and planned quantity to calculate required material.'}</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    </div>
  );
};

export default BOMScreen;
