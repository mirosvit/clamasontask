import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ScrapBin, ScrapMetal, ScrapPrice, ScrapRecord, PriorityLevel, Task } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface ScrapWeighingTabProps {
  currentUser: string;
  bins: ScrapBin[];
  metals: ScrapMetal[];
  prices: ScrapPrice[];
  actualScrap: ScrapRecord[];
  scrapSanons: any[];
  onAddRecord: (record: ScrapRecord) => Promise<void>;
  onBulkAddScrapRecords: (records: ScrapRecord[]) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onFinalizeArchive: (date: string, worker: string, records: ScrapRecord[]) => Promise<string | undefined>;
  onAddTask: (pn: string, wp: string | null, qty: string | null, unit: string | null, prio: PriorityLevel, isLogistics?: boolean, noteOrPlate?: string, isProduction?: boolean) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  tasks: Task[];
  hasPermission: (perm: string) => boolean;
  resolveName: (username?: string | null) => string;
}

const Icons = {
  Scale: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Check: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>,
  Alert: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Search: () => <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  ChevronRight: () => <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>,
  Cube: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
};

const ScrapWeighingTab: React.FC<ScrapWeighingTabProps> = (props) => {
  const { t, language } = useLanguage();
  
  const activeScrapTask = useMemo(() => {
      return (props.tasks || []).find(t => 
          t.partNumber === "Váženie šrotu" && 
          !t.isDone && 
          (t.inProgressBy === props.currentUser || t.createdBy === props.currentUser)
      );
  }, [props.tasks, props.currentUser]);

  // States pre modaly výberu
  const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
  const [metalSearch, setMetalSearch] = useState('');
  
  const [isBinModalOpen, setIsBinModalOpen] = useState(false);
  const [binSearchQuery, setBinSearchQuery] = useState('');

  const [selectedMetalId, setSelectedMetalId] = useState('');
  const [selectedBinId, setSelectedBinId] = useState('');
  const [gross, setGross] = useState('');
  const [tara, setTara] = useState(0);
  const [sessionRecords, setSessionRecords] = useState<ScrapRecord[]>([]);

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!activeScrapTask) {
        setSessionRecords([]);
        return;
    }
    const storageKey = `scrap_weighing_${activeScrapTask.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try { setSessionRecords(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, [activeScrapTask?.id]);

  useEffect(() => {
    if (activeScrapTask && sessionRecords.length >= 0) {
        localStorage.setItem(`scrap_weighing_${activeScrapTask.id}`, JSON.stringify(sessionRecords));
    }
  }, [sessionRecords, activeScrapTask?.id]);

  const netto = useMemo(() => {
    const g = parseFloat(gross) || 0;
    return Math.max(g - tara, 0);
  }, [gross, tara]);

  // Filtrovanie kovov v modale
  const filteredMetals = useMemo(() => {
    const q = metalSearch.toLowerCase().trim();
    if (!q) return props.metals;
    return props.metals.filter(m => m.type.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }, [props.metals, metalSearch]);

  // Filtrovanie kontajnerov v modale
  const filteredBins = useMemo(() => {
    const q = binSearchQuery.toLowerCase().trim();
    if (!q) return props.bins;
    return props.bins.filter(b => b.name.toLowerCase().includes(q));
  }, [props.bins, binSearchQuery]);

  const selectedMetalObj = useMemo(() => props.metals.find(m => m.id === selectedMetalId), [props.metals, selectedMetalId]);
  const selectedBinObj = useMemo(() => props.bins.find(b => b.id === selectedBinId), [props.bins, selectedBinId]);

  const handleSelectMetal = (m: ScrapMetal) => {
    setSelectedMetalId(m.id);
    setIsMetalModalOpen(false);
    setMetalSearch('');
  };

  const handleSelectBin = (b: ScrapBin) => {
    setSelectedBinId(b.id);
    setTara(b.tara);
    setIsBinModalOpen(false);
    setBinSearchQuery('');
  };

  const handleStartSession = () => {
      props.onAddTask("Váženie šrotu", "Váha šrotu", "0", "pallet", "NORMAL", true, "", true);
  };

  const handleAddItem = () => {
    if (!selectedMetalId || !selectedBinId || !gross) {
      alert(t('fill_all_fields'));
      return;
    }

    const newRecord: ScrapRecord = {
      id: crypto.randomUUID(),
      metalId: selectedMetalId,
      binId: selectedBinId,
      gross: parseFloat(gross),
      tara: tara,
      netto: netto,
      timestamp: Date.now(),
      worker: props.currentUser,
      taskId: activeScrapTask?.id || ''
    };

    setSessionRecords(prev => [newRecord, ...prev]);
    setGross('');
    setSelectedBinId('');
    setSelectedMetalId('');
    setTara(0);
  };

  const handleDeleteItem = (id: string) => {
      setSessionRecords(prev => prev.filter(r => r.id !== id));
  };

  const confirmCancelSession = async () => {
    if (activeScrapTask) {
        localStorage.removeItem(`scrap_weighing_${activeScrapTask.id}`);
        await props.onDeleteTask(activeScrapTask.id);
    }
    setSessionRecords([]);
    setIsCancelModalOpen(false);
  };

  const handleFinalize = async () => {
      if (!activeScrapTask || sessionRecords.length === 0) return;
      
      setIsSubmitting(true);
      try {
          await props.onBulkAddScrapRecords(sessionRecords);
          await props.onUpdateTask(activeScrapTask.id, {
              isDone: true,
              status: 'completed',
              completedBy: props.currentUser,
              completedAt: Date.now(),
              quantity: sessionRecords.length.toString(),
              quantityUnit: 'pallet',
              note: `Odvážené: ${sessionRecords.length} paliet`
          });
          localStorage.removeItem(`scrap_weighing_${activeScrapTask.id}`);
          setSessionRecords([]);
          setIsFinishModalOpen(false);
          alert(language === 'sk' ? `Váženie úspešne ukončené. Položky pridané do skladu.` : `Weighing finished successfully. Items added to warehouse.`);
      } catch (err) {
          console.error(err);
          alert("Chyba pri ukladaní dát.");
      } finally {
          setIsSubmitting(false);
      }
  };

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
  const inputClass = "w-full h-16 bg-slate-900/80 border-2 border-slate-700 rounded-xl px-4 text-white text-lg font-black focus:outline-none focus:border-teal-500/50 transition-all font-mono uppercase text-center";
  const triggerButtonClass = "w-full h-16 bg-slate-900/80 border-2 border-slate-700 rounded-xl px-4 flex items-center justify-between group hover:border-teal-500/50 transition-all text-left";

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {!activeScrapTask ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-800/20 rounded-[3rem] border-2 border-dashed border-slate-800 space-y-10">
            <div className="text-center">
                <h2 className="text-4xl font-black text-white uppercase tracking-widest">{t('scrap_not_started')}</h2>
                <p className="text-slate-500 text-lg mt-4 font-bold uppercase tracking-widest">{t('scrap_start_hint')}</p>
            </div>
            <button 
                onClick={handleStartSession}
                className="bg-teal-600 hover:bg-teal-500 text-white font-black py-10 px-20 rounded-[2.5rem] shadow-[0_0_50px_rgba(20,184,166,0.3)] transition-all active:scale-95 uppercase tracking-[0.3em] text-3xl border-b-8 border-teal-800"
            >
                ⚖️ {t('scrap_start_btn')}
            </button>
        </div>
      ) : (
        <>
            <div className="flex flex-col md:row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-teal-400 uppercase tracking-tighter leading-none">{t('scrap_active_session')}</h1>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="bg-teal-500/20 text-teal-400 text-[9px] font-black px-3 py-1 rounded-full border border-teal-500/30 animate-pulse uppercase tracking-widest">LIVE RELÁCIA</span>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Položiek: <span className="text-white">{sessionRecords.length}</span></p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsCancelModalOpen(true)}
                    className="h-12 px-6 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/30 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                >
                    🛑 {t('scrap_cancel_session')}
                </button>
            </div>

            <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    {/* MODAL TRIGGER: VÝBER KOVU */}
                    <div className="relative">
                        <label className={labelClass}>{t('scrap_metal_select')}</label>
                        <button 
                            onClick={() => setIsMetalModalOpen(true)}
                            className={triggerButtonClass}
                        >
                            <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-black uppercase truncate ${selectedMetalId ? 'text-white' : 'text-slate-600'}`}>
                                    {selectedMetalObj ? selectedMetalObj.type : 'VÝBER MATERIÁLU'}
                                </span>
                                {selectedMetalObj && (
                                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{selectedMetalObj.description}</span>
                                )}
                            </div>
                            <Icons.ChevronRight />
                        </button>
                    </div>

                    {/* MODAL TRIGGER: VÝBER KONTAJNERA */}
                    <div className="relative">
                        <label className={labelClass}>{t('scrap_bin_select')}</label>
                        <button 
                            onClick={() => setIsBinModalOpen(true)}
                            className={triggerButtonClass}
                        >
                            <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-black uppercase truncate ${selectedBinId ? 'text-white' : 'text-slate-600'}`}>
                                    {selectedBinObj ? selectedBinObj.name : 'VÝBER KONTAJNERA'}
                                </span>
                                {selectedBinObj && (
                                    <span className="text-[10px] font-bold text-teal-500 uppercase truncate">{selectedBinObj.tara} kg tara</span>
                                )}
                            </div>
                            <Icons.ChevronRight />
                        </button>
                    </div>

                    <div className="relative">
                        <label className={labelClass}>{t('scrap_gross')}</label>
                        <input type="number" inputMode="decimal" value={gross} onChange={e => setGross(e.target.value)} className={`${inputClass} !text-3xl text-teal-400`} placeholder="0" />
                        <span className="absolute right-4 bottom-5 text-xs font-black text-slate-600">KG</span>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center h-16">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">VÝSLEDNÉ NETTO</p>
                        <p className="text-2xl font-black text-white font-mono leading-none">{netto} <span className="text-xs font-normal text-slate-600">kg</span></p>
                    </div>
                </div>

                <button 
                    onClick={handleAddItem}
                    className="w-full mt-8 h-16 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black text-lg tracking-[0.2em] shadow-xl transition-all active:scale-95 border-b-4 border-teal-800"
                >
                    ⚖️ {t('scrap_btn_weigh')}
                </button>
            </div>

            <div className={cardClass}>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-1.5 h-4 bg-slate-500 rounded-full"></span>
                        {t('scrap_list_title')}
                    </h3>
                    <button 
                        onClick={() => setIsFinishModalOpen(true)} 
                        disabled={sessionRecords.length === 0}
                        className="w-full sm:w-auto h-14 px-10 bg-green-700 hover:bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest border-b-4 border-green-900 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Icons.Check /> {t('scrap_btn_export')}
                    </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                                <th className="p-4">Čas</th>
                                <th className="p-4">Typ kovu</th>
                                <th className="p-4">Kontajner</th>
                                <th className="p-4 text-right">Brutto</th>
                                <th className="p-4 text-right">Tara</th>
                                <th className="p-4 text-right">Netto</th>
                                <th className="p-4 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {sessionRecords.length > 0 ? (
                                sessionRecords.map(r => {
                                    const metal = props.metals.find(m => m.id === r.metalId);
                                    const bin = props.bins.find(b => b.id === r.binId);
                                    return (
                                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group text-sm">
                                            <td className="p-4 text-slate-500 font-mono">{new Date(r.timestamp).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="p-4 font-black text-white uppercase">{metal?.type || '?'}</td>
                                            <td className="p-4 text-slate-400 font-bold uppercase">{bin?.name || '?'}</td>
                                            <td className="p-4 text-right text-slate-500 font-mono">{r.gross} kg</td>
                                            <td className="p-4 text-right text-slate-500 font-mono">{r.tara} kg</td>
                                            <td className="p-4 text-right font-black text-teal-400 font-mono">{r.netto} kg</td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleDeleteItem(r.id)} className="text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Icons.Trash />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={7} className="py-20 text-center text-slate-700 font-black uppercase tracking-[0.3em] text-xs italic">Zatiaľ žiadne váženia v tejto relácii</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
      )}

      {/* --- METAL SELECTION MODAL --- */}
      {isMetalModalOpen && createPortal(
          <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setIsMetalModalOpen(false)}>
              <div className="bg-slate-900 border-2 border-teal-500/50 rounded-[2.5rem] shadow-[0_0_100px_rgba(20,184,166,0.2)] w-full max-w-4xl p-8 sm:p-10 relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                      <div>
                          <h3 className="text-3xl font-black text-white uppercase tracking-tighter">VÝBER KOVU</h3>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Zvoľte typ materiálu pre váženie</p>
                      </div>
                      <button onClick={() => setIsMetalModalOpen(false)} className="text-slate-500 hover:text-white transition-colors text-2xl font-black p-2">×</button>
                  </div>

                  <div className="relative mb-6">
                      <input 
                          type="text"
                          value={metalSearch}
                          onChange={e => setMetalSearch(e.target.value.toUpperCase())}
                          placeholder="FILTROVAŤ MATERIÁL..."
                          className="w-full h-14 bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 pl-14 text-white font-black uppercase focus:border-teal-500 outline-none transition-all shadow-inner"
                          autoFocus
                      />
                      <div className="absolute left-6 top-5"><Icons.Search /></div>
                  </div>

                  <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredMetals.map(m => (
                              <button
                                  key={m.id}
                                  onClick={() => handleSelectMetal(m)}
                                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-start text-left group active:scale-[0.97] min-h-[100px] ${selectedMetalId === m.id ? 'bg-teal-600/10 border-teal-500 shadow-lg shadow-teal-500/20' : 'bg-slate-800/40 border-slate-700 hover:border-teal-500/40 hover:bg-slate-800'}`}
                              >
                                  <span className={`text-lg font-black uppercase tracking-tight leading-none mb-2 ${selectedMetalId === m.id ? 'text-teal-400' : 'text-white'}`}>
                                      {m.type}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                      {m.description || 'Bez popisu'}
                                  </span>
                              </button>
                          ))}
                          {filteredMetals.length === 0 && (
                              <div className="col-span-full py-20 text-center text-slate-600 font-black uppercase tracking-widest italic opacity-50">
                                  Nenašli sa žiadne materiály
                              </div>
                          )}
                      </div>
                  </div>

                  <button 
                      onClick={() => setIsMetalModalOpen(false)}
                      className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all border border-slate-700 shadow-inner"
                  >
                      {t('btn_cancel')}
                  </button>
              </div>
          </div>,
          document.body
      )}

      {/* --- BIN SELECTION MODAL --- */}
      {isBinModalOpen && createPortal(
          <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setIsBinModalOpen(false)}>
              <div className="bg-slate-900 border-2 border-blue-500/50 rounded-[2.5rem] shadow-[0_0_100px_rgba(59,130,246,0.2)] w-full max-w-4xl p-8 sm:p-10 relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                      <div>
                          <h3 className="text-3xl font-black text-white uppercase tracking-tighter">VÝBER KONTAJNERA</h3>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Zvoľte kontajner pre váženie</p>
                      </div>
                      <button onClick={() => setIsBinModalOpen(false)} className="text-slate-500 hover:text-white transition-colors text-2xl font-black p-2">×</button>
                  </div>

                  <div className="relative mb-6">
                      <input 
                          type="text"
                          value={binSearchQuery}
                          onChange={e => setBinSearchQuery(e.target.value.toUpperCase())}
                          placeholder="FILTROVAŤ KONTAJNERY..."
                          className="w-full h-14 bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 pl-14 text-white font-black uppercase focus:border-blue-500 outline-none transition-all shadow-inner"
                          autoFocus
                      />
                      <div className="absolute left-6 top-5"><Icons.Search /></div>
                  </div>

                  <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredBins.map(b => (
                              <button
                                  key={b.id}
                                  onClick={() => handleSelectBin(b)}
                                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-start text-left group active:scale-[0.97] min-h-[100px] ${selectedBinId === b.id ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-800/40 border-slate-700 hover:border-blue-500/40 hover:bg-slate-800'}`}
                              >
                                  <div className="flex justify-between items-start w-full mb-2">
                                      <span className={`text-3xl font-black uppercase tracking-tight leading-none ${selectedBinId === b.id ? 'text-blue-400' : 'text-white'}`}>
                                          {b.name}
                                      </span>
                                      <div className="p-2 bg-slate-950/50 rounded-lg text-teal-400">
                                          <Icons.Cube />
                                      </div>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-auto">
                                      Tara: <span className="text-white">{b.tara} kg</span>
                                  </span>
                              </button>
                          ))}
                          {filteredBins.length === 0 && (
                              <div className="col-span-full py-20 text-center text-slate-600 font-black uppercase tracking-widest italic opacity-50">
                                  Nenašli sa žiadne kontajnery
                              </div>
                          )}
                      </div>
                  </div>

                  <button 
                      onClick={() => setIsBinModalOpen(false)}
                      className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all border border-slate-700 shadow-inner"
                  >
                      {t('btn_cancel')}
                  </button>
              </div>
          </div>,
          document.body
      )}

      {/* --- FINISH CONFIRMATION MODAL --- */}
      {isFinishModalOpen && createPortal(
          <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={() => !isSubmitting && setIsFinishModalOpen(false)}>
              <div className="bg-slate-900 border-2 border-teal-500/50 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                  <div className="w-20 h-20 bg-teal-500/10 border border-teal-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-500">
                      <Icons.Scale />
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                      {language === 'sk' ? 'UKONČIŤ RELÁCIU?' : 'FINISH SESSION?'}
                  </h3>
                  
                  <p className="text-sm text-slate-400 font-bold uppercase leading-relaxed mb-10">
                    {language === 'sk' 
                      ? `Naozaj chcete ukončiť váženie a uložiť ${sessionRecords.length} položiek do skladu šrotu?` 
                      : `Do you want to finish weighing and save ${sessionRecords.length} items to scrap warehouse?`
                    }
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                      <button 
                        disabled={isSubmitting}
                        onClick={() => setIsFinishModalOpen(false)} 
                        className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all disabled:opacity-30"
                      >
                        ZRUŠIŤ
                      </button>
                      <button 
                        disabled={isSubmitting}
                        onClick={handleFinalize} 
                        className="h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-teal-800 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:border-slate-800"
                      >
                        {isSubmitting ? 'UKLADÁM...' : <><Icons.Check /> POTVRDIŤ KONIEC</>}
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* --- CANCEL CONFIRMATION MODAL --- */}
      {isCancelModalOpen && createPortal(
          <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setIsCancelModalOpen(false)}>
              <div className="bg-slate-900 border-2 border-red-600 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden text-center" onClick={e => e.stopPropagation()}>
                  <div className="w-20 h-20 bg-red-600/10 border border-red-600/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                      <Icons.Alert />
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                      {language === 'sk' ? 'ZRUŠIŤ VÁŽENIE?' : 'CANCEL WEIGHING?'}
                  </h3>
                  
                  <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl mb-10">
                    <p className="text-sm text-red-400 font-bold uppercase leading-relaxed">
                        {language === 'sk' 
                            ? "POZOR! Všetky doteraz odvážené položky v tejto relácii budú nenávratne vymazané z pamäte tabletu a úloha bude zrušená." 
                            : "WARNING! All items weighed in this session will be permanently deleted from tablet memory and the task will be cancelled."
                        }
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setIsCancelModalOpen(false)} 
                        className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all"
                      >
                        {t('btn_cancel')}
                      </button>
                      <button 
                        onClick={confirmCancelSession} 
                        className="h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-red-800 shadow-xl transition-all active:scale-95"
                      >
                        {language === 'sk' ? 'POTVRDIŤ ZMAZANIE' : 'CONFIRM DELETE'}
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

    </div>
  );
};

export default ScrapWeighingTab;