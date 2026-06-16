import React, { useState, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ScrapBin, ScrapMetal, ScrapConfig, DBItem, ScrapBuyer } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface ScrapSectionProps {
  bins: ScrapBin[];
  metals: ScrapMetal[];
  scrapConfig: ScrapConfig;
  logisticsOperations: DBItem[];
  scrapBuyers: ScrapBuyer[];
  onAddBin: (name: string, tara: number) => Promise<void>;
  onBatchAddBins: (lines: string[]) => Promise<void>;
  onDeleteBin: (id: string) => Promise<void>;
  onUpdateBin: (id: string, updates: Partial<ScrapBin>) => Promise<void>;
  onAddMetal: (type: string, description: string) => Promise<void>;
  onDeleteMetal: (id: string) => Promise<void>;
  onUpdateMetal: (id: string, updates: Partial<ScrapMetal>) => Promise<void>;
  onUpdateScrapConfig: (config: Partial<ScrapConfig>) => Promise<void>;
  onAddBuyer: (name: string, color: string) => Promise<void>;
  onDeleteBuyer: (id: string) => Promise<void>;
  onUpdateBuyer: (id: string, updates: Partial<ScrapBuyer>) => Promise<void>;
}

const Icons = {
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Money: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Scale: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>,
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Truck: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
  Import: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
};

export const getBuyerColorClasses = (color: string) => {
  switch (color) {
    case 'indigo': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30';
    case 'emerald': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    case 'amber': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    case 'rose': return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
    case 'violet': return 'bg-violet-500/10 text-violet-400 border border-violet-500/30';
    case 'cyan': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
    case 'orange': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
    case 'blue': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
    case 'pink': return 'bg-pink-500/10 text-pink-400 border border-pink-500/30';
    case 'purple': return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
    case 'teal': return 'bg-teal-500/10 text-teal-400 border border-teal-500/30';
    default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
  }
};

