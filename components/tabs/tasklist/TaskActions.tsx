
import React from 'react';
import { Task, PriorityLevel } from '../../../App';
import { useLanguage } from '../../LanguageContext';

interface TaskActionsProps {
  task: Task;
  isSystemInventoryTask: boolean;
  isSearchingMode: boolean;
  isManualBlocked: boolean;
  isAuditInProgress: boolean;
  isNoteLockedByAudit: boolean;
  copiedId: string | null;
  hasPermission: (perm: string) => boolean;
  onSetInProgress: (id: string) => void;
  onToggleTask: (id: string) => void;
  onToggleBlock: (id: string) => void;
  onToggleManualBlock: (id: string) => void;
  onExhaustSearch: (id: string) => void;
  onMarkAsIncorrect: (id: string) => void;
  handleMissingClick: (task: Task, e: React.MouseEvent) => void;
  handleNoteClick: (task: Task) => void;
  handleDeleteClick: (id: string) => void;
  handleCopyPart: (id: string, text: string) => void;
  openPriorityModal: (task: Task) => void;
  onAuditPart?: (task: Task) => void;
}

const Icons = {
  Play: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>,
  Pause: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
  Exclamation: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>,
  Copy: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>,
  Chat: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>,
  Return: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>,
  Ban: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-10 h-10" fill="none"><circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth="2.5" fill="none" /><path d="M5 19L19 5" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" /></svg>,
  ClipboardCheck: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
  Signal: () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
};

