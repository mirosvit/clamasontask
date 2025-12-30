
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

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TaskCard: React.FC<TaskCardProps> = (props) => {
  const { t, language } = useLanguage();
  const { task, resolveName } = props;

  const isSearchingMode = !!task.isBlocked;
  const isManualBlocked = !!task.isManualBlocked;
  const isAuditInProgress = !!task.isAuditInProgress;
  const isUrgent = task.priority === 'URGENT' && !task.isDone;
  const isNoteLockedByAudit = !!(task.auditFinalBadge && !props.hasPermission('perm_btn_audit'));

  // --- SMART TIME LOGIC START ---
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const now = Date.now();
    const diff = now - ts;
    
    // Menej ako minúta
    if (diff < 60000) return language === 'sk' ? 'Práve teraz' : 'Just now';

    const date = new Date(ts);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const timeStr = date.toLocaleTimeString(language === 'sk' ? 'sk-SK' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return (language === 'sk' ? 'Dnes, ' : 'Today, ') + timeStr;
    if (isYesterday) return (language === 'sk' ? 'Včera, ' : 'Yesterday, ') + timeStr;
    
    // Staršie
    return date.toLocaleDateString(language === 'sk' ? 'sk-SK' : 'en-US', { day: '2-digit', month: '2-digit' }) + ', ' + timeStr;
  };

  let displayTimeValue = task.createdAt;
  let displayTimeLabel = language === 'sk' ? 'Vytvorené' : 'Created';
  let timeColorClass = 'text-slate-500';

  if (task.isDone && task.completedAt) {
      displayTimeValue = task.completedAt;
      displayTimeLabel = language === 'sk' ? 'Dokončené' : 'Completed';
      timeColorClass = 'text-green-500';
  } else if (task.isInProgress && task.startedAt) {
      displayTimeValue = task.startedAt;
      displayTimeLabel = language === 'sk' ? 'Začaté' : 'Started';
      timeColorClass = 'text-amber-500';
  }
  // --- SMART TIME LOGIC END ---

  let bgClass = "";
  let borderClass = "";
  let textClass = "text-white";

  if (task.isDone) {
    bgClass = "bg-gray-800 opacity-60";
    textClass = "text-gray-500 line-through";
  } else {
    if (isManualBlocked) { bgClass = "bg-black"; textClass = "text-gray-500"; borderClass = "border-l-4 border-gray-800"; }
    else if (isAuditInProgress) { bgClass = "bg-amber-500/20"; borderClass = "border-l-4 border-amber-500"; }
    else if (isSearchingMode) { bgClass = "bg-gray-800"; borderClass = "border-l-4 border-gray-600 shadow-inner"; }
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
          
          <div className="mb-2">
             <div className="flex flex-wrap gap-2">
                {task.auditFinalBadge && (
                    <span className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-amber-500 shadow-sm inline-block">
                        📌 {task.auditFinalBadge}
                    </span>
                )}
                <TaskBadges 
                    task={task} 
                    isSystemInventoryTask={props.isSystemInventoryTask} 
                    isAuditInProgress={isAuditInProgress} 
                    isSearchingMode={isSearchingMode} 
                    isManualBlocked={isManualBlocked} 
                    isUrgent={isUrgent} 
                    resolveName={resolveName}
                />
             </div>
             
             {/* NEW TIME ROW */}
             <div className="flex items-center gap-1.5 mt-1.5 pl-0.5 opacity-80">
                <ClockIcon className={`w-3 h-3 ${timeColorClass}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${timeColorClass}`}>
                    {displayTimeLabel}:
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-300">
                    {formatTime(displayTimeValue)}
                </span>
             </div>
          </div>

          <div className="flex justify-between items-start gap-3 mt-1">
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
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className={`bg-black border border-gray-700 shadow-inner px-3 py-1 rounded-full text-xl font-bold ${textClass}`}>{task.quantity || "0"} <span className="ml-1 text-lg font-normal">{unitLabel}</span></span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <span className={`text-lg font-bold uppercase tracking-wider ${task.isDone ? 'text-gray-600' : isManualBlocked ? 'text-gray-600' : props.isSystemInventoryTask ? 'text-[#4169E1]' : isAuditInProgress ? 'text-amber-500' : 'text-cyan-400'}`}>{task.workplace || "---"}</span>
            {task.note && <span className="inline-block px-2 py-0.5 rounded bg-[#fef9c3] text-gray-800 text-xs font-bold shadow-sm border border-yellow-200 leading-tight">{task.note}</span>}
          </div>
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
