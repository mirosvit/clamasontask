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

// Fix: Completed the component by adding the return statement and export default to resolve type errors and missing export
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
  const inputClass = "w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2";

  return (
    <div className={cardClass}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">BOM - KUSOVNÍKY</h3>
          <button onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllBOMItems(); }} className="text-[10px] font-black text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 uppercase tracking-widest">{t('delete_all')}</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
              <h4 className={labelClass}>ADD SINGLE RELATION</h4>
              <div className="space-y-2">
                <input value={bomParent} onChange={e=>setBomParent(e.target.value.toUpperCase())} placeholder="PARENT" className={inputClass} />
                <input value={bomChild} onChange={e=>setBomChild(e.target.value.toUpperCase())} placeholder="CHILD" className={inputClass} />
                <input type="number" step="0.0001" value={bomQty} onChange={e=>setBomQty(e.target.value)} placeholder="QTY" className={inputClass} />
                <button onClick={() => { if(bomParent && bomChild) { onAddBOMItem(bomParent, bomChild, parseFloat(bomQty)); setBomParent(''); setBomChild(''); setBomQty(''); } }} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full">ADD</button>
              </div>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
              <h4 className={labelClass}>BULK IMPORT (CSV)</h4>
              <textarea value={bomBulk} onChange={e=>setBomBulk(e.target.value)} placeholder="Parent;Child;Qty" className={inputClass + " h-32 resize-none"} />
              <button onClick={() => { if(bomBulk) { onBatchAddBOMItems(bomBulk.split('\n')); setBomBulk(''); } }} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full mt-2">IMPORT BATCH</button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-2 flex flex-col">
            <input value={bomSearchQuery} onChange={e=>setBomSearchQuery(e.target.value)} placeholder="Hľadať v kusovníkoch..." className={inputClass} />
            <div className="flex-1 bg-slate-950/40 rounded-2xl border border-white/5 overflow-hidden shadow-inner max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-slate-950 text-slate-600 uppercase tracking-widest sticky top-0">
                  <tr><th className="p-3">Parent</th><th className="p-3">Child</th><th className="p-3 text-right">Qty</th><th className="p-3"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBOMs.map(item => (
                    <tr key={item.id} className="hover:bg-white/5">
                      <td className="p-3 text-white font-bold">{item.parentPart}</td>
                      <td className="p-3 text-slate-400">{item.childPart}</td>
                      <td className="p-3 text-right text-teal-400">{item.quantity}</td>
                      <td className="p-3 text-right"><button onClick={() => onDeleteBOMItem(item.id)} className="text-slate-600 hover:text-red-500 px-1">×</button></td>
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