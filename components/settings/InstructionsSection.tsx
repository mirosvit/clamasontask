import React, { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Instruction } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface InstructionsSectionProps {
  instructions: Instruction[];
  onAdd: (inst: Omit<Instruction, 'id' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Instruction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  hasManagePermission: boolean;
}

const Icons = {
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Book: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
};

const categoryOptions = ['PROD', 'LOG', 'SAFE', 'OTHER'] as const;

const InstructionsSection: React.FC<InstructionsSectionProps> = memo(({ instructions, onAdd, onUpdate, onDelete, hasManagePermission }) => {
  const { t, language } = useLanguage();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Instruction['category']>('PROD');
  const [content, setContent] = useState('');

  const handleOpenAdd = () => {
    setTitle(''); setCategory('PROD'); setContent(''); setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inst: Instruction) => {
    setTitle(inst.title || ''); 
    setCategory(inst.category || 'PROD'); 
    setContent(inst.content || ''); 
    setEditingId(inst.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!title || !content) return;
    const author = localStorage.getItem('app_user') || 'Admin';
    
    if (editingId) {
      await onUpdate(editingId, { title, category, content });
    } else {
      await onAdd({ title, category, content, author });
    }
    setIsModalOpen(false);
  };

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden";
  const labelClass = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2";
  const inputClass = "w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white text-sm font-bold focus:border-teal-500 outline-none transition-all uppercase";
  const modalOverlayClass = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in";
  const modalContentClass = "bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl p-8 relative";

  if (!hasManagePermission) {
      return (
          <div className="py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800 italic text-slate-500">
              {t('action_not_allowed')}
          </div>
      );
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-2 h-8 bg-teal-500 rounded-full"></span>
                  {t('sect_instructions')}
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 ml-5">{instructions.length} dokumentov</p>
          </div>
          <button 
              onClick={handleOpenAdd}
              className="h-12 bg-teal-600 hover:bg-teal-500 text-white px-8 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest border-b-4 border-teal-800"
          >
              <Icons.Plus /> {t('inst_add_btn')}
          </button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          {instructions.map(inst => (
              <div key={inst.id} className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-900 rounded-xl text-teal-500"><Icons.Book /></div>
                      <div>
                          <p className="text-sm font-black text-white uppercase tracking-tight">{inst.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                {t(`inst_cat_${(inst.category || 'OTHER').toLowerCase()}` as any)}
                              </span>
                              <span className="text-[8px] font-mono text-slate-700">Aktualizácia: {inst.updatedAt ? new Date(inst.updatedAt).toLocaleDateString() : '-'}</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEdit(inst)} className="p-2 text-slate-400 hover:text-white hover:bg-teal-600 rounded-lg"><Icons.Edit /></button>
                      <button onClick={() => { if(window.confirm('Zmazať inštrukciu?')) onDelete(inst.id); }} className="p-2 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg"><Icons.Trash /></button>
                  </div>
              </div>
          ))}
          {instructions.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                  <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Žiadna dokumentácia</p>
              </div>
          )}
      </div>

      {isModalOpen && createPortal(
          <div className={modalOverlayClass} onClick={() => setIsModalOpen(false)}>
              <div className={modalContentClass} onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">{editingId ? t('inst_edit_title') : t('inst_new_title')}</h3>
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                              <label className={labelClass}>{t('inst_label_title')}</label>
                              <input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="NAPR. BOZP SKLAD" />
                          </div>
                          <div>
                              <label className={labelClass}>{t('inst_label_cat')}</label>
                              <select value={category} onChange={e => setCategory(e.target.value as any)} className={inputClass}>
                                  {categoryOptions.map(c => <option key={c} value={c}>{t(`inst_cat_${c.toLowerCase()}` as any)}</option>)}
                              </select>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between items-end mb-2">
                              <label className={labelClass}>{t('inst_label_content')}</label>
                              <div className="flex gap-3 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">
                                  <span>**Tučné**</span>
                                  <span>*Kurzíva*</span>
                                  <span>![Obrázok](url)</span>
                                  <span># Nadpis</span>
                              </div>
                          </div>
                          <textarea 
                              value={content} 
                              onChange={e => setContent(e.target.value)} 
                              className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-6 text-white text-sm focus:border-teal-500 outline-none transition-all font-sans" 
                              placeholder="Tu napíšte inštrukcie (podporuje Markdown)..."
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-8">
                          <button onClick={() => setIsModalOpen(false)} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white transition-all">ZRUŠIŤ</button>
                          <button onClick={handleSubmit} className="h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-teal-800 shadow-xl transition-all active:scale-95">ULOŽIŤ DOKUMENT</button>
                      </div>
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
});

export default InstructionsSection;