
import React, { useMemo } from 'react';
import PartNumberInput from '../PartNumberInput';
import { DBItem, PriorityLevel } from '../../App';

interface ProductionEntryProps {
  mode: 'production' | 'logistics';
  setMode: (mode: 'production' | 'logistics') => void;
  selectedPart: DBItem | null;
  setSelectedPart: (part: DBItem | null) => void;
  selectedWorkplace: string | null;
  setSelectedWorkplace: (val: string | null) => void;
  logisticsRef: string;
  setLogisticsRef: (val: string) => void;
  logisticsOp: string;
  setLogisticsOp: (val: string) => void;
  quantity: string;
  setQuantity: (val: string) => void;
  quantityUnit: 'pcs' | 'boxes' | 'pallet';
  setQuantityUnit: (val: 'pcs' | 'boxes' | 'pallet') => void;
  priority: PriorityLevel;
  setPriority: (val: PriorityLevel) => void;
  parts: DBItem[];
  workplaces: DBItem[];
  logisticsOperationsList: DBItem[];
  t: (key: any, params?: any) => string;
  language: string;
  hasPermission: (perm: string) => boolean;
  handleAdd: () => void;
  onRequestPart: (part: string) => Promise<boolean>;
}

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ProductionEntry: React.FC<ProductionEntryProps> = ({
  mode, setMode, selectedPart, setSelectedPart, selectedWorkplace, setSelectedWorkplace,
  logisticsRef, setLogisticsRef, logisticsOp, setLogisticsOp, quantity, setQuantity,
  quantityUnit, setQuantityUnit, priority, setPriority, parts, workplaces,
  logisticsOperationsList, t, language, hasPermission, handleAdd, onRequestPart
}) => {
  const inputBaseClass = "w-full h-10 bg-gray-700 border border-gray-600 rounded-lg px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-mono uppercase text-sm";

  const partNumbers = useMemo(() => parts.map(p => p.value), [parts]);

  return (
    <div className="h-full flex flex-col items-center animate-fade-in pb-20">
      <div className="w-full max-w-2xl">
        <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700 relative overflow-hidden">
          {hasPermission('perm_logistics_mode') && (
            <div className="flex justify-center mb-6 z-10 relative">
              <div className="bg-gray-900 p-1 rounded-lg flex border border-gray-600 shadow-inner h-12">
                <button 
                  onClick={() => setMode('production')} 
                  className={`px-4 sm:px-6 rounded-md font-bold text-sm transition-all duration-200 flex items-center gap-2 ${mode === 'production' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  🏭 {t('mode_production')}
                </button>
                <button 
                  onClick={() => setMode('logistics')} 
                  className={`px-4 sm:px-6 rounded-md font-bold text-sm transition-all duration-200 flex items-center gap-2 ${mode === 'logistics' ? 'bg-sky-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  🚛 {t('mode_logistics')}
                </button>
              </div>
            </div>
          )}
          <h1 className={`text-2xl sm:text-3xl font-extrabold text-center mb-2 ${mode === 'production' ? 'text-teal-400' : 'text-sky-400'}`}>
            {t('search_title')}
          </h1>
          <p className="text-gray-400 text-center mb-6 text-sm">{t('search_subtitle')}</p>
          <div className="space-y-4 sm:space-y-6">
            {mode === 'production' ? (
              <>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('part_number')}</label>
                  <PartNumberInput 
                    parts={partNumbers} 
                    onPartSelect={(p) => setSelectedPart(p ? (parts.find(i => i.value === p) || null) : null)} 
                    placeholder={t('part_placeholder')} 
                    value={selectedPart ? selectedPart.value : ''} 
                    onRequestPart={onRequestPart} 
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('workplace')}</label>
                  <div className="relative">
                    <select 
                      value={selectedWorkplace || ''} 
                      onChange={(e) => setSelectedWorkplace(e.target.value)} 
                      className="block appearance-none w-full h-10 bg-gray-700 border border-gray-600 text-white px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors font-mono uppercase text-sm"
                    >
                      <option value="" className="font-sans normal-case">{t('workplace_placeholder')}</option>
                      {workplaces.map((wp) => (<option key={wp.id} value={wp.value}>{wp.value}</option>))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('log_reference')}</label>
                  <input 
                    type="text" 
                    value={logisticsRef} 
                    onChange={(e) => setLogisticsRef(e.target.value)} 
                    placeholder={t('log_reference_place')} 
                    className={`${inputBaseClass} focus:ring-sky-500`} 
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('log_operation')}</label>
                  <div className="relative">
                    <select 
                      value={logisticsOp} 
                      onChange={(e) => setLogisticsOp(e.target.value)} 
                      className="block appearance-none w-full h-10 bg-gray-700 border border-gray-600 text-white px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors font-mono uppercase text-sm"
                    >
                      <option value="" className="font-sans normal-case">{t('workplace_placeholder')}</option>
                      {logisticsOperationsList.map((op) => (<option key={op.id} value={op.value}>{op.value}</option>))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('quantity')}</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="number" 
                  inputMode="decimal" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  className={`${inputBaseClass} sm:w-1/2 ${mode === 'production' ? 'focus:ring-teal-500' : 'focus:ring-sky-500'}`} 
                  placeholder={t('pcs_placeholder')} 
                />
                <div className="flex w-full sm:w-1/2 h-10 bg-gray-700 rounded-lg p-1 border border-gray-600">
                  <button 
                    onClick={() => setQuantityUnit('pcs')} 
                    disabled={mode === 'logistics'} 
                    className={`flex-1 rounded text-[10px] font-black uppercase transition-all ${quantityUnit === 'pcs' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} ${mode === 'logistics' ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {t('unit_pcs_short')}
                  </button>
                  <button 
                    onClick={() => setQuantityUnit('boxes')} 
                    className={`flex-1 rounded text-[10px] font-black uppercase transition-all ${quantityUnit === 'boxes' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  >
                    {t('unit_boxes_short')}
                  </button>
                  <button 
                    onClick={() => setQuantityUnit('pallet')} 
                    className={`flex-1 rounded text-[10px] font-black uppercase transition-all ${quantityUnit === 'pallet' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  >
                    {t('unit_pallet_short')}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('priority_label')}</label>
              <div className="flex h-10 bg-gray-700 rounded-lg p-1 border border-gray-600">
                <button onClick={() => setPriority('LOW')} className={`flex-1 rounded text-[10px] font-black uppercase transition-all ${priority === 'LOW' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{t('prio_low')}</button>
                <button onClick={() => setPriority('NORMAL')} className={`flex-1 rounded text-[10px] font-black uppercase transition-all ${priority === 'NORMAL' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{t('prio_normal')}</button>
                <button onClick={() => setPriority('URGENT')} className={`flex-1 rounded text-[10px] font-black uppercase transition-all ${priority === 'URGENT' ? 'bg-red-600 text-white shadow-md animate-pulse' : 'text-gray-400 hover:text-white'}`}>{t('prio_urgent')}</button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={handleAdd} 
                className={`w-full text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 ${mode === 'production' ? 'bg-teal-600 hover:bg-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.4)]' : 'bg-sky-600 hover:bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]'}`}
              >
                <PlusIcon className="w-6 h-6" />
                {t('send_btn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionEntry;
