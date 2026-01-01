
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
import TransactionLogTab from './tabs/TransactionLogTab';
import SectorPickerModal from './modals/SectorPickerModal';
import AppHeader from './AppHeader';
import TabNavigator from './TabNavigator';
import { UserData, DBItem, PartRequest, BreakSchedule, SystemBreak, BOMComponent, BOMRequest, Role, Permission, Task, Notification as AppNotification, PriorityLevel, SystemConfig, MapSector, AdminNote } from '../types/appTypes';
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface PartSearchScreenProps {
  currentUser: string;
  currentUserRole: 'ADMIN' | 'USER' | 'LEADER';
  onLogout: () => void;
  tasks: Task[];
  draftTasks: Task[];
  onAddTask: (partNumber: string, workplace: string | null, quantity: string | null, quantityUnit: string | null, priority: PriorityLevel, isLogistics?: boolean, note?: string, isProduction?: boolean, sourceSectorId?: string, targetSectorId?: string) => void; 
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
  onArchiveTasks: () => Promise<{ success: boolean; count?: number }>;
  onDailyClosing: () => Promise<{ success: boolean; count: number }>;
  onWeeklyClosing: () => Promise<{ success: boolean; count: number; sanon?: string }>;
  onFetchArchivedTasks: () => Promise<Task[]>;
  fetchSanons: () => Promise<any[]>;
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
  onUpdateUserRole: (username: string, newRole: any) => void;
  onDeleteUser: (username: string) => void;
  onUpdateExportPermission: (username: string, canExport: boolean) => void;
  parts: DBItem[];
  workplaces: DBItem[];
  missingReasons: DBItem[];
  onAddPart: (val: string, desc?: string) => void;
  onBatchAddParts: (vals: string[]) => void;
  onDeletePart: (val: string) => void;
  onDeleteAllParts: () => void;
  onAddWorkplace: (val: string, time?: number, x?: number, y?: number) => void;
  onUpdateWorkplace: (id: string, updates: Partial<DBItem>) => void;
  onBatchAddWorkplaces: (vals: string[]) => void;
  onDeleteWorkplace: (id: string) => void;
  onDeleteAllWorkplaces: () => void;
  onAddMissingReason: (val: string) => void;
  logisticsOperations: DBItem[];
  onAddLogisticsOperation: (val: string, time?: number, dist?: number) => void; 
  onUpdateLogisticsOperation: (id: string, updates: Partial<DBItem>) => void;
  onDeleteLogisticsOperation: (id: string) => void;
  mapSectors: MapSector[];
  onAddMapSector: (name: string, x: number, y: number, color?: string) => void;
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
  bomRequests: any[];
  onAddBOMItem: (parent: string, child: string, qty: number) => void;
  onBatchAddBOMItems: (vals: string[]) => void;
  onDeleteBOMItem: (parent: string, child: string) => void;
  onDeleteAllBOMItems: () => void;
  onRequestBOM: (parent: string) => Promise<boolean>;
  onApproveBOMRequest: (req: any) => void;
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
  settings?: any;
  adminNotes: AdminNote[];
  onAddAdminNote: (text: string, author: string) => void;
  onDeleteAdminNote: (id: string) => void;
  onClearAdminNotes: () => void;
}

