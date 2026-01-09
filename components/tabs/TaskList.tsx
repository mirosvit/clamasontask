import React, { useState, useMemo } from 'react';
import { Task, PriorityLevel, DBItem, MapSector } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';
import TaskCard from './tasklist/TaskCard';
import TaskModals from './tasklist/TaskModals';
import SearchConfirmModal from '../modals/SearchConfirmModal';
import AuditModal from '../modals/AuditModal';
import SectorPickerModal from '../modals/SectorPickerModal';

interface TaskListProps {
  currentUser: 'ADMIN' | 'USER' | 'LEADER';
  currentUserName: string;
  tasks: Task[];
  missingReasons: DBItem[];
  mapSectors: MapSector[];
  onToggleTask: (id: string, sectorId?: string) => void;
  onEditTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onToggleMissing: (id: string, reason?: string) => void;
  onSetInProgress: (id: string) => void;
  onToggleBlock: (id: string) => void;
  onToggleManualBlock: (id: string) => void;
  onExhaustSearch: (id: string) => void;
  onMarkAsIncorrect: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  onReleaseTask: (id: string) => void;
  onAuditPart?: (id: string) => void;
  onFinishAudit?: (id: string, result: 'found' | 'missing', note: string) => void;
  hasPermission: (perm: string) => boolean;
  resolveName: (username?: string | null) => string;
}