const TaskActions: React.FC<TaskActionsProps> = ({ 
  task, isSystemInventoryTask, isSearchingMode, isManualBlocked, isAuditInProgress, 
  isNoteLockedByAudit, copiedId, hasPermission, onSetInProgress, onToggleTask, 
  onToggleBlock, onToggleManualBlock, onExhaustSearch, onMarkAsIncorrect, handleMissingClick, 
  handleNoteClick, handleDeleteClick, handleCopyPart, openPriorityModal, onAuditPart 
}) => {
  const { t } = useLanguage();

  if (isSystemInventoryTask) {
    return hasPermission('perm_btn_delete') ? (
      <button onClick={() => handleDeleteClick(task.id)} className="w-16 h-16 flex items-center justify-center rounded-lg bg-red-900/50 text-red-500 hover:bg-red-800 hover:text-white border border-red-800 transition-colors">
        <Icons.Trash />
      </button>
    ) : null;
  }

  if (task.isDone) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {hasPermission('perm_btn_copy') && (
          <button onClick={() => handleCopyPart(task.id, task.partNumber || '')} className={`w-16 h-16 flex items-center justify-center rounded-xl transition-all active:scale-95 shadow-lg border ${copiedId === task.id ? 'bg-green-600 border-green-500 text-white' : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'}`}>
            <Icons.Copy />
          </button>
        )}
        {hasPermission('perm_btn_return') && (
          <button onClick={() => onToggleTask(task.id)} className="w-16 h-16 flex items-center justify-center rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md transition-all active:scale-95 border border-orange-500">
            <Icons.Return />
          </button>
        )}
        {hasPermission('perm_btn_delete') && (
          <button onClick={() => handleDeleteClick(task.id)} className="w-16 h-16 flex items-center justify-center rounded-lg bg-red-900/50 text-red-500 hover:bg-red-800 hover:text-white border border-red-800 transition-colors">
            <Icons.Trash />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2 items-center justify-center">
      {!isSearchingMode && !isManualBlocked && hasPermission('perm_btn_resolve') && !isAuditInProgress && (
        <button onClick={() => onSetInProgress(task.id)} className={`w-16 h-16 flex items-center justify-center rounded-xl transition-all active:scale-95 shadow-lg ${task.isInProgress ? 'bg-yellow-600 text-white border border-yellow-500' : 'bg-gray-700 text-yellow-500 hover:bg-gray-600 border border-gray-600'}`}>
          {task.isInProgress ? <Icons.Pause /> : <Icons.Play />}
        </button>
      )}
      
      {!isManualBlocked && hasPermission('perm_btn_copy') && (
        <button onClick={() => (task.isInProgress || isSearchingMode || isAuditInProgress) && handleCopyPart(task.id, task.partNumber || '')} disabled={!task.isInProgress && !isSearchingMode && !isAuditInProgress} className={`w-16 h-16 flex items-center justify-center rounded-lg transition-all shadow-lg border ${(!task.isInProgress && !isSearchingMode && !isAuditInProgress) ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-50' : (copiedId === task.id ? 'bg-green-600 border-green-500 text-white' : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 active:scale-95')}`}>
          {copiedId === task.id ? <span className="font-bold text-xs">OK</span> : <Icons.Copy />}
        </button>
      )}

      {!isManualBlocked && hasPermission('perm_btn_missing') && !isAuditInProgress && (
        <button onClick={(e) => (task.isInProgress || isSearchingMode) && handleMissingClick(task, e)} disabled={!task.isInProgress && !isSearchingMode} className={`w-16 h-16 flex items-center justify-center rounded-xl transition-all shadow-lg border ${(!task.isInProgress && !isSearchingMode) ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-50' : (task.isMissing ? 'bg-red-800 text-white border-red-500' : 'bg-red-600 text-white hover:bg-red-50 border-red-500 active:scale-95')}`}>
          <Icons.Exclamation />
        </button>
      )}

      {/* LUPA: Iba ak je isMissing */}
      {!isManualBlocked && hasPermission('perm_btn_lock') && !isAuditInProgress && task.isMissing && !task.searchExhausted && (
        <button 
            onClick={() => {
                if (isSearchingMode) {
                    if (window.confirm("Nenašlo sa ani po hľadaní?")) onExhaustSearch(task.id);
                    else onToggleBlock(task.id);
                } else {
                    onToggleBlock(task.id);
                }
            }} 
            title={t('perm_btn_lock')} 
            className={`w-16 h-16 flex items-center justify-center rounded-lg transition-all active:scale-95 shadow-lg ${task.isBlocked ? 'bg-gray-600 text-white border border-gray-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 border border-gray-600'}`}
        >
          <Icons.Search />
        </button>
      )}

      {hasPermission('perm_btn_block_new') && !isAuditInProgress && (
        <button onClick={() => onToggleManualBlock(task.id)} className={`w-16 h-16 flex items-center justify-center rounded-lg border shadow-lg transition-all active:scale-95 ${task.isManualBlocked ? 'bg-[#1e1b4b] border-[#312e81] text-white' : 'bg-black border-[#4169E1] text-[#4169E1]'}`}>
          <Icons.Lock />
        </button>
      )}

      {!isSearchingMode && !isManualBlocked && hasPermission('perm_btn_finish') && !isAuditInProgress && (
        <button onClick={() => task.isInProgress && onToggleTask(task.id)} disabled={!task.isInProgress} className={`w-16 h-16 flex items-center justify-center rounded-xl transition-all shadow-xl border ${task.isInProgress ? 'bg-lime-600 text-white hover:bg-lime-500 active:scale-95 border-lime-500' : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-50'}`}>
          <Icons.Check />
        </button>
      )}

      {!isSearchingMode && !isManualBlocked && hasPermission('perm_btn_edit') && !isAuditInProgress && (
        <button onClick={() => openPriorityModal(task)} className="w-16 h-16 flex items-center justify-center rounded-lg bg-gray-700 text-blue-400 border border-gray-600 hover:bg-gray-600 hover:text-white transition-colors">
          <Icons.Signal />
        </button>
      )}

      {!isSearchingMode && !isManualBlocked && hasPermission('perm_btn_note') && !isAuditInProgress && (
        <button 
          onClick={() => !isNoteLockedByAudit && handleNoteClick(task)} 
          disabled={!!isNoteLockedByAudit}
          className={`w-16 h-16 flex items-center justify-center rounded-lg border transition-all ${isNoteLockedByAudit ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-30 grayscale' : (task.note ? 'bg-[#fef9c3] text-gray-800 border-yellow-200' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600')}`}
        >
          <Icons.Chat />
        </button>
      )}

      {hasPermission('perm_btn_delete') && (
        <button onClick={() => handleDeleteClick(task.id)} className="w-16 h-16 flex items-center justify-center rounded-lg bg-red-900/50 text-red-500 hover:bg-red-800 hover:text-white border border-red-800 transition-colors">
          <Icons.Trash />
        </button>
      )}

      {!isSearchingMode && !isManualBlocked && hasPermission('perm_btn_incorrect') && !isAuditInProgress && (
        <button onClick={() => onMarkAsIncorrect(task.id)} className="w-16 h-16 flex items-center justify-center rounded-xl transition-all shadow-lg border bg-white border-red-600 text-red-600 hover:bg-red-50 active:scale-95">
          <Icons.Ban />
        </button>
      )}

      {hasPermission('perm_btn_audit') && task.isMissing && (
        <button 
          onClick={() => onAuditPart?.(task)} 
          className={`w-16 h-16 flex items-center justify-center rounded-lg bg-[#926a05] text-white border border-[#7a5804] hover:bg-[#a67c06] transition-colors shadow-lg active:scale-95 ${isAuditInProgress ? 'animate-pulse ring-4 ring-[#926a05]/50' : ''}`}
          title={t('perm_btn_audit')}
        >
          <Icons.ClipboardCheck />
        </button>
      )}
    </div>
  );
};

export default TaskActions;
