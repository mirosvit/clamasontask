import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Task } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface AuditModalProps {
  task: Task;
  onClose: () => void;
  onConfirm: (taskId: string, result: 'found' | 'missing', note: string) => void;
}

const AuditModal: React.FC<AuditModalProps> = ({ task, onClose, onConfirm }) => {
  const { t, language } = useLanguage();
  const [note, setNote] = useState('');

  const handleAction = (result: 'found' | 'missing') => {
    if (!note.trim()) {
      alert(language === 'sk' ? 'Zadajte povinnú poznámku k auditu!' : 'Audit note is required!');
      return;
    }
    onConfirm(task.id, result, note);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-amber-600/50 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-amber-600/20 rounded-2xl flex items-center justify-center border border-amber-600/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t('audit_finish_title')}</h3>
              <p className="text-slate-500 text-xs font-bold font-mono">{task.partNumber}</p>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">{t('audit_finish_note')}</label>
            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="..."
              className="w-full h-32 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all resize-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleAction('found')} className="py-6 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 border-2 border-amber-500">
              {t('audit_found_btn')}
            </button>
            <button onClick={() => handleAction('missing')} className="py-6 bg-slate-800 hover:bg-slate-700 text-rose-500 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 border-2 border-rose-900/30">
              {t('audit_missing_btn')}
            </button>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-4 bg-slate-950 text-slate-500 hover:text-slate-300 font-bold uppercase text-[10px] tracking-widest transition-colors border-t border-slate-800">
          {t('btn_cancel')}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default AuditModal;