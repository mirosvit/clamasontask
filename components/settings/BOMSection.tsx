
import React, { useState, useMemo, memo } from 'react';
import { BOMItem } from '../../App';
import { useLanguage } from '../LanguageContext';

interface BOMSectionProps {
  bomItems: BOMItem[];
  onAddBOMItem: (parent: string, child: string, qty: number) => void;
  onBatchAddBOMItems: (vals: string[]) => void;
  onDeleteBOMItem: (id: string) => void;
  onDeleteAllBOMItems: () => void;
}

const BOMSection: React.FC<BOMSectionProps> = memo(({ bomItems, onAddBOMItem, onBatchAddBOMItems, onDeleteBOMItem, onDeleteAllBOMItems }) => {
  const { t } = useLanguage();
  const [bomParent, setBomParent] = useState('');
  const [bomChild, setBomChild] = useState('');
  const [bomQty, setBomQty] = useState('');
  const [bomBulk, setBomBulk] = useState('');
  const [bomSearchQuery, setBomSearchQuery] = useState('');

  const filteredBOMs = useMemo(() => {
      const q = bomSearchQuery.toLowerCase();
      if (!q) return bomItems;
      return bomItems.filter(item => 
          item.parentPart.toLowerCase().includes(q) || 
          item.childPart.toLowerCase().includes(q)
      );
  }, [bomItems, bomSearchQuery]);

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-12 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3";

  return (
    <div className={cardClass}>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">BOM - KUSOVNÍKY</h3>
          <button onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllBOMItems(); }} className="text-xs font-black text-red-500 bg-red-500/10 px-6 py-3 rounded-xl border-2 border-red-500/20 uppercase tracking-widest hover:bg-red-500/20">{t('delete_all')}</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5">
              <h4 className={labelClass}>ADD SINGLE RELATION</h4>
              <div className="space-y-4">
                <input value={bomParent} onChange={e=>setBomParent(e.target.value.toUpperCase())} placeholder="PARENT" className={inputClass} />
                <input value={bomChild} onChange={e=>setBomChild(e.target.value.toUpperCase())} placeholder="CHILD" className={inputClass} />
                <input type="number" step="0.0001" value={bomQty} onChange={e=>setBomQty(e.target.value)} placeholder="QTY" className={inputClass} />
                <button onClick={() => { if(bomParent && bomChild) { onAddBOMItem(bomParent, bomChild, parseFloat(bomQty)); setBomParent(''); setBomChild(''); setBomQty(''); } }} className="h-12 bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full mt-2 border-2 border-teal-500 shadow-lg">ADD</button>
              </div>
            </div>
            <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5">
              <h4 className={labelClass}>BULK IMPORT (CSV)</h4>
              <textarea value={bomBulk} onChange={e=>setBomBulk(e.target.value)} placeholder="Parent;Child;Qty" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 h-40 resize-none" />
              <button onClick={() => { if(bomBulk) { onBatchAddBOMItems(bomBulk.split('\n')); setBomBulk(''); } }} className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full mt-2 border-2 border-blue-500 shadow-lg">IMPORT BATCH</button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4 flex flex-col">
            <input value={bomSearchQuery} onChange={e=>setBomSearchQuery(e.target.value)} placeholder="Hľadať v kusovníkoch..." className={inputClass} />
            <div className="flex-1 bg-slate-950/40 rounded-2xl border border-white/5 overflow-hidden shadow-inner max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-600 uppercase tracking-widest sticky top-0">
                  <tr><th className="p-4">Parent</th><th className="p-4">Child</th><th className="p-4 text-right">Qty</th><th className="p-4"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBOMs.map(item => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-bold text-sm">{item.parentPart}</td>
                      <td className="p-4 text-slate-400 text-sm">{item.childPart}</td>
                      <td className="p-4 text-right text-teal-400 font-black text-sm">{item.quantity}</td>
                      <td className="p-4 text-right"><button onClick={() => onDeleteBOMItem(item.id)} className="text-slate-600 hover:text-red-500 px-2 font-black text-xl">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BOMSection;
