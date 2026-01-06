
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext'; 
import { SystemConfig } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';
import PartRequestsSection from './PartRequestsSection';
import UserSection from './UserSection';
import ReactSection from './PartsSection';
import BOMSection from './BOMSection';
import WorkplaceSection from './WorkplaceSection';
import SystemSection from './SystemSection';
import MaintenanceSection from './MaintenanceSection';
import SetupView from './SetupView';
import YearlyClosing from './YearlyClosing';
import AdminNotesSection from './AdminNotesSection';
import PartsSection from './PartsSection';

interface SettingsTabProps {
  currentUser: string;
  currentUserRole: string;
  installPrompt: any;
  onInstallApp: () => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  onUpdateAdminKey: (oldK: string, newK: string) => Promise<void>;
  onToggleAdminLock: (val: boolean) => void;
}

const Icons = {
  Users: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Parts: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Workplaces: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  BOM: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  System: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Archive: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
  Summary: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Yearly: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Notes: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
};

const SettingsTab: React.FC<SettingsTabProps> = (props) => {
  const data = useData(); 
  const { t, language } = useLanguage();

  const resolveName = (username?: string | null) => {
      if (!username) return '-';
      const u = data.users.find(x => x.username === username);
      return (u?.nickname || username).toUpperCase();
  };

  // OPTIMALIZOVANÝ CHECK: Už nie data.permissions.some, ale role.permissions.includes
  const hasPermission = (permName: string) => {
      if (props.currentUserRole === 'ADMIN') return true;
      const roleObj = data.roles.find(r => r.name === props.currentUserRole);
      if (!roleObj) return false;
      return roleObj.permissions ? roleObj.permissions.includes(permName) : false;
  };
  
  const navTiles = useMemo(() => {
    const all = [
      { id: 'summary', label: language === 'sk' ? 'SÚHRN' : 'SUMMARY', icon: <Icons.Summary />, perm: 'perm_view_setup' },
      { id: 'users', label: t('sect_users_manage'), icon: <Icons.Users />, perm: 'perm_settings_users' },
      { id: 'parts', label: t('sect_parts'), icon: <Icons.Parts />, perm: 'perm_settings_parts' },
      { id: 'wp', label: t('sect_wp'), icon: <Icons.Workplaces />, perm: 'perm_settings_wp' },
      { id: 'bom', label: t('sect_bom'), icon: <Icons.BOM />, perm: 'perm_settings_bom' },
      { id: 'system', label: 'SYSTÉM', icon: <Icons.System />, perm: 'perm_settings_system' },
      { id: 'maint', label: 'ÚDRŽBA', icon: <Icons.Archive />, perm: 'perm_settings_maint' },
      { id: 'yearly', label: language === 'sk' ? 'UZÁVIERKA' : 'CLOSING', icon: <Icons.Yearly />, perm: 'perm_manage_roles' },
    ];
    if (props.currentUserRole === 'ADMIN') {
        all.push({ id: 'notes', label: 'POZNÁMKY', icon: <Icons.Notes />, perm: 'perm_view_setup' });
    }
    return all.filter(tile => hasPermission(tile.perm));
  }, [language, t, props.currentUserRole, data.roles]); // data.permissions odstránené zo závislostí

  const [activeSubTab, setActiveSubTab] = useState<string | null>(navTiles[0]?.id || null);

  if (navTiles.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 italic bg-slate-900/40 border border-slate-800 rounded-3xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              {t('action_not_allowed')}
          </div>
      );
  }

  const partsList = data.partsMap 
    ? Object.entries(data.partsMap).map(([p, d]) => ({ id: p, value: p, description: d }))
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in px-4 md:px-0">
      <PartRequestsSection 
        partRequests={data.partRequests} 
        bomRequests={data.bomRequests}
        onApprovePartRequest={async (req) => { await data.onAddPart(req.partNumber); await data.onDeletePartRequest(req.id); }}
        onRejectPartRequest={(id) => data.onDeletePartRequest(id)}
        onApproveBOMRequest={async (req) => { await data.onDeleteBOMRequest(req.id); }}
        onRejectBOMRequest={(id) => data.onDeleteBOMRequest(id)}
        resolveName={resolveName}
      />

      <div className={`grid gap-3 mb-8 ${navTiles.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-8'}`}>
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
              } ${tile.id === 'notes' && isActive ? '!border-amber-500 !bg-amber-500/10 !shadow-[0_0_20px_rgba(245,158,11,0.3)]' : ''}`}
            >
              <div className={`mb-3 transition-transform group-hover:scale-110 ${isActive ? (tile.id === 'notes' ? 'text-amber-500' : 'text-teal-400') : 'text-slate-600'}`}>
                {tile.icon}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight ${isActive ? (tile.id === 'notes' ? 'text-amber-500' : 'text-teal-400') : 'text-slate-500'}`}>
                {tile.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in">
        {activeSubTab === 'summary' && (
          <SetupView 
            users={data.users}
            parts={partsList}
            workplaces={data.workplaces}
            missingReasons={data.missingReasons}
            logisticsOperations={data.logisticsOperations}
            breakSchedules={data.breakSchedules}
            bomMap={data.bomMap}
            systemConfig={props.systemConfig}
          />
        )}
        {activeSubTab === 'users' && (
          <UserSection 
            users={data.users} 
            roles={data.roles} 
            onAddUser={data.onAddUser} 
            onUpdatePassword={data.onUpdatePassword} 
            onUpdateNickname={data.onUpdateNickname}
            onUpdateUserRole={data.onUpdateUserRole}
            onUpdateExportPermission={data.onUpdateExportPermission}
            onDeleteUser={data.onDeleteUser} 
          />
        )}
        {activeSubTab === 'parts' && (
          <PartsSection 
            parts={partsList} 
            onAddPart={data.onAddPart} 
            onBatchAddParts={data.onBatchAddParts} 
            onDeletePart={data.onDeletePart} 
            onDeleteAllParts={data.onDeleteAllParts} 
          />
        )}
        {activeSubTab === 'wp' && (
          <WorkplaceSection 
            workplaces={data.workplaces} 
            logisticsOperations={data.logisticsOperations}
            onAddWorkplace={data.onAddWorkplace}
            onUpdateWorkplace={data.onUpdateWorkplace}
            onBatchAddWorkplaces={data.onBatchAddWorkplaces}
            onDeleteWorkplace={data.onDeleteWorkplace}
            onDeleteAllWorkplaces={data.onDeleteAllWorkplaces}
            onAddLogisticsOperation={data.onAddLogisticsOperation}
            onUpdateLogisticsOperation={data.onUpdateLogisticsOperation}
            onDeleteLogisticsOperation={data.onDeleteLogisticsOperation}
            onDeleteAllLogisticsOperations={data.onDeleteAllLogisticsOperations}
            mapSectors={data.mapSectors}
            onAddMapSector={data.onAddMapSector}
            onDeleteMapSector={data.onDeleteMapSector}
            onUpdateMapSector={data.onUpdateMapSector}
            mapObstacles={data.mapObstacles}
            onAddMapObstacle={data.onAddMapObstacle}
            onDeleteMapObstacle={data.onDeleteMapObstacle}
            systemConfig={props.systemConfig}
            onUpdateSystemConfig={props.onUpdateSystemConfig}
          />
        )}
        {activeSubTab === 'bom' && (
          <BOMSection 
            bomMap={data.bomMap} 
            onAddBOMItem={data.onAddBOMItem} 
            onBatchAddBOMItems={data.onBatchAddBOMItems} 
            onDeleteBOMItem={data.onDeleteBOMItem} 
            onDeleteAllBOMItems={data.onDeleteAllBOMItems} 
          />
        )}
        {activeSubTab === 'system' && (
          <SystemSection 
            missingReasons={data.missingReasons} 
            breakSchedules={data.breakSchedules} 
            onAddMissingReason={data.onAddMissingReason} 
            onDeleteMissingReason={data.onDeleteMissingReason} 
            onAddBreakSchedule={data.onAddBreakSchedule}
            onDeleteBreakSchedule={data.onDeleteBreakSchedule} 
            onUpdateAdminKey={props.onUpdateAdminKey}
            isAdminLockEnabled={props.systemConfig.adminLockEnabled || false}
            onToggleAdminLock={props.onToggleAdminLock}
            systemConfig={props.systemConfig}
            onUpdateSystemConfig={props.onUpdateSystemConfig}
          />
        )}
        {activeSubTab === 'maint' && (
          <MaintenanceSection 
            systemConfig={props.systemConfig} 
            onUpdateSystemConfig={props.onUpdateSystemConfig} 
            onArchiveTasks={async () => ({ success: true })} 
            onDailyClosing={data.onDailyClosing}
            onWeeklyClosing={data.onWeeklyClosing}
            onGetDocCount={async () => 0} 
            onPurgeOldTasks={async () => 0} 
            onExportTasksJSON={async () => {}} 
          />
        )}
        {activeSubTab === 'yearly' && (
          <YearlyClosing 
            resolveName={resolveName} 
            fetchSanons={data.fetchSanons} 
            mapSectors={data.mapSectors} 
          />
        )}
        {activeSubTab === 'notes' && props.currentUserRole === 'ADMIN' && (
          <AdminNotesSection 
            notes={data.adminNotes}
            onAddNote={data.onAddAdminNote}
            onDeleteNote={data.onDeleteAdminNote}
            onClearNotes={data.onClearAdminNotes}
            currentUser={props.currentUser}
            resolveName={resolveName}
          />
        )}
      </div>
    </div>
  );
};

export default SettingsTab;
