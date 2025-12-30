
import React, { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { DBItem } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';
import MasterDbSyncModal from '../modals/MasterDbSyncModal';

interface PartsSectionProps {
  parts: DBItem[];
  onAddPart: (val: string, desc?: string) => void;
  onBatchAddParts: (vals: string[]) => void;
  onDeletePart: (val: string) => void;
  onDeleteAllParts: () => void;
}

// --- ICONS ---
const Icons = {
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Import: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Sync: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Cube: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
};

const PartsSection: React.FC<PartsSectionProps> = memo(({ parts, onAddPart, onBatchAddParts, onDeletePart, onDeleteAllParts }) => {
  const { t } = useLanguage();
  const [newPart, setNewPart] = useState('');
  const [newPartDesc, setNewPartDesc] = useState('');
  const [bulkParts, setBulkParts] = useState('');
  const [partSearch, setPartSearch] = useState('');
  
  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const filteredParts = useMemo(() => {
      const q = partSearch.toLowerCase();
      if (!q) return parts;
      return parts.filter(p => 
        p.value.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
  }, [parts, partSearch]);

  const handleAddSubmit = () => {
      if (newPart) {
          onAddPart(newPart, newPartDesc);
          setNewPart('');
          setNewPartDesc('');
          setIsAddModalOpen(false);
      }
  };

  const handleBatchSubmit = () => {
      if (bulkParts) {
          onBatchAddParts(bulkParts.split('\n'));
          setBulkParts('');
          setIsImportModalOpen(false);
      }
  };

  // Styles
  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden";
  const labelClass = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
  const inputClass = "w-full h-12 bg-slate-900/50 border-2 border-slate-700/50 rounded-xl px-4 text-white text-sm font-bold focus:outline-none focus:border-teal-500/50 transition-all font-mono uppercase";
  const modalOverlayClass = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in";
  const modalContentClass = "bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg p-8 relative";

  return (
    <div className={cardClass}>
      <div className="space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-2 h-8 bg-teal-500 rounded-full"></span>
                  DATABÁZA DIELOV
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 ml-5">
                  {parts.length} {parts.length === 1 ? 'diel' : parts.length >= 2 && parts.length <= 4 ? 'diely' : 'dielov'} v systéme
              </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className="flex-1 sm:flex-none h-10 px-4 bg-[#97bc1e]/10 hover:bg-[#97bc1e]/20 text-[#97bc1e] rounded-lg border border-[#97bc1e]/30 font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Icons.Sync /> SYNCHRO
            </button>
            <button 
                onClick={() => setIsImportModalOpen(true)} 
                className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-lg shadow-md transition-all flex items-center justify-center border border-slate-700" 
                title="Importovať dávku"
            >
                <Icons.Import />
            </button>
            <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="h-10 bg-teal-600 hover:bg-teal-500 text-white px-4 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-wide"
            >
                <Icons.Plus /> <span className="hidden sm:inline">Nový</span>
            </button>
            <button 
                onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllParts(); }} 
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
                value={partSearch} 
                onChange={e=>setPartSearch(e.target.value)} 
                placeholder="HĽADAŤ V DATABÁZE..." 
                className="w-full h-12 bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 text-white uppercase font-bold focus:outline-none focus:border-teal-500 transition-all" 
            />
            <div className="absolute left-4 top-3.5 text-slate-500">
                <Icons.Search />
            </div>
        </div>
        
        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {filteredParts.map(p => (
            <div key={p.id} className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-teal-500/30 rounded-xl p-4 transition-all duration-200 relative cursor-default flex flex-col justify-between min-h-[90px]">
              <div>
                  <div className="flex items-start justify-between mb-1">
                      <h4 className="font-black text-white text-sm font-mono break-all leading-tight">{p.value}</h4>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase line-clamp-2 leading-snug">
                      {p.description || "Bez popisu"}
                  </p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeletePart(p.value); }} 
                    className="text-slate-600 hover:text-red-500 bg-slate-900/80 p-1.5 rounded-lg backdrop-blur-sm"
                  >
                      <Icons.Trash />
                  </button>
              </div>
            </div>
          ))}
          {filteredParts.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Žiadne diely</p>
              </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* ADD SINGLE MODAL */}
      {isAddModalOpen && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsAddModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-teal-500/10 rounded-xl text-teal-500 border border-teal-500/20">
                       <Icons.Cube />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">NOVÝ DIEL</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>ČÍSLO DIELU</label>
                     <input 
                        value={newPart} 
                        onChange={e => setNewPart(e.target.value.toUpperCase())}
                        className={`${inputClass} text-lg`}
                        placeholder="NAPR. 3323..."
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className={labelClass}>POPIS (VOLITEĽNÉ)</label>
                     <input 
                        value={newPartDesc} 
                        onChange={e => setNewPartDesc(e.target.value)}
                        className={inputClass}
                        placeholder="NAPR. KRYT MOTORA"
                     />
                  </div>
                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsAddModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        Zrušiť
                     </button>
                     <button onClick={handleAddSubmit} className="flex-1 h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-teal-500">
                        Pridať Diel
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
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">HROMADNÝ IMPORT</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>DÁTA (Formát: Diel;Popis)</label>
                     <textarea 
                        value={bulkParts} 
                        onChange={e => setBulkParts(e.target.value)}
                        placeholder="Part1;Desc1&#10;Part2;Desc2" 
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 h-48 resize-none"
                        autoFocus
                     />
                     <p className="text-[10px] text-slate-500 mt-2 italic">* Každý diel na nový riadok. Oddeľovač je bodkočiarka.</p>
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

      <MasterDbSyncModal 
        isOpen={isSyncModalOpen} 
        onClose={() => setIsSyncModalOpen(false)}
        onSyncSuccess={(count) => {
            alert(`Synchronizácia úspešná. Pridaných ${count} unikátnych dielov.`);
        }}
      />
    </div>
  );
});

export default PartsSection;
