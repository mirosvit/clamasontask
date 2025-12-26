
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import TaskList from './tabs/TaskList';
import SettingsTab from './settings/SettingsTab';
import AnalyticsTab from './tabs/Analytics/AnalyticsTab';
import MissingItemsTab from './tabs/MissingItemsTab';
import LogisticsCenterTab from './tabs/LogisticsCenterTab';
import InventoryTab from './tabs/InventoryTab';
import PermissionsTab from './tabs/PermissionsTab';
import BOMScreen from './tabs/BOMScreen';
import ProductionEntry from './tabs/ProductionEntry';
import PartCatalogTab from './tabs/PartCatalogTab';
import AppHeader from './AppHeader';
import TabNavigator from './TabNavigator';
import { UserData, DBItem, PartRequest, BreakSchedule, SystemBreak, BOMComponent, BOMRequest, Role, Permission, Task, Notification as AppNotification, PriorityLevel, SystemConfig, MapSector } from '../App';
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface PartSearchScreenProps {
  currentUser: string;
  currentUserRole: 'ADMIN' | 'USER' | 'LEADER';
  onLogout: () => void;
  tasks: Task[];
  onAddTask: (partNumber: string, workplace: string | null, quantity: string | null, quantityUnit: string | null, priority: PriorityLevel, isLogistics?: boolean, note?: string) => void; 
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onToggleTask: (id: string) => void;
  onMarkAsIncorrect: (id: string) => void;
  onEditTask: (id: string, newText: string, newPriority?: PriorityLevel) => void;
  onDeleteTask: (id: string) => void;
  onToggleMissing: (id: string, reason?: string) => void; 
  onSetInProgress: (id: string) => void;
  onToggleBlock: (id: string) => void; 
  onToggleManualBlock: (id: string) => void;
  onExhaustSearch: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  onDeleteMissingItem: (id: string) => void;
  onDeleteMissingReason: (id: string) => void;
  onReleaseTask: (id: string) => void;
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
  onDailyClosing: () => Promise<{ success: boolean; count: number }>;
  onWeeklyClosing: () => Promise<{ success: boolean; count: number; sanon?: string }>;
  onFetchArchivedTasks: () => Promise<Task[]>;
  onStartAudit: (id: string) => void;
  onFinishAudit: (id: string, result: 'found' | 'missing', note: string) => void;
  onVerifyAdminPassword: (password: string) => boolean;
  onGetDocCount: () => Promise<number>;
  onPurgeOldTasks: () => Promise<number>;
  onExportTasksJSON: () => Promise<void>;
  users: UserData[];
  onAddUser: (user: UserData) => void;
  onUpdatePassword: (username: string, newPass: string) => void;
  onUpdateNickname: (username: string, newNick: string) => void;
  onUpdateExportPermission: (username: string, canExport: boolean) => void;
  onUpdateUserRole: (username: string, newRole: any) => void;
  onDeleteUser: (username: string) => void;
  parts: DBItem[];
  workplaces: DBItem[];
  missingReasons: DBItem[];
  onAddPart: (val: string, desc?: string) => void;
  onBatchAddParts: (vals: string[]) => void;
  onDeletePart: (val: string) => void;
  onDeleteAllParts: () => void;
  onAddWorkplace: (val: string, time?: number) => void;
  onUpdateWorkplace: (id: string, updates: Partial<DBItem>) => void;
  onBatchAddWorkplaces: (vals: string[]) => void;
  onDeleteWorkplace: (id: string) => void;
  onDeleteAllAllWorkplaces?: () => void; 
  onDeleteAllWorkplaces: () => void;
  onAddMissingReason: (val: string) => void;
  logisticsOperations: DBItem[];
  onAddLogisticsOperation: (val: string, time?: number, dist?: number) => void; 
  onUpdateLogisticsOperation: (id: string, updates: Partial<DBItem>) => void;
  onDeleteLogisticsOperation: (id: string) => void;
  mapSectors: MapSector[];
  onAddMapSector: (name: string, x: number, y: number) => void;
  onDeleteMapSector: (id: string) => void;
  onUpdateMapSector: (id: string, updates: Partial<MapSector>) => void;
  partRequests: PartRequest[];
  onRequestPart: (part: string) => Promise<boolean>;
  onApprovePartRequest: (req: PartRequest) => void;
  onRejectPartRequest: (id: string) => void;
  breakSchedules: BreakSchedule[];
  systemBreaks: SystemBreak[];
  isBreakActive: boolean;
  onAddBreakSchedule: (start: string, end: string) => void;
  onDeleteBreakSchedule: (id: string) => void;
  bomMap: Record<string, BOMComponent[]>;
  bomRequests: BOMRequest[];
  onAddBOMItem: (parent: string, child: string, qty: number) => void;
  onBatchAddBOMItems: (vals: string[]) => void;
  onDeleteBOMItem: (parent: string, child: string) => void;
  onDeleteAllBOMItems: () => void;
  onRequestBOM: (parent: string) => Promise<boolean>;
  onApproveBOMRequest: (req: BOMRequest) => void;
  onRejectBOMRequest: (id: string) => void;
  roles: Role[];
  permissions: Permission[];
  onAddRole: (name: string) => void;
  onDeleteRole: (id: string) => void;
  onUpdatePermission: (permissionId: string, roleName: string, hasPermission: boolean) => void;
  notifications: AppNotification[];
  onClearNotification: (id: string) => void;
  installPrompt: any;
  onInstallApp: () => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  dbLoadWarning: boolean;
  onUpdateAdminKey: (oldK: string, newK: string) => Promise<void>;
  onToggleAdminLock: (val: boolean) => void;
}

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PartSearchScreen: React.FC<PartSearchScreenProps> = (props) => {
  const { 
    currentUser, currentUserRole, onLogout, tasks, onAddTask, onUpdateTask, roles, permissions,
    notifications, onClearNotification, installPrompt, onInstallApp, parts, workplaces,
    onToggleTask, onEditTask, onDeleteTask, onToggleMissing, onSetInProgress, onToggleBlock, onToggleManualBlock, onExhaustSearch, onMarkAsIncorrect, onAddNote, onReleaseTask, missingReasons,
    users,
    onApprovePartRequest, onRejectPartRequest,
    onArchiveTasks, onDailyClosing, onWeeklyClosing,
    breakSchedules,
    bomMap, bomRequests, onApproveBOMRequest, onRejectBOMRequest,
    onAddRole, onDeleteRole, onUpdatePermission, onVerifyAdminPassword,
    systemConfig, onUpdateSystemConfig,
    dbLoadWarning, onGetDocCount, onPurgeOldTasks, onExportTasksJSON
  } = props;
  
  const { t, language, setLanguage } = useLanguage();
  
  const [entryMode, setEntryMode] = useState<'production' | 'logistics'>('production');
  const [selectedPart, setSelectedPart] = useState<DBItem | null>(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState<string | null>(null);
  const [logisticsRef, setLogisticsRef] = useState('');
  const [logisticsOp, setLogisticsOp] = useState('');
  const [logisticsPlate, setLogisticsPlate] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [quantityUnit, setQuantityUnit] = useState<'pcs' | 'boxes' | 'pallet'>('pcs');
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'entry' | 'tasks' | 'settings' | 'analytics' | 'bom' | 'missing' | 'logistics' | 'permissions' | 'inventory' | 'catalog'>('entry');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [auditStartTask, setAuditStartTask] = useState<Task | null>(null);
  const [auditFinishTask, setAuditFinishTask] = useState<Task | null>(null);
  const [auditNote, setAuditNote] = useState('');
  
  const [searchConfirmTask, setSearchConfirmTask] = useState<Task | null>(null);

  const unitLock = useMemo(() => {
    if (entryMode === 'logistics' || !selectedPart?.description) return null;
    const desc = selectedPart.description;
    if (desc.includes('S0001S')) return 'pcs';
    if (desc.includes('S0002S')) return 'boxes';
    if (desc.includes('S0003S')) return 'pallet';
    return null;
  }, [selectedPart, entryMode]);

  useEffect(() => {
    if (unitLock) {
      setQuantityUnit(unitLock);
    }
  }, [unitLock]);

  const currentRoleId = roles.find(r => r.name === currentUserRole)?.id;
  const hasPermission = useCallback((permName: string) => {
      if (currentUserRole === 'ADMIN' && (permName === 'perm_tab_permissions' || permName === 'perm_manage_roles' || permName === 'perm_tab_settings')) {
          return true;
      }
      if (!currentRoleId) return false;
      return permissions.some(p => p.roleId === currentRoleId && p.permissionName === permName);
  }, [currentUserRole, currentRoleId, permissions]);

  const resolveName = useCallback((username?: string | null) => {
      if (!username) return '-';
      const u = users.find(x => x.username === username);
      return (u?.nickname || username).toUpperCase();
  }, [users]);
  
  const unfinishedTasksCount = tasks.filter(t => !t.isDone).length;
  const pendingRequestsCount = props.partRequests.length + props.bomRequests.length;
  
  const partNumbersList = useMemo(() => parts.map(p => p.value), [parts]);

  const [hasInitialData, setHasInitialData] = useState(false);
  const [syncTimeout, setSyncTimeout] = useState(false);

  useEffect(() => {
    if (parts.length > 0) {
        setHasInitialData(true);
    }
  }, [parts.length]);

  useEffect(() => {
      const timer = setTimeout(() => {
          if (!hasInitialData) setSyncTimeout(true);
      }, 5000);
      return () => clearTimeout(timer);
  }, [hasInitialData]);

  const isDataLoading = !hasInitialData && !syncTimeout;

  const logisticsOperationsList = useMemo(() => {
      if (props.logisticsOperations && props.logisticsOperations.length > 0) {
          return props.logisticsOperations;
      }
      return [
          { id: 'op_unloading', value: t('op_unloading') },
          { id: 'op_loading', value: t('op_loading') },
          { id: 'op_putaway', value: t('op_putaway') },
          { id: 'op_move', value: t('op_move') }
      ];
  }, [props.logisticsOperations, t]);

  useEffect(() => {
      if (entryMode === 'logistics') {
          setQuantityUnit('pallet');
      } else {
          setQuantityUnit('pcs');
      }
  }, [entryMode]);
  
  const handleSendToTasks = () => {
    if (entryMode === 'production') {
        if (!selectedPart || !selectedWorkplace || !quantity) {
            alert(t('fill_all_fields')); 
            return;
        }
        onAddTask(selectedPart.value, selectedWorkplace, quantity, quantityUnit, priority, false);
    } else {
        if (!logisticsRef || !logisticsOp || !quantity) {
            alert(t('fill_all_fields'));
            return;
        }
        onAddTask(logisticsRef, logisticsOp, quantity, quantityUnit, priority, true, logisticsPlate);
    }

    setSelectedPart(null);
    setSelectedWorkplace(null);
    setLogisticsRef('');
    setLogisticsOp('');
    setLogisticsPlate('');
    setQuantity('');
    if (entryMode === 'logistics') { setQuantityUnit('pallet'); } else { setQuantityUnit('pcs'); }
    setPriority('NORMAL'); 
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 2000);
  };
  
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleAuditClick = (task: Task) => {
      if (task.isAuditInProgress) { setAuditFinishTask(task); setAuditNote(''); } else { setAuditStartTask(task); }
  };

  const handleConfirmStartAudit = () => { if (auditStartTask) { props.onStartAudit(auditStartTask.id); setAuditStartTask(null); } };
  const handleConfirmFinishAudit = (result: 'found' | 'missing', note: string) => { if (auditFinishTask && note.trim()) { props.onFinishAudit(auditFinishTask.id, result, note.trim()); setAuditFinishTask(null); } else { alert(t('fill_all_fields')); } };

  const handleSearchIconClick = (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const u = users.find(x => x.username === currentUser);
      const nickname = u?.nickname || currentUser;
      if (task.isBlocked) {
          onUpdateTask(id, { searchedBy: nickname });
          setSearchConfirmTask(task);
      } else {
          onToggleBlock(id);
      }
  };

  const handleConfirmFoundItem = (found: boolean) => {
      if (!searchConfirmTask) return;
      if (found) {
          onToggleMissing(searchConfirmTask.id);
      } else {
          onExhaustSearch(searchConfirmTask.id);
      }
      setSearchConfirmTask(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {notifications.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-gray-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-gray-700 animate-fade-in">
                  <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                      <h3 className="text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('alert_missing_title')}</h3>
                      <span className="bg-teal-500/20 text-teal-400 px-3 py-1 rounded-full text-xs font-bold">{notifications.length}</span>
                  </div>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                      {notifications.map(notif => {
                          const isAudit = notif.reason.toUpperCase().includes('AUDIT');
                          const itemBgClass = isAudit ? "bg-amber-900/20 border-amber-800/40" : "bg-red-900/20 border-red-800/40";
                          const iconColorClass = isAudit ? "text-amber-400" : "text-red-400";
                          return (
                              <div key={notif.id} className={`${itemBgClass} border p-5 rounded-xl flex items-center justify-between gap-6 transition-all hover:bg-opacity-30`}>
                                  <div className="flex-grow min-w-0">
                                      <div className="flex items-center gap-3 mb-1">
                                          <div className={`w-2 h-2 rounded-full ${isAudit ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                                          <p className="font-mono font-black text-2xl text-white uppercase truncate">{notif.partNumber}</p>
                                      </div>
                                      <p className="text-lg text-gray-200 font-medium leading-tight mb-2">{notif.reason}</p>
                                      <div className="flex items-center gap-4 text-sm text-gray-500 font-bold uppercase tracking-wide">
                                          <span className={iconColorClass + " truncate max-w-[120px]"}>{resolveName(notif.reportedBy)}</span>
                                          <span className="opacity-50">•</span>
                                          <span>{new Date(notif.timestamp).toLocaleString('sk-SK', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</span>
                                      </div>
                                  </div>
                                  <button onClick={() => props.onClearNotification(notif.id)} className="flex-shrink-0 bg-gray-900/50 text-gray-400 hover:text-white p-3 rounded-xl hover:bg-gray-700 transition-all active:scale-90">
                                      <CheckCircleIcon className="w-8 h-8" />
                                  </button>
                              </div>
                          );
                      })}
                  </div>
                  <div className="mt-8 flex gap-4">
                      <button onClick={() => notifications.forEach(n => props.onClearNotification(n.id))} className="flex-1 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black text-lg shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest">{t('alert_btn_ok')}</button>
                  </div>
              </div>
          </div>
      )}

      {props.isBreakActive && (
        <div className="w-full px-2 sm:px-4 pt-2 z-50 bg-gray-900">
            <div className="w-full bg-red-600 text-white py-5 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.6)] flex items-center justify-center gap-4 animate-pulse border-2 border-red-400">
                <ClockIcon className="w-10 h-10 flex-shrink-0" />
                <span className="font-black text-2xl sm:text-3xl uppercase tracking-[0.2em] length-none text-center">PREBIEHA PRESTÁVKA</span>
            </div>
        </div>
      )}

      {showSuccessMessage && (
        <div className="fixed top-24 right-6 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-bounce font-black tracking-widest">✓ {t('sent_msg')}</div>
      )}

      <AppHeader currentUser={currentUser} currentUserRole={currentUserRole} users={users} onLogout={onLogout} language={language} setLanguage={setLanguage} t={t} isFullscreen={isFullscreen} onToggleFullscreen={handleToggleFullscreen} installPrompt={installPrompt} onInstallApp={onInstallApp} hasPermission={hasPermission} resolveName={resolveName} />
      
      {isDataLoading && activeTab === 'entry' ? (
          <div className="flex-grow flex items-center justify-center bg-gray-900">
              <div className="text-center space-y-6">
                  <div className="inline-block w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-teal-400 font-black animate-pulse uppercase tracking-[0.2em] text-base">Synchronizujem databázu dielov...</p>
                  <p className="text-gray-600 text-sm">Pokúšam sa nadviazať spojenie so serverom.</p>
              </div>
          </div>
      ) : (
          <>
            <TabNavigator activeTab={activeTab} setActiveTab={setActiveTab} hasPermission={hasPermission} t={t} counts={{ tasks: unfinishedTasksCount, pendingRequests: pendingRequestsCount }} />

            <div className="flex-grow overflow-y-auto p-3 md:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto w-full h-full">
                {activeTab === 'entry' && hasPermission('perm_tab_entry') && (
                    <ProductionEntry 
                        mode={entryMode} 
                        setMode={setEntryMode} 
                        selectedPart={selectedPart} 
                        setSelectedPart={setSelectedPart} 
                        selectedWorkplace={selectedWorkplace} 
                        setSelectedWorkplace={setSelectedWorkplace} 
                        logisticsRef={logisticsRef} 
                        setLogisticsRef={setLogisticsRef} 
                        logisticsPlate={logisticsPlate} 
                        setLogisticsPlate={setLogisticsPlate} 
                        logisticsOp={logisticsOp} 
                        setLogisticsOp={setLogisticsOp} 
                        quantity={quantity} 
                        setQuantity={setQuantity} 
                        quantityUnit={quantityUnit} 
                        setQuantityUnit={setQuantityUnit} 
                        priority={priority} 
                        setPriority={setPriority} 
                        parts={parts} 
                        workplaces={workplaces} 
                        logisticsOperationsList={logisticsOperationsList} 
                        t={t} 
                        language={language} 
                        hasPermission={hasPermission} 
                        handleAdd={handleSendToTasks} 
                        onRequestPart={props.onRequestPart}
                        isUnitLocked={!!unitLock} 
                    />
                )}
                {activeTab === 'catalog' && hasPermission('perm_tab_catalog') && (
                    <PartCatalogTab 
                        parts={props.parts} 
                        onSelectPart={(p) => {
                          setSelectedPart(p);
                          setActiveTab('entry');
                        }} 
                    />
                )}
                {activeTab === 'tasks' && hasPermission('perm_tab_tasks') && (
                    <div className="animate-fade-in pb-20">
                    <div className="mb-6 flex justify-center">
                        <input type="text" value={taskSearchQuery} onChange={e => setTaskSearchQuery(e.target.value)} className="w-full max-w-lg h-12 px-6 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono uppercase text-base" placeholder={t('task_search_placeholder')} />
                    </div>
                    <TaskList 
                        currentUser={currentUserRole} 
                        currentUserName={currentUser} 
                        tasks={tasks.filter(t => { const q = taskSearchQuery.toLowerCase(); return (t.partNumber && t.partNumber.toLowerCase().includes(q)) || (t.text && t.text.toLowerCase().includes(q)) || (t.workplace && t.workplace.toLowerCase().includes(q)); })} 
                        onToggleTask={onToggleTask} 
                        onEditTask={onEditTask} 
                        onDeleteTask={onDeleteTask} 
                        onToggleMissing={onToggleMissing} 
                        onSetInProgress={onSetInProgress} 
                        onToggleBlock={handleSearchIconClick} 
                        onToggleManualBlock={onToggleManualBlock} 
                        onExhaustSearch={onExhaustSearch} 
                        onMarkAsIncorrect={onMarkAsIncorrect} 
                        onAddNote={onAddNote} 
                        onReleaseTask={onReleaseTask} 
                        onAuditPart={handleAuditClick} 
                        resolveName={resolveName} 
                        missingReasons={missingReasons} 
                        hasPermission={hasPermission} 
                    />
                    </div>
                )}
                {activeTab === 'analytics' && hasPermission('perm_tab_analytics') && <AnalyticsTab tasks={tasks} onFetchArchivedTasks={props.onFetchArchivedTasks} systemBreaks={props.systemBreaks} resolveName={resolveName} mapSectors={props.mapSectors} workplaces={props.workplaces} systemConfig={systemConfig} logisticsOperations={logisticsOperationsList} />}
                {activeTab === 'settings' && hasPermission('perm_tab_settings') && <SettingsTab hasPermission={hasPermission} currentUserRole={currentUserRole} users={users} onAddUser={props.onAddUser} onUpdatePassword={props.onUpdatePassword} onUpdateNickname={props.onUpdateNickname} onUpdateExportPermission={props.onUpdateExportPermission} onUpdateUserRole={props.onUpdateUserRole} onDeleteUser={props.onDeleteUser} parts={parts} workplaces={workplaces} missingReasons={missingReasons} onAddPart={props.onAddPart} onBatchAddParts={props.onBatchAddParts} onDeletePart={props.onDeletePart} onDeleteAllParts={props.onDeleteAllParts} onAddWorkplace={props.onAddWorkplace} onUpdateWorkplace={props.onUpdateWorkplace} onBatchAddWorkplaces={props.onBatchAddWorkplaces} onDeleteWorkplace={props.onDeleteWorkplace} onDeleteAllWorkplaces={props.onDeleteAllWorkplaces} onAddMissingReason={props.onAddMissingReason} onDeleteMissingReason={props.onDeleteMissingReason} logisticsOperations={logisticsOperationsList} onAddLogisticsOperation={props.onAddLogisticsOperation} onUpdateLogisticsOperation={props.onUpdateLogisticsOperation} onDeleteLogisticsOperation={props.onDeleteLogisticsOperation} mapSectors={props.mapSectors} onAddMapSector={props.onAddMapSector} onDeleteMapSector={props.onDeleteMapSector} onUpdateMapSector={props.onUpdateMapSector} partRequests={props.partRequests} onApprovePartRequest={onApprovePartRequest} onRejectPartRequest={id => props.onRejectPartRequest(id)} onArchiveTasks={onArchiveTasks} onDailyClosing={props.onDailyClosing} onWeeklyClosing={props.onWeeklyClosing} breakSchedules={breakSchedules} onAddBreakSchedule={props.onAddBreakSchedule} onDeleteBreakSchedule={props.onDeleteBreakSchedule} bomMap={bomMap} bomRequests={bomRequests} onAddBOMItem={props.onAddBOMItem} onBatchAddBOMItems={props.onBatchAddBOMItems} onDeleteBOMItem={props.onDeleteBOMItem} onDeleteAllBOMItems={props.onDeleteAllBOMItems} onApproveBOMRequest={onApproveBOMRequest} onRejectBOMRequest={id => props.onRejectBOMRequest(id)} roles={roles} permissions={permissions} onAddRole={onAddRole} onDeleteRole={onDeleteRole} onUpdatePermission={onUpdatePermission} installPrompt={installPrompt} onInstallApp={onInstallApp} systemConfig={systemConfig} onUpdateSystemConfig={onUpdateSystemConfig} dbLoadWarning={dbLoadWarning} resolveName={resolveName} onGetDocCount={onGetDocCount} onPurgeOldTasks={onPurgeOldTasks} onExportTasksJSON={onExportTasksJSON} onUpdateAdminKey={props.onUpdateAdminKey} onToggleAdminLock={props.onToggleAdminLock} />}
                {activeTab === 'bom' && hasPermission('perm_tab_bom') && <BOMScreen parts={parts} workplaces={workplaces} bomMap={bomMap} onAddTask={onAddTask} onRequestBOM={props.onRequestBOM} t={t} language={language} />}
                {activeTab === 'missing' && hasPermission('perm_tab_missing') && <MissingItemsTab tasks={tasks} onDeleteMissingItem={props.onDeleteMissingItem} hasPermission={hasPermission} resolveName={resolveName} />}
                {activeTab === 'inventory' && hasPermission('perm_tab_inventory') && <InventoryTab currentUser={currentUser} tasks={tasks} onAddTask={onAddTask} onUpdateTask={onUpdateTask} onToggleTask={onToggleTask} onDeleteTask={props.onDeleteTask} hasPermission={hasPermission} parts={partNumbersList} onRequestPart={props.onRequestPart} resolveName={resolveName} />}
                {activeTab === 'logistics' && hasPermission('perm_tab_logistics_center') && <LogisticsCenterTab tasks={tasks} onDeleteTask={props.onDeleteTask} hasPermission={hasPermission} resolveName={resolveName} />}
                {activeTab === 'permissions' && hasPermission('perm_tab_permissions') && <PermissionsTab roles={roles} permissions={permissions} onAddRole={onAddRole} onDeleteRole={id => props.onDeleteRole(id)} onUpdatePermission={onUpdatePermission} onVerifyAdminPassword={onVerifyAdminPassword} />}
                </div>
            </div>
          </>
      )}

      {auditStartTask && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setAuditStartTask(null)}>
              <div className="bg-gray-800 border-2 border-[#926a05] rounded-xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-black text-white mb-6 text-center uppercase tracking-widest">{t('audit_start_title')}</h3>
                  <p className="text-gray-300 text-center mb-10 text-base leading-relaxed">{t('audit_start_desc', { part: (auditStartTask?.partNumber || '') as string })}</p>
                  <div className="flex gap-4">
                      <button onClick={() => setAuditStartTask(null)} className="flex-1 py-5 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 font-black transition-all uppercase text-xs tracking-widest">{t('btn_cancel')}</button>
                      <button onClick={handleConfirmStartAudit} className="flex-1 py-5 bg-[#926a05] hover:bg-[#a67c06] text-white rounded-xl font-black transition-all shadow-xl uppercase text-xs tracking-widest border-2 border-[#b68406]">Potvrdiť začiatok</button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {auditFinishTask && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setAuditFinishTask(null)}>
              <div className="bg-gray-800 border-2 border-[#926a05] rounded-xl shadow-2xl w-full max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-black text-white mb-8 text-center uppercase tracking-widest">{t('audit_finish_title')}</h3>
                  <div className="mb-8">
                      <label className="block text-gray-400 text-xs font-black uppercase mb-3 tracking-[0.2em]">{t('audit_finish_note')}</label>
                      <textarea value={auditNote} onChange={(e) => setAuditNote(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-xl text-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#926a05] h-40 text-base font-medium placeholder-gray-500" placeholder="..." autoFocus />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <button onClick={() => handleConfirmFinishAudit('found', auditNote)} disabled={!auditNote.trim()} className={`py-5 rounded-xl font-black transition-all shadow-xl uppercase text-xs tracking-widest flex items-center justify-center gap-2 border-2 ${!auditNote.trim() ? 'bg-gray-700 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-green-600 border-green-500 text-white'}`}>✅ {t('audit_found_btn')}</button>
                      <button onClick={() => handleConfirmFinishAudit('missing', auditNote)} disabled={!auditNote.trim()} className={`py-5 rounded-xl font-black transition-all shadow-xl uppercase text-xs tracking-widest flex items-center justify-center gap-2 border-2 ${!auditNote.trim() ? 'bg-gray-700 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-red-600 border-red-500 text-white'}`}>❌ {t('audit_missing_btn')}</button>
                  </div>
                  <button onClick={() => setAuditFinishTask(null)} className="w-full py-4 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 font-black transition-all uppercase text-[10px] tracking-widest">{t('btn_cancel')}</button>
              </div>
          </div>,
          document.body
      )}

      {searchConfirmTask && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSearchConfirmTask(null)}>
              <div className="bg-gray-800 border-2 border-gray-600 rounded-2xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                  <div className="text-center mb-8">
                      <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">
                          {language === 'sk' ? 'Našiel si tovar?' : 'Found the item?'}
                      </h3>
                      <p className="text-gray-400 text-base leading-relaxed">
                          {language === 'sk' 
                            ? `Potvrď, či sa diel ${searchConfirmTask.partNumber} podarilo nájsť.` 
                            : `Confirm if you found part ${searchConfirmTask.partNumber}.`}
                      </p>
                  </div>
                  <div className="flex gap-4 mb-4">
                      <button 
                        onClick={() => handleConfirmFoundItem(true)} 
                        className="flex-1 py-5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black transition-all shadow-xl uppercase text-xs border-2 border-green-500"
                      >
                          ✅ {language === 'sk' ? 'Áno, našiel' : 'Yes, found'}
                      </button>
                      <button 
                        onClick={() => handleConfirmFoundItem(false)} 
                        className="flex-1 py-5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black transition-all shadow-xl uppercase text-xs border-2 border-red-500"
                      >
                          ❌ {language === 'sk' ? 'Nie, nenašiel' : 'No, not found'}
                      </button>
                  </div>
                  <button onClick={() => setSearchConfirmTask(null)} className="w-full py-3 bg-gray-700 text-gray-400 rounded-xl hover:bg-gray-600 font-bold transition-all uppercase text-[10px] tracking-widest">
                      {t('btn_cancel')}
                  </button>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};

export default PartSearchScreen;
