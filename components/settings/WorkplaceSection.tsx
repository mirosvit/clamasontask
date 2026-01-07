import React, { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { DBItem, MapSector, SystemConfig, MapObstacle } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface WorkplaceSectionProps {
  workplaces: DBItem[];
  logisticsOperations: DBItem[];
  onAddWorkplace: (val: string, time?: number, x?: number, y?: number) => void;
  onUpdateWorkplace: (id: string, updates: Partial<DBItem>) => void;
  onBatchAddWorkplaces: (vals: string[]) => void;
  onDeleteWorkplace: (id: string) => void;
  onDeleteAllWorkplaces: () => void;
  onAddLogisticsOperation: (val: string, time?: number, dist?: number, x?: number, y?: number, defaultSource?: string, defaultTarget?: string) => void;
  onUpdateLogisticsOperation: (id: string, updates: Partial<DBItem>) => void;
  onDeleteLogisticsOperation: (id: string) => void;
  onDeleteAllLogisticsOperations: () => void;
  mapSectors: MapSector[];
  onAddMapSector: (name: string, x: number, y: number, color?: string) => void;
  onDeleteMapSector: (id: string) => void;
  onUpdateMapSector: (id: string, updates: Partial<MapSector>) => void;
  mapObstacles: MapObstacle[];
  onAddMapObstacle: (obs: Omit<MapObstacle, 'id'>) => void;
  onDeleteMapObstacle: (id: string) => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
}

// --- ICONS ---
const Icons = {
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Import: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Factory: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Truck: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
  Map: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  Time: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Stop: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
};

const colorOptions = [
  { id: 'slate', label: 'Šedá', class: 'bg-slate-600', border: 'border-slate-500' },
  { id: 'blue', label: 'Modrá', class: 'bg-blue-600', border: 'border-blue-500' },
  { id: 'green', label: 'Zelená', class: 'bg-emerald-600', border: 'border-emerald-500' },
  { id: 'orange', label: 'Oranžová', class: 'bg-orange-600', border: 'border-orange-500' },
  { id: 'teal', label: 'Teal', class: 'bg-teal-600', border: 'border-teal-500' },
  { id: 'pink', label: 'Ružová', class: 'bg-pink-600', border: 'border-pink-500' },
  { id: 'red', label: 'Červená', class: 'bg-red-600', border: 'border-red-500' }
];

const WorkplaceSection: React.FC<WorkplaceSectionProps> = memo((props) => {
  const { t } = useLanguage();
  const [wpSearch, setWpSearch] = useState('');
  
  // Modals States
  const [isWpModalOpen, setIsWpModalOpen] = useState(false);
  const [editingWp, setEditingWp] = useState<Partial<DBItem> | null>(null); 
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Partial<DBItem> | null>(null);

  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Partial<MapSector> | null>(null);

  const [isObstacleModalOpen, setIsObstacleModalOpen] = useState(false);
  const [editingObstacle, setEditingObstacle] = useState<Partial<MapObstacle> | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [bulkWorkplaces, setBulkWorkplaces] = useState('');

  // Filtered Lists
  const filteredWPs = useMemo(() => {
      const q = wpSearch.toLowerCase();
      if (!q) return props.workplaces;
      return props.workplaces.filter(w => w.value.toLowerCase().includes(q));
  }, [props.workplaces, wpSearch]);

  const sortedSectors = useMemo(() => {
    return [...props.mapSectors].sort((a, b) => (a.order || 0) - (b.order || 0) || (a.name || '').localeCompare(b.name || ''));
  }, [props.mapSectors]);

  // --- HANDLERS ---

  // Obstacle
  const handleCreateObstacle = () => {
      setEditingObstacle({ name: 'Regál', x: 0, y: 0, w: 50, h: 20, type: 'rack' });
      setIsObstacleModalOpen(true);
  };
  const handleSaveObstacle = () => {
      if (!editingObstacle || !editingObstacle.name) return;
      props.onAddMapObstacle(editingObstacle as Omit<MapObstacle, 'id'>);
      setIsObstacleModalOpen(false);
  };

  // Workplace
  const handleEditWorkplace = (wp: DBItem) => {
      setEditingWp({ ...wp });
      setIsWpModalOpen(true);
  };
  const handleCreateWorkplace = () => {
      setEditingWp({ value: '', standardTime: 2.0, coordX: 0, coordY: 0 });
      setIsWpModalOpen(true);
  };
  const handleSaveWorkplace = () => {
      if (!editingWp || !editingWp.value) return;
      if (editingWp.id) {
          props.onUpdateWorkplace(editingWp.id, editingWp);
      } else {
          props.onAddWorkplace(editingWp.value, editingWp.standardTime, editingWp.coordX, editingWp.coordY);
      }
      setIsWpModalOpen(false);
  };

  // Logistics
  const handleEditLog = (op: DBItem) => {
      setEditingLog({ ...op });
      setIsLogModalOpen(true);
  };
  const handleCreateLog = () => {
      setEditingLog({ value: '', standardTime: 2.0, distancePx: 0, coordX: 0, coordY: 0, defaultSourceSectorId: '', defaultTargetSectorId: '' });
      setIsLogModalOpen(true);
  };
  const handleSaveLog = () => {
      if (!editingLog || !editingLog.value) return;
      if (editingLog.id) {
          props.onUpdateLogisticsOperation(editingLog.id, editingLog);
      } else {
          props.onAddLogisticsOperation(editingLog.value, editingLog.standardTime, editingLog.distancePx, editingLog.coordX, editingLog.coordY, editingLog.defaultSourceSectorId, editingLog.defaultTargetSectorId);
      }
      setIsLogModalOpen(false);
  };

  // Sector
  const handleEditSector = (s: MapSector) => {
      setEditingSector({ ...s });
      setIsSectorModalOpen(true);
  };
  const handleCreateSector = () => {
      setEditingSector({ name: '', order: (props.mapSectors.length + 1) * 10, color: 'slate', coordX: 0, coordY: 0 });
      setIsSectorModalOpen(true);
  };
  const handleSaveSector = () => {
      if (!editingSector || !editingSector.name) return;
      if (editingSector.id) {
          props.onUpdateMapSector(editingSector.id, editingSector);
      } else {
          props.onAddMapSector(editingSector.name, editingSector.coordX || 0, editingSector.coordY || 0, editingSector.color);
      }
      setIsSectorModalOpen(false);
  };

  // Import
  const handleBatchImport = () => {
      if (bulkWorkplaces) {
          props.onBatchAddWorkplaces(bulkWorkplaces.split('\n'));
          setBulkWorkplaces('');
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in">
      
      {/* --- LEFT COLUMN: PRODUCTION --- */}
      <div className="space-y-8">
        <div className={cardClass}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <span className="w-2 h-8 bg-teal-500 rounded-full"></span>
                        PRACOVISKÁ
                    </h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 ml-5">Výroba & Normy</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsImportModalOpen(true)} className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-lg shadow-md transition-all flex items-center justify-center border border-slate-700" title="Importovať dávku">
                        <Icons.Import />
                    </button>
                    <button onClick={handleCreateWorkplace} className="h-10 bg-teal-600 hover:bg-teal-500 text-white px-4 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-wide">
                        <Icons.Plus /> <span className="hidden sm:inline">Nové</span>
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <input 
                    value={wpSearch} 
                    onChange={e=>setWpSearch(e.target.value)} 
                    placeholder="HĽADAŤ PRACOVISKO..." 
                    className="w-full h-12 bg-slate-900/50 border border-slate-700 rounded-xl px-4 text-white uppercase font-bold focus:outline-none focus:border-teal-500 transition-all" 
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {filteredWPs.map(w => (
                    <div key={w.id} className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-teal-500/30 rounded-2xl p-5 transition-all duration-200 relative cursor-default">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-black text-white text-lg leading-tight uppercase break-words max-w-[80%]">{w.value}</h4>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-slate-900/80 rounded-lg p-1 backdrop-blur-sm">
                                <button onClick={() => handleEditWorkplace(w)} className="text-slate-400 hover:text-white p-1.5 hover:bg-teal-600 rounded-md transition-colors"><Icons.Edit /></button>
                                <button onClick={() => { if(window.confirm('Vymazať?')) props.onDeleteWorkplace(w.id); }} className="text-slate-400 hover:text-white p-1.5 hover:bg-red-600 rounded-md transition-colors"><Icons.Trash /></button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-3 bg-slate-950/30 p-3 rounded-xl border border-white/5">
                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Icons.Time /></div>
                            <div>
                                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">NORMA</p>
                                <p className="text-lg font-black text-white font-mono">{w.standardTime ?? 2.0} <span className="text-xs font-normal text-slate-500">min</span></p>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <div className="inline-flex items-center gap-2 text-[9px] font-mono font-bold bg-slate-950/30 px-3 py-1 rounded-full text-slate-500 border border-white/5">
                                <span>X: {w.coordX || 0}</span>
                                <span className="text-slate-700">|</span>
                                <span>Y: {w.coordY || 0}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Map Obstacles - NOVO PRIDANÉ */}
        <div className={cardClass}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                        PREKÁŽKY MAPY
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Steny, regále a prejazdy</p>
                </div>
                <button onClick={handleCreateObstacle} className="h-9 bg-red-700 hover:bg-red-600 text-white px-3 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <Icons.Plus /> Pridať prekážku
                </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {(props.mapObstacles || []).map(obs => (
                    <div key={obs.id} className="flex justify-between items-center bg-slate-950/30 p-3 rounded-xl border border-white/5 group hover:bg-slate-900 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${obs.type === 'wall' ? 'bg-slate-700' : 'bg-red-900/30 text-red-500'}`}>
                                <Icons.Stop />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase">{obs.name}</p>
                                <p className="text-[9px] font-mono text-slate-600 uppercase">
                                    Pos: {obs.x},{obs.y} | Size: {obs.w}x{obs.h}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => { if(window.confirm('Zmazať prekážku?')) props.onDeleteMapObstacle(obs.id); }} className="text-slate-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icons.Trash />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* --- RIGHT COLUMN: LOGISTICS & SECTORS --- */}
      <div className="space-y-8">
        
        {/* VZV Config */}
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-lg">
            <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Rýchlosť flotily VZV</h4>
                <p className="text-[10px] text-slate-500">Pre výpočet Travel Time</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-700">
                <input 
                    type="number" 
                    value={props.systemConfig.vzvSpeed || 8}
                    onChange={e => props.onUpdateSystemConfig({ vzvSpeed: parseFloat(e.target.value) || 1 })}
                    className="bg-transparent text-white font-black text-lg w-12 text-center focus:outline-none border-b border-slate-600 focus:border-indigo-500"
                />
                <span className="text-[10px] font-black text-slate-500 pr-1">KM/H</span>
            </div>
        </div>

        {/* Logistics Operations */}
        <div className={cardClass}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                        LOGISTIKA
                    </h3>
                </div>
                <button onClick={handleCreateLog} className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <Icons.Plus /> Pridať
                </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {props.logisticsOperations.map(op => {
                    const isOutbound = op.value.toUpperCase().includes('NAKL') || op.value.toUpperCase().includes('OUT');
                    const isInbound = op.value.toUpperCase().includes('VYKL') || op.value.toUpperCase().includes('IN');
                    const statusColor = isOutbound ? 'text-sky-400' : isInbound ? 'text-green-400' : 'text-slate-300';
                    const iconBg = isOutbound ? 'bg-sky-500/10 border-sky-500/20' : isInbound ? 'bg-green-500/10 border-green-500/20' : 'bg-slate-700/30 border-slate-600/30';

                    return (
                        <div key={op.id} className="flex justify-between items-center bg-slate-900/40 hover:bg-slate-800/60 p-3 rounded-xl border border-white/5 transition-all group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2 rounded-lg border ${iconBg}`}>
                                    <Icons.Truck />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs font-black uppercase tracking-tighter truncate ${statusColor}`}>{op.value}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-1.5 rounded border border-white/5">{op.distancePx}px</span>
                                        <span className="text-[9px] font-mono text-amber-500/80">Norma: {op.standardTime}m</span>
                                        <div className="flex gap-1 text-[8px] font-mono text-slate-600">
                                            <span>X:{op.coordX || 0}</span>
                                            <span>Y:{op.coordY || 0}</span>
                                        </div>
                                    </div>
                                    {(op.defaultSourceSectorId || op.defaultTargetSectorId) && (
                                        <div className="flex gap-2 mt-1">
                                            {op.defaultSourceSectorId && <span className="text-[7px] bg-slate-800 text-slate-400 px-1 rounded uppercase">Predv. Zdroj</span>}
                                            {op.defaultTargetSectorId && <span className="text-[7px] bg-slate-800 text-slate-400 px-1 rounded uppercase">Predv. Cieľ</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditLog(op)} className="p-1.5 text-slate-400 hover:text-white hover:bg-indigo-600 rounded"><Icons.Edit /></button>
                                <button onClick={() => { if(window.confirm('Vymazať?')) props.onDeleteLogisticsOperation(op.id); }} className="p-1.5 text-slate-400 hover:text-white hover:bg-red-600 rounded"><Icons.Trash /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Map Sectors */}
        <div className={cardClass}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <span className="w-2 h-6 bg-slate-500 rounded-full"></span>
                        SEKTORY (KYBLÍK)
                    </h3>
                </div>
                <button onClick={handleCreateSector} className="h-9 bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <Icons.Plus /> Pridať
                </button>
            </div>

            <div className="flex flex-wrap gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {sortedSectors.map(s => {
                    const colorObj = colorOptions.find(c => c.id === s.color) || colorOptions[0];
                    return (
                        <div key={s.id} className="group flex items-center gap-3 bg-slate-900/50 border border-white/5 hover:border-white/20 p-2 pr-3 rounded-xl transition-all cursor-pointer hover:shadow-lg">
                            <div className={`w-3 h-3 rounded-full ${colorObj.class} shadow-sm ml-1`}></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">#{s.order}</span>
                                <span className="text-xs font-bold text-slate-200 uppercase">{s.name}</span>
                            </div>
                            <div className="flex gap-1 ml-2 border-l border-white/10 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditSector(s)} className="text-slate-400 hover:text-amber-400"><Icons.Edit /></button>
                                <button onClick={() => { if(window.confirm('Zmazať?')) props.onDeleteMapSector(s.id); }} className="text-slate-400 hover:text-red-500"><Icons.Trash /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </div>

      {/* --- MODALS --- */}

      {/* OBSTACLE MODAL */}
      {isObstacleModalOpen && editingObstacle && createPortal(
          <div className={modalOverlayClass} onClick={() => setIsObstacleModalOpen(false)}>
              <div className={modalContentClass} onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">DEFINOVAŤ PREKÁŽKU</h3>
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className={labelClass}>NÁZOV (NAPR. REGÁL A1)</label>
                              <input value={editingObstacle.name} onChange={e=>setEditingObstacle({...editingObstacle, name: e.target.value})} className={inputClass} />
                          </div>
                          <div>
                              <label className={labelClass}>X POZÍCIA</label>
                              <input type="number" value={editingObstacle.x} onChange={e=>setEditingObstacle({...editingObstacle, x: parseInt(e.target.value)})} className={inputClass} />
                          </div>
                          <div>
                              <label className={labelClass}>Y POZÍCIA</label>
                              <input type="number" value={editingObstacle.y} onChange={e=>setEditingObstacle({...editingObstacle, y: parseInt(e.target.value)})} className={inputClass} />
                          </div>
                          <div>
                              <label className={labelClass}>ŠÍRKA (W)</label>
                              <input type="number" value={editingObstacle.w} onChange={e=>setEditingObstacle({...editingObstacle, w: parseInt(e.target.value)})} className={inputClass} />
                          </div>
                          <div>
                              <label className={labelClass}>VÝŠKA (H)</label>
                              <input type="number" value={editingObstacle.h} onChange={e=>setEditingObstacle({...editingObstacle, h: parseInt(e.target.value)})} className={inputClass} />
                          </div>
                          <div className="col-span-2">
                              <label className={labelClass}>TYP</label>
                              <select value={editingObstacle.type} onChange={e=>setEditingObstacle({...editingObstacle, type: e.target.value as any})} className={inputClass}>
                                  <option value="rack">REGÁL (PRIEPUTNÝ PRE LOGIKU)</option>
                                  <option value="wall">STENA (NEPRIEPUTNÝ BLOK)</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex gap-3 mt-8">
                        <button onClick={() => setIsObstacleModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase text-slate-400 bg-transparent border-2 border-slate-700 text-xs">Zrušiť</button>
                        <button onClick={handleSaveObstacle} className="flex-1 h-14 bg-red-600 text-white rounded-xl font-black uppercase text-xs border-2 border-red-500">Uložiť Blok</button>
                      </div>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* WORKPLACE MODAL */}
      {isWpModalOpen && editingWp && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsWpModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">
                  {editingWp.id ? 'UPRAVIŤ PRACOVISKO' : 'NOVÉ PRACOVISKO'}
               </h3>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>NÁZOV PRACOVISKA</label>
                     <input 
                        value={editingWp.value} 
                        onChange={e => setEditingWp({...editingWp, value: e.target.value.toUpperCase()})}
                        className={`${inputClass} text-lg`}
                        autoFocus
                     />
                  </div>

                  <div>
                     <label className={`${labelClass} text-amber-500`}>NORMA NA 1 ÚKON (STANDARD TIME)</label>
                     <div className="relative">
                        <input 
                           type="number" 
                           value={editingWp.standardTime} 
                           onChange={e => setEditingWp({...editingWp, standardTime: parseFloat(e.target.value)})}
                           className={`${inputClass} border-amber-500/30 focus:border-amber-500 text-amber-400`}
                        />
                        <span className="absolute right-4 top-3 text-xs font-black text-amber-500/50">MIN</span>
                     </div>
                     <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">* Čas na 1 paletu alebo 1 cyklus.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-800">
                     <div>
                        <label className={labelClass}>X SÚRADNICA</label>
                        <input 
                           type="number" 
                           value={editingWp.coordX} 
                           onChange={e => setEditingWp({...editingWp, coordX: parseInt(e.target.value)})}
                           className={inputClass}
                        />
                     </div>
                     <div>
                        <label className={labelClass}>Y SÚRADNICA</label>
                        <input 
                           type="number" 
                           value={editingWp.coordY} 
                           onChange={e => setEditingWp({...editingWp, coordY: parseInt(e.target.value)})}
                           className={inputClass}
                        />
                     </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsWpModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        Zrušiť
                     </button>
                     <button onClick={handleSaveWorkplace} className="flex-1 h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-teal-500">
                        Uložiť
                     </button>
                  </div>
               </div>
            </div>
         </div>,
         document.body
      )}

      {/* LOGISTICS MODAL */}
      {isLogModalOpen && editingLog && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsLogModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">
                  {editingLog.id ? 'UPRAVIŤ OPERÁCIU' : 'NOVÁ OPERÁCIA'}
               </h3>
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>NÁZOV OPERÁCIE</label>
                     <input 
                        value={editingLog.value} 
                        onChange={e => setEditingLog({...editingLog, value: e.target.value.toUpperCase()})}
                        className={inputClass}
                        placeholder="NAPR. VYKLÁDKA"
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className={`${labelClass} text-indigo-400`}>VZDIALENOSŤ TRASY (PX)</label>
                     <input 
                        type="number" 
                        value={editingLog.distancePx} 
                        onChange={e => setEditingLog({...editingLog, distancePx: parseInt(e.target.value)})}
                        className={`${inputClass} border-indigo-500/30 focus:border-indigo-500 text-indigo-400`}
                     />
                  </div>
                  <div>
                     <label className={`${labelClass} text-amber-500`}>NORMA NA 1 ÚKON (STANDARD TIME)</label>
                     <input 
                        type="number" 
                        value={editingLog.standardTime} 
                        onChange={e => setEditingLog({...editingLog, standardTime: parseFloat(e.target.value)})}
                        className={`${inputClass} border-amber-500/30 text-amber-400`}
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                     <div className="col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Predvolené Sektory (Automatické plnenie)</div>
                     <div>
                        <label className={labelClass}>ZDROJ (ODKIAĽ)</label>
                        <select 
                            value={editingLog.defaultSourceSectorId || ''} 
                            onChange={e => setEditingLog({...editingLog, defaultSourceSectorId: e.target.value})}
                            className={inputClass}
                        >
                            <option value="">-- Žiadny --</option>
                            {props.mapSectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className={labelClass}>CIEĽ (KAM)</label>
                        <select 
                            value={editingLog.defaultTargetSectorId || ''} 
                            onChange={e => setEditingLog({...editingLog, defaultTargetSectorId: e.target.value})}
                            className={inputClass}
                        >
                            <option value="">-- Žiadny --</option>
                            {props.mapSectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>
                  </div>

                  {/* SÚRADNICE PRE REŤAZENIE LOGISTIKY */}
                  <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-800">
                     <div className="col-span-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 text-center">
                        Súradnice miesta (pre reťazenie jázd)
                     </div>
                     <div>
                        <label className={labelClass}>X SÚRADNICA</label>
                        <input 
                           type="number" 
                           value={editingLog.coordX || 0} 
                           onChange={e => setEditingLog({...editingLog, coordX: parseInt(e.target.value)})}
                           className={inputClass}
                        />
                     </div>
                     <div>
                        <label className={labelClass}>Y SÚRADNICA</label>
                        <input 
                           type="number" 
                           value={editingLog.coordY || 0} 
                           onChange={e => setEditingLog({...editingLog, coordY: parseInt(e.target.value)})}
                           className={inputClass}
                        />
                     </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsLogModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        Zrušiť
                     </button>
                     <button onClick={handleSaveLog} className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-indigo-500">
                        Uložiť
                     </button>
                  </div>
               </div>
            </div>
         </div>,
         document.body
      )}

      {/* SECTOR MODAL */}
      {isSectorModalOpen && editingSector && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsSectorModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">
                  {editingSector.id ? 'UPRAVIŤ SEKTOR' : 'NOVÝ SEKTOR'}
               </h3>
               <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className={labelClass}>NÁZOV SEKTORA</label>
                        <input 
                            value={editingSector.name} 
                            onChange={e => setEditingSector({...editingSector, name: e.target.value.toUpperCase()})}
                            className={inputClass}
                            placeholder="NAPR. LISOVŇA"
                            autoFocus
                        />
                      </div>
                      <div>
                        <label className={labelClass}>PORADIE</label>
                        <input 
                            type="number"
                            value={editingSector.order} 
                            onChange={e => setEditingSector({...editingSector, order: parseInt(e.target.value)})}
                            className={inputClass}
                        />
                      </div>
                  </div>
                  
                  <div>
                     <label className={labelClass}>FARBA</label>
                     <div className="flex flex-wrap gap-3">
                        {colorOptions.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setEditingSector({...editingSector, color: c.id})}
                                className={`w-10 h-10 rounded-full transition-all ${c.class} ${editingSector.color === c.id ? 'ring-4 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                title={c.label}
                            />
                        ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                     <div>
                        <label className={labelClass}>X SÚRADNICA</label>
                        <input 
                           type="number" 
                           value={editingSector.coordX} 
                           onChange={e => setEditingSector({...editingSector, coordX: parseInt(e.target.value)})}
                           className={inputClass}
                        />
                     </div>
                     <div>
                        <label className={labelClass}>Y SÚRADNICA</label>
                        <input 
                           type="number" 
                           value={editingSector.coordY} 
                           onChange={e => setEditingSector({...editingSector, coordY: parseInt(e.target.value)})}
                           className={inputClass}
                        />
                     </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsSectorModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        Zrušiť
                     </button>
                     <button onClick={handleSaveSector} className="flex-1 h-14 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-slate-600">
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
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">
                  HROMADNÝ IMPORT
               </h3>
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>DÁTA (Formát: Názov;Čas)</label>
                     <textarea 
                        value={bulkWorkplaces} 
                        onChange={e => setBulkWorkplaces(e.target.value)}
                        placeholder="Workplace1;2.0&#10;Workplace2;1.5" 
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 h-48 resize-none"
                        autoFocus
                     />
                     <p className="text-[10px] text-slate-500 mt-2 italic">* Zadajte klasickú normu v minútach.</p>
                  </div>
                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsImportModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        Zrušiť
                     </button>
                     <button onClick={handleBatchImport} className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-blue-500">
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

export default WorkplaceSection;