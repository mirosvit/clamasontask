import React, { useState } from 'react';
import { DBItem } from '../App';
import { useLanguage } from './LanguageContext';

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

const WorkplaceSection: React.FC<WorkplaceSectionProps> = ({ 
  workplaces, logisticsOperations, onAddWorkplace, onBatchAddWorkplaces, onDeleteWorkplace, onDeleteAllWorkplaces, onAddLogisticsOperation, onDeleteLogisticsOperation 
}) => {
  const { t } = useLanguage();
  const [newWorkplace, setNewWorkplace] = useState('');
  const [newWorkplaceTime, setNewWorkplaceTime] = useState('');
  const [wpSearch, setWpSearch] = useState('');
  const [bulkWorkplaces, setBulkWorkplaces] = useState('');
  const [newLogOp, setNewLogOp] = useState('');
  const [newLogOpTime, setNewLogOpTime] = useState('');

  const filteredWPs = workplaces.filter(w => w.value.toLowerCase().includes(wpSearch.toLowerCase()));

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2";

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">PRACUVISKÁ</h3>
            <button onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllWorkplaces(); }} className="text-[10px] font-black text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 uppercase tracking-widest">{t('delete_all')}</button>
          </div>
          <input value={wpSearch} onChange={e=>setWpSearch(e.target.value)} placeholder="Hľadať pracovisko..." className={inputClass} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {filteredWPs.map(w => (
              <div key={w.id} className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex justify-between items-center text-[10px] font-mono group">
                <span className="text-slate-300">{w.value} <span className="text-slate-600">({w.standardTime}m)</span></span>
                <button onClick={() => onDeleteWorkplace(w.id)} className="opacity-0 group-hover:opacity-100 text-red-500">×</button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
            <div className="space-y-3">
              <h4 className={labelClass}>NOVÉ PRACOVISKO</h4>
              <input value={newWorkplace} onChange={e=>setNewWorkplace(e.target.value)} placeholder="Názov" className={inputClass} />
              <input type="number" value={newWorkplaceTime} onChange={e=>setNewWorkplaceTime(e.target.value)} placeholder="Std. Čas (min)" className={inputClass} />
              <button onClick={() => { if(newWorkplace) { onAddWorkplace(newWorkplace, parseInt(newWorkplaceTime)); setNewWorkplace(''); setNewWorkplaceTime(''); } }} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full">PRIDAŤ</button>
            </div>
            <div className="space-y-3">
              <h4 className={labelClass}>HROMADNÝ IMPORT</h4>
              <textarea value={bulkWorkplaces} onChange={e=>setBulkWorkplaces(e.target.value)} placeholder="Wp1;10&#10;Wp2;15" className={inputClass + " h-[116px] resize-none"} />
              <button onClick={() => { if(bulkWorkplaces) { onBatchAddWorkplaces(bulkWorkplaces.split('\n')); setBulkWorkplaces(''); } }} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full">IMPORT BATCH</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="space-y-6">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">LOGISTICKÉ OPERÁCIE</h3>
          <div className="flex-1 overflow-y-auto max-h-80 bg-slate-950/40 rounded-3xl p-6 space-y-2 border border-white/5 shadow-inner">
            {logisticsOperations.map(op => (
              <div key={op.id} className="flex justify-between items-center bg-slate-800/50 px-4 py-3 rounded-xl border border-white/5 group">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">{op.value} <span className="text-slate-600 ml-2">({op.standardTime}m)</span></span>
                <button onClick={() => onDeleteLogisticsOperation(op.id)} className="text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 px-2">×</button>
              </div>
            ))}
          </div>
          <div className="pt-4">
            <h4 className={labelClass}>PRIDAŤ OPERÁCIU</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={newLogOp} onChange={e=>setNewLogOp(e.target.value)} placeholder="Operácia" className={inputClass} />
              <input type="number" value={newLogOpTime} onChange={e=>setNewLogOpTime(e.target.value)} placeholder="min" className={inputClass} />
              <button onClick={() => { if(newLogOp) { onAddLogisticsOperation(newLogOp, parseInt(newLogOpTime)); setNewLogOp(''); setNewLogOpTime(''); } }} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-all">PRIDAŤ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkplaceSection;