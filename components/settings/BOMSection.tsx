
import React, { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { BOMComponent } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface BOMSectionProps {
  bomMap: Record<string, BOMComponent[]>;
  onAddBOMItem: (parent: string, child: string, qty: number) => void;
  onBatchAddBOMItems: (vals: string[]) => void;
  onDeleteBOMItem: (parent: string, child: string) => void;
  onDeleteAllBOMItems: () => void;
  parts?: { id: string; value: string; description?: string }[];
  onAddPart?: (partNumber: string) => Promise<void>;
  onDeletePart?: (partId: string) => Promise<void>;
}

// --- ICONS ---
const Icons = {
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Import: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Export: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Flow: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>,
  Layers: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Compare: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  AlertCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Database: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
};

const BOMSection: React.FC<BOMSectionProps> = memo(({ bomMap, onAddBOMItem, onBatchAddBOMItems, onDeleteBOMItem, onDeleteAllBOMItems, parts, onAddPart, onDeletePart }) => {
  const { t, language } = useLanguage();
  
  // Section Navigation: 'list' (Väzby) alebo 'correlation' (Korelácia)
  const [activeTab, setActiveTab] = useState<'list' | 'correlation'>('list');
  const [bomSearchQuery, setBomSearchQuery] = useState('');
  const [correlationSearchQuery, setCorrelationSearchQuery] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Add Form State
  const [bomParent, setBomParent] = useState('');
  const [bomChild, setBomChild] = useState('');
  const [bomQty, setBomQty] = useState('');
  
  // Import Form State
  const [bomBulk, setBomBulk] = useState('');

  // States pre loading pri zapisovaní chýbajúcich dielov
  const [isAddingBatchParts, setIsAddingBatchParts] = useState(false);
  const [addingPartsMap, setAddingPartsMap] = useState<Record<string, boolean>>({});

  const flattenedItems = useMemo(() => {
    const items: { parent: string; child: string; consumption: number }[] = [];
    Object.entries(bomMap).forEach(([parent, components]) => {
      (components as BOMComponent[]).forEach(comp => {
        items.push({ parent, child: comp.child, consumption: comp.consumption });
      });
    });
    return items;
  }, [bomMap]);

  const filteredBOMs = useMemo(() => {
      const q = bomSearchQuery.toLowerCase();
      if (!q) return flattenedItems;
      return flattenedItems.filter(item => 
          item.parent.toLowerCase().includes(q) || 
          item.child.toLowerCase().includes(q)
      );
  }, [flattenedItems, bomSearchQuery]);

  const handleAddSubmit = () => {
      if (bomParent && bomChild && bomQty) {
          onAddBOMItem(bomParent, bomChild, parseFloat(bomQty));
          setBomParent('');
          setBomChild('');
          setBomQty('');
          setIsAddModalOpen(false);
      }
  };

  const handleBatchSubmit = () => {
      if (bomBulk) {
          onBatchAddBOMItems(bomBulk.split('\n'));
          setBomBulk('');
          setIsImportModalOpen(false);
      }
  };

  const handleExport = () => {
    if (flattenedItems.length === 0) {
      alert(language === 'sk' ? 'V kusovníku nie sú žiadne položky na export.' : 'No items in BOM to export.');
      return;
    }

    const exportData = flattenedItems.map(item => ({
      'RODIČ (PARENT)': item.parent,
      'DIEŤA (CHILD)': item.child,
      'SPOTREBA (QTY)': item.consumption
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kusovník');
    XLSX.writeFile(wb, `BOM_Kusovnik_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- KORELAČNÉ ANALÝZY ---

  // 1. DIELY V BOM, KTORÉ CHÝBAJÚ V DB (KATALÓGU)
  const partsMissingInDB = useMemo(() => {
    const dbParts = new Set((parts || []).map(p => p.id.toUpperCase().trim()));
    const bomParts = new Set<string>();
    
    // Zozbierame všetky položky vystupujúce v BOM (dieťa aj rodič)
    Object.entries(bomMap).forEach(([parent, components]) => {
      if (parent && parent.trim()) {
        bomParts.add(parent.toUpperCase().trim());
      }
      components.forEach(comp => {
        if (comp.child && comp.child.trim()) {
          bomParts.add(comp.child.toUpperCase().trim());
        }
      });
    });
    
    const missing: { partNumber: string; occurrences: string[] }[] = [];
    bomParts.forEach(p => {
      if (!dbParts.has(p)) {
        // Hľadáme všetky typy výskytu – dieťa môže byť v inej úrovni rodičom a naopak
        const occurrences: string[] = [];
        if (bomMap[p]) {
          occurrences.push(language === 'sk' ? 'Rodičovská zostava' : 'Parent assembly');
        }
        Object.entries(bomMap).forEach(([parent, components]) => {
          if (components.some(c => c.child.toUpperCase().trim() === p)) {
            occurrences.push(`${language === 'sk' ? 'Komponent u' : 'Child under'} [${parent}]`);
          }
        });
        
        missing.push({
          partNumber: p,
          occurrences
        });
      }
    });

    // Filtrujeme vyhľadávaním, ak existuje filter
    const q = correlationSearchQuery.toUpperCase().trim();
    if (!q) return missing;
    return missing.filter(item => 
      item.partNumber.includes(q) || 
      item.occurrences.some(o => o.toUpperCase().includes(q))
    );
  }, [bomMap, parts, correlationSearchQuery, language]);

  // 2. DIELY V DB, KTORÉ NIE SÚ PRÍTOMNÉ V ŽIADNOM BOM
  const partsUnusedInBOM = useMemo(() => {
    const bomParts = new Set<string>();
    Object.entries(bomMap).forEach(([parent, components]) => {
      bomParts.add(parent.toUpperCase().trim());
      components.forEach(comp => {
        bomParts.add(comp.child.toUpperCase().trim());
      });
    });

    const unused = (parts || []).filter(p => !bomParts.has(p.id.toUpperCase().trim()));

    const q = correlationSearchQuery.toUpperCase().trim();
    if (!q) return unused;
    return unused.filter(p => 
      p.id.toUpperCase().includes(q) || 
      (p.description || '').toUpperCase().includes(q)
    );
  }, [bomMap, parts, correlationSearchQuery]);

  // AKCIA: Pridanie jedného chýbajúceho dielu do katalógu dielov
  const handleAddSingleMissingPart = async (partNumber: string) => {
    if (!onAddPart) return;
    setAddingPartsMap(prev => ({ ...prev, [partNumber]: true }));
    try {
      await onAddPart(partNumber);
    } catch (err) {
      console.error(err);
      alert(language === 'sk' ? `Chyba pri vytváraní dielu ${partNumber}.` : `Error creating part ${partNumber}.`);
    } finally {
      setAddingPartsMap(prev => ({ ...prev, [partNumber]: false }));
    }
  };

  // AKCIA: Hromadné pridanie všetkých chýbajúcich dielov do katalógu
  const handleAddAllMissingParts = async () => {
    if (!onAddPart || partsMissingInDB.length === 0) return;
    const confirmMsg = language === 'sk' 
      ? `Naozaj chcete zapísať všetkých ${partsMissingInDB.length} chýbajúcich dielov do databázy dielov?`
      : `Are you sure you want to add all ${partsMissingInDB.length} missing parts to the catalog?`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setIsAddingBatchParts(true);
    try {
      // Zapisujeme postupne sekvenčne, aby sme sa vyhli konfliktom
      for (const item of partsMissingInDB) {
        await onAddPart(item.partNumber);
      }
      alert(language === 'sk' ? 'Všetky chýbajúce diely boli nahrané!' : 'All missing parts have been successfully added!');
    } catch (err) {
      console.error(err);
      alert(language === 'sk' ? 'Niektoré diely sa nepodarilo zapísať.' : 'Some parts could not be added.');
    } finally {
      setIsAddingBatchParts(false);
    }
  };

  // AKCIA: Vymazanie všetkých BOM väzieb pre jeden chýbajúci diel
  const handleDeleteSingleBOMMissing = (partNumber: string) => {
    const parent = partNumber.toUpperCase().trim();
    const confirmMsg = language === 'sk' 
      ? `Naozaj chcete odstrániť všetky väzby v kusovníku pre diel ${partNumber}?`
      : `Are you sure you want to delete all BOM relations involving part ${partNumber}?`;
    if (!window.confirm(confirmMsg)) return;

    const relationsToDelete: { parent: string; child: string }[] = [];
    Object.entries(bomMap).forEach(([p, components]) => {
      if (p.toUpperCase().trim() === parent) {
        components.forEach(comp => {
          relationsToDelete.push({ parent: p, child: comp.child });
        });
      } else {
        components.forEach(comp => {
          if (comp.child.toUpperCase().trim() === parent) {
            relationsToDelete.push({ parent: p, child: comp.child });
          }
        });
      }
    });

    relationsToDelete.forEach(rel => {
      onDeleteBOMItem(rel.parent, rel.child);
    });
  };

  // AKCIA: Vymazanie všetkých BOM väzieb pre všetkých chýbajúcich v DB
  const handleDeleteAllBOMMissing = () => {
    if (partsMissingInDB.length === 0) return;
    const confirmMsg = language === 'sk' 
      ? `Naozaj chcete vymazať z kusovníkov (BOM) všetky väzby pre všetkých ${partsMissingInDB.length} chýbajúcich dielov?`
      : `Are you sure you want to delete all BOM links for all ${partsMissingInDB.length} missing parts?`;
    if (!window.confirm(confirmMsg)) return;

    const relationsToDelete: { parent: string; child: string }[] = [];
    const missingSet = new Set(partsMissingInDB.map(item => item.partNumber.toUpperCase().trim()));

    Object.entries(bomMap).forEach(([p, components]) => {
      const pUpper = p.toUpperCase().trim();
      if (missingSet.has(pUpper)) {
        components.forEach(comp => {
          relationsToDelete.push({ parent: p, child: comp.child });
        });
      } else {
        components.forEach(comp => {
          if (missingSet.has(comp.child.toUpperCase().trim())) {
            relationsToDelete.push({ parent: p, child: comp.child });
          }
        });
      }
    });

    relationsToDelete.forEach(rel => {
      onDeleteBOMItem(rel.parent, rel.child);
    });
  };

  // AKCIA: Vymazanie jedného nepoužitého dielu z databázy
  const handleDeleteSingleUnusedPart = async (partId: string) => {
    if (!onDeletePart) return;
    const confirmMsg = language === 'sk' 
      ? `Naozaj chcete odstrániť nepoužitý diel ${partId} z databázy dielov?`
      : `Are you sure you want to delete unused part ${partId} from the database?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await onDeletePart(partId);
    } catch (err) {
      console.error(err);
      alert(language === 'sk' ? `Chyba pri mazaní dielu ${partId}.` : `Error deleting part ${partId}.`);
    }
  };

  // AKCIA: Hromadné vymazanie všetkých nepoužitých dielov z databázy
  const handleDeleteAllUnusedParts = async () => {
    if (!onDeletePart || partsUnusedInBOM.length === 0) return;
    const confirmMsg = language === 'sk' 
      ? `Naozaj chcete hromadne odstrániť všetkých ${partsUnusedInBOM.length} nepoužitých dielov z databázy dielov?`
      : `Are you sure you want to delete all ${partsUnusedInBOM.length} unused parts from the database?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      for (const part of partsUnusedInBOM) {
        await onDeletePart(part.id);
      }
      alert(language === 'sk' ? 'Všetky nepoužité diely boli vymazané.' : 'All unused parts have been deleted.');
    } catch (err) {
      console.error(err);
      alert(language === 'sk' ? 'Niektoré diely sa nepodarilo vymazať.' : 'Some parts could not be deleted.');
    }
  };

  // Štýly
  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden";
  const labelClass = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
  const inputClass = "w-full h-12 bg-slate-900/50 border-2 border-slate-700/50 rounded-xl px-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50 transition-all font-mono uppercase";
  const modalOverlayClass = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in";
  const modalContentClass = "bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg p-8 relative";

  return (
    <div className={cardClass}>
      <div className="space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                  KUSOVNÍKY (BOM)
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 ml-5">
                  {flattenedItems.length} {language === 'sk' ? 'väzieb definovaných' : 'relations defined'}
              </p>
          </div>
          
          {/* TAB SWITCHER */}
          <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Icons.Layers />
              {language === 'sk' ? 'Zoznam Väzieb' : 'BOM Map'}
            </button>
            <button
              onClick={() => setActiveTab('correlation')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all relative ${
                activeTab === 'correlation'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Icons.Compare />
              {language === 'sk' ? 'Korelácia s dielmi' : 'Part Correlation'}
              {partsMissingInDB.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md animate-bounce">
                  {partsMissingInDB.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ==================== TAB 1: ZOZNAM VÄZIEB ==================== */}
        {activeTab === 'list' && (
          <div className="space-y-6 animate-fade-in">
            {/* SUB ACTIONS */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="relative flex-1">
                  <input 
                      value={bomSearchQuery} 
                      onChange={e=>setBomSearchQuery(e.target.value)} 
                      placeholder={language === 'sk' ? "HĽADAŤ V KUSOVNÍKOCH..." : "SEARCH IN BOM..."} 
                      className="w-full h-12 bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 text-white uppercase font-bold focus:outline-none focus:border-indigo-500 transition-all font-mono" 
                  />
                  <div className="absolute left-4 top-3.5 text-slate-500">
                      <Icons.Search />
                  </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                    onClick={() => setIsImportModalOpen(true)} 
                    className="h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-xl shadow-md transition-all flex items-center justify-center border border-slate-700" 
                    title={language === 'sk' ? "Importovať kusovník" : "Import BOM"}
                >
                    <Icons.Import />
                </button>
                <button 
                    onClick={handleExport} 
                    className="h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-xl shadow-md transition-all flex items-center justify-center border border-slate-700" 
                    title={language === 'sk' ? "Exportovať do Excelu" : "Export to Excel"}
                >
                    <Icons.Export />
                </button>
                <button 
                    onClick={() => setIsAddModalOpen(true)} 
                    className="h-12 bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-black uppercase text-xs tracking-wider"
                >
                    <Icons.Plus /> <span>{language === 'sk' ? 'Nová Väzba' : 'New Link'}</span>
                </button>
                <button 
                    onClick={() => { if(window.confirm(language === 'sk' ? 'VYMAZAŤ VŠETKO?' : 'DELETE ALL?')) onDeleteAllBOMItems(); }} 
                    className="h-12 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-4 rounded-xl transition-all"
                    title={language === 'sk' ? "Vymazať všetko" : "Delete all"}
                >
                    <Icons.Trash />
                </button>
              </div>
            </div>

            {/* LIST OF CARDS */}
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {filteredBOMs.map((item, idx) => (
                    <div key={idx} className="group flex items-center justify-between bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/30 rounded-xl p-4 transition-all">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="flex flex-col min-w-[120px]">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{language === 'sk' ? 'RODIČ (PARENT)' : 'PARENT PART'}</span>
                                <span className="text-white font-black font-mono text-sm sm:text-base truncate">{item.parent}</span>
                            </div>
                            
                            <div className="text-slate-600 group-hover:text-indigo-500 transition-colors">
                                <Icons.Flow />
                            </div>

                            <div className="flex flex-col min-w-[120px]">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{language === 'sk' ? 'DIEŤA (CHILD)' : 'CHILD PART'}</span>
                                <span className="text-slate-300 font-bold font-mono text-sm sm:text-base truncate">{item.child}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-white/5">
                                <span className="text-[9px] text-slate-500 font-black mr-2 uppercase">{language === 'sk' ? 'KS' : 'PCS'}</span>
                                <span className="text-teal-400 font-black font-mono text-sm">{item.consumption}</span>
                            </div>
                            <button 
                                onClick={() => onDeleteBOMItem(item.parent, item.child)} 
                                className="text-slate-600 hover:text-red-500 bg-slate-900/80 p-200 p-2.5 rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all border border-slate-800/50"
                            >
                                <Icons.Trash />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredBOMs.length === 0 && (
                    <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                        <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">{language === 'sk' ? 'Žiadne väzby pre kusovníky' : 'No BOM parent-child links'}</p>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: ANALÝZA KORELÁCIE ==================== */}
        {activeTab === 'correlation' && (
          <div className="space-y-6 animate-fade-in">
            {/* CORRELATION SEARCH FILTER */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 w-full">
                  <input 
                      value={correlationSearchQuery} 
                      onChange={e=>setCorrelationSearchQuery(e.target.value)} 
                      placeholder={language === 'sk' ? "VYHĽADAŤ DIEL V ROZDIELOCH..." : "FILTER PARTS IN DIFFERENCES..."} 
                      className="w-full h-12 bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 text-white uppercase font-bold focus:outline-none focus:border-indigo-500 transition-all font-mono" 
                  />
                  <div className="absolute left-4 top-3.5 text-slate-500">
                      <Icons.Search />
                  </div>
              </div>
              
              {/* BUTTON TO AUTO-FIX ALL MISSING PARTS */}
              {partsMissingInDB.length > 0 && onAddPart && (
                <button
                  disabled={isAddingBatchParts}
                  onClick={handleAddAllMissingParts}
                  className="w-full sm:w-auto h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-b-4 border-emerald-800 transition-all active:scale-95 shrink-0"
                >
                  <Icons.Plus />
                  {isAddingBatchParts ? 'NAHRÁVAM...' : (language === 'sk' ? `PRIDAŤ VŠETKÝCH ${partsMissingInDB.length} CHÝBAJÚCICH` : `ADD ALL ${partsMissingInDB.length} MISSING`)}
                </button>
              )}
            </div>

            {/* TWO COLUMN BENTO GRID FOR SYNC STATUS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* CHÝBAJÚCE V DATABÁZE DIELOV (ERRORS) */}
              <div className="bg-slate-950/40 border border-red-500/10 rounded-3xl p-6 flex flex-col h-full min-h-[400px]">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                      <Icons.AlertCircle />
                    </div>
                    <div>
                      <h4 className="text-md font-black text-white uppercase tracking-tight">{language === 'sk' ? 'BOM Chýbajúci V DIELOCH' : 'MISSING IN PART DATABASE'}</h4>
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{language === 'sk' ? 'Vyskytujú sa v BOM, ale nie v DB dielov' : 'Present in BOM, but absent in inventory DB'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {partsMissingInDB.length > 0 && (
                      <button
                        onClick={handleDeleteAllBOMMissing}
                        className="h-8 px-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 focus:outline-none"
                        title={language === 'sk' ? "Vymazať chýbajúce z BOM" : "Delete missing from BOM"}
                      >
                        <Icons.Trash />
                        <span className="hidden xl:inline">{language === 'sk' ? "VYMAZAŤ Z BOM" : "DELETE FROM BOM"}</span>
                      </button>
                    )}
                    <span className="px-3 py-1 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-black rounded-lg">
                      {partsMissingInDB.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[400px] space-y-3 pr-1">
                  {partsMissingInDB.map((item, idx) => {
                    const isSavingSingle = addingPartsMap[item.partNumber] || false;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 rounded-xl p-4 transition-all">
                        <div className="flex flex-col gap-1 overflow-hidden flex-1 mr-3">
                          <span className="text-white font-mono font-black text-sm truncate">{item.partNumber}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-normal">
                            {language === 'sk' ? 'VÝSKYT: ' : 'OCCURS AS: '}{item.occurrences.join(', ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleDeleteSingleBOMMissing(item.partNumber)}
                            className="h-9 w-9 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 rounded-lg transition-all flex items-center justify-center focus:outline-none"
                            title={language === 'sk' ? "Vymazať väzby tohto dielu z BOM" : "Delete all links of this part from BOM"}
                          >
                            <Icons.Trash />
                          </button>
                          
                          {onAddPart && (
                            <button
                              disabled={isSavingSingle || isAddingBatchParts}
                              onClick={() => handleAddSingleMissingPart(item.partNumber)}
                              className="h-9 px-2.5 bg-indigo-600/25 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 disabled:opacity-30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 focus:outline-none"
                              title={language === 'sk' ? "Jedným klikom vytvoriť v DB" : "Quick create in DB"}
                            >
                              <Icons.Plus />
                              {isSavingSingle ? '...' : (language === 'sk' ? 'PRIDAŤ' : 'ADD')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {partsMissingInDB.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-4 animate-pulse">
                        <Icons.CheckCircle />
                      </div>
                      <p className="text-white font-black uppercase text-xs tracking-widest">{language === 'sk' ? 'Kusovník je 100% zladený' : 'BOM is 100% in sync'}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{language === 'sk' ? 'Všetky diely z BOM sa nachádzajú v databáze' : 'All BOM parts exist in inventory DB'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* NEPOUŽITÉ V BOM (DIELY V DB S ABSENTUJÚCIM BOM) */}
              <div className="bg-slate-950/40 border border-indigo-500/10 rounded-3xl p-6 flex flex-col h-full min-h-[400px]">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/20">
                      <Icons.Database />
                    </div>
                    <div>
                      <h4 className="text-md font-black text-white uppercase tracking-tight">{language === 'sk' ? 'NEPOUŽITÉ V KUSOVNÍKOCH' : 'NOT DESIGNED IN ANY BOM'}</h4>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{language === 'sk' ? 'Diely z DB bez akejkoľvek BOM väzby' : 'Existing DB parts not associated with any BOM'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {partsUnusedInBOM.length > 0 && onDeletePart && (
                      <button
                        onClick={handleDeleteAllUnusedParts}
                        className="h-8 px-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 focus:outline-none"
                        title={language === 'sk' ? "Vymazať nepoužité diely z DB" : "Delete unused parts from DB"}
                      >
                        <Icons.Trash />
                        <span className="hidden xl:inline">{language === 'sk' ? "VYMAZAŤ Z DB" : "DELETE FROM DB"}</span>
                      </button>
                    )}
                    <span className="px-3 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-black rounded-lg">
                      {partsUnusedInBOM.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[400px] space-y-3 pr-1">
                  {partsUnusedInBOM.map((part, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 rounded-xl p-4 transition-all">
                      <div className="flex flex-col gap-1 overflow-hidden flex-1 mr-3">
                        <span className="text-slate-300 font-mono font-black text-sm">{part.id}</span>
                        {part.description && (
                          <p className="text-xs text-slate-500 font-medium italic truncate">{part.description}</p>
                        )}
                      </div>
                      
                      {onDeletePart && (
                        <button
                          onClick={() => handleDeleteSingleUnusedPart(part.id)}
                          className="h-9 w-9 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 rounded-lg transition-all flex items-center justify-center focus:outline-none shrink-0"
                          title={language === 'sk' ? "Odstrániť diel z databázy" : "Delete part from database"}
                        >
                          <Icons.Trash />
                        </button>
                      )}
                    </div>
                  ))}

                  {partsUnusedInBOM.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-500 mb-4">
                        <Icons.Compare />
                      </div>
                      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">{language === 'sk' ? 'Žiadne nepoužité diely' : 'No unused database parts'}</p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1">{language === 'sk' ? 'Všetky diely z DB majú navrhnutý BOM' : 'All defined parts have an associated BOM'}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* --- MODALS --- */}

      {/* ADD MODAL */}
      {isAddModalOpen && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsAddModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/20">
                       <Icons.Layers />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{language === 'sk' ? 'NOVÁ VÄZBA' : 'NEW BOM LINK'}</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>{language === 'sk' ? 'RODIČ (PARENT PART)' : 'PARENT PART NUMBER'}</label>
                     <input 
                        value={bomParent} 
                        onChange={e => setBomParent(e.target.value.toUpperCase())}
                        className={inputClass}
                        placeholder="NAPR. 3323..."
                        autoFocus
                     />
                  </div>
                  <div>
                     <label className={labelClass}>{language === 'sk' ? 'DIEŤA (CHILD PART)' : 'CHILD PART NUMBER'}</label>
                     <input 
                        value={bomChild} 
                        onChange={e => setBomChild(e.target.value.toUpperCase())}
                        className={inputClass}
                        placeholder="NAPR. SKRUTKA..."
                     />
                  </div>
                  <div>
                     <label className={`${labelClass} text-teal-500`}>{language === 'sk' ? 'SPOTREBA NA 1 KUS' : 'CONSUMPTION PER 1 UNIT'}</label>
                     <input 
                        type="number"
                        step="0.00001"
                        value={bomQty} 
                        onChange={e => setBomQty(e.target.value)}
                        className={`${inputClass} text-teal-400 border-teal-500/30 focus:border-teal-500`}
                        placeholder="0.00000"
                     />
                  </div>

                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsAddModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        {language === 'sk' ? 'Zrušiť' : 'Cancel'}
                     </button>
                     <button onClick={handleAddSubmit} className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-indigo-500">
                        {language === 'sk' ? 'Uložiť' : 'Save'}
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
               <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                       <Icons.Import />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{language === 'sk' ? 'IMPORT KUSOVNÍKA' : 'IMPORT BOM MAP'}</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>DÁTA (Parent;Child;Qty)</label>
                     <textarea 
                        value={bomBulk} 
                        onChange={e => setBomBulk(e.target.value)}
                        placeholder="Parent1;Child1;10&#10;Parent1;Child2;5" 
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono placeholder-gray-500 h-48 resize-none"
                        autoFocus
                     />
                     <p className="text-[10px] text-slate-500 mt-2 italic">* Každá väzba na nový riadok. Oddeľovač je bodkočiarka.</p>
                  </div>
                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsImportModalOpen(false)} className="flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 transition-colors bg-transparent border-2 border-slate-700 text-xs">
                        {language === 'sk' ? 'Zrušiť' : 'Cancel'}
                     </button>
                     <button onClick={handleBatchSubmit} className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs border-2 border-blue-500">
                        {language === 'sk' ? 'Importovať' : 'Import'}
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

export default BOMSection;
