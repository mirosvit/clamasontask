
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Task, PriorityLevel, DBItem } from '../../App';
import { useLanguage } from '../LanguageContext';

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
  onToggleTaskInProgress?: (id: string) => void; 
  onToggleBlock: (id: string) => void;
  onToggleManualBlock: (id: string) => void;
  onMarkAsIncorrect: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  onReleaseTask: (id: string) => void;
  onAuditPart?: (task: Task) => void;
  hasPermission: (perm: string) => boolean;
}

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
);

const ExclamationIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
);

const SignalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
);

const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
);

const ReturnIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
);

const BanIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
        <circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth="2.5" fill="none" />
        <path d="M5 19L19 5" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

const ClipboardCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const TaskList: React.FC<TaskListProps> = (props) => {
    const { t, language } = useLanguage();
    
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

    const saveNote = (id: string) => {
        props.onAddNote(id, noteVal);
        setNoteId(null);
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

    const renderFormattedText = (text: string | undefined) => {
        if (!text) return null;
        if (!text.includes(';')) return text;
        const parts = text.split(';');
        return parts.map((part, index) => (
            <React.Fragment key={index}>
                {part.trim()}
                {index < parts.length - 1 && (
                    <span className="mx-2 text-teal-400 font-bold opacity-80 inline-block transform translate-y-[1px]">➤</span>
                )}
            </React.Fragment>
        ));
    };

    const getUnitLabel = (count: number, unit: string, isInventory: boolean) => {
        if (isInventory) return "pol.";
        if (language === 'sk') {
            let key = count === 1 ? `unit_${unit}_1` : (count >= 2 && count <= 4 ? `unit_${unit}_2_4` : `unit_${unit}_5`);
            return t(key as any) || unit;
        } else {
            let key = count === 1 ? `unit_${unit}_1` : `unit_${unit}_5`; 
            return t(key as any) || unit;
        }
    };

    return (
        <div className="flex flex-col space-y-3 pb-20">
            {props.tasks.length === 0 && (
                <div className="text-center py-12 text-gray-500 italic bg-gray-800 rounded-xl border border-gray-700">{t('empty_tasks')}</div>
            )}
            
            {props.tasks.map((task) => {
                const isSearchingMode = task.isBlocked; 
                const isManualBlocked = task.isManualBlocked;
                const isAuditInProgress = task.isAuditInProgress;
                const isUrgent = task.priority === 'URGENT' && !task.isDone;
                const isSystemInventoryTask = task.partNumber === "Počítanie zásob";
                const isNoteLockedByAudit = !!(task.auditFinalBadge && !props.hasPermission('perm_btn_audit'));
                const isLogisticsTask = task.isLogistics;
                
                if (isSystemInventoryTask && !props.hasPermission('perm_tab_inventory')) {
                    return null;
                }

                let bgClass = "";
                let borderClass = "";
                let textClass = "text-white";
                
                if (task.isDone) {
                    bgClass = "bg-gray-800 opacity-60";
                    textClass = "text-gray-500 line-through";
                } else {
                    if (isManualBlocked) { bgClass = "bg-black"; textClass = "text-gray-500"; borderClass = "border-l-4 border-gray-800"; }
                    else if (isAuditInProgress) { bgClass = "bg-[#926a05]/30"; borderClass = "border-l-4 border-[#926a05]"; }
                    else if (isSearchingMode) { bgClass = "bg-gray-800"; borderClass = "border-l-4 border-gray-600"; }
                    else if (isSystemInventoryTask) { bgClass = "bg-[#4169E1]/20"; borderClass = "border-l-4 border-[#4169E1]"; }
                    else if (task.isInProgress) { bgClass = "bg-[#FFD700]/20"; borderClass = "border-l-4 border-[#FFD700]"; }
                    else if (task.isMissing) { bgClass = "bg-red-900/20"; borderClass = "border-l-4 border-red-500"; }
                    else if (isLogisticsTask) { bgClass = "bg-sky-900/10"; borderClass = "border-l-4 border-sky-500"; }
                    else {
                        switch (task.priority) {
                            case 'URGENT': bgClass = "bg-[#FF8C00]/20"; borderClass = "border-l-4 border-[#FF8C00]"; break;
                            case 'LOW': bgClass = "bg-[#1E90FF]/20"; borderClass = "border-l-4 border-[#1E90FF]"; break;
                            case 'NORMAL':
                            default: bgClass = "bg-[#8A2BE2]/20"; borderClass = "border-l-4 border-[#8A2BE2]"; break;
                        }
                    }
                }
                
                const qtyNum = parseFloat(task.quantity || '0');
                const unitLabel = getUnitLabel(qtyNum, task.quantityUnit || '', isSystemInventoryTask);

                return (
                    <div key={task.id} className={`group relative flex flex-col sm:flex-row rounded-lg shadow-md overflow-hidden transition-all duration-200 items-stretch ${bgClass} ${borderClass} ${!task.isDone ? 'hover:shadow-lg' : ''}`}>
                        {isUrgent && !isManualBlocked && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF8C00] animate-pulse z-50"></div>}
                        
                        {isSearchingMode && !task.isDone && (
                            <div className="absolute right-20 top-1/2 -translate-y-1/2 pointer-events-none opacity-10">
                                <SearchIcon className="w-32 h-32 text-gray-400" />
                            </div>
                        )}

                        <div className="flex-grow p-4 flex flex-col gap-1 min-w-0 relative">
                            <div className="relative z-10">
                                {isLogisticsTask && !task.isDone && (
                                    <div className="mb-1">
                                        <span className="bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.4)] inline-block">
                                            🚛 {t('status_logistics')}
                                        </span>
                                    </div>
                                )}

                                {isSystemInventoryTask && !task.isDone && (
                                    <div className="mb-1">
                                        <span className="bg-[#4169E1] text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-[#3151b1] shadow-[0_0_10px_rgba(65,105,225,0.4)] inline-block">
                                            📋 {t('tab_inventory')} {task.inProgressBy ? `• ${task.inProgressBy}` : ''}
                                        </span>
                                    </div>
                                )}

                                {isAuditInProgress && !task.isDone && (
                                    <div className="mb-1">
                                        <span className="bg-[#926a05] text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-[#7a5804] shadow-[0_0_10px_rgba(146,106,5,0.4)] inline-block">
                                            ⚙️ {t('audit_badge')} • {task.auditBy}
                                        </span>
                                    </div>
                                )}

                                {task.auditFinalBadge && (
                                    <div className="mb-1">
                                        <span className="bg-[#926a05]/80 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-[#7a5804] shadow-sm inline-block">
                                            📌 {task.auditFinalBadge}
                                        </span>
                                    </div>
                                )}

                                {isUrgent && !isManualBlocked && (
                                    <div className="mb-1">
                                        <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.4)] inline-block">
                                            🔥 {t('status_urgent')}
                                        </span>
                                    </div>
                                )}

                                {isSearchingMode && !task.isDone && (
                                    <div className="mb-1">
                                        <span className="bg-gray-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-gray-400 shadow-sm inline-block">
                                            🔍 {t('status_inventory')} {task.blockedBy ? `• ${task.blockedBy}` : ''}
                                        </span>
                                    </div>
                                )}

                                {isManualBlocked && !task.isDone && (
                                    <div className="mb-1">
                                        <span className="bg-[#1e1b4b] text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-[#312e81] shadow-sm inline-block">
                                            🚫 {t('status_blocked')}
                                        </span>
                                    </div>
                                )}

                                {task.isMissing && !task.isDone && task.missingReason && !isAuditInProgress && (
                                    <div className="mb-1">
                                        <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-red-500 shadow-sm inline-block">
                                            ⚠️ {task.missingReason}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start gap-3">
                                    <h3 
                                        className={`text-2xl sm:text-3xl font-bold truncate leading-tight cursor-copy active:scale-[0.98] transition-transform ${textClass}`}
                                        onClick={() => handleCopyPart(task.id, task.partNumber || '')}
                                        title={language === 'sk' ? "Kliknite pre kopírovanie čísla dielu" : "Click to copy part number"}
                                    >
                                        {renderFormattedText(task.partNumber || task.text)}
                                        {copiedId === task.id && (
                                            <span className="ml-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-full animate-bounce inline-block font-sans lowercase align-middle">
                                                {t('copied_msg')}
                                            </span>
                                        )}
                                    </h3>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                        <span className={`bg-black border border-gray-700 shadow-inner px-3 py-1 rounded-full text-xl font-bold ${textClass}`}>{task.quantity || "0"} <span className="ml-1 text-lg font-normal">{unitLabel}</span></span>
                                        <div className="text-xs text-gray-400 mt-1 font-mono text-right"><span className="font-bold text-gray-500">{task.createdBy}</span> • {new Date(task.createdAt || 0).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className={`text-lg font-bold uppercase tracking-wider ${task.isDone ? 'text-gray-600' : isManualBlocked ? 'text-gray-600' : isSystemInventoryTask ? 'text-[#4169E1]' : isAuditInProgress ? 'text-[#926a05]' : 'text-cyan-400'}`}>{task.workplace || "---"}</span>
                                    {task.note && <span className="inline-block px-2 py-0.5 rounded bg-[#fef9c3] text-gray-800 text-xs font-bold shadow-sm border border-yellow-200 leading-tight">{task.note}</span>}
                                </div>
                                {task.isInProgress && !isSystemInventoryTask && (
                                    <div className="flex"><span className="text-[#FFD700] text-xs font-bold uppercase tracking-wide border border-[#FFD700]/50 bg-[#FFD700]/10 px-2 py-0.5 rounded animate-pulse">{t('status_resolving')} {task.inProgressBy}</span></div>
                                )}

                                {task.isDone && task.completedBy && (
                                    <div className="mt-2 flex items-center gap-1.5 border-t border-gray-700/50 pt-1.5 animate-fade-in">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                                        <span className="text-[10px] font-bold uppercase text-green-500/80 tracking-wide">
                                            {t('task_completed_label')}: <span className="text-green-400">{task.completedBy}</span> {t('at_time')} <span className="font-mono">{new Date(task.completedAt || 0).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center justify-center p-3 z-10">
                            <div className="grid grid-cols-5 gap-2 items-center justify-center">
                                {isSystemInventoryTask ? (
                                    props.hasPermission('perm_btn_delete') && (
                                        <button onClick={() => handleDeleteClick(task.id)} className="w-16 h-16 flex items-center justify-center rounded-lg bg-red-900/50 text-red-500 hover:bg-red-800 hover:text-white border border-red-800 transition-colors">
                                            <TrashIcon className="w-8 h-8" />
                                        </button>
                                    )
                                ) : !task.isDone ? (
                                    <>
                                        {!isSearchingMode && !isManualBlocked && props.hasPermission('perm_btn_resolve') && !isAuditInProgress && (
                                            <button onClick={() => props.onSetInProgress(task.id)} className={`w-16 h-16 flex items-center justify-center rounded-xl transition-all active:scale-95 shadow-lg ${task.isInProgress ? 'bg-yellow-600 text-white border border-yellow-500' : 'bg-gray-700 text-yellow-500 hover:bg-gray-600 border border-gray-600'}`}>
                                                {task.isInProgress ? <PauseIcon className="w-10 h-10" /> : <PlayIcon className="w-10 h-10" />}
                                            </button>
                                        )}
                                        {!isManualBlocked && props.hasPermission('perm_btn_copy') && (
                                            <button onClick={() => (task.isInProgress || isSearchingMode || isAuditInProgress) && handleCopyPart(task.id, task.partNumber || '')} disabled={!task.isInProgress && !isSearchingMode && !isAuditInProgress} className={`w-16 h-16 flex items-center justify-center rounded-lg transition-all shadow-lg border ${(!task.isInProgress && !isSearchingMode && !isAuditInProgress) ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-50' : (copiedId === task.id ? 'bg-green-600 border-green-500 text-white' : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 active:scale-95')}`}>
                                                {copiedId === task.id ? <span className="font-bold text-xs">OK</span> : <CopyIcon className="w-8 h-8" />}
                                            </button>
                                        )}
                                        {!isManualBlocked && props.hasPermission('perm_btn_missing') && !isAuditInProgress && (
                                            <button onClick={(e) => (task.isInProgress || isSearchingMode) && handleMissingClick(task, e)} disabled={!task.isInProgress && !isSearchingMode} className={`w-16 h-16 flex items-center justify-center rounded-xl transition-all shadow-lg border ${(!task.isInProgress && !isSearchingMode) ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-50' : (task.isMissing ? 'bg-red-800 text-white border-red-500' : 'bg-red-600 text-white hover:bg-red-50 border-red-500 active:scale-95')}`}>
                                                <ExclamationIcon className="w-10 h-10" />
                                            </button>
                                        )}
                                        {!isManualBlocked && props.hasPermission('perm_btn_lock') && !isAuditInProgress && (
                                            <button onClick={() => props.onToggleBlock(task.id)} title={t('perm_btn_lock')} className={`w-16 h-16 flex items-center justify-center rounded-lg transition-all active:scale-95 shadow-lg ${task.isBlocked ? 'bg-gray-600 text-white border border-gray-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 border border-gray-600'}`}><SearchIcon className="w-8 h-8" /></button>
                                        )}
                                        {props.hasPermission('perm_btn_block_new') && !isAuditInProgress && (
                                            <button onClick={() => props.onToggleManualBlock(task.id)} className={`w-16 h-16 flex items-center justify-center rounded-lg border shadow-lg transition-all active:scale-95 ${task.isManualBlocked ? 'bg-[#1e1b4b] border-[#312e81] text-white' : 'bg-black border-[#4169E1] text-[#4169E1]'}`}><LockIcon className="w-8 h-8" /></button>
                                        )}
                                        {!isSearchingMode && !isManualBlocked && props.hasPermission('perm_btn_finish') && !isAuditInProgress && (
                                            <button onClick={() => task.isInProgress && props.onToggleTask(task.id)} disabled={!task.isInProgress} className={`w-16 h-16 flex items-center justify-center rounded-xl transition-all shadow-xl border ${task.isInProgress ? 'bg-lime-600 text-white hover:bg-lime-500 active:scale-95 border-lime-500' : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-50'}`}><CheckIcon className="w-12 h-12" /></button>
                                        )}
                                        {!isSearchingMode && !isManualBlocked && props.hasPermission('perm_btn_edit') && !isAuditInProgress && (
                                            <button onClick={() => openPriorityModal(task)} className="w-16 h-16 flex items-center justify-center rounded-lg bg-gray-700 text-blue-400 border border-gray-600 hover:bg-gray-600 hover:text-white transition-colors"><SignalIcon className="w-8 h-8" /></button>
                                        )}
                                        {!isSearchingMode && !isManualBlocked && props.hasPermission('perm_btn_note') && !isAuditInProgress && (
                                            <button 
                                                onClick={() => !isNoteLockedByAudit && handleNoteClick(task)} 
                                                disabled={!!isNoteLockedByAudit}
                                                className={`w-16 h-16 flex items-center justify-center rounded-lg border transition-all ${isNoteLockedByAudit ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-30 grayscale' : (task.note ? 'bg-[#fef9c3] text-gray-800 border-yellow-200' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600')}`}
                                            >
                                                <ChatIcon className="w-8 h-8" />
                                            </button>
                                        )}
                                        {props.hasPermission('perm_btn_delete') && (
                                            <button onClick={() => handleDeleteClick(task.id)} className="w-16 h-16 flex items-center justify-center rounded-lg bg-red-900/50 text-red-500 hover:bg-red-800 hover:text-white border border-red-800 transition-colors"><TrashIcon className="w-8 h-8" /></button>
                                        )}
                                        {!isSearchingMode && !isManualBlocked && props.hasPermission('perm_btn_incorrect') && !isAuditInProgress && (
                                            <button 
                                                onClick={() => props.onMarkAsIncorrect(task.id)} 
                                                className="w-16 h-16 flex items-center justify-center rounded-xl transition-all shadow-lg border bg-white border-red-600 text-red-600 hover:bg-red-50 active:scale-95"
                                            >
                                                <BanIcon className="w-10 h-10" />
                                            </button>
                                        )}
                                        {props.hasPermission('perm_btn_audit') && task.isMissing && (
                                            <button 
                                                onClick={() => props.onAuditPart?.(task)} 
                                                className={`w-16 h-16 flex items-center justify-center rounded-lg bg-[#926a05] text-white border border-[#7a5804] hover:bg-[#a67c06] transition-colors shadow-lg active:scale-95 ${isAuditInProgress ? 'animate-pulse ring-4 ring-[#926a05]/50' : ''}`}
                                                title={t('perm_btn_audit')}
                                            >
                                                <ClipboardCheckIcon className="w-8 h-8" />
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {props.hasPermission('perm_btn_copy') && (
                                            <button onClick={() => handleCopyPart(task.id, task.partNumber || '')} className={`w-16 h-16 flex items-center justify-center rounded-xl transition-all active:scale-95 shadow-lg border ${copiedId === task.id ? 'bg-green-600 border-green-500 text-white' : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'}`}><CopyIcon className="w-8 h-8" /></button>
                                        )}
                                        {props.hasPermission('perm_btn_return') && (
                                            <button onClick={() => props.onToggleTask(task.id)} className="w-16 h-16 flex items-center justify-center rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md transition-all active:scale-95 border border-orange-500"><ReturnIcon className="w-10 h-10" /></button>
                                        )}
                                        {props.hasPermission('perm_btn_delete') && (
                                            <button onClick={() => handleDeleteClick(task.id)} className="w-16 h-16 flex items-center justify-center rounded-lg bg-red-900/50 text-red-500 hover:bg-red-800 hover:text-white border border-red-800 transition-colors"><TrashIcon className="w-8 h-8" /></button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {priorityEditId && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPriorityEditId(null)}><div className="bg-gray-800 border-2 border-blue-500 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}><h3 className="text-xl font-bold text-blue-400 mb-6 text-center uppercase tracking-wide">{t('priority_label')}</h3><div className="grid grid-cols-1 gap-3"><button onClick={() => confirmPriority(priorityEditId, 'LOW')} className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white rounded-lg font-bold transition-all duration-200 text-lg shadow-md hover:translate-x-1 uppercase">{t('prio_low')}</button><button onClick={() => confirmPriority(priorityEditId, 'NORMAL')} className="p-4 bg-green-700 hover:bg-green-600 border border-green-500 text-white rounded-lg font-bold transition-all duration-200 text-lg shadow-md hover:translate-x-1 uppercase">{t('prio_normal')}</button><button onClick={() => confirmPriority(priorityEditId, 'URGENT')} className="p-4 bg-red-700 hover:bg-red-600 border border-red-500 text-white rounded-lg font-bold transition-all duration-200 text-lg shadow-md hover:translate-x-1 uppercase">{t('prio_urgent')}</button></div><button onClick={() => setPriorityEditId(null)} className="w-full mt-6 py-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors">{t('btn_cancel')}</button></div></div>, document.body)}
            {missingId && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setMissingId(null)}><div className="bg-gray-800 border-2 border-red-600 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}><h3 className="text-xl font-bold text-red-400 mb-6 text-center uppercase tracking-wide">{t('modal_missing_title')}</h3><div className="grid grid-cols-1 gap-3">{props.missingReasons.map(r => (<button key={r.id} onClick={() => confirmMissing(missingId, r.value)} className="p-4 bg-gray-700 hover:bg-red-900/30 border border-gray-600 hover:border-red-500 text-white rounded-lg font-bold transition-all duration-200 text-lg shadow-md hover:translate-x-1">{r.value}</button>))}</div><button onClick={() => setMissingId(null)} className="w-full mt-6 py-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors">{t('btn_cancel')}</button></div></div>, document.body)}
            {noteId && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setNoteId(null)}><div className="bg-gray-800 border-2 border-yellow-500 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}><h3 className="text-xl font-bold text-yellow-400 mb-4 text-center uppercase tracking-wide">{t('btn_note')}</h3><textarea value={noteVal} onChange={(e) => setNoteVal(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-yellow-500 outline-none mb-4" rows={4} autoFocus placeholder={t('btn_note') + "..."} /><div className="flex gap-3"><button onClick={() => saveNote(noteId)} className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold transition-colors">{t('btn_save')}</button><button onClick={() => setNoteId(null)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-bold transition-colors">{t('btn_cancel')}</button></div></div></div>, document.body)}
            {deleteId && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setDeleteId(null)}><div className="bg-gray-800 border-2 border-red-600 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}><div className="text-center mb-6"><div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50"><TrashIcon className="w-8 h-8 text-red-500" /></div><h3 className="text-xl font-bold text-white mb-2">{t('miss_delete_confirm')}</h3></div><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors">{t('btn_cancel')}</button><button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors shadow-lg flex items-center justify-center gap-2"><TrashIcon className="w-5 h-5" />Vymazať</button></div></div></div>, document.body)}
        </div>
    );
};

export default TaskList;