const TaskList: React.FC<TaskListProps> = (props) => {
  const { t } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityEditId, setPriorityEditId] = useState<string | null>(null);
  const [missingId, setMissingId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteVal, setNoteVal] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [searchConfirmTask, setSearchConfirmTask] = useState<Task | null>(null);
  const [auditTask, setAuditTask] = useState<Task | null>(null);
  const [pendingCompleteTask, setPendingCompleteTask] = useState<Task | null>(null);

  // --- LOKÁLNA FILTRÁCIA ---
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return props.tasks;
    const q = searchTerm.toLowerCase().trim();
    return props.tasks.filter(task => 
      (task.partNumber || '').toLowerCase().includes(q) ||
      (task.workplace || '').toLowerCase().includes(q) ||
      (task.note || '').toLowerCase().includes(q)
    );
  }, [props.tasks, searchTerm]);

  const openPriorityModal = (task: Task) => {
    setPriorityEditId(task.id);
    setMissingId(null); setNoteId(null); setDeleteId(null);
  };

  const confirmPriority = (id: string, newPriority: PriorityLevel) => {
    const task = props.tasks.find(t => t.id === id);
    if (task) props.onEditTask(id, { priority: newPriority });
    setPriorityEditId(null);
  };

  const handleToggleTaskWithCheck = (id: string) => {
      const task = props.tasks.find(t => t.id === id);
      if (!task) return;

      // Ak je úloha hotová, vrátime ju (re-open) bez otázky na sektor
      if (task.isDone) {
          props.onToggleTask(id);
          return;
      }

      // Ak ide o VÝROBNÚ úlohu a nie je ešte hotová, pýtame sa skladníka odkiaľ ju vzal
      if (task.isProduction) {
          setPendingCompleteTask(task);
      } else {
          // Pre logistiku alebo iné typy uzavrieme okamžite
          props.onToggleTask(id);
      }
  };

  const confirmSectorPick = (sectorId: string) => {
      if (pendingCompleteTask) {
          props.onToggleTask(pendingCompleteTask.id, sectorId);
          setPendingCompleteTask(null);
      }
  };

  const handleSearchClick = (task: Task) => {
    if (!task.isBlocked) {
      props.onToggleBlock(task.id);
    } else {
      setSearchConfirmTask(task);
    }
  };

  const confirmSearch = (taskId: string, found: boolean) => {
    if (found) {
      props.onToggleMissing(taskId); // Reset missing
      props.onToggleBlock(taskId);  // Reset searching
    } else {
      props.onExhaustSearch(taskId); // Permanent unsuccessful search
      props.onToggleBlock(taskId);   // Reset searching status
    }
    setSearchConfirmTask(null);
  };

  const handleAuditClick = (task: Task) => {
    if (!task.isAuditInProgress) {
      props.onAuditPart?.(task.id);
    } else {
      setAuditTask(task);
    }
  };

  const handleMissingClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.isMissing) props.onToggleMissing(task.id);
    else {
      setMissingId(missingId === task.id ? null : task.id);
      setPriorityEditId(null); setNoteId(null); setDeleteId(null);
    }
  };

  const confirmMissing = (id: string, reason: string) => {
    props.onToggleMissing(id, reason);
    setMissingId(null);
  };

  const handleNoteClick = (task: Task) => {
    const isNoteLocked = !!(task.auditFinalBadge && !props.hasPermission('perm_btn_audit'));
    if (isNoteLocked) return;
    setNoteId(noteId === task.id ? null : task.id);
    setNoteVal(task.note || '');
    setPriorityEditId(null); setMissingId(null); setDeleteId(null);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setPriorityEditId(null); setMissingId(null); setNoteId(null);
  };

  const confirmDelete = () => {
    if (deleteId) {
      props.onDeleteTask(deleteId);
      setDeleteId(null);
    }
  };

  const handleCopyPart = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(err => console.error('Copy failed', err));
  };

  const saveNote = (id: string) => {
    props.onAddNote(id, noteVal);
    setNoteId(null);
  };

  return (
    <div className="flex flex-col space-y-3 pb-20">
      {/* VYHĽADÁVACÍ PANEL */}
      <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm pb-4 pt-1">
        <div className="relative group">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('task_search_placeholder')}
            className="w-full h-14 bg-gray-800 border-2 border-gray-700 rounded-2xl px-6 pl-14 text-white text-lg focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all font-mono uppercase placeholder:text-gray-600 shadow-xl"
          />
          <div className="absolute left-5 top-4 text-gray-500 group-focus-within:text-teal-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-3.5 p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-20 text-gray-500 italic bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-700 animate-fade-in">
          <div className="mb-4 opacity-20 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-bold uppercase tracking-tighter">{searchTerm ? 'Nič sa nenašlo' : t('empty_tasks')}</p>
          {searchTerm && <p className="text-sm mt-1">Skúste upraviť hľadaný výraz</p>}
        </div>
      )}
      
      {filteredTasks.map((task) => {
        const isSystemInventoryTask = task.partNumber === "Počítanie zásob";
        if (isSystemInventoryTask && !props.hasPermission('perm_tab_inventory')) return null;

        return (
          <TaskCard 
            key={task.id}
            task={task}
            currentUserName={props.currentUserName}
            isSystemInventoryTask={isSystemInventoryTask}
            copiedId={copiedId}
            hasPermission={props.hasPermission}
            onSetInProgress={props.onSetInProgress}
            onToggleTask={() => handleToggleTaskWithCheck(task.id)}
            onToggleBlock={() => handleSearchClick(task)}
            onToggleManualBlock={props.onToggleManualBlock}
            onExhaustSearch={props.onExhaustSearch}
            onMarkAsIncorrect={props.onMarkAsIncorrect}
            handleMissingClick={handleMissingClick}
            handleNoteClick={handleNoteClick}
            handleDeleteClick={handleDeleteClick}
            handleCopyPart={handleCopyPart}
            openPriorityModal={openPriorityModal}
            onAuditPart={() => handleAuditClick(task)}
            resolveName={props.resolveName}
          />
        );
      })}

      <TaskModals 
        priorityEditId={priorityEditId}
        missingId={missingId}
        noteId={noteId}
        deleteId={deleteId}
        noteVal={noteVal}
        missingReasons={props.missingReasons}
        tasks={props.tasks}
        setPriorityEditId={setPriorityEditId}
        setMissingId={setMissingId}
        setNoteId={setNoteId}
        setDeleteId={setDeleteId}
        setNoteVal={setNoteVal}
        confirmPriority={confirmPriority}
        confirmMissing={confirmMissing}
        saveNote={saveNote}
        confirmDelete={confirmDelete}
      />

      {searchConfirmTask && (
        <SearchConfirmModal 
          task={searchConfirmTask} 
          onClose={() => setSearchConfirmTask(null)} 
          onConfirm={confirmSearch} 
        />
      )}

      {auditTask && (
        <AuditModal 
          task={auditTask} 
          onClose={() => setAuditTask(null)} 
          onConfirm={(id, res, note) => {
            props.onFinishAudit?.(id, res, note);
            setAuditTask(null);
          }} 
        />
      )}

      {pendingCompleteTask && (
        <SectorPickerModal 
          task={pendingCompleteTask}
          mapSectors={props.mapSectors}
          onClose={() => setPendingCompleteTask(null)}
          onConfirm={confirmSectorPick}
        />
      )}
    </div>
  );
};

export default TaskList;