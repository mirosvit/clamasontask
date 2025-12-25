
import React, { useState } from 'react';
import { Task, PriorityLevel, DBItem } from '../../App';
import { useLanguage } from '../LanguageContext';
import TaskCard from './tasklist/TaskCard';
import TaskModals from './tasklist/TaskModals';

interface TaskListProps {
  currentUser: 'ADMIN' | 'USER' | 'LEADER';
  currentUserName: string;
  tasks: Task[];
  missingReasons: DBItem[];
  onToggleTask: (id: string) => void;
  onEditTask: (id: string, newText: string, newPriority?: PriorityLevel) => void;
  onDeleteTask: (id: string) => void;
  onToggleMissing: (id: string, reason?: string) => void;
  onSetInProgress: (id: string) => void;
  onToggleBlock: (id: string) => void;
  onToggleManualBlock: (id: string) => void;
  onExhaustSearch: (id: string) => void;
  onMarkAsIncorrect: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  onReleaseTask: (id: string) => void;
  onAuditPart?: (task: Task) => void;
  hasPermission: (perm: string) => boolean;
  resolveName: (username?: string | null) => string;
}

const TaskList: React.FC<TaskListProps> = (props) => {
  const { t } = useLanguage();
  
  const [priorityEditId, setPriorityEditId] = useState<string | null>(null);
  const [missingId, setMissingId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteVal, setNoteVal] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openPriorityModal = (task: Task) => {
    setPriorityEditId(task.id);
    setMissingId(null); setNoteId(null); setDeleteId(null);
  };

  const confirmPriority = (id: string, newPriority: PriorityLevel) => {
    const task = props.tasks.find(t => t.id === id);
    if (task) props.onEditTask(id, task.text, newPriority);
    setPriorityEditId(null);
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

  /* Fix: Added saveNote implementation which was missing in line 143 of TaskModals usage */
  const saveNote = (id: string) => {
    props.onAddNote(id, noteVal);
    setNoteId(null);
  };

  return (
    <div className="flex flex-col space-y-3 pb-20">
      {props.tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500 italic bg-gray-800 rounded-xl border border-gray-700">{t('empty_tasks')}</div>
      )}
      
      {props.tasks.map((task) => {
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
            onToggleTask={props.onToggleTask}
            onToggleBlock={props.onToggleBlock}
            onToggleManualBlock={props.onToggleManualBlock}
            onExhaustSearch={props.onExhaustSearch}
            onMarkAsIncorrect={props.onMarkAsIncorrect}
            handleMissingClick={handleMissingClick}
            handleNoteClick={handleNoteClick}
            handleDeleteClick={handleDeleteClick}
            handleCopyPart={handleCopyPart}
            openPriorityModal={openPriorityModal}
            onAuditPart={props.onAuditPart}
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
    </div>
  );
};

export default TaskList;
