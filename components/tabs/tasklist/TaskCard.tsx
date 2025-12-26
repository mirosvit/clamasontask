import React from 'react';
import { Task, PriorityLevel, DBItem } from '../../../types/appTypes';
import { useLanguage } from '../../LanguageContext';
import TaskBadges from './TaskBadges';
import TaskActions from './TaskActions';

interface TaskCardProps {
  task: Task;
  currentUserName: string;
  isSystemInventoryTask: boolean;
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
  handleDeleteNoteClick?: (id: string) => void;
  handleCopyPart: (id: string, text: string) => void;
  openPriorityModal: (task: Task) => void;
  onAuditPart?: (task: Task) => void;
  resolveName: (username?: string | null) => string;
}

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
);

const TaskCard: React.FC<TaskCardProps> = (props) => {
  const { t, language } = useLanguage();
  const { task, resolveName } = props;

  const isSearchingMode = !!task.isBlocked;
  const isManualBlocked = !!task.isManualBlocked;
  const isAuditInProgress = !!task.isAuditInProgress;
  const isUrgent = task.priority === 'URGENT' && !task.isDone;
  const isNoteLockedByAudit = !!(task.auditFinalBadge && !props.hasPermission('perm_btn_audit'));

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
    else if (props.isSystemInventoryTask) { bgClass = "bg-[#4169E1]/20"; borderClass = "border-l-4 border-[#4169E1]"; }
    else if (task.isInProgress) { bgClass = "bg-[#FFD700]/20"; borderClass = "border-l-4 border-[#FFD700]"; }
    else if (task.isMissing) { bgClass = "bg-red-900/20"; borderClass = "border-l-4 border-red-500"; }
    else if (task.isLogistics) { bgClass = "bg-sky-900/10"; borderClass = "border-l-4 border-sky-500"; }
    else {
      switch (task.priority) {
        case 'URGENT': bgClass = "bg-[#FF8C00]/20"; borderClass = "border-l-4 border-[#FF8C00]"; break;
        case 'LOW': bgClass = "bg-[#1E90FF]/20"; borderClass = "border-l-4 border-[#1E90FF]"; break;
        case 'NORMAL':
        default: bgClass = "bg-[#8A2BE2]/20"; borderClass = "border-l-4 border-[#8A2BE2]"; break;
      }
    }
  }

  const renderFormattedText = (text: string | undefined, isLarge: boolean = true) => {
    if (!text) return null;
    if (!text.includes(';')) return text;
    const parts = text.split(';');
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part.trim()}
        {index < parts.length - 1 && (
          <span className={`mx-2 text-teal-500/40 font-light inline-block transform ${isLarge ? 'scale-110 translate-y-[-1px]' : 'scale-90'}`}>→</span>
        )}
      </React.Fragment>
    ));
  };

  const getUnitLabel = (count: number, unit: string, isInventory: boolean) => {
    if (isInventory) return "pol.";
    let key = count === 1 ? `unit_${unit}_1` : (language === 'sk' && count >= 2 && count <= 4 ? `unit_${unit}_2_4` : `unit_${unit}_5`);
    return t(key as any) || unit;
  };

  const qtyNum = parseFloat(task.quantity || '0');
  const unitLabel = getUnitLabel(qtyNum, task.quantityUnit || '', props.isSystemInventoryTask);

  return (
    <div className={`group relative flex flex-col sm:flex-row rounded-lg shadow-md overflow-hidden transition-all duration-200 items-stretch ${bgClass} ${borderClass} ${!task.isDone ? 'hover:shadow-lg' : ''}`}>
      {isUrgent && !isManualBlocked && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF8C00] animate-pulse z-50"></div>}

      {isSearchingMode && !task.isDone && (
        <div className="absolute right-20 top-1/2 -translate-y-1/2 pointer-events-none opacity-10">
          <SearchIcon className="w-32 h-32 text-gray-400" />
        </div>
      )}

      <div className="flex-grow p-4 flex flex-col gap-1 min-w-0 relative">
        <div className="relative z-10">
          <TaskBadges 
            task={task} 
            isSystemInventoryTask={props.isSystemInventoryTask} 
            isAuditInProgress={isAuditInProgress} 
            isSearchingMode={isSearchingMode} 
            isManualBlocked={isManualBlocked} 
            isUrgent={isUrgent} 
            resolveName={resolveName}
          />

          {task.auditFinalBadge && (
            <div className="mb-1">
              <span className="bg-[#926a05]/80 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-[#7a5804] shadow-sm inline-block">
                📌 {task.auditFinalBadge}
              </span>
            </div>
          )}

          <div className="flex justify-between items-start gap-3">
            <div className="flex flex-col min-w-0">
                <h3 
                className={`text-2xl sm:text-3xl font-bold break-words whitespace-normal leading-tight cursor-copy active:scale-[0.98] transition-transform ${textClass}`}
                onClick={() => props.handleCopyPart(task.id, task.partNumber || '')}
                title={language === 'sk' ? "Kliknite pre kopírovanie" : "Click to copy"}
                >
                {renderFormattedText(task.partNumber || task.text)}
                {props.copiedId === task.id && (
                    <span className="ml-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-full animate-bounce inline-block font-sans lowercase align-middle">
                    {t('copied_msg')}
                    </span>
                )}
                </h3>
                {task.isLogistics && task.note && (
                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-sky-500 font-black text-xs uppercase tracking-widest">ŠPZ/PREPR:</span>
                        <span className="text-gray-300 font-mono font-bold text-base bg-gray-900/50 px-2 py-0.5 rounded border border-gray-700">{task.note}</span>
                    </div>
                )}
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className={`bg-black border border-gray-700 shadow-inner px-3 py-1 rounded-full text-xl font-bold ${textClass}`}>{task.quantity || "0"} <span className="ml-1 text-lg font-normal">{unitLabel}</span></span>
              <div className="text-xs text-gray-400 mt-1 font-mono text-right truncate max-w-[150px]"><span className="font-bold text-gray-500">{resolveName(task.createdBy)}</span> • {new Date(task.createdAt || 0).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <span className={`text-lg font-bold uppercase tracking-wider ${task.isDone ? 'text-gray-600' : isManualBlocked ? 'text-gray-600' : props.isSystemInventoryTask ? 'text-[#4169E1]' : isAuditInProgress ? 'text-[#926a05]' : 'text-cyan-400'}`}>{task.workplace || "---"}</span>
            {task.note && !task.isLogistics && <span className="inline-block px-2 py-0.5 rounded bg-[#fef9c3] text-gray-800 text-xs font-bold shadow-sm border border-yellow-200 leading-tight">{task.note}</span>}
          </div>

          {task.isInProgress && !props.isSystemInventoryTask && (
            <div className="flex mt-1">
              <span className="text-[#FFD700] text-xs font-bold uppercase tracking-wide border border-[#FFD700]/50 bg-[#FFD700]/10 px-2 py-0.5 rounded animate-pulse truncate max-w-[200px]">
                {t('status_resolving')} {resolveName(task.inProgressBy)}
              </span>
            </div>
          )}

          {task.isDone && task.completedBy && (
            <div className="mt-2 flex items-center gap-1.5 border-t border-gray-700/50 pt-1.5 animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
              <span className="text-[10px] font-bold uppercase text-green-500/80 tracking-wide truncate">
                {t('task_completed_label')}: <span className="text-green-400">{resolveName(task.completedBy)}</span> {t('at_time')} <span className="font-mono">{new Date(task.completedAt || 0).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-center p-3 z-10">
        <TaskActions 
          task={task} 
          isSystemInventoryTask={props.isSystemInventoryTask} 
          isSearchingMode={isSearchingMode} 
          isManualBlocked={isManualBlocked} 
          isAuditInProgress={isAuditInProgress} 
          isNoteLockedByAudit={isNoteLockedByAudit} 
          copiedId={props.copiedId} 
          hasPermission={props.hasPermission} 
          onSetInProgress={props.onSetInProgress} 
          onToggleTask={props.onToggleTask} 
          onToggleBlock={props.onToggleBlock} 
          onToggleManualBlock={props.onToggleManualBlock} 
          onExhaustSearch={props.onExhaustSearch}
          onMarkAsIncorrect={props.onMarkAsIncorrect} 
          handleMissingClick={props.handleMissingClick} 
          handleNoteClick={props.handleNoteClick} 
          handleDeleteClick={props.handleDeleteClick} 
          handleCopyPart={props.handleCopyPart} 
          openPriorityModal={props.openPriorityModal} 
          onAuditPart={props.onAuditPart} 
        />
      </div>
    </div>
  );
};

export default TaskCard;