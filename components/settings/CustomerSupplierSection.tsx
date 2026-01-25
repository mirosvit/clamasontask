import React, { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { CSItem } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface CustomerSupplierSectionProps {
  customers: CSItem[];
  suppliers: CSItem[];
  onAdd: (category: 'customers' | 'suppliers', name: string, desc?: string) => Promise<void>;
  onBatchAdd: (category: 'customers' | 'suppliers', lines: string[]) => Promise<void>;
  onDelete: (category: 'customers' | 'suppliers', id: string) => Promise<void>;
  onDeleteAll: (category: 'customers' | 'suppliers') => Promise<void>;
}

const Icons = {
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Import: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Building: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
};

const CustomerSupplierSection: React.FC<CustomerSupplierSectionProps> = memo((props) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [bulkText, setBulkText] = useState('');

  const currentList = activeTab === 'customers' ? props.customers : props.suppliers;

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return currentList;
    return currentList.filter(i => 
      i.name.toLowerCase().includes(q) || 
      (i.description && i.description.toLowerCase().includes(q))
    );
  }, [currentList, searchQuery]);

  const handleAddSubmit = async () => {
    if (newName.trim()) {
      await props.onAdd(activeTab, newName, newDesc);
      setNewName(''); setNewDesc('');
      setIsAddModalOpen(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (bulkText.trim()) {
      await props.onBatchAdd(activeTab, bulkText.split('\n'));
      setBulkText('');
      setIsImportModalOpen(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(t('csdb_delete_confirm', { name }))) {
      await props.onDelete(activeTab, id);
    }
  };

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden";
  const labelClass = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
  const inputClass = "w-full h-12 bg-slate-900/50 border-2 border-slate-700/50 rounded-xl px-4 text-white text-sm font-bold focus:outline-none focus:border-teal-500/50 transition-all font-mono uppercase";
  const modalOverlayClass = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in";
  const modalContentClass = "bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg p-8 relative";

  return (
    <div className={cardClass}>
      <div className="space-y-8">
        
        {/* HEADER & TAB SWITCHER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex flex-col gap-4 w-full sm:w-auto">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
                  {t('csdb_title')}
              </h3>
              <div className="bg-slate-900 p-1 rounded-xl flex border border-slate-700 w-fit h-12 shadow-inner">
                <button 
                  onClick={() => setActiveTab('customers')} 
                  className={`px-6 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'customers' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t('csdb_tab_customers')}
                </button>
                <button 
                  onClick={() => setActiveTab('suppliers')} 
                  className={`px-6 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t('csdb_tab_suppliers')}
                </button>
              </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setIsImportModalOpen(true)} className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-lg shadow-md transition-all flex items-center justify-center border border-slate-700">
                <Icons.Import />
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className={`h-10 text-white px-6 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-wide ${activeTab === 'customers' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                <Icons.Plus /> <span>Nový</span>
            </button>
            <button onClick={() => { if(window.confirm(t('csdb_delete_all_confirm'))) props.onDeleteAll(activeTab); }} className="h-10 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-3 rounded-lg transition-all">
                <Icons.Trash />
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative">
            <input 
                value={searchQuery} 
                onChange={e=>setSearchQuery(e.target.value)} 
                placeholder={t('search_db_placeholder')} 
                className="w-full h-12 bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 text-white uppercase font-bold focus:outline-none focus:border-teal-500 transition-all shadow-inner" 
            />
            <div className="absolute left-4 top-3.5 text-slate-500">
                <Icons.Search />
            </div>
        </div>

        {/* GRID LIST */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {filteredList.map(item => (
            <div key={item.id} className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all relative">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${activeTab === 'customers' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}`}>
                  {activeTab === 'customers' ? 'Zákazník' : 'Dodávateľ'}
                </span>
                <button onClick={() => handleDelete(item.id, item.name)} className="text-slate-700 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">
                  <Icons.Trash />
                </button>
              </div>
              <h4 className="font-black text-white text-base font-mono uppercase tracking-tight break-words">{item.name}</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-2 line-clamp-2 italic">{item.description || 'Bez popisu'}</p>
            </div>
          ))}
          {filteredList.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl opacity-40">
              <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">{t('csdb_empty')}</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      {isAddModalOpen && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsAddModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-4 mb-8">
                   <div className={`p-4 rounded-2xl border ${activeTab === 'customers' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}`}>
                       <Icons.Building />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">PRIDAŤ PARTNERA</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>{t('csdb_new_name')}</label>
                     <input value={newName} onChange={e => setNewName(e.target.value)} className={inputClass} autoFocus />
                  </div>
                  <div>
                     <label className={labelClass}>{t('csdb_new_desc')}</label>
                     <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className={inputClass} />
                  </div>
                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsAddModalOpen(false)} className="flex-1 h-14 bg-slate-800 text-slate-400 rounded-xl font-black uppercase text-xs tracking-widest transition-all">ZRUŠIŤ</button>
                     <button onClick={handleAddSubmit} className={`flex-1 h-14 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 border-b-4 ${activeTab === 'customers' ? 'bg-amber-600 border-amber-800' : 'bg-indigo-600 border-indigo-800'}`}>ULOŽIŤ</button>
                  </div>
               </div>
            </div>
         </div>,
         document.body
      )}

      {isImportModalOpen && createPortal(
         <div className={modalOverlayClass} onClick={() => setIsImportModalOpen(false)}>
            <div className={modalContentClass} onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-4 mb-8">
                   <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-500 border border-teal-500/20">
                       <Icons.Import />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">HROMADNÝ IMPORT</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>{t('csdb_bulk_placeholder')}</label>
                     <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} className="w-full h-48 bg-slate-950 border-2 border-slate-700 rounded-2xl p-4 text-white font-mono text-xs focus:border-teal-500 outline-none transition-all resize-none" autoFocus />
                  </div>
                  <div className="flex gap-3 mt-8">
                     <button onClick={() => setIsImportModalOpen(false)} className="flex-1 h-14 bg-slate-800 text-slate-400 rounded-xl font-black uppercase text-xs tracking-widest transition-all">ZRUŠIŤ</button>
                     <button onClick={handleBatchSubmit} className="flex-1 h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 border-b-4 border-teal-800">IMPORTUVAŤ</button>
                  </div>
               </div>
            </div>
         </div>,
         document.body
      )}
    </div>
  );
});

export default CustomerSupplierSection;