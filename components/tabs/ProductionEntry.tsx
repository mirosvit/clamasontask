import React, { useEffect } from 'react';
import PartNumberInput from '../PartNumberInput';
import { DBItem, PriorityLevel, MapSector } from '../../types/appTypes';

interface ProductionEntryProps {
  mode: 'production' | 'logistics';
  setMode: (mode: 'production' | 'logistics') => void;
  selectedPart: string | null;
  setSelectedPart: (part: string | null) => void;
  selectedWorkplace: string | null;
  setSelectedWorkplace: (val: string | null) => void;
  logisticsRef: string;
  setLogisticsRef: (val: string) => void;
  logisticsPlate: string;
  setLogisticsPlate: (val: string) => void;
  logisticsOp: string;
  setLogisticsOp: (val: string) => void;
  sourceSector: string | null;
  setSourceSector: (val: string | null) => void;
  targetSector: string | null;
  setTargetSector: (val: string | null) => void;
  quantity: string;
  setQuantity: (val: string) => void;
  quantityUnit: 'pcs' | 'boxes' | 'pallet';
  setQuantityUnit: (val: 'pcs' | 'boxes' | 'pallet') => void;
  priority: PriorityLevel;
  setPriority: (val: PriorityLevel) => void;
  parts: string[];
  workplaces: DBItem[];
  logisticsOperationsList: DBItem[];
  mapSectors: MapSector[];
  t: (key: any, params?: any) => string;
  language: string;
  hasPermission: (perm: string) => boolean;
  handleAdd: () => void;
  onRequestPart: (part: string) => Promise<boolean>;
  isUnitLocked?: boolean;
}

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ProductionEntry: React.FC<ProductionEntryProps> = ({
  mode, setMode, selectedPart, setSelectedPart, selectedWorkplace, setSelectedWorkplace,
  logisticsRef, setLogisticsRef, logisticsPlate, setLogisticsPlate, logisticsOp, setLogisticsOp, 
  sourceSector, setSourceSector, targetSector, setTargetSector,
  quantity, setQuantity, quantityUnit, setQuantityUnit, priority, setPriority, parts, workplaces,
  logisticsOperationsList, mapSectors, t, language, hasPermission, handleAdd, onRequestPart, isUnitLocked
}) => {
  const inputBaseClass = "w-full h-12 bg-gray-700 border border-gray-600 rounded-lg px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono uppercase text-base";

  // AUTOMATICKÉ DOPĹŇANIE SEKTOROV PRI ZMENE OPERÁCIE
  useEffect(() => {
      if (mode === 'logistics' && logisticsOp) {
          const selectedOpData = logisticsOperationsList.find(op => op.value === logisticsOp);
          if (selectedOpData) {
              if (selectedOpData.defaultSourceSectorId) setSourceSector(selectedOpData.defaultSourceSectorId);
              if (selectedOpData.defaultTargetSectorId) setTargetSector(selectedOpData.defaultTargetSectorId);
          }
      }
  }, [logisticsOp, mode, logisticsOperationsList, setSourceSector, setTargetSector]);

  return (
    <div className="h-full flex flex-col items-center animate-fade-in pb-20">
      <div className="w-full max-w-2xl">
        <div className="bg-gray-800 p-5 sm:p-8 rounded-xl shadow-lg border border-gray-700 relative">
          {hasPermission('perm_logistics_mode') && (
            <div className="flex justify-center mb-8 z-10 relative">
              <div className="bg-gray-900 p-1.5 rounded-xl flex border border-gray-600 shadow-inner h-14">
                <button 
                  onClick={() => setMode('production')} 
                  className={`px-5 sm:px-8 rounded-lg font-bold text-base transition-all duration-200 flex items-center gap-2 ${mode === 'production' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  🏭 {t('mode_production')}
                </button>
                <button 
                  onClick={() => setMode('logistics')} 
                  className={`px-5 sm:px-8 rounded-lg font-bold text-base transition-all duration-200 flex items-center gap-2 ${mode === 'logistics' ? 'bg-sky-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  🚛 {t('mode_logistics')}
                </button>
              </div>
            </div>
          )}
          <h1 className={`text-3xl sm:text-4xl font-extrabold text-center mb-3 ${mode === 'production' ? 'text-teal-400' : 'text-sky-400'}`}>
            {t('search_title')}
          </h1>
          <p className="text-gray-400 text-center mb-8 text-base">{t('search_subtitle')}</p>
          <div className="space-y-6 sm:space-y-8">
            {mode === 'production' ? (
              <>
                <div>
                  <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">
                    {t('part_number')} <span className="text-teal-500">*</span>
                  </label>
                  <PartNumberInput 
                    parts={parts} 
                    onPartSelect={setSelectedPart} 
                    placeholder={t('part_placeholder')} 
                    value={selectedPart} 
                    onRequestPart={onRequestPart} 
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">
                    {t('workplace')} <span className="text-teal-500">*</span>
                  </label>
                  <div className="relative">
                    <select 
                      value={selectedWorkplace || ''} 
                      onChange={(e) => setSelectedWorkplace(e.target.value)} 
                      className="block appearance-none w-full h-12 bg-gray-700 border border-gray-600 text-white px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors font-mono uppercase text-base"
                    >
                      <option value="" className="font-sans normal-case">{t('workplace_placeholder')}</option>
                      {workplaces.map((wp) => (<option key={wp.id} value={wp.value}>{wp.value}</option>))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                      <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">
                    {t('log_reference')} <span className="text-sky-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={logisticsRef} 
                    onChange={(e) => setLogisticsRef(e.target.value.toUpperCase())} 
                    placeholder={t('log_reference_place')} 
                    className={`${inputBaseClass} focus:ring-sky-500`} 
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">
                    {t('log_plate')} <span className="text-gray-500 text-[10px] font-normal lowercase tracking-normal ml-2">{t('optional_label')}</span>
                  </label>
                  <input 
                    type="text" 
                    value={logisticsPlate} 
                    onChange={(e) => setLogisticsPlate(e.target.value.toUpperCase())} 
                    placeholder={t('log_plate_placeholder')} 
                    className={`${inputBaseClass} focus:ring-sky-500`} 
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">
                    {t('log_operation')} <span className="text-sky-500">*</span>
                  </label>
                  <div className="relative">
                    <select 
                      value={logisticsOp} 
                      onChange={(e) => setLogisticsOp(e.target.value)} 
                      className="block appearance-none w-full h-12 bg-gray-700 border border-gray-600 text-white px-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors font-mono uppercase text-base"
                    >
                      <option value="" className="font-sans normal-case">{t('workplace_placeholder')}</option>
                      {logisticsOperationsList.map((op) => (<option key={op.id} value={op.value}>{op.value}</option>))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                      <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                {/* --- SECTOR SELECTORS FOR ALL LOGISTICS OPERATIONS --- */}
                <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-xl border border-gray-600/50 animate-fade-in">
                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">
                            ZDROJ (ODKIAĽ)
                        </label>
                        <select 
                            value={sourceSector || ''} 
                            onChange={(e) => setSourceSector(e.target.value || null)} 
                            className="block w-full h-10 bg-gray-800 border border-gray-600 text-white px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors font-mono uppercase text-xs"
                        >
                            <option value="">- Výber -</option>
                            {[...mapSectors].sort((a,b) => (a.order||0)-(b.order||0)).map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide">
                            CIEĽ (KAM)
                        </label>
                        <select 
                            value={targetSector || ''} 
                            onChange={(e) => setTargetSector(e.target.value || null)} 
                            className="block w-full h-10 bg-gray-800 border border-gray-600 text-white px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors font-mono uppercase text-xs"
                        >
                            <option value="">- Výber -</option>
                            {[...mapSectors].sort((a,b) => (a.order||0)-(b.order||0)).map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">
                {t('quantity')} <span className={`${mode === 'production' ? 'text-teal-500' : 'text-sky-500'}`}>*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="number" 
                  inputMode="decimal" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value.slice(0, 7))} 
                  maxLength={7}
                  className={`${inputBaseClass} sm:w-1/2 ${mode === 'production' ? 'focus:ring-teal-500' : 'focus:ring-sky-500'}`} 
                  placeholder={t('pcs_placeholder')} 
                />
                <div className="flex w-full sm:w-1/2 h-12 bg-gray-700 rounded-lg p-1.5 border border-gray-600">
                  <button 
                    onClick={() => setQuantityUnit('pcs')} 
                    disabled={mode === 'logistics' || isUnitLocked} 
                    className={`flex-1 rounded-md text-xs font-black uppercase transition-all ${quantityUnit === 'pcs' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} ${mode === 'logistics' ? 'opacity-10 cursor-not-allowed grayscale' : ''} ${isUnitLocked && quantityUnit !== 'pcs' ? 'opacity-20 cursor-not-allowed' : ''}`}
                  >
                    {t('unit_pcs_short')}
                  </button>
                  <button 
                    onClick={() => setQuantityUnit('boxes')} 
                    disabled={isUnitLocked}
                    className={`flex-1 rounded-md text-xs font-black uppercase transition-all ${quantityUnit === 'boxes' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} ${isUnitLocked && quantityUnit !== 'boxes' ? 'opacity-20 cursor-not-allowed' : ''}`}
                  >
                    {t('unit_boxes_short')}
                  </button>
                  <button 
                    onClick={() => setQuantityUnit('pallet')} 
                    disabled={isUnitLocked}
                    className={`flex-1 rounded-md text-xs font-black uppercase transition-all ${quantityUnit === 'pallet' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} ${isUnitLocked && quantityUnit !== 'pallet' ? 'opacity-20 cursor-not-allowed' : ''}`}
                  >
                    {t('unit_pallet_short')}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-base font-bold mb-2 uppercase tracking-wide">{t('priority_label')}</label>
              <div className="flex h-12 bg-gray-700 rounded-lg p-1.5 border border-gray-600">
                <button onClick={() => setPriority('LOW')} className={`flex-1 rounded-md text-xs font-black uppercase transition-all ${priority === 'LOW' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{t('prio_low')}</button>
                <button onClick={() => setPriority('NORMAL')} className={`flex-1 rounded-md text-xs font-black uppercase transition-all ${priority === 'NORMAL' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{t('prio_normal')}</button>
                <button onClick={() => setPriority('URGENT')} className={`flex-1 rounded-md text-xs font-black uppercase transition-all ${priority === 'URGENT' ? 'bg-red-600 text-white shadow-md animate-pulse' : 'text-gray-400 hover:text-white'}`}>{t('prio_urgent')}</button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button 
                onClick={handleAdd} 
                className={`w-full text-white font-bold py-5 px-6 rounded-xl shadow-lg transform transition-all duration-150 active:scale-95 flex items-center justify-center gap-3 text-lg ${mode === 'production' ? 'bg-teal-600 hover:bg-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.4)]' : 'bg-sky-600 hover:bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]'}`}
              >
                <PlusIcon className="w-8 h-8" />
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