const ScrapSection: React.FC<ScrapSectionProps> = memo((props) => {
  const { t, language } = useLanguage();
  
  // Search States
  const [binQuery, setBinQuery] = useState('');
  const [metalQuery, setMetalQuery] = useState('');
  const [buyerQuery, setBuyerQuery] = useState('');

  // Modals
  const [modalType, setModalType] = useState<'bin' | 'metal' | 'import_bins' | 'buyer' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [binName, setBinName] = useState('');
  const [binTara, setBinTara] = useState('');
  const [bulkBins, setBulkBins] = useState('');
  const [metalType, setMetalType] = useState('');
  const [metalDesc, setMetalDesc] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerColor, setBuyerColor] = useState('indigo');

  // Filtered Lists
  const filteredBins = useMemo(() => {
    const q = binQuery.toLowerCase().trim();
    if (!q) return props.bins;
    return props.bins.filter(b => b.name.toLowerCase().includes(q));
  }, [props.bins, binQuery]);

  const filteredMetals = useMemo(() => {
    const q = metalQuery.toLowerCase().trim();
    if (!q) return props.metals;
    return props.metals.filter(m => 
      m.type.toLowerCase().includes(q) || 
      m.description.toLowerCase().includes(q)
    );
  }, [props.metals, metalQuery]);

  const filteredBuyers = useMemo(() => {
    const q = buyerQuery.toLowerCase().trim();
    if (!q) return props.scrapBuyers;
    return props.scrapBuyers.filter(b => b.name.toLowerCase().includes(q));
  }, [props.scrapBuyers, buyerQuery]);

  const resetForms = () => {
    setBinName(''); setBinTara(''); setBulkBins('');
    setMetalType(''); setMetalDesc('');
    setBuyerName(''); setBuyerColor('indigo');
    setEditingId(null);
    setModalType(null);
  };

  const handleEditBin = (bin: ScrapBin) => {
    setBinName(bin.name); setBinTara(bin.tara.toString());
    setEditingId(bin.id); setModalType('bin');
  };

  const handleEditMetal = (m: ScrapMetal) => {
    setMetalType(m.type); setMetalDesc(m.description);
    setEditingId(m.id); setModalType('metal');
  };

  const handleEditBuyer = (b: ScrapBuyer) => {
    setBuyerName(b.name); setBuyerColor(b.color);
    setEditingId(b.id); setModalType('buyer');
  };

  const handleBatchBinsSubmit = () => {
    if (bulkBins) {
        props.onBatchAddBins(bulkBins.split('\n'));
        resetForms();
    }
  };

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden";
  const labelClass = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
  const inputClass = "w-full h-12 bg-slate-900/50 border-2 border-slate-700/50 rounded-xl px-4 text-white text-sm font-bold focus:outline-none focus:border-teal-500/50 transition-all font-mono uppercase";
  const searchInputClass = "w-full h-10 bg-slate-950/50 border border-slate-800 rounded-lg pl-10 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 transition-all uppercase font-bold";
  const modalOverlayClass = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in";
  const modalContentClass = "bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg p-8 relative";

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SYSTEM CONFIG - LOGISTICS LINK */}
      <div className="bg-indigo-900/10 border-2 border-indigo-500/30 rounded-[2rem] p-8 shadow-xl ring-1 ring-indigo-500/20 mb-8">
          <div className="flex items-center gap-4 mb-8 border-b border-indigo-500/20 pb-6">
              <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                  <Icons.Truck />
              </div>
              <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">PRIRADENIE OPERÁCIE</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Zvoľte logistickú operáciu pre úlohu "VÁŽENIE ŠROTU"</p>
              </div>
          </div>

          <div className="max-w-md">
              <label className={labelClass}>LOGISTICKÁ OPERÁCIA</label>
              <select 
                  value={props.scrapConfig.scrapLogisticsOpId || ''}
                  onChange={(e) => props.onUpdateScrapConfig({ scrapLogisticsOpId: e.target.value })}
                  className="w-full h-14 bg-slate-950 border-2 border-indigo-500/30 rounded-2xl px-6 text-white font-black uppercase text-xs focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                  <option value="">-- NEVYBRANÉ --</option>
                  {props.logisticsOperations.map(op => (
                      <option key={op.id} value={op.id}>{op.value}</option>
                  ))}
              </select>
              <p className="text-[9px] text-slate-600 mt-3 italic font-bold uppercase tracking-widest leading-relaxed">
                  * Táto operácia sa automaticky nastaví ako "pracovisko" pri spustení relácie váženia, čo zabezpečí správne KPI a výpočty trás.
              </p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* BIN DATABASE */}
        <div className={cardClass}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              {t('scrap_bins')}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setModalType('import_bins')} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all shadow-lg active:scale-95 border border-slate-700" title="Hromadný import">
                <Icons.Import />
              </button>
              <button onClick={() => setModalType('bin')} className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-all shadow-lg active:scale-95">
                <Icons.Plus />
              </button>
            </div>
          </div>
          
          <div className="relative mb-4">
            <input 
              type="text" 
              value={binQuery} 
              onChange={e => setBinQuery(e.target.value)} 
              placeholder="HĽADAŤ KONTAJNER..." 
              className={searchInputClass}
            />
            <div className="absolute left-3 top-3 text-slate-700"><Icons.Search /></div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {filteredBins.map(bin => (
              <div key={bin.id} className="bg-slate-950/30 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-slate-900/50 transition-colors">
                <div>
                   <p className="text-sm font-black text-white uppercase tracking-tight">{bin.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">Tara: <span className="text-blue-400 font-bold">{bin.tara} kg</span></p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditBin(bin)} className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-md transition-colors"><Icons.Edit /></button>
                  <button onClick={() => { if(window.confirm('Zmazať?')) props.onDeleteBin(bin.id); }} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-800 rounded-md transition-colors"><Icons.Trash /></button>
                </div>
              </div>
            ))}
            {filteredBins.length === 0 && <p className="text-center py-8 text-xs text-slate-600 italic font-bold uppercase tracking-widest">{binQuery ? 'Nič sa nenašlo' : t('scrap_no_bins')}</p>}
          </div>
        </div>

        {/* METAL DATABASE */}
        <div className={cardClass}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="w-2 h-6 bg-teal-500 rounded-full"></span>
              {t('scrap_metals')}
            </h3>
            <button onClick={() => setModalType('metal')} className="p-2 bg-teal-600 rounded-lg text-white hover:bg-teal-500 transition-all shadow-lg active:scale-95">
              <Icons.Plus />
            </button>
          </div>

          <div className="relative mb-4">
            <input 
              type="text" 
              value={metalQuery} 
              onChange={e => setMetalQuery(e.target.value)} 
              placeholder="HĽADAŤ KOV / POPIS..." 
              className={searchInputClass}
            />
            <div className="absolute left-3 top-3 text-slate-700"><Icons.Search /></div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {filteredMetals.map(m => (
              <div key={m.id} className="bg-slate-950/30 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-slate-900/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white uppercase tracking-tight truncate">{m.type}</p>
                  <p className="text-[10px] text-slate-500 italic truncate pr-4">{m.description}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => handleEditMetal(m)} className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-md transition-colors"><Icons.Edit /></button>
                  <button onClick={() => { if(window.confirm('Zmazať?')) props.onDeleteMetal(m.id); }} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-800 rounded-md transition-colors"><Icons.Trash /></button>
                </div>
              </div>
            ))}
            {filteredMetals.length === 0 && <p className="text-center py-8 text-xs text-slate-600 italic font-bold uppercase tracking-widest">{metalQuery ? 'Nič sa nenašlo' : t('scrap_no_metals')}</p>}
          </div>
        </div>

        {/* BUYERS DATABASE */}
        <div className={cardClass}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
              ODBERATELIA
            </h3>
            <button onClick={() => setModalType('buyer')} className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-all shadow-lg active:scale-95">
              <Icons.Plus />
            </button>
          </div>

          <div className="relative mb-4">
            <input 
              type="text" 
              value={buyerQuery} 
              onChange={e => setBuyerQuery(e.target.value)} 
              placeholder="HĽADAŤ ODBERATEĽA..." 
              className={searchInputClass}
            />
            <div className="absolute left-3 top-3 text-slate-700"><Icons.Search /></div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {filteredBuyers.map(b => (
              <div key={b.id} className="bg-slate-950/30 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-slate-900/50 transition-colors">
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-black text-white uppercase tracking-tight truncate">{b.name}</p>
                  <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border mt-2 ${getBuyerColorClasses(b.color)}`}>
                    {b.color}
                  </span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => handleEditBuyer(b)} className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-md transition-colors"><Icons.Edit /></button>
                  <button onClick={() => { if(window.confirm('Zmazať odberateľa?')) props.onDeleteBuyer(b.id); }} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-800 rounded-md transition-colors"><Icons.Trash /></button>
                </div>
              </div>
            ))}
            {filteredBuyers.length === 0 && <p className="text-center py-8 text-xs text-slate-600 italic font-bold uppercase tracking-widest">{buyerQuery ? 'Nič sa nenašlo' : 'Žiadni odberatelia'}</p>}
          </div>
        </div>

      </div>

      {/* --- MODALS --- */}
      {modalType && createPortal(
        <div className={modalOverlayClass} onClick={resetForms}>
          <div className={modalContentClass} onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
              {modalType === 'bin' && <><Icons.Scale /> {editingId ? 'UPRAVIŤ KONTAJNER' : 'NOVÝ KONTAJNER'}</>}
              {modalType === 'metal' && <><Icons.Scale /> {editingId ? 'UPRAVIŤ KOV' : 'NOVÝ KOV'}</>}
              {modalType === 'import_bins' && <><Icons.Import /> HROMADNÝ IMPORT</>}
            </h3>

            <div className="space-y-6">
              {modalType === 'bin' && (
                <>
                  <div>
                    <label className={labelClass}>{t('scrap_bin_name')}</label>
                    <input value={binName} onChange={e => setBinName(e.target.value.toUpperCase())} className={inputClass} autoFocus />
                  </div>
                  <div>
                    <label className={labelClass}>{t('scrap_bin_tara')}</label>
                    <input type="number" value={binTara} onChange={e => setBinTara(e.target.value)} className={inputClass} />
                  </div>
                  <button onClick={() => {
                    if (editingId) props.onUpdateBin(editingId, { name: binName, tara: parseFloat(binTara) });
                    else props.onAddBin(binName, parseFloat(binTara));
                    resetForms();
                  }} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-xs border-2 border-blue-500 shadow-xl transition-all">
                    {t('btn_save')}
                  </button>
                </>
              )}

              {modalType === 'import_bins' && (
                <>
                  <div>
                    <label className={labelClass}>DÁTA (Formát: Názov;Tara)</label>
                    <textarea 
                      value={bulkBins} 
                      onChange={e => setBulkBins(e.target.value)}
                      placeholder="BIN_01;24.5&#10;BIN_02;28.0" 
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 h-48 resize-none"
                      autoFocus
                    />
                    <p className="text-[10px] text-slate-500 mt-2 italic">* Každý kontajner na nový riadok. Oddeľovač je bodkočiarka.</p>
                  </div>
                  <button onClick={handleBatchBinsSubmit} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-xs border-2 border-blue-500 shadow-xl transition-all">
                    IMPORTOVAŤ
                  </button>
                </>
              )}

              {modalType === 'metal' && (
                <>
                  <div>
                    <label className={labelClass}>{t('scrap_metal_type')}</label>
                    <input value={metalType} onChange={e => setMetalType(e.target.value.toUpperCase())} className={inputClass} autoFocus />
                  </div>
                  <div>
                    <label className={labelClass}>{t('scrap_metal_desc')}</label>
                    <input value={metalDesc} onChange={e => setMetalDesc(e.target.value)} className={inputClass} />
                  </div>
                  <button onClick={() => {
                    if (editingId) props.onUpdateMetal(editingId, { type: metalType, description: metalDesc });
                    else props.onAddMetal(metalType, metalDesc);
                    resetForms();
                  }} className="w-full h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black uppercase text-xs border-2 border-teal-500 shadow-xl transition-all">
                    {t('btn_save')}
                  </button>
                </>
              )}

              {modalType === 'buyer' && (
                <>
                  <div>
                    <label className={labelClass}>NÁZOV FIRMY / ODBERATEĽA</label>
                    <input value={buyerName} onChange={e => setBuyerName(e.target.value.toUpperCase())} className={inputClass} autoFocus placeholder="napr. RECYKLA S.R.O." />
                  </div>
                  <div>
                    <label className={labelClass}>FARBA BADGE / LABEL COLOR</label>
                    <div className="flex flex-wrap gap-3 p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                      {['indigo', 'blue', 'cyan', 'teal', 'emerald', 'amber', 'orange', 'rose', 'purple', 'violet'].map(colorKey => (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => setBuyerColor(colorKey)}
                          className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-95 flex items-center justify-center ${
                            buyerColor === colorKey ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                          }`}
                          style={{
                            backgroundColor: {
                              indigo: '#6366f1',
                              blue: '#3b82f6',
                              cyan: '#06b6d4',
                              teal: '#14b8a6',
                              emerald: '#10b981',
                              amber: '#f59e0b',
                              orange: '#f97316',
                              rose: '#f43f5e',
                              purple: '#a855f7',
                              violet: '#8b5cf6'
                            }[colorKey]
                          }}
                          title={colorKey}
                        >
                          {buyerColor === colorKey && (
                            <span className="text-white text-[10px] font-black leading-none">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {buyerName && (
                    <div className="p-4 bg-slate-950/20 border border-slate-800 rounded-2xl text-center">
                      <label className={labelClass}>NÁHĽAD OZNAČENIA</label>
                      <div className="mt-2">
                        <span className={`inline-block text-xs font-black uppercase px-3 py-1 rounded-lg border tracking-wide shadow-md ${getBuyerColorClasses(buyerColor)}`}>
                          {buyerName}
                        </span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      if (!buyerName.trim()) return;
                      if (editingId) {
                        props.onUpdateBuyer(editingId, { name: buyerName, color: buyerColor });
                      } else {
                        props.onAddBuyer(buyerName, buyerColor);
                      }
                      resetForms();
                    }} 
                    disabled={!buyerName.trim()}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:border-slate-850 disabled:text-slate-600 text-white rounded-xl font-black uppercase text-xs border-2 border-indigo-500 shadow-xl transition-all"
                  >
                    {t('btn_save')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

export default ScrapSection;