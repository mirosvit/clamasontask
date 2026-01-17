import React from 'react';
import { Task } from '../../../types/appTypes';
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

const FactoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const TaskBadges: React.FC<TaskBadgesProps> = ({ 
  task, isSystemInventoryTask, isAuditInProgress, isSearchingMode, isManualBlocked, isUrgent, resolveName
}) => {
  const { t, language } = useLanguage();

  if (task.isDone && task.status !== 'incorrectly_entered') return null;

  const baseBadgeClass = "w-fit px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-sm backdrop-blur-sm transition-all";

  // Identifikácia typu systémovej úlohy
  const isInventory = task.partNumber === "Počítanie zásob";
  const isScrap = task.partNumber === "Váženie šrotu";

  return (
    <div className="flex flex-wrap gap-2 mb-2.5">
      {task.isProduction && !isScrap && (
        <div className={`${baseBadgeClass} bg-pink-500/10 text-pink-400 border-pink-500/20`}>
          <FactoryIcon className="w-3 h-3" /> {language === 'sk' ? 'VÝROBA' : 'PRODUCTION'}
        </div>
      )}

      {task.isLogistics && !isInventory && (
        <div className={`${baseBadgeClass} bg-indigo-500/10 text-indigo-400 border-indigo-500/20`}>
          <TruckIcon className="w-3 h-3" /> {t('status_logistics')}
        </div>
      )}

      {isSystemInventoryTask && (
        <span className={`${baseBadgeClass} ${isScrap ? 'bg-teal-600/20 text-teal-400 border-teal-500/50' : 'bg-blue-600/20 text-blue-300 border-blue-500/50'} animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.2)]`}>
          {isScrap ? '⚖️ ' + t('tab_scrap_weighing') : '📋 ' + t('tab_inventory')} {task.inProgressBy ? `• ${resolveName(task.inProgressBy)}` : ''}
        </span>
      )}

      {!isSystemInventoryTask && task.isInProgress && (
        <span className={`${baseBadgeClass} bg-yellow-500/10 text-yellow-400 border-yellow-500/30 animate-pulse`}>
          👷 {language === 'sk' ? 'RIEŠI' : 'HANDLING'}: {resolveName(task.inProgressBy)}
        </span>
      )}

      {isAuditInProgress && (
        <span className={`${baseBadgeClass} bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse`}>
          ⚙️ {language === 'sk' ? 'AUDIT' : 'AUDIT'}: {resolveName(task.auditBy)}
        </span>
      )}

      {isUrgent && !isManualBlocked && (
        <span className={`${baseBadgeClass} bg-orange-500/10 text-orange-500 border-orange-500/40 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.1)]`}>
          🔥 {t('status_urgent')}
        </span>
      )}

      {isSearchingMode && (
        <span className={`${baseBadgeClass} bg-slate-700/50 text-slate-300 border-slate-600`}>
          🔍 {language === 'sk' ? 'HĽADÁ SA TOVAR' : 'SEARCHING ITEM'}: {resolveName(task.blockedBy)}
        </span>
      )}

      {isManualBlocked && (
        <span className={`${baseBadgeClass} bg-slate-900 text-slate-400 border-slate-700`}>
          🚫 {t('status_blocked')}
        </span>
      )}

      {task.isMissing && task.missingReason && !isAuditInProgress && !isSearchingMode && (
        <span className={`${baseBadgeClass} bg-red-500/10 text-red-500 border-red-500/30 animate-pulse`}>
          ⚠️ {task.missingReason}
        </span>
      )}

      {task.searchedBy && !isSearchingMode && (
        <span className={`${baseBadgeClass} bg-slate-800/60 text-slate-400 border-slate-700`}>
          🕵️ {language === 'sk' ? 'HLADAL' : 'SEARCHED'}: {resolveName(task.searchedBy)}
        </span>
      )}

      {task.status === 'incorrectly_entered' && (
        <div className={`${baseBadgeClass} bg-red-900/10 text-red-400 border-red-800/30 opacity-70`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          CHYBNE ZADANÉ
        </div>
      )}
    </div>
  );
};

export default TaskBadges;