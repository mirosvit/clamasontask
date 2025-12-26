
import React, { useState, useMemo, memo } from 'react';
import { DBItem, MapSector } from '../../App';
import { useLanguage } from '../LanguageContext';

interface WorkplaceSectionProps {
  workplaces: DBItem[];
  logisticsOperations: DBItem[];
  onAddWorkplace: (val: string, time?: number, x?: number, y?: number) => void;
  onUpdateWorkplace: (id: string, updates: Partial<DBItem>) => void;
  onBatchAddWorkplaces: (vals: string[]) => void;
  onDeleteWorkplace: (id: string) => void;
  onDeleteAllWorkplaces: () => void;
  onAddLogisticsOperation: (val: string, time?: number) => void;
  onUpdateLogisticsOperation: (id: string, newTime: number) => void;
  onDeleteLogisticsOperation: (id: string) => void;
  mapSectors: MapSector[];
  onAddMapSector: (name: string, x: number, y: number) => void;
  onDeleteMapSector: (id: string) => void;
  onUpdateMapSector: (id: string, x: number, y: number) => void;
}

const WorkplaceSection: React.FC<WorkplaceSectionProps> = memo(({ 
  workplaces, logisticsOperations, onAddWorkplace, onUpdateWorkplace, onBatchAddWorkplaces, onDeleteWorkplace, onDeleteAllWorkplaces, onAddLogisticsOperation, onUpdateLogisticsOperation, onDeleteLogisticsOperation,
  mapSectors, onAddMapSector, onDeleteMapSector, onUpdateMapSector
}) => {
  const { t, language } = useLanguage();
  const [newWorkplace, setNewWorkplace] = useState('');
  const [newWorkplaceTime, setNewWorkplaceTime] = useState('');
  const [newWorkplaceX, setNewWorkplaceX] = useState('');
  const [newWorkplaceY, setNewWorkplaceY] = useState('');
  const [wpSearch, setWpSearch] = useState('');
  const [bulkWorkplaces, setBulkWorkplaces] = useState('');
  const [newLogOp, setNewLogOp] = useState('');
  const [newLogOpTime, setNewLogOpTime] = useState('');

  // Sektory State
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorX, setNewSectorX] = useState('');
  const [newSectorY, setNewSectorY] = useState('');

  const filteredWPs = useMemo(() => {
      const q = wpSearch.toLowerCase();
      if (!q) return workplaces;
      return workplaces.filter(w => w.value.toLowerCase().includes(q));
  }, [workplaces, wpSearch]);

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-12 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3";
  const inlineInputClass = "bg-transparent border-b border-slate-700 w-12 text-center text-teal-400 focus:border-teal-500 outline-none font-mono text-sm";

  return (
    <div className="space-y-8">
      <div className={cardClass}>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">PRACOVISKÁ</h3>
            <button onClick={() => { if(window.confirm('VYMAZAŤ VŠETKO?')) onDeleteAllWorkplaces(); }} className="text-xs font-black text-red-500 bg-red-500/10 px-6 py-3 rounded-xl border-2 border-red-500/20 uppercase tracking-widest hover:bg-red-500/20">{t('delete_all')}</button>
          </div>
          <input value={wpSearch} onChange={e=>setWpSearch(e.target.value)} placeholder="Hľadať pracovisko..." className={inputClass} />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[450px] overflow-y-auto custom-scrollbar">
            {filteredWPs.map(w => (
              <div key={w.id} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex flex-col gap-3 font-mono group hover:bg-slate-900 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-bold truncate max-w-[120px]">{w.value}</span>
                  <button onClick={() => onDeleteWorkplace(w.id)} className="opacity-0 group-hover:opacity-100 text-red-500 font-black px-2 text-lg">×</button>
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-600 font-bold uppercase">Time:</span>
                    <input 
                      type="number" 
                      value={w.standardTime || 0} 
                      onChange={(e) => onUpdateWorkplace(w.id, { standardTime: parseInt(e.target.value) || 0 })}
                      className={inlineInputClass}
                    />
                    <span className="text-slate-600 text-[10px]">m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-600 font-bold uppercase">X:</span>
                    <input 
                      type="number" 
                      value={w.coordX || 0} 
                      onChange={(e) => onUpdateWorkplace(w.id, { coordX: parseInt(e.target.value) || 0 })}
                      className={inlineInputClass}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-600 font-bold uppercase">Y:</span>
                    <input 
                      type="number" 
                      value={w.coordY || 0} 
                      onChange={(e) => onUpdateWorkplace(w.id, { coordY: parseInt(e.target.value) || 0 })}
                      className={inlineInputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800">
            <div className="space-y-4">
              <h4 className={labelClass}>NOVÉ PRACOVISKO</h4>
              <input value={newWorkplace} onChange={e=>setNewWorkplace(e.target.value)} placeholder="Názov" className={inputClass} />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" value={newWorkplaceTime} onChange={e=>setNewWorkplaceTime(e.target.value)} placeholder="Std. m" className={inputClass} />
                <input type="number" value={newWorkplaceX} onChange={e=>setNewWorkplaceX(e.target.value)} placeholder="X" className={inputClass} />
                <input type="number" value={newWorkplaceY} onChange={e=>setNewWorkplaceY(e.target.value)} placeholder="Y" className={inputClass} />
              </div>
              <button onClick={() => { if(newWorkplace) { onAddWorkplace(newWorkplace, parseInt(newWorkplaceTime), parseInt(newWorkplaceX), parseInt(newWorkplaceY)); setNewWorkplace(''); setNewWorkplaceTime(''); setNewWorkplaceX(''); setNewWorkplaceY(''); } }} className="h-12 bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full border-2 border-teal-500 shadow-lg">PRIDAŤ</button>
            </div>
            <div className="space-y-4">
              <h4 className={labelClass}>HROMADNÝ IMPORT</h4>
              <textarea value={bulkWorkplaces} onChange={e=>setBulkWorkplaces(e.target.value)} placeholder="Wp1;10&#10;Wp2;15" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 h-[120px] resize-none" />
              <button onClick={() => { if(bulkWorkplaces) { onBatchAddWorkplaces(bulkWorkplaces.split('\n')); setBulkWorkplaces(''); } }} className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all w-full border-2 border-blue-500 shadow-lg">IMPORT BATCH</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="space-y-8">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">LOGISTICKÉ OPERÁCIE</h3>
          <div className="flex-1 overflow-y-auto max-h-80 bg-slate-950/40 rounded-3xl p-6 space-y-3 border border-white/5 shadow-inner">
            {logisticsOperations.map(op => (
              <div key={op.id} className="flex justify-between items-center bg-slate-800/50 h-12 px-5 rounded-xl border border-white/5 group transition-colors hover:bg-slate-700/50">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest truncate max-w-[200px]">{op.value}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={op.standardTime || 0} 
                      onChange={(e) => onUpdateLogisticsOperation(op.id, parseInt(e.target.value) || 0)}
                      className={inlineInputClass}
                    />
                    <span className="text-slate-600 text-[10px]">m</span>
                  </div>
                  <button onClick={() => onDeleteLogisticsOperation(op.id)} className="text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 font-black px-2 text-lg">×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6">
            <h4 className={labelClass}>PRIDAŤ OPERÁCIU</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input value={newLogOp} onChange={e=>setNewLogOp(e.target.value)} placeholder="Operácia" className={inputClass} />
              <input type="number" value={newLogOpTime} onChange={e=>setNewLogOpTime(e.target.value)} placeholder="min" className={inputClass} />
              <button onClick={() => { if(newLogOp) { onAddLogisticsOperation(newLogOp, parseInt(newLogOpTime)); setNewLogOp(''); setNewLogOpTime(''); } }} className="h-12 bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all border-2 border-teal-500 shadow-lg">PRIDAŤ</button>
            </div>
          </div>
        </div>
      </div>

      {/* LOGISTICKÉ SEKTORY (MAPA) */}
      <div className={cardClass}>
        <div className="space-y-8">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">LOGISTICKÉ SEKTORY (MAPA)</h3>
          <div className="flex-1 overflow-y-auto max-h-80 bg-slate-950/40 rounded-3xl p-6 space-y-3 border border-white/5 shadow-inner">
            {mapSectors.map(s => (
              <div key={s.id} className="flex flex-col sm:row justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-white/5 group hover:bg-slate-700/50 transition-colors gap-4">
                <span className="text-sm font-black text-slate-300 uppercase tracking-[0.2em] flex-1">{s.name}</span>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase">X:</span>
                        <input 
                            type="number" 
                            value={s.coordX} 
                            onChange={(e) => onUpdateMapSector(s.id, parseInt(e.target.value) || 0, s.coordY)}
                            className={inlineInputClass.replace('w-12', 'w-16')}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Y:</span>
                        <input 
                            type="number" 
                            value={s.coordY} 
                            onChange={(e) => onUpdateMapSector(s.id, s.coordX, parseInt(e.target.value) || 0)}
                            className={inlineInputClass.replace('w-12', 'w-16')}
                        />
                    </div>
                    <button onClick={() => { if(window.confirm('Zmazať sektor?')) onDeleteMapSector(s.id); }} className="text-slate-600 hover:text-red-500 transition-all font-black px-2 text-xl ml-2">×</button>
                </div>
              </div>
            ))}
            {mapSectors.length === 0 && (
                <p className="text-center py-6 text-slate-600 italic text-xs uppercase tracking-widest font-bold">Žiadne sektory nie sú definované</p>
            )}
          </div>
          <div className="pt-6 border-t border-slate-800">
            <h4 className={labelClass}>PRIDAŤ NOVÝ SEKTOR</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input value={newSectorName} onChange={e=>setNewSectorName(e.target.value)} placeholder="NÁZOV (napr. SKLAD A)" className={inputClass} />
              <input type="number" value={newSectorX} onChange={e=>setNewSectorX(e.target.value)} placeholder="X súradnica" className={inputClass} />
              <input type="number" value={newSectorY} onChange={e=>setNewSectorY(e.target.value)} placeholder="Y súradnica" className={inputClass} />
              <button 
                onClick={() => { 
                    if(newSectorName && newSectorX && newSectorY) { 
                        onAddMapSector(newSectorName.toUpperCase(), parseInt(newSectorX), parseInt(newSectorY)); 
                        setNewSectorName(''); setNewSectorX(''); setNewSectorY(''); 
                    } 
                }} 
                className="h-12 bg-sky-600 hover:bg-sky-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all border-2 border-sky-500 shadow-lg"
              >
                PRIDAŤ SEKTOR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default WorkplaceSection;
