
import React from 'react';
import { createPortal } from 'react-dom';
import { Task, PriorityLevel, DBItem } from '../../../App';
import { useLanguage } from '../../LanguageContext';

interface TaskModalsProps {
  priorityEditId: string | null;
  missingId: string | null;
  noteId: string | null;
  deleteId: string | null;
  noteVal: string;
  missingReasons: DBItem[];
  tasks: Task[];
  setPriorityEditId: (id: string | null) => void;
  setMissingId: (id: string | null) => void;
  setNoteId: (id: string | null) => void;
  setDeleteId: (id: string | null) => void;
  setNoteVal: (val: string) => void;
  confirmPriority: (id: string, newPriority: PriorityLevel) => void;
  confirmMissing: (id: string, reason: string) => void;
  saveNote: (id: string) => void;
  confirmDelete: () => void;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
);

const TaskModals: React.FC<TaskModalsProps> = (props) => {
  const { t } = useLanguage();

  return (
    <>
      {props.priorityEditId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => props.setPriorityEditId(null)}>
          <div className="bg-gray-800 border-2 border-blue-500 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-blue-400 mb-6 text-center uppercase tracking-wide">{t('priority_label')}</h3>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => props.confirmPriority(props.priorityEditId!, 'LOW')} className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white rounded-lg font-bold transition-all duration-200 text-lg shadow-md hover:translate-x-1 uppercase">{t('prio_low')}</button>
              <button onClick={() => props.confirmPriority(props.priorityEditId!, 'NORMAL')} className="p-4 bg-green-700 hover:bg-green-600 border border-green-500 text-white rounded-lg font-bold transition-all duration-200 text-lg shadow-md hover:translate-x-1 uppercase">{t('prio_normal')}</button>
              <button onClick={() => props.confirmPriority(props.priorityEditId!, 'URGENT')} className="p-4 bg-red-700 hover:bg-red-600 border border-red-500 text-white rounded-lg font-bold transition-all duration-200 text-lg shadow-md hover:translate-x-1 uppercase">{t('prio_urgent')}</button>
            </div>
            <button onClick={() => props.setPriorityEditId(null)} className="w-full mt-6 py-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors">{t('btn_cancel')}</button>
          </div>
        </div>,
        document.body
      )}

      {props.missingId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => props.setMissingId(null)}>
          <div className="bg-gray-800 border-2 border-red-600 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-red-400 mb-6 text-center uppercase tracking-wide">{t('modal_missing_title')}</h3>
            <div className="grid grid-cols-1 gap-3">
              {props.missingReasons.map(r => (
                <button key={r.id} onClick={() => props.confirmMissing(props.missingId!, r.value)} className="p-4 bg-gray-700 hover:bg-red-900/30 border border-gray-600 hover:border-red-500 text-white rounded-lg font-bold transition-all duration-200 text-lg shadow-md hover:translate-x-1">{r.value}</button>
              ))}
            </div>
            <button onClick={() => props.setMissingId(null)} className="w-full mt-6 py-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors">{t('btn_cancel')}</button>
          </div>
        </div>,
        document.body
      )}

      {props.noteId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => props.setNoteId(null)}>
          <div className="bg-gray-800 border-2 border-yellow-500 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center uppercase tracking-wide">{t('btn_note')}</h3>
            <textarea value={props.noteVal} onChange={(e) => props.setNoteVal(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none mb-4 text-sm py-2.5" rows={4} autoFocus placeholder={t('btn_note') + "..."} />
            <div className="flex gap-3">
              <button onClick={() => props.saveNote(props.noteId!)} className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold transition-colors">{t('btn_save')}</button>
              <button onClick={() => props.setNoteId(null)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-bold transition-colors">{t('btn_cancel')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {props.deleteId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => props.setDeleteId(null)}>
          <div className="bg-gray-800 border-2 border-red-600 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                <TrashIcon className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('miss_delete_confirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => props.setDeleteId(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors">{t('btn_cancel')}</button>
              <button onClick={props.confirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors shadow-lg flex items-center justify-center gap-2"><TrashIcon className="w-5 h-5" />Vymazať</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default TaskModals;
