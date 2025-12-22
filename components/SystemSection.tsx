import React, { useState } from 'react';
import { DBItem, BreakSchedule } from '../App';
import { useLanguage } from './LanguageContext';

interface SystemSectionProps {
  missingReasons: DBItem[];
  breakSchedules: BreakSchedule[];
  onAddMissingReason: (val: string) => void;
  onDeleteMissingReason: (id: string) => void;
  onAddBreakSchedule: (start: string, end: string) => void;
  onDeleteBreakSchedule: (id: string) => void;
}

const Icons = {
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
};

const SystemSection: React.FC<SystemSectionProps> = ({ 
  missingReasons, breakSchedules, onAddMissingReason, onDeleteMissingReason, onAddBreakSchedule, onDeleteBreakSchedule 
}) => {
  const { t } = useLanguage();
  const [newMissingReason, setNewMissingReason] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2";

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="space-y-6">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">DÔVODY PRESTOJOV</h3>
          <div className="flex-1 overflow-y-auto max-h-80 bg-slate-950/40 rounded-3xl p-6 space-y-2 border border-white/5 shadow-inner">
            {missingReasons.map(r => (
              <div key={r.id} className="flex justify-between items-center bg-slate-800/50 px-4 py-3 rounded-xl border border-white/5 group">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">{r.value}</span>
                <button onClick={() => onDeleteMissingReason(r.id)} className="text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 px-2">×</button>
              </div>
            ))}
          </div>
          <div className="pt-4">
            <h4 className={labelClass}>PRIDAŤ DÔVOD</h4>
            <div className="flex gap-2">
              <input value={newMissingReason} onChange={e=>setNewMissingReason(e.target.value)} placeholder="Napr. Fyzicky chýba" className={inputClass} />
              <button onClick={() => { if(newMissingReason) { onAddMissingReason(newMissingReason); setNewMissingReason(''); } }} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-all">PRIDAŤ</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="space-y-6">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">PRESTÁVKY</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
            {breakSchedules.map(b => (
              <div key={b.id} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center group shadow-sm">
                <span className="text-lg font-mono font-black text-slate-200">{b.start} — {b.end}</span>
                <button onClick={() => onDeleteBreakSchedule(b.id)} className="text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Icons.Trash /></button>
              </div>
            ))}
          </div>
          <div className="bg-slate-950/30 p-6 rounded-3xl border border-white/5 mt-auto">
            <h4 className={labelClass}>NOVO DEFINOVANÁ PRESTÁVKA</h4>
            <div className="flex items-center gap-3">
              <input type="time" value={newBreakStart} onChange={e=>setNewBreakStart(e.target.value)} className={inputClass} />
              <span className="text-slate-600 font-black">—</span>
              <input type="time" value={newBreakEnd} onChange={e=>setNewBreakEnd(e.target.value)} className={inputClass} />
              <button onClick={() => { if(newBreakStart && newBreakEnd) { onAddBreakSchedule(newBreakStart, newBreakEnd); setNewBreakStart(''); setNewBreakEnd(''); } }} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-all">PRIDAŤ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSection;