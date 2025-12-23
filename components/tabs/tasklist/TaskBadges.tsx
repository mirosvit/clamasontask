
import React from 'react';
import { Task } from '../../../App';
import { useLanguage } from '../../LanguageContext';

interface TaskBadgesProps {
  task: Task;
  isSystemInventoryTask: boolean;
  isAuditInProgress: boolean;
  isSearchingMode: boolean;
  isManualBlocked: boolean;
  isUrgent: boolean;
  resolveName: (username?: string | null) => string;
}

const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
);

const TaskBadges: React.FC<TaskBadgesProps> = ({ 
  task, isSystemInventoryTask, isAuditInProgress, isSearchingMode, isManualBlocked, isUrgent, resolveName
}) => {
  const { t } = useLanguage();

  if (task.isDone) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {task.isLogistics && (
        <div className="w-fit bg-indigo-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-md tracking-widest flex items-center gap-1 shadow-sm">
          <TruckIcon className="w-3 h-3" /> {t('status_logistics')}
        </div>
      )}

      {isSystemInventoryTask && (
        <span className="bg-[#4169E1] text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-[#3151b1] shadow-[0_0_10px_rgba(65,105,225,0.4)]">
          📋 {t('tab_inventory')} {task.inProgressBy ? `• ${resolveName(task.inProgressBy)}` : ''}
        </span>
      )}

      {isAuditInProgress && (
        <span className="bg-[#926a05] text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-[#7a5804] shadow-[0_0_10px_rgba(146,106,5,0.4)]">
          ⚙️ {t('audit_badge')} • {resolveName(task.auditBy)}
        </span>
      )}

      {isUrgent && !isManualBlocked && (
        <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.4)]">
          🔥 {t('status_urgent')}
        </span>
      )}

      {isSearchingMode && (
        <span className="bg-gray-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-gray-400 shadow-sm">
          🔍 {t('status_inventory')} {task.blockedBy ? `• ${resolveName(task.blockedBy)}` : ''}
        </span>
      )}

      {isManualBlocked && (
        <span className="bg-[#1e1b4b] text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-[#312e81] shadow-sm">
          🚫 {t('status_blocked')}
        </span>
      )}

      {task.isMissing && task.missingReason && !isAuditInProgress && (
        <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse border border-red-500 shadow-sm">
          ⚠️ {task.missingReason}
        </span>
      )}
    </div>
  );
};

export default TaskBadges;
