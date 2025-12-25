
import React, { useState, useMemo } from 'react';
import { UserData, DBItem, PartRequest, BreakSchedule, BOMComponent, BOMRequest, Role, Permission, SystemConfig } from '../../App';
import { useLanguage } from '../LanguageContext';
import PartRequestsSection from './PartRequestsSection';
import UserSection from './UserSection';
import PartsSection from './PartsSection';
import BOMSection from './BOMSection';
import WorkplaceSection from './WorkplaceSection';
import SystemSection from './SystemSection';
import MaintenanceSection from './MaintenanceSection';
import SetupView from './SetupView';

interface SettingsTabProps {
  currentUserRole: 'ADMIN' | 'USER' | 'LEADER';
  users: UserData[];
  onAddUser: (user: UserData) => void;
  onUpdatePassword: (username: string, newPass: string) => void;
  onUpdateUserRole: (username: string, newRole: 'ADMIN' | 'USER' | 'LEADER') => void;
  onUpdateNickname: (username: string, newNick: string) => void;
  onDeleteUser: (username: string) => void;
  parts: DBItem[];
  workplaces: DBItem[];
  missingReasons: DBItem[];
  onAddPart: (val: string, desc?: string) => void;
  onBatchAddParts: (vals: string[]) => void;
  onDeletePart: (id: string) => void;
  onDeleteAllParts: () => void;
  onAddWorkplace: (val: string, time?: number) => void;
  onBatchAddWorkplaces: (vals: string[]) => void;
  onDeleteWorkplace: (id: string) => void;
  onDeleteAllWorkplaces: () => void;
  onAddMissingReason: (val: string) => void;
  onDeleteMissingReason: (id: string) => void;
  logisticsOperations?: DBItem[];
  onAddLogisticsOperation?: (val: string, time?: number) => void;
  onDeleteLogisticsOperation?: (id: string) => void;
  partRequests: PartRequest[];
  onApprovePartRequest: (req: PartRequest) => void;
  onRejectPartRequest: (id: string) => void;
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
  /* Fix: Added missing closing handlers for MaintenanceSection */
  onDailyClosing: () => Promise<{ success: boolean; count: number }>;
  onWeeklyClosing: () => Promise<{ success: boolean; count: number; sanon?: string }>;
  onGetDocCount: () => Promise<number>;
  onPurgeOldTasks: () => Promise<number>;
  onExportTasksJSON: () => Promise<void>;
  breakSchedules: BreakSchedule[];
  onAddBreakSchedule: (start: string, end: string) => void;
  onDeleteBreakSchedule: (id: string) => void;
  /* Fix: Changed bomItems to bomMap to match App.tsx state and BOMSectionProps */
  bomMap: Record<string, BOMComponent[]>; 
  bomRequests: BOMRequest[]; 
  onAddBOMItem: (parent: string, child: string, qty: number) => void;
  onBatchAddBOMItems: (vals: string[]) => void;
  /* Fix: Corrected onDeleteBOMItem signature to match BOMSection and App.tsx logic */
  onDeleteBOMItem: (parent: string, child: string) => void;
  onDeleteAllBOMItems: () => void;
  onApproveBOMRequest: (req: BOMRequest) => void;
  onRejectBOMRequest: (id: string) => void;
  roles: Role[];
  permissions: Permission[]; 
  onAddRole: (name: string) => void;
  onDeleteRole: (id: string) => void;
  onUpdatePermission: (permissionId: string, roleName: string, hasPermission: boolean) => void;
  installPrompt: any;
  onInstallApp: () => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  dbLoadWarning?: boolean;
  hasPermission: (perm: string) => boolean;
  resolveName: (username?: string | null) => string;
}

const Icons = {
  Users: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Parts: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Workplaces: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  BOM: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  System: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Archive: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
  Summary: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
};

const SettingsTab: React.FC<SettingsTabProps> = (props) => {
  const { hasPermission, resolveName } = props;
  const { t, language } = useLanguage();
  
  const navTiles = useMemo(() => {
    const all = [
      { id: 'summary', label: language === 'sk' ? 'SÚHRN' : 'SUMMARY', icon: <Icons.Summary />, perm: 'perm_view_setup' },
      { id: 'users', label: t('sect_users_manage'), icon: <Icons.Users />, perm: 'perm_settings_users' },
      { id: 'parts', label: t('sect_parts'), icon: <Icons.Parts />, perm: 'perm_settings_parts' },
      { id: 'wp', label: t('sect_wp'), icon: <Icons.Workplaces />, perm: 'perm_settings_wp' },
      { id: 'bom', label: t('sect_bom'), icon: <Icons.BOM />, perm: 'perm_settings_bom' },
      { id: 'system', label: 'SYSTÉM', icon: <Icons.System />, perm: 'perm_settings_system' },
      { id: 'maint', label: 'ÚDRŽBA', icon: <Icons.Archive />, perm: 'perm_settings_maint' },
    ];
    return all.filter(tile => hasPermission(tile.perm));
  }, [language, t, hasPermission]);

  const [activeSubTab, setActiveSubTab] = useState<string | null>(navTiles[0]?.id || null);

  if (navTiles.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 italic bg-slate-900/40 border border-slate-800 rounded-3xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              {t('action_not_allowed')}
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in px-4 md:px-0">
      <PartRequestsSection 
        partRequests={props.partRequests} 
        bomRequests={props.bomRequests}
        onApprovePartRequest={props.onApprovePartRequest}
        onRejectPartRequest={props.onRejectPartRequest}
        onApproveBOMRequest={props.onApproveBOMRequest}
        onRejectBOMRequest={props.onRejectBOMRequest}
        resolveName={resolveName}
      />

      <div className={`grid gap-3 mb-8 ${
          navTiles.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'
      }`}>
        {navTiles.map(tile => {
          const isActive = activeSubTab === tile.id;
          return (
            <button 
              key={tile.id} 
              onClick={() => setActiveSubTab(tile.id)}
              className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-300 group relative ${
                isActive 
                ? 'bg-teal-500/10 border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.3)]' 
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <div className={`mb-3 transition-transform group-hover:scale-110 ${isActive ? 'text-teal-400' : 'text-slate-600'}`}>
                {tile.icon}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight ${isActive ? 'text-teal-400' : 'text-slate-500'}`}>
                {tile.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in">
        {activeSubTab === 'summary' && (
          <SetupView 
            users={props.users}
            parts={props.parts}
            workplaces={props.workplaces}
            missingReasons={props.missingReasons}
            logisticsOperations={props.logisticsOperations || []}
            breakSchedules={props.breakSchedules}
            /* Fix: Passing bomMap instead of bomItems */
            bomMap={props.bomMap}
            systemConfig={props.systemConfig}
          />
        )}
        {activeSubTab === 'users' && (
          <UserSection 
            users={props.users} 
            roles={props.roles} 
            onAddUser={props.onAddUser} 
            onUpdatePassword={props.onUpdatePassword} 
            onUpdateNickname={props.onUpdateNickname}
            onDeleteUser={props.onDeleteUser} 
          />
        )}
        {activeSubTab === 'parts' && (
          <PartsSection 
            parts={props.parts} 
            onAddPart={props.onAddPart} 
            onBatchAddParts={props.onBatchAddParts} 
            onDeletePart={props.onDeletePart} 
            onDeleteAllParts={props.onDeleteAllParts} 
          />
        )}
        {activeSubTab === 'wp' && (
          <WorkplaceSection 
            workplaces={props.workplaces} 
            logisticsOperations={props.logisticsOperations || []}
            onAddWorkplace={props.onAddWorkplace}
            onBatchAddWorkplaces={props.onBatchAddWorkplaces}
            onDeleteWorkplace={props.onDeleteWorkplace}
            onDeleteAllWorkplaces={props.onDeleteAllWorkplaces}
            onAddLogisticsOperation={props.onAddLogisticsOperation || (() => {})}
            onDeleteLogisticsOperation={props.onDeleteLogisticsOperation || (() => {})}
          />
        )}
        {activeSubTab === 'bom' && (
          <BOMSection 
            /* Fix: Correcting prop name and source to match actual BOMSection and state */
            bomMap={props.bomMap} 
            onAddBOMItem={props.onAddBOMItem} 
            onBatchAddBOMItems={props.onBatchAddBOMItems} 
            onDeleteBOMItem={props.onDeleteBOMItem} 
            onDeleteAllBOMItems={props.onDeleteAllBOMItems} 
          />
        )}
        {activeSubTab === 'system' && (
          <SystemSection 
            missingReasons={props.missingReasons} 
            breakSchedules={props.breakSchedules} 
            onAddMissingReason={props.onAddMissingReason} 
            onDeleteMissingReason={props.onDeleteMissingReason} 
            onAddBreakSchedule={props.onAddBreakSchedule} 
            onDeleteBreakSchedule={props.onDeleteBreakSchedule} 
          />
        )}
        {activeSubTab === 'maint' && (
          <MaintenanceSection 
            systemConfig={props.systemConfig} 
            onUpdateSystemConfig={props.onUpdateSystemConfig} 
            onArchiveTasks={props.onArchiveTasks} 
            /* Fix: Added daily and weekly closing handlers to MaintenanceSection */
            onDailyClosing={props.onDailyClosing}
            onWeeklyClosing={props.onWeeklyClosing}
            onGetDocCount={props.onGetDocCount}
            onPurgeOldTasks={props.onPurgeOldTasks}
            onExportTasksJSON={props.onExportTasksJSON}
          />
        )}
      </div>
    </div>
  );
};

export default SettingsTab;
