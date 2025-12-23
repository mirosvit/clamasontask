
import React, { useState, useMemo, memo } from 'react';
import { DBItem } from '../../App';
import { useLanguage } from '../LanguageContext';

interface WorkplaceSectionProps {
  workplaces: DBItem[];
  logisticsOperations: DBItem[];
  onAddWorkplace: (val: string, time?: number) => void;
  onBatchAddWorkplaces: (vals: string[]) => void;
  onDeleteWorkplace: (id: string) => void;
  onDeleteAllWorkplaces: () => void;
  onAddLogisticsOperation: (val: string, time?: number) => void;
  onDeleteLogisticsOperation: (id: string) => void;
}

const WorkplaceSection: React.FC<WorkplaceSectionProps> = memo(({ 
  workplaces, logisticsOperations, onAddWorkplace, onBatchAddWorkplaces, onDeleteWorkplace, onDeleteAllWorkplaces, onAddLogisticsOperation, onDeleteLogisticsOperation 
}) => {
  const { t } = useLanguage();
  const [newWorkplace, setNewWorkplace] = useState('');
  const [newWorkplaceTime, setNewWorkplaceTime] = useState('');
  const [wpSearch, setWpSearch] = useState('');
  const [bulkWorkplaces, setBulkWorkplaces] = useState('');
  const [newLogOp, setNewLogOp] = useState('');
  const [newLogOpTime, setNewLogOpTime] = useState('');

  const filteredWPs = useMemo(() => {
      const q = wpSearch.toLowerCase();
      if (!q) return workplaces;
      return workplaces.filter(w => w.value.toLowerCase().includes(q));
  }, [workplaces, wpSearch]);

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-10 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2";

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">PRACOVISKÁ</h3>
            <button onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllWorkplaces(); }} className="text-[10px] font-black text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 uppercase tracking-widest">{t('delete_all')}</button>
          </div>
          <input value={wpSearch} onChange={e=>setWpSearch(e.target.value)} placeholder="Hľadať pracovisko..." className={inputClass} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {filteredWPs.map(w => (
              <div key={w.id} className="bg-slate-950/40 h-10 px-3 rounded-xl border border-white/5 flex justify-between items-center text-[10px] font-mono group">
                <span className="text-slate-300 truncate">{w.value} <span className="text-slate-600 text-[8px]">({w.standardTime}m)</span></span>
                <button onClick={() => onDeleteWorkplace(w.id)} className="opacity-0 group-hover:opacity-100 text-red-500 font-black px-1">×</button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
            <div className="space-y-3">
              <h4 className={labelClass}>NOVÉ PRACOVISKO</h4>
              <input value={newWorkplace} onChange={e=>setNewWorkplace(e.target.value)} placeholder="Názov" className={inputClass} />
              <input type="number" value={newWorkplaceTime} onChange={e=>setNewWorkplaceTime(e.target.value)} placeholder="Std. Čas (min)" className={inputClass} />
              <button onClick={() => { if(newWorkplace) { onAddWorkplace(newWorkplace, parseInt(newWorkplaceTime)); setNewWorkplace(''); setNewWorkplaceTime(''); } }} className="h-10 bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-[10px] transition-all w-full">PRIDAŤ</button>
            </div>
            <div className="space-y-3">
              <h4 className={labelClass}>HROMADNÝ IMPORT</h4>
              <textarea value={bulkWorkplaces} onChange={e=>setBulkWorkplaces(e.target.value)} placeholder="Wp1;10&#10;Wp2;15" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 h-[104px] resize-none" />
              <button onClick={() => { if(bulkWorkplaces) { onBatchAddWorkplaces(bulkWorkplaces.split('\n')); setBulkWorkplaces(''); } }} className="h-10 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-[10px] transition-all w-full">IMPORT BATCH</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="space-y-6">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">LOGISTICKÉ OPERÁCIE</h3>
          <div className="flex-1 overflow-y-auto max-h-80 bg-slate-950/40 rounded-3xl p-6 space-y-2 border border-white/5 shadow-inner">
            {logisticsOperations.map(op => (
              <div key={op.id} className="flex justify-between items-center bg-slate-800/50 h-10 px-4 rounded-xl border border-white/5 group">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest truncate">{op.value} <span className="text-slate-600 ml-2 text-[9px]">({op.standardTime}m)</span></span>
                <button onClick={() => onDeleteLogisticsOperation(op.id)} className="text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 font-black px-1">×</button>
              </div>
            ))}
          </div>
          <div className="pt-4">
            <h4 className={labelClass}>PRIDAŤ OPERÁCIU</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={newLogOp} onChange={e=>setNewLogOp(e.target.value)} placeholder="Operácia" className={inputClass} />
              <input type="number" value={newLogOpTime} onChange={e=>setNewLogOpTime(e.target.value)} placeholder="min" className={inputClass} />
              <button onClick={() => { if(newLogOp) { onAddLogisticsOperation(newLogOp, parseInt(newLogOpTime)); setNewLogOp(''); setNewLogOpTime(''); } }} className="h-10 bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-[10px] transition-all">PRIDAŤ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default WorkplaceSection;
