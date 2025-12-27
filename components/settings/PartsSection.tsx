
import React, { useState, useMemo, memo } from 'react';
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

const PartsSection: React.FC<PartsSectionProps> = memo(({ parts, onAddPart, onBatchAddParts, onDeletePart, onDeleteAllParts }) => {
  const { t } = useLanguage();
  const [newPart, setNewPart] = useState('');
  const [newPartDesc, setNewPartDesc] = useState('');
  const [bulkParts, setBulkParts] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const filteredParts = useMemo(() => {
      const q = partSearch.toLowerCase();
      if (!q) return parts;
      return parts.filter(p => 
        p.value.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
  }, [parts, partSearch]);

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-12 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3";

  return (
    <div className={cardClass}>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">DATABÁZA DIELOV (KYBLÍK)</h3>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className="flex-1 sm:flex-none text-[10px] font-black text-[#97bc1e] bg-[#97bc1e]/10 px-4 py-3 rounded-xl border-2 border-[#97bc1e]/20 uppercase tracking-widest transition-all hover:bg-[#97bc1e]/20 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              MASTER SYNCHRO
            </button>
            <button onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllParts(); }} className="flex-1 sm:flex-none text-[10px] font-black text-red-500 bg-red-500/10 px-4 py-3 rounded-xl border-2 border-red-500/20 uppercase tracking-widest transition-all hover:bg-red-500/20">{t('delete_all')}</button>
          </div>
        </div>
        
        <input value={partSearch} onChange={e=>setPartSearch(e.target.value)} placeholder="Hľadať v databáze..." className={inputClass} />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar">
          {filteredParts.map(p => (
            <div key={p.id} className="bg-slate-950/40 h-12 px-4 rounded-xl border border-white/5 flex justify-between items-center text-xs font-mono group transition-colors hover:bg-slate-900">
              <span className="text-slate-300 truncate mr-2" title={p.description}>{p.value}</span>
              <button onClick={() => onDeletePart(p.value)} className="opacity-0 group-hover:opacity-100 text-red-500 font-black px-2 text-lg">×</button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800">
          <div className="space-y-4">
            <h4 className={labelClass}>JEDNOTLIVÉ PRIDANIE</h4>
            <input value={newPart} onChange={e=>setNewPart(e.target.value)} placeholder="Číslo Dielu" className={inputClass} />
            <input value={newPartDesc} onChange={e=>setNewPartDesc(e.target.value)} placeholder="Popis" className={inputClass} />
            <button onClick={() => { if(newPart) { onAddPart(newPart, newPartDesc); setNewPart(''); setNewPartDesc(''); } }} className="h-12 bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full border-2 border-teal-500 shadow-lg">PRIDAŤ DIEL</button>
          </div>
          <div className="space-y-4">
            <h4 className={labelClass}>HROMADNÝ IMPORT</h4>
            <textarea value={bulkParts} onChange={e=>setBulkParts(e.target.value)} placeholder="Part1;Desc1&#10;Part2;Desc2" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 h-[120px] resize-none" />
            <button onClick={() => { if(bulkParts) { onBatchAddParts(bulkParts.split('\n')); setBulkParts(''); } }} className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full border-2 border-blue-500 shadow-lg">IMPORTOVAŤ DÁVKU</button>
          </div>
        </div>
      </div>

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
