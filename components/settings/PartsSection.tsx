
import React, { useState, useMemo, memo } from 'react';
import { DBItem } from '../../App';
import { useLanguage } from '../LanguageContext';

interface PartsSectionProps {
  parts: DBItem[];
  onAddPart: (val: string, desc?: string) => void;
  onBatchAddParts: (vals: string[]) => void;
  onDeletePart: (id: string) => void;
  onDeleteAllParts: () => void;
}

const PartsSection: React.FC<PartsSectionProps> = memo(({ parts, onAddPart, onBatchAddParts, onDeletePart, onDeleteAllParts }) => {
  const { t } = useLanguage();
  const [newPart, setNewPart] = useState('');
  const [newPartDesc, setNewPartDesc] = useState('');
  const [bulkParts, setBulkParts] = useState('');
  const [partSearch, setPartSearch] = useState('');

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
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">DATABÁZA DIELOV</h3>
          <button onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllParts(); }} className="text-xs font-black text-red-500 bg-red-500/10 px-6 py-3 rounded-xl border-2 border-red-500/20 uppercase tracking-widest transition-all hover:bg-red-500/20">{t('delete_all')}</button>
        </div>
        <input value={partSearch} onChange={e=>setPartSearch(e.target.value)} placeholder="Hľadať v databáze..." className={inputClass} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar">
          {filteredParts.map(p => (
            <div key={p.id} className="bg-slate-950/40 h-12 px-4 rounded-xl border border-white/5 flex justify-between items-center text-xs font-mono group transition-colors hover:bg-slate-900">
              <span className="text-slate-300 truncate mr-2">{p.value}</span>
              <button onClick={() => onDeletePart(p.id)} className="opacity-0 group-hover:opacity-100 text-red-500 font-black px-2 text-lg">×</button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800">
          <div className="space-y-4">
            <h4 className={labelClass}>SINGULAR ADDITION</h4>
            <input value={newPart} onChange={e=>setNewPart(e.target.value)} placeholder="Part No." className={inputClass} />
            <input value={newPartDesc} onChange={e=>setNewPartDesc(e.target.value)} placeholder="Description" className={inputClass} />
            <button onClick={() => { if(newPart) { onAddPart(newPart, newPartDesc); setNewPart(''); setNewPartDesc(''); } }} className="h-12 bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full border-2 border-teal-500 shadow-lg">ADD SINGLE</button>
          </div>
          <div className="space-y-4">
            <h4 className={labelClass}>BULK IMPORT</h4>
            <textarea value={bulkParts} onChange={e=>setBulkParts(e.target.value)} placeholder="Part1;Desc1&#10;Part2;Desc2" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 h-[120px] resize-none" />
            <button onClick={() => { if(bulkParts) { onBatchAddParts(bulkParts.split('\n')); setBulkParts(''); } }} className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full border-2 border-blue-500 shadow-lg">IMPORT BATCH</button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PartsSection;