const PartSearchScreen: React.FC<PartSearchScreenProps> = (props) => {
  const { 
    currentUser, currentUserRole, onLogout, tasks, draftTasks, onAddTask, onUpdateTask, roles, permissions,
    notifications, onClearNotification, installPrompt, onInstallApp, parts, workplaces,
    onToggleTask, onEditTask, onDeleteTask, onToggleMissing, onSetInProgress, onToggleManualBlock, onExhaustSearch, onMarkAsIncorrect, onAddNote, onReleaseTask, missingReasons,
    users, fetchSanons,
    breakSchedules,
    bomMap,
    onAddRole, onDeleteRole, onUpdatePermission, onVerifyAdminPassword,
    systemConfig, onUpdateSystemConfig,
    mapSectors
  } = props;
  
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'entry' | 'tasks' | 'settings' | 'analytics' | 'bom' | 'missing' | 'logistics' | 'permissions' | 'inventory' | 'catalog' | 'logs'>('entry');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [entryMode, setEntryMode] = useState<'production' | 'logistics'>('production');

  const [pickingTask, setPickingTask] = useState<Task | null>(null);

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState<string | null>(null);
  
  const [logisticsRef, setLogisticsRef] = useState('');
  const [logisticsOp, setLogisticsOp] = useState('');
  const [logisticsPlate, setLogisticsPlate] = useState('');
  const [sourceSector, setSourceSector] = useState<string | null>(null);
  const [targetSector, setTargetSector] = useState<string | null>(null);

  const [quantity, setQuantity] = useState<string>('');
  const [quantityUnit, setQuantityUnit] = useState<'pcs' | 'boxes' | 'pallet'>('pcs');
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const unitLock = useMemo(() => {
    if (entryMode === 'logistics' || !selectedPart) return null;
    const partData = parts.find(p => p.value === selectedPart);
    const desc = partData?.description || '';
    if (desc.includes('S0001S')) return 'pcs';
    if (desc.includes('S0002S')) return 'boxes';
    if (desc.includes('S0003S')) return 'pallet';
    return null;
  }, [selectedPart, entryMode, parts]);

  useEffect(() => { if (unitLock) setQuantityUnit(unitLock); }, [unitLock]);

  const currentRoleId = roles.find(r => r.name === currentUserRole)?.id;
  const hasPermission = useCallback((permName: string) => {
      if (currentUserRole === 'ADMIN' && (permName === 'perm_tab_permissions' || permName === 'perm_manage_roles' || permName === 'perm_tab_settings')) return true;
      if (!currentRoleId) return false;
      return permissions.some(p => p.roleId === currentRoleId && p.permissionName === permName);
  }, [currentUserRole, currentRoleId, permissions]);

  const resolveName = useCallback((username?: string | null) => {
      if (!username) return '-';
      const u = users.find(x => x.username === username);
      return (u?.nickname || username).toUpperCase();
  }, [users]);

  const logisticsOperationsList = useMemo(() => props.logisticsOperations || [], [props.logisticsOperations]);

  const handleAdd = () => {
    if (entryMode === 'production') {
        if (!selectedPart || !selectedWorkplace || !quantity) { alert(t('fill_all_fields')); return; }
        onAddTask(selectedPart, selectedWorkplace, quantity, quantityUnit, priority, false, '', true);
    } else {
        if (!logisticsRef || !logisticsOp || !quantity) { alert(t('fill_all_fields')); return; }
        onAddTask(logisticsRef, logisticsOp, quantity, quantityUnit, priority, true, logisticsPlate, false, sourceSector || undefined, targetSector || undefined);
    }
    
    setSelectedPart(null); 
    setSelectedWorkplace(null); 
    setLogisticsRef(''); 
    setLogisticsOp(''); 
    setLogisticsPlate(''); 
    setSourceSector(null);
    setTargetSector(null);
    setQuantity('');
    setPriority('NORMAL'); 
    setShowSuccessMessage(true); 
    setTimeout(() => setShowSuccessMessage(false), 2000);
  };

  const handleCompleteWithSectorCheck = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (!task.isLogistics && !task.isDone && !task.pickedFromSectorId) {
        setPickingTask(task);
        return;
    }
    onToggleTask(id);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <AppHeader currentUser={currentUser} currentUserRole={currentUserRole} users={users} onLogout={onLogout} language={language} setLanguage={setLanguage} t={t} isFullscreen={false} onToggleFullscreen={()=>{}} installPrompt={installPrompt} onInstallApp={onInstallApp} hasPermission={hasPermission} resolveName={resolveName} />
      
      {showSuccessMessage && (
        <div className="fixed top-24 right-6 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-bounce font-black tracking-widest">✓ {t('sent_msg')}</div>
      )}

      <TabNavigator activeTab={activeTab} setActiveTab={setActiveTab} hasPermission={hasPermission} t={t} counts={{ tasks: (tasks || []).filter(t=>!t.isDone).length, pendingRequests: (props.partRequests?.length || 0) + (props.bomRequests?.length || 0) }} currentUserRole={currentUserRole} />

      <div className="flex-grow overflow-y-auto p-3 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
          {activeTab === 'entry' && (
            <ProductionEntry 
                mode={entryMode} setMode={setMode => { setEntryMode(setMode); setQuantityUnit(setMode === 'logistics' ? 'pallet' : 'pcs'); }} 
                selectedPart={selectedPart} setSelectedPart={setSelectedPart} 
                selectedWorkplace={selectedWorkplace} setSelectedWorkplace={setSelectedWorkplace} 
                logisticsRef={logisticsRef} setLogisticsRef={setLogisticsRef} 
                logisticsPlate={logisticsPlate} setLogisticsPlate={setLogisticsPlate} 
                logisticsOp={logisticsOp} setLogisticsOp={setLogisticsOp} 
                sourceSector={sourceSector} setSourceSector={setSourceSector}
                targetSector={targetSector} setTargetSector={setTargetSector}
                quantity={quantity} setQuantity={setQuantity} 
                quantityUnit={quantityUnit} setQuantityUnit={setQuantityUnit} 
                priority={priority} setPriority={setPriority} 
                parts={(parts || []).map(p => p.value)} workplaces={workplaces} 
                logisticsOperationsList={logisticsOperationsList} 
                mapSectors={mapSectors}
                t={t} language={language} hasPermission={hasPermission} 
                handleAdd={handleAdd} onRequestPart={props.onRequestPart} 
                isUnitLocked={!!unitLock} 
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab 
              systemConfig={systemConfig} 
              currentUser={currentUser} 
              currentUserRole={currentUserRole} 
              hasPermission={hasPermission} 
            />
          )}
          {activeTab === 'settings' && 
            <SettingsTab 
                currentUserRole={currentUserRole} 
                currentUser={currentUser}
                installPrompt={null} 
                onInstallApp={()=>{}} 
                systemConfig={systemConfig} 
                onUpdateSystemConfig={onUpdateSystemConfig} 
                onUpdateAdminKey={props.onUpdateAdminKey} 
                onToggleAdminLock={props.onToggleAdminLock}
            />}
          {activeTab === 'tasks' && (
            <div className="animate-fade-in pb-20">
              <div className="mb-6 flex justify-center">
                <input 
                  type="text" 
                  value={taskSearchQuery} 
                  onChange={e => setTaskSearchQuery(e.target.value)} 
                  className="w-full max-w-lg h-12 px-6 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono uppercase" 
                  placeholder={t('task_search_placeholder')} 
                />
              </div>
              <TaskList 
                currentUser={currentUserRole} 
                currentUserName={currentUser} 
                tasks={(tasks || []).filter(t => { 
                  const q = taskSearchQuery.toLowerCase(); 
                  return (t.partNumber && t.partNumber.toLowerCase().includes(q)) || (t.text && t.text.toLowerCase().includes(q)) || (t.workplace && t.workplace.toLowerCase().includes(q)); 
                })} 
                onToggleTask={handleCompleteWithSectorCheck} 
                onEditTask={onEditTask} 
                onDeleteTask={onDeleteTask} 
                onToggleMissing={onToggleMissing} 
                onSetInProgress={onSetInProgress} 
                onToggleBlock={props.onToggleBlock} 
                onToggleManualBlock={props.onToggleManualBlock} 
                onExhaustSearch={onExhaustSearch} 
                onMarkAsIncorrect={onMarkAsIncorrect} 
                onAddNote={onAddNote} 
                onReleaseTask={onReleaseTask} 
                onAuditPart={props.onStartAudit}
                onFinishAudit={props.onFinishAudit} 
                resolveName={resolveName} 
                missingReasons={missingReasons} 
                hasPermission={hasPermission} 
              />
            </div>
          )}
          {activeTab === 'bom' && <BOMScreen parts={parts} workplaces={workplaces} bomMap={bomMap} onAddTask={onAddTask} onRequestBOM={props.onRequestBOM} t={t} language={language} />}
          {activeTab === 'missing' && <MissingItemsTab tasks={tasks} onDeleteMissingItem={props.onDeleteMissingItem} hasPermission={hasPermission} resolveName={resolveName} />}
          {activeTab === 'inventory' && <InventoryTab currentUser={currentUser} tasks={tasks} onAddTask={onAddTask} onUpdateTask={onUpdateTask} onToggleTask={onToggleTask} onDeleteTask={props.onDeleteTask} hasPermission={hasPermission} parts={(parts || []).map(p=>p.value)} onRequestPart={props.onRequestPart} resolveName={resolveName} />}
          {activeTab === 'logistics' && <LogisticsCenterTab tasks={tasks} onDeleteTask={props.onDeleteTask} hasPermission={hasPermission} resolveName={resolveName} />}
          {activeTab === 'permissions' && <PermissionsTab roles={roles} permissions={permissions} onAddRole={onAddRole} onDeleteRole={onDeleteRole} onUpdatePermission={onUpdatePermission} onVerifyAdminPassword={onVerifyAdminPassword} />}
          {activeTab === 'catalog' && <PartCatalogTab parts={parts} onSelectPart={p => { setSelectedPart(p.value); setActiveTab('entry'); }} />}
          {activeTab === 'logs' && currentUserRole === 'ADMIN' && (
              <TransactionLogTab 
                  tasks={tasks}
                  draftTasks={draftTasks}
                  fetchSanons={fetchSanons}
                  users={users}
                  mapSectors={mapSectors}
                  resolveName={resolveName}
              />
          )}
          </div>
      </div>

      {pickingTask && createPortal(
          <SectorPickerModal 
              task={pickingTask}
              mapSectors={props.mapSectors}
              onClose={() => setPickingTask(null)}
              onConfirm={(sectorId) => {
                  onUpdateTask(pickingTask.id, { pickedFromSectorId: sectorId });
                  onToggleTask(pickingTask.id);
                  setPickingTask(null);
              }}
          />,
          document.body
      )}
    </div>
  );
};

export default PartSearchScreen;
