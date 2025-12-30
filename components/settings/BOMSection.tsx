
import React, { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { BOMComponent } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface BOMSectionProps {
  bomMap: Record<string, BOMComponent[]>;
  onAddBOMItem: (parent: string, child: string, qty: number) => void;
  onBatchAddBOMItems: (vals: string[]) => void;
  onDeleteBOMItem: (parent: string, child: string) => void;
  onDeleteAllBOMItems: () => void;
}

// --- ICONS ---
const Icons = {
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Import: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Flow: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>,
  Layers: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
};

const BOMSection: React.FC<BOMSectionProps> = memo(({ bomMap, onAddBOMItem, onBatchAddBOMItems, onDeleteBOMItem, onDeleteAllBOMItems }) => {
  const { t } = useLanguage();
  
  const [bomSearchQuery, setBomSearchQuery] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Add Form State
  const [bomParent, setBomParent] = useState('');
  const [bomChild, setBomChild] = useState('');
  const [bomQty, setBomQty] = useState('');
  
  // Import Form State
  const [bomBulk, setBomBulk] = useState('');

  const flattenedItems = useMemo(() => {
    const items: { parent: string; child: string; consumption: number }[] = [];
    Object.entries(bomMap).forEach(([parent, components]) => {
      (components as BOMComponent[]).forEach(comp => {
        items.push({ parent, child: comp.child, consumption: comp.consumption });
      });
    });
    return items;
  }, [bomMap]);

  const filteredBOMs = useMemo(() => {
      const q = bomSearchQuery.toLowerCase();
      if (!q) return flattenedItems;
      return flattenedItems.filter(item => 
          item.parent.toLowerCase().includes(q) || 
          item.child.toLowerCase().includes(q)
      );
  }, [flattenedItems, bomSearchQuery]);

  const handleAddSubmit = () => {
      if (bomParent && bomChild && bomQty) {
          onAddBOMItem(bomParent, bomChild, parseFloat(bomQty));
          setBomParent('');
          setBomChild('');
          setBomQty('');
          setIsAddModalOpen(false);
      }
  };

  const handleBatchSubmit = () => {
      if (bomBulk) {
          onBatchAddBOMItems(bomBulk.split('\n'));
          setBomBulk('');
          setIsImportModalOpen(false);
      }
  };

  // Styles
  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden";
  const labelClass = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
  const inputClass = "w-full h-12 bg-slate-900/50 border-2 border-slate-700/50 rounded-xl px-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50 transition-all font-mono uppercase";
  const modalOverlayClass = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in";
  const modalContentClass = "bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg p-8 relative";

  return (
    <div className={cardClass}>
      <div className="space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                  KUSOVNÍKY (BOM)
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 ml-5">
                  {flattenedItems.length} väzieb definovaných
              </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
                onClick={() => setIsImportModalOpen(true)} 
                className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-lg shadow-md transition-all flex items-center justify-center border border-slate-700" 
                title="Importovať dávku"
            >
                <Icons.Import />
            </button>
            <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-wide"
            >
                <Icons.Plus /> <span className="hidden sm:inline">Nová Väzba</span>
            </button>
            <button 
                onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllBOMItems(); }} 
                className="h-10 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-3 rounded-lg transition-all"
                title="Vymazať všetko"
            >
                <Icons.Trash />
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative">
            <input 
                value={bomSearchQuery} 
                onChange={e=>setBomSearchQuery(e.target.value)} 
                placeholder="HĽADAŤ V KUSOVNÍKOCH..." 
                className="w-full h-12 bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 text-white uppercase font-bold focus:outline-none focus:border-indigo-500 transition-all" 
            />
            <div className="absolute left-4 top-3.5 text-slate-500">
                <Icons.Search />
            </div>
        </div>

        {/* LIST OF CARDS */}
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {filteredBOMs.map((item, idx) => (
                <div key={idx} className="group flex items-center justify-between bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/30 rounded-xl p-4 transition-all">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="flex flex-col min-w-[120px]">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">RODIČ (PARENT)</span>
                            <span className="text-white font-black font-mono text-sm sm:text-base truncate">{item.parent}</span>
                        </div>
                        
                        <div className="text-slate-600 group-hover:text-indigo-500 transition-colors">
                            <Icons.Flow />
                        </div>

                        <div className="flex flex-col min-w-[120px]">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">DIEŤA (CHILD)</span>
                            <span className="text-slate-300 font-bold font-mono text-sm sm:text-base truncate">{item.child}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-slate-950 px-3 py-1 rounded-lg border border-white/5">
                            <span className="text-[10px] text-slate-500 font-bold mr-2 uppercase">KS</span>
                            <span className="text-teal-400 font-black font-mono text-sm">{item.consumption}</span>
                        </div>
                        <button 
                            onClick={() => onDeleteBOMItem(item.parent, item.child)} 
                            className="text-slate-600 hover:text-red-500 bg-slate-900/80 p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Icons.Trash />
                        </button>
                    </div>
                </div>
            ))}
            {filteredBOMs.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Žiadne väzby</p>
                </div>
            )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* ADD MODAL */}
      {isAddModalOpen && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsAddModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/20">
                       <Icons.Layers />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">NOVÁ VÄZBA</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>RODIČ (PARENT PART)</label>
                     <input 
                        value={bomParent} 
                        onChange={e => setBomParent(e.target.value.toUpperCase())}
                        className={inputClass}
                        placeholder="NAPR. 3323..."
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className={labelClass}>DIEŤA (CHILD PART)</label>
                     <input 
                        value={bomChild} 
                        onChange={e => setBomChild(e.target.value.toUpperCase())}
                        className={inputClass}
                        placeholder="NAPR. SKRUTKA..."
                     />
                  </div>
                  <div>
                     <label className={`${labelClass} text-teal-500`}>SPOTREBA NA 1 KUS</label>
                     <input 
                        type="number"
                        step="0.00001"
                        value={bomQty} 
                        onChange={e => setBomQty(e.target.value)}
                        className={`${inputClass} text-teal-400 border-teal-500/30 focus:border-teal-500`}
                        placeholder="0.00000"
                     />
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsAddModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        Zrušiť
                     </button>
                     <button onClick={handleAddSubmit} className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-indigo-500">
                        Uložiť
                     </button>
                  </div>
               </div>
            </div>
         </div>,
         document.body
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsImportModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                       <Icons.Import />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">IMPORT KUSOVNÍKA</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>DÁTA (Parent;Child;Qty)</label>
                     <textarea 
                        value={bomBulk} 
                        onChange={e => setBomBulk(e.target.value)}
                        placeholder="Parent1;Child1;10&#10;Parent1;Child2;5" 
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono placeholder-gray-500 h-48 resize-none"
                        autoFocus
                     />
                     <p className="text-[10px] text-slate-500 mt-2 italic">* Každá väzba na nový riadok. Oddeľovač je bodkočiarka.</p>
                  </div>
                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsImportModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        Zrušiť
                     </button>
                     <button onClick={handleBatchSubmit} className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-blue-500">
                        Importovať
                     </button>
                  </div>
               </div>
            </div>
         </div>,
         document.body
      )}

    </div>
  );
});

export default BOMSection;
