import React from 'react';
import { createPortal } from 'react-dom';
import { Task } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface SearchConfirmModalProps {
  task: Task;
  onClose: () => void;
  onConfirm: (taskId: string, found: boolean) => void;
}

const SearchConfirmModal: React.FC<SearchConfirmModalProps> = ({ task, onClose, onConfirm }) => {
  const { t, language } = useLanguage();

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gray-600 shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
            {language === 'sk' ? 'VÝSLEDOK HĽADANIA' : 'SEARCH RESULT'}
          </h3>
          <p className="text-slate-400 font-medium mb-8">
            {language === 'sk' ? 'Našiel sa hľadaný tovar na pozícii?' : 'Did you find the item at the location?'}
            <br />
            <span className="text-white font-mono text-sm">{task.partNumber}</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onConfirm(task.id, true)} className="py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 border-2 border-emerald-500">
              {language === 'sk' ? 'ÁNO, NAŠIEL' : 'YES, FOUND'}
            </button>
            <button onClick={() => onConfirm(task.id, false)} className="py-6 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 border-2 border-rose-600">
              {language === 'sk' ? 'NIE, NENAŠIEL' : 'NO, NOT FOUND'}
            </button>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-4 bg-slate-950 text-slate-500 hover:text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em] transition-colors border-t border-slate-800">
          {t('btn_cancel')}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default SearchConfirmModal;