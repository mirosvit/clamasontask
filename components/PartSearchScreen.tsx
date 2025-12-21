
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PartNumberInput from './PartNumberInput';
import TaskList from './TaskList';
import SettingsTab from './SettingsTab';
import AnalyticsTab from './AnalyticsTab';
import MissingItemsTab from './MissingItemsTab';
import LogisticsCenterTab from './LogisticsCenterTab';
import InventoryTab from './InventoryTab';
import PermissionsTab from './PermissionsTab';
import { UserData, DBItem, PartRequest, BreakSchedule, SystemBreak, BOMItem, BOMRequest, Role, Permission, Task, Notification as AppNotification, PriorityLevel, SystemConfig } from '../App';
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface PartSearchScreenProps {
  currentUser: string;
  currentUserRole: 'ADMIN' | 'USER' | 'LEADER';
  onLogout: () => void;
  tasks: Task[];
  onAddTask: (partNumber: string, workplace: string | null, quantity: string | null, quantityUnit: string | null, priority: PriorityLevel, type?: 'production' | 'logistics') => void; 
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onToggleTask: (id: string) => void;
  onMarkAsIncorrect: (id: string) => void;
  onEditTask: (id: string, newText: string, newPriority?: PriorityLevel) => void;
  onDeleteTask: (id: string) => void;
  onToggleMissing: (id: string, reason?: string) => void; 
  onSetInProgress: (id: string) => void;
  onToggleBlock: (id: string) => void; 
  onToggleManualBlock: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  onDeleteMissingItem: (id: string) => void;
  onReleaseTask: (id: string) => void;
  onStartAudit: (id: string) => void;
  onFinishAudit: (id: string, result: 'found' | 'missing', note: string) => void;
  users: UserData[];
  onAddUser: (user: UserData) => void;
  onUpdatePassword: (username: string, newPass: string) => void;
  onUpdateUserRole: (username: string, newRole: any) => void;
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
  logisticsOperations: DBItem[];
  onAddLogisticsOperation: (val: string, time?: number) => void; 
  onDeleteLogisticsOperation: (id: string) => void;
  partRequests: PartRequest[];
  onRequestPart: (part: string) => Promise<boolean>;
  onApprovePartRequest: (req: PartRequest) => void;
  onRejectPartRequest: (id: string) => void;
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
  onFetchArchivedTasks: () => Promise<Task[]>;
  breakSchedules: BreakSchedule[];
  systemBreaks: SystemBreak[];
  isBreakActive: boolean;
  onAddBreakSchedule: (start: string, end: string) => void;
  onDeleteBreakSchedule: (id: string) => void;
  bomItems: BOMItem[];
  bomRequests: BOMRequest[];
  onAddBOMItem: (parent: string, child: string, qty: number) => void;
  onBatchAddBOMItems: (vals: string[]) => void;
  onDeleteBOMItem: (id: string) => void;
  onDeleteAllBOMItems: () => void;
  onRequestBOM: (parent: string) => Promise<boolean>;
  onApproveBOMRequest: (req: BOMRequest) => void;
  onRejectBOMRequest: (id: string) => void;
  roles: Role[];
  permissions: Permission[];
  onAddRole: (name: string) => void;
  onDeleteRole: (id: string) => void;
  onUpdatePermission: (permissionId: string, roleName: string, hasPermission: boolean) => void;
  onVerifyAdminPassword: (password: string) => boolean;
  notifications: AppNotification[];
  onClearNotification: (id: string) => void;
  installPrompt: any;
  onInstallApp: () => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  dbLoadWarning: boolean;
}

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const FullscreenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 10L4 4m0 0v4m0-4h4M14 10l6-6m0 0v4m0-4h-4M14 14l6 6m0 0v-4m0 4h-4M10 14l-6 6m0 0v-4m0 4h4" />
    </svg>
);

const ExitFullscreenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l6 6m0 0v-4m0-4h-4M20 4l-6 6m0 0v-4m0 4h4M20 20l-6-6m0 0v4m0-4h4M4 20l6-6m0 0v-4m0-4h-4" />
    </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);
const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);
const ClipboardCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const PartSearchScreen: React.FC<PartSearchScreenProps> = (props) => {
  const { 
    currentUser, currentUserRole, onLogout, tasks, onAddTask, onUpdateTask, roles, permissions,
    notifications, onClearNotification, installPrompt, onInstallApp, parts, workplaces,
    onToggleTask, onEditTask, onDeleteTask, onToggleMissing, onSetInProgress, onToggleBlock, onToggleManualBlock, onMarkAsIncorrect, onAddNote, onReleaseTask, missingReasons,
    users,
    onApprovePartRequest, onRejectPartRequest,
    onArchiveTasks,
    breakSchedules,
    bomItems, bomRequests, onApproveBOMRequest, onRejectBOMRequest,
    onAddRole, onDeleteRole, onUpdatePermission, onVerifyAdminPassword,
    systemConfig, onUpdateSystemConfig,
    dbLoadWarning
  } = props;
  
  const { t, language, setLanguage } = useLanguage();
  
  const [entryMode, setEntryMode] = useState<'production' | 'logistics'>('production');
  const [selectedPart, setSelectedPart] = useState<DBItem | null>(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState<string | null>(null);
  const [logisticsRef, setLogisticsRef] = useState('');
  const [logisticsOp, setLogisticsOp] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [quantityUnit, setQuantityUnit] = useState<'pcs' | 'boxes' | 'pallet'>('pcs');
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'entry' | 'tasks' | 'settings' | 'analytics' | 'bom' | 'missing' | 'logistics' | 'permissions' | 'inventory'>('entry');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [auditStartTask, setAuditStartTask] = useState<Task | null>(null);
  const [auditFinishTask, setAuditFinishTask] = useState<Task | null>(null);
  const [auditNote, setAuditNote] = useState('');

  const [bomParentQuery, setBomParentQuery] = useState('');
  const [bomQuantity, setBomQuantity] = useState('');
  const [bomSelectedWorkplace, setBomSelectedWorkplace] = useState<string | null>(null);
  const [clickedBOMTasks, setClickedBOMTasks] = useState<Set<string>>(new Set());
  const [bomRequestStatus, setBomRequestStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [displayedBomParent, setDisplayedBomParent] = useState<string | null>(null);
  const [displayedBomQuantity, setDisplayedBomQuantity] = useState<number | null>(null);

  const currentRoleId = roles.find(r => r.name === currentUserRole)?.id;
  const hasPermission = useCallback((permName: string) => {
      if (currentUserRole === 'ADMIN' && (permName === 'perm_tab_permissions' || permName === 'perm_manage_roles' || permName === 'perm_tab_settings')) {
          return true;
      }
      if (!currentRoleId) return false;
      return permissions.some(p => p.roleId === currentRoleId && p.permissionName === permName);
  }, [currentUserRole, currentRoleId, permissions]);
  
  const unfinishedTasksCount = tasks.filter(t => !t.isDone).length;
  const pendingRequestsCount = props.partRequests.length + props.bomRequests.length;
  
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

  const handleLogoutWithCheck = () => {
      const savedScans = localStorage.getItem('inventory_scans');
      if (savedScans) {
          try {
              const scans = JSON.parse(savedScans);
              if (scans.length > 0) {
                  const confirmMsg = language === 'sk' 
                    ? `Pozor! V Inventúre máte ${scans.length} neexportovaných položiek. Po odhlásení zostanú v pamäti tohto tabletu, ale odporúčame ich najskôr exportovať. Naozaj sa chcete odhlásiť?`
                    : `Warning! You have ${scans.length} unexported items in Inventory. They will remain in this tablet's memory, but we recommend exporting them first. Do you really want to log out?`;
                  
                  if (!window.confirm(confirmMsg)) return;
              }
          } catch (e) {}
      }
      onLogout();
  };
  
  const handleSendToTasks = () => {
    if (entryMode === 'production') {
        if (!selectedPart || !selectedWorkplace || !quantity) {
            alert(t('fill_all_fields')); 
            return;
        }
        onAddTask(selectedPart.value, selectedWorkplace, quantity, quantityUnit, priority, 'production');
    } else {
        if (!logisticsRef || !logisticsOp || !quantity) {
            alert(t('fill_all_fields'));
            return;
        }
        onAddTask(logisticsRef, logisticsOp, quantity, quantityUnit, priority, 'logistics');
    }

    setSelectedPart(null);
    setSelectedWorkplace(null);
    setLogisticsRef('');
    setLogisticsOp('');
    setQuantity('');
    if (entryMode === 'logistics') {
         setQuantityUnit('pallet'); 
    } else {
         setQuantityUnit('pcs'); 
    }
    setPriority('NORMAL'); 
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 2000);
  };
  
  const handleCalculateBOM = () => {
    if (!bomParentQuery || !bomQuantity || parseFloat(bomQuantity) <= 0) {
        alert(t('bom_invalid_input')); 
        return;
    }
    setDisplayedBomParent(bomParentQuery);
    setDisplayedBomQuantity(parseFloat(bomQuantity));
    setClickedBOMTasks(new Set());
  };

  const handleCreateBOMTask = (childPart: string, qty: number) => {
    if (!bomSelectedWorkplace) {
        alert(t('select_bom_workplace'));
        return;
    }
    onAddTask(childPart, bomSelectedWorkplace, qty.toString(), 'pcs', 'NORMAL', 'production');
    setClickedBOMTasks(prev => new Set(prev).add(childPart));
  };

  const handleCreateAllBOMTasks = (results: any[]) => {
      if (!bomSelectedWorkplace) {
          alert(t('select_bom_workplace'));
          return;
      }
      results.forEach(res => {
          if (!clickedBOMTasks.has(res.childPart)) {
              handleCreateBOMTask(res.childPart, res.requiredQty);
          }
      });
  };

  const handleRequestNewBOM = async () => {
      if (!bomParentQuery) return;
      setBomRequestStatus('loading');
      const success = await props.onRequestBOM(bomParentQuery);
      if (success) {
          setBomRequestStatus('success');
          setTimeout(() => setBomRequestStatus('idle'), 3000);
      } else {
          setBomRequestStatus('idle');
      }
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
      if (task.isAuditInProgress) {
          setAuditFinishTask(task);
          setAuditNote('');
      } else {
          setAuditStartTask(task);
      }
  };

  const handleConfirmStartAudit = () => {
      if (auditStartTask) {
          props.onStartAudit(auditStartTask.id);
          setAuditStartTask(null);
      }
  };

  const handleConfirmFinishAudit = (result: 'found' | 'missing') => {
      if (auditFinishTask && auditNote.trim()) {
          props.onFinishAudit(auditFinishTask.id, result, auditNote.trim());
          setAuditFinishTask(null);
      } else {
          alert(t('fill_all_fields'));
      }
  };

  const bomResults = useMemo(() => {
    if (!displayedBomParent || !displayedBomQuantity) return [];
    return bomItems
        .filter(item => item.parentPart === displayedBomParent)
        .map(item => ({
            ...item,
            requiredQty: Math.ceil(item.quantity * displayedBomQuantity)
        }));
  }, [displayedBomParent, displayedBomQuantity, bomItems]);

  const inputBaseClass = "w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 placeholder:font-mono focus:outline-none focus:ring-2 transition-all font-mono uppercase text-lg";
  
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {notifications.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-red-600 animate-fade-in">
                  <h3 className="text-xl font-bold text-red-400 mb-4 text-center">{t('alert_missing_title')}</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                      {notifications.map(notif => (
                          <div key={notif.id} className="bg-gray-700 p-3 rounded-lg flex items-center justify-between gap-3">
                              <div>
                                  <p className="font-bold text-white text-lg font-mono">{notif.partNumber}</p>
                                  <p className="text-sm text-gray-300">{notif.reason} - <span className="text-red-400">{notif.reportedBy}</span></p>
                                  <p className="text-xs text-gray-500">{new Date(notif.timestamp).toLocaleString('sk-SK')}</p>
                              </div>
                              <button onClick={() => props.onClearNotification(notif.id)} className="text-red-300 hover:text-red-500 p-2 rounded-full hover:bg-gray-600">
                                  <CheckCircleIcon className="w-6 h-6" />
                              </button>
                          </div>
                      ))}
                  </div>
                  <button onClick={() => notifications.forEach(n => props.onClearNotification(n.id))} className="mt-6 w-full py-3 bg-red-800/50 hover:bg-red-800 text-red-100 rounded-lg font-bold transition-colors">{t('alert_btn_ok')}</button>
              </div>
          </div>
      )}

      {props.isBreakActive && (
        <div className="w-full px-2 sm:px-4 pt-2 z-50 bg-gray-900">
            <div className="w-full bg-red-600 text-white py-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.6)] flex items-center justify-center gap-3 animate-pulse border-2 border-red-400">
                <ClockIcon className="w-8 h-8 flex-shrink-0" />
                <span className="font-extrabold text-xl sm:text-2xl uppercase tracking-widest leading-none text-center">PREBIEHA PRESTÁVKA</span>
            </div>
        </div>
      )}

      {showSuccessMessage && (
        <div className="fixed top-20 right-4 bg-green-600 text-white p-4 rounded-lg shadow-xl z-50 animate-bounce">
          {t('sent_msg')}
        </div>
      )}

      <div className="bg-gray-900 shadow-2xl z-40 p-3 border-b border-gray-800 relative">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between relative">
          <div className="flex items-center z-10">
             <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 shadow-inner">
                <button onClick={() => setLanguage('sk')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${language === 'sk' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>SK</button>
                <button onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${language === 'en' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>EN</button>
             </div>
          </div>
          <div className="flex items-center gap-3 z-10">
            <div className="hidden sm:flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full shadow-sm">
                <UserIcon className="w-4 h-4 text-teal-400" />
                <div className="flex flex-col">
                    <span className="text-xs font-black text-white leading-none truncate max-w-[120px]">{currentUser}</span>
                    <span className={`text-[9px] font-bold uppercase leading-none mt-1 ${currentUserRole === 'ADMIN' ? 'text-red-400' : currentUserRole === 'LEADER' ? 'text-sky-400' : 'text-teal-500 opacity-80'}`}>
                        {currentUserRole}
                    </span>
                </div>
            </div>

            {installPrompt && hasPermission('perm_install_pwa') && (
                <button onClick={onInstallApp} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors shadow-md border border-blue-500/50" title={t('pwa_install_btn')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2z"/><path fillRule="evenodd" d="M3.5 9.25a.75.75 0 00-1.5 0v7a2 2 0 002 2h11a2 2 0 002-2v-7a.75.75 0 00-1.5 0v7a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-7z" clipRule="evenodd"/></svg>
                </button>
            )}
            {hasPermission('perm_view_fullscreen') && (
                <button onClick={handleToggleFullscreen} className="bg-gray-700 hover:bg-gray-600 text-teal-400 hover:text-white p-2 rounded-lg transition-all shadow-md border border-gray-600" title={isFullscreen ? t('fullscreen_off') : t('fullscreen_on')}>
                    {isFullscreen ? <ExitFullscreenIcon className="h-5 w-5" /> : <FullscreenIcon className="h-5 w-5" />}
                </button>
            )}
            <button onClick={handleLogoutWithCheck} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-all shadow-md border border-red-500/50" title={t('logout')}>
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border-t border-gray-700 shadow-sm z-10">
        <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 overflow-x-auto custom-scrollbar">
          <div className="flex space-x-4 sm:space-x-6">
            {hasPermission('perm_tab_entry') && <button onClick={() => setActiveTab('entry')} className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'entry' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('tab_entry')}</button>}
            {hasPermission('perm_tab_tasks') && <button onClick={() => setActiveTab('tasks')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'tasks' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} ${unfinishedTasksCount > 0 ? 'text-orange-400' : ''}`}>{t('tab_tasks')} {unfinishedTasksCount > 0 && <span className="ml-1 sm:ml-2 bg-orange-600 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5">{unfinishedTasksCount}</span>}</button>}
            {hasPermission('perm_tab_bom') && <button onClick={() => setActiveTab('bom')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'bom' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('tab_bom')}</button>}
            {hasPermission('perm_tab_missing') && <button onClick={() => setActiveTab('missing')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'missing' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('tab_missing')}</button>}
            {hasPermission('perm_tab_inventory') && <button onClick={() => setActiveTab('inventory')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'inventory' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('tab_inventory')}</button>}
            {hasPermission('perm_tab_logistics_center') && <button onClick={() => setActiveTab('logistics')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'logistics' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('tab_logistics_center')}</button>}
            {hasPermission('perm_tab_analytics') && <button onClick={() => setActiveTab('analytics')} className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'analytics' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('tab_analytics')}</button>}
            {hasPermission('perm_tab_settings') && <button onClick={() => setActiveTab('settings')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'settings' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} ${pendingRequestsCount > 0 ? 'text-red-400' : ''}`}>{t('tab_settings')} {pendingRequestsCount > 0 && <span className="ml-1 sm:ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5">{pendingRequestsCount}</span>}</button>}
            {hasPermission('perm_tab_permissions') && <button onClick={() => setActiveTab('permissions')} className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'permissions' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>{t('tab_permissions')}</button>}
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-2 md:p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto w-full h-full">
          {activeTab === 'entry' && hasPermission('perm_tab_entry') && (
            <div className="h-full flex flex-col items-center animate-fade-in pb-20">
                <div className="w-full max-w-2xl">
                    <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700 relative overflow-hidden">
                        {hasPermission('perm_logistics_mode') && (
                             <div className="flex justify-center mb-6 z-10 relative">
                                <div className="bg-gray-900 p-1 rounded-lg flex border border-gray-600 shadow-inner">
                                    <button onClick={() => setEntryMode('production')} className={`px-4 sm:px-6 py-2 rounded-md font-bold text-sm sm:text-base transition-all duration-200 flex items-center gap-2 ${entryMode === 'production' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>🏭 {t('mode_production')}</button>
                                    <button onClick={() => setEntryMode('logistics')} className={`px-4 sm:px-6 py-2 rounded-md font-bold text-sm sm:text-base transition-all duration-200 flex items-center gap-2 ${entryMode === 'logistics' ? 'bg-sky-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>🚛 {t('mode_logistics')}</button>
                                </div>
                             </div>
                        )}
                        <h1 className={`text-2xl sm:text-3xl font-extrabold text-center mb-2 ${entryMode === 'production' ? 'text-teal-400' : 'text-sky-400'}`}>{t('search_title')}</h1>
                        <p className="text-gray-400 text-center mb-6 text-sm">{t('search_subtitle')}</p>
                        <div className="space-y-4 sm:space-y-6">
                            {entryMode === 'production' ? (
                                <>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('part_number')}</label>
                                        <PartNumberInput parts={parts.map(p => p.value)} onPartSelect={(p) => setSelectedPart(p ? (parts.find(i => i.value === p) || null) : null)} placeholder={t('part_placeholder')} value={selectedPart ? selectedPart.value : ''} onRequestPart={props.onRequestPart} />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('workplace')}</label>
                                        <div className="relative">
                                            <select value={selectedWorkplace || ''} onChange={(e) => setSelectedWorkplace(e.target.value)} className="block appearance-none w-full bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors font-mono uppercase text-lg">
                                                <option value="" className="font-sans normal-case">{t('workplace_placeholder')}</option>
                                                {workplaces.map((wp) => (<option key={wp.id} value={wp.value}>{wp.value}</option>))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('log_reference')}</label>
                                        <input type="text" value={logisticsRef} onChange={(e) => setLogisticsRef(e.target.value)} placeholder={t('log_reference_place')} className={`${inputBaseClass} focus:ring-sky-500 focus:border-sky-500`} />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('log_operation')}</label>
                                        <div className="relative">
                                            <select value={logisticsOp} onChange={(e) => setLogisticsOp(e.target.value)} className="block appearance-none w-full bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors font-mono uppercase text-lg">
                                                <option value="" className="font-sans normal-case">{t('workplace_placeholder')}</option>
                                                {logisticsOperationsList.map((op) => (<option key={op.id} value={op.value}>{op.value}</option>))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('quantity')}</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input type="number" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputBaseClass} sm:w-1/2 ${entryMode === 'production' ? 'focus:ring-teal-500' : 'focus:ring-sky-500'}`} placeholder={t('pcs_placeholder')} />
                                    <div className="flex w-full sm:w-1/2 bg-gray-700 rounded-lg p-1 border border-gray-600">
                                        <button onClick={() => setQuantityUnit('pcs')} disabled={entryMode === 'logistics'} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${quantityUnit === 'pcs' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} ${entryMode === 'logistics' ? 'opacity-30 cursor-not-allowed' : ''}`}>{t('unit_pcs_short')}</button>
                                        <button onClick={() => setQuantityUnit('boxes')} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${quantityUnit === 'boxes' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{t('unit_boxes_short')}</button>
                                        <button onClick={() => setQuantityUnit('pallet')} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${quantityUnit === 'pallet' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{t('unit_pallet_short')}</button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('priority_label')}</label>
                                <div className="flex bg-gray-700 rounded-lg p-1 border border-gray-600">
                                    <button onClick={() => setPriority('LOW')} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${priority === 'LOW' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{t('prio_low')}</button>
                                    <button onClick={() => setPriority('NORMAL')} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${priority === 'NORMAL' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>{t('prio_normal')}</button>
                                    <button onClick={() => setPriority('URGENT')} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${priority === 'URGENT' ? 'bg-red-600 text-white shadow-md animate-pulse' : 'text-gray-400 hover:text-white'}`}>{t('prio_urgent')}</button>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button onClick={handleSendToTasks} className={`w-full text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 ${entryMode === 'production' ? 'bg-teal-600 hover:bg-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.4)]' : 'bg-sky-600 hover:bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]'}`}>
                                    <PlusIcon className="w-6 h-6" />
                                    {t('send_btn')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
          
          {activeTab === 'tasks' && hasPermission('perm_tab_tasks') && (
            <div className="animate-fade-in pb-20">
              <div className="mb-4 flex justify-center">
                  <input type="text" value={taskSearchQuery} onChange={e => setTaskSearchQuery(e.target.value)} className="w-full max-w-md px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 placeholder:font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono uppercase" placeholder={t('task_search_placeholder')} />
              </div>
              <TaskList currentUser={currentUserRole} currentUserName={currentUser} tasks={tasks.filter(t => { const q = taskSearchQuery.toLowerCase(); return (t.partNumber && t.partNumber.toLowerCase().includes(q)) || (t.text && t.text.toLowerCase().includes(q)) || (t.workplace && t.workplace.toLowerCase().includes(q)); })} onToggleTask={onToggleTask} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onToggleMissing={onToggleMissing} onSetInProgress={onSetInProgress} onToggleBlock={onToggleBlock} onToggleManualBlock={onToggleManualBlock} onMarkAsIncorrect={onMarkAsIncorrect} onAddNote={onAddNote} onReleaseTask={onReleaseTask} onAuditPart={handleAuditClick} missingReasons={missingReasons} hasPermission={hasPermission} />
            </div>
          )}

          {activeTab === 'analytics' && hasPermission('perm_tab_analytics') && <AnalyticsTab tasks={tasks} onFetchArchivedTasks={props.onFetchArchivedTasks} systemBreaks={props.systemBreaks} />}
          {activeTab === 'settings' && hasPermission('perm_tab_settings') && <SettingsTab currentUserRole={currentUserRole} users={users} onAddUser={props.onAddUser} onUpdatePassword={props.onUpdatePassword} onUpdateUserRole={props.onUpdateUserRole} onDeleteUser={props.onDeleteUser} parts={parts} workplaces={workplaces} missingReasons={missingReasons} onAddPart={props.onAddPart} onBatchAddParts={props.onBatchAddParts} onDeletePart={props.onDeletePart} onDeleteAllParts={props.onDeleteAllParts} onAddWorkplace={props.onAddWorkplace} onBatchAddWorkplaces={props.onBatchAddWorkplaces} onDeleteWorkplace={props.onDeleteWorkplace} onDeleteAllWorkplaces={props.onDeleteAllWorkplaces} onAddMissingReason={props.onAddMissingReason} onDeleteMissingReason={props.onDeleteMissingReason} logisticsOperations={logisticsOperationsList} onAddLogisticsOperation={props.onAddLogisticsOperation} onDeleteLogisticsOperation={props.onDeleteLogisticsOperation} partRequests={props.partRequests} onApprovePartRequest={onApprovePartRequest} onRejectPartRequest={onRejectPartRequest} onArchiveTasks={onArchiveTasks} breakSchedules={breakSchedules} onAddBreakSchedule={props.onAddBreakSchedule} onDeleteBreakSchedule={props.onDeleteBreakSchedule} bomItems={bomItems} bomRequests={bomRequests} onAddBOMItem={props.onAddBOMItem} onBatchAddBOMItems={props.onBatchAddBOMItems} onDeleteBOMItem={props.onDeleteBOMItem} onDeleteAllBOMItems={props.onDeleteAllBOMItems} onApproveBOMRequest={onApproveBOMRequest} onRejectBOMRequest={onRejectBOMRequest} roles={roles} permissions={permissions} onAddRole={onAddRole} onDeleteRole={onDeleteRole} onUpdatePermission={onUpdatePermission} installPrompt={installPrompt} onInstallApp={onInstallApp} systemConfig={systemConfig} onUpdateSystemConfig={onUpdateSystemConfig} dbLoadWarning={dbLoadWarning} />}
          
          {activeTab === 'bom' && hasPermission('perm_tab_bom') && (
              <div className="h-full animate-fade-in pb-20">
                  <div className="max-w-7xl mx-auto">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          
                          <div className="lg:col-span-4 space-y-6">
                              <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                                  <div className="flex items-center gap-3 mb-6">
                                      <div className="p-2 bg-teal-500/20 rounded-lg">
                                          <ClipboardListIcon className="w-6 h-6 text-teal-400" />
                                      </div>
                                      <h2 className="text-xl font-bold text-white">{t('bom_title')}</h2>
                                  </div>
                                  
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wider">{t('bom_parent')}</label>
                                          <PartNumberInput 
                                              parts={parts.map(p => p.value)} 
                                              value={bomParentQuery} 
                                              onInputChange={(val) => setBomParentQuery(val)} 
                                              onPartSelect={(val) => { if (val) setBomParentQuery(val); }} 
                                              placeholder={t('part_placeholder')} 
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wider">{t('bom_qty')}</label>
                                          <input 
                                              type="number" 
                                              inputMode="numeric"
                                              value={bomQuantity} 
                                              onChange={(e) => setBomQuantity(e.target.value)} 
                                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono placeholder-gray-500 placeholder:font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-lg" 
                                              placeholder="Napr. 500" 
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-gray-400 text-xs font-bold mb-2 uppercase tracking-wider">{t('bom_select_wp')}</label>
                                          <select 
                                              value={bomSelectedWorkplace || ''} 
                                              onChange={(e) => setBomSelectedWorkplace(e.target.value)} 
                                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono uppercase text-lg"
                                          >
                                              <option value="" className="font-sans normal-case">{t('workplace_placeholder')}</option>
                                              {workplaces.map(wp => <option key={wp.id} value={wp.value}>{wp.value}</option>)}
                                          </select>
                                      </div>
                                      
                                      <button 
                                          onClick={handleCalculateBOM} 
                                          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-900/20 transform transition-all active:scale-95 flex items-center justify-center gap-2"
                                      >
                                          <ActivityIcon className="h-5 w-5" />
                                          {t('bom_calc_btn')}
                                      </button>

                                      {bomParentQuery && bomResults.length === 0 && (
                                          <button 
                                              onClick={handleRequestNewBOM}
                                              disabled={bomRequestStatus !== 'idle'}
                                              className={`w-full py-3 rounded-xl border text-sm font-bold transition-all ${
                                                  bomRequestStatus === 'success' ? 'bg-green-600 border-green-500 text-white' : 
                                                  bomRequestStatus === 'loading' ? 'bg-gray-700 border-gray-600 text-gray-400 animate-pulse' :
                                                  'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                                              }`}
                                          >
                                              {bomRequestStatus === 'loading' ? '...' : bomRequestStatus === 'success' ? t('bom_req_success') : t('bom_request_btn')}
                                          </button>
                                      )}
                                  </div>
                              </div>

                              {bomResults.length > 0 && (
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{language === 'sk' ? 'Komponenty' : 'Components'}</p>
                                          <p className="text-2xl font-black text-white">{bomResults.length}</p>
                                      </div>
                                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{language === 'sk' ? 'Zostáva' : 'Remaining'}</p>
                                          <p className="text-2xl font-black text-orange-400">{bomResults.length - clickedBOMTasks.size}</p>
                                      </div>
                                  </div>
                              )}
                          </div>

                          <div className="lg:col-span-8">
                              {bomResults.length > 0 ? (
                                  <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden flex flex-col h-full">
                                      <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/30">
                                          <div>
                                              <h3 className="text-xl font-bold text-white font-mono uppercase">
                                                  {displayedBomParent}
                                              </h3>
                                              <p className="text-sm text-gray-500">
                                                  {t('bom_results')} <span className="text-teal-400 font-bold">{displayedBomQuantity} ks</span>
                                              </p>
                                          </div>
                                          <button 
                                              onClick={() => handleCreateAllBOMTasks(bomResults)}
                                              className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                          >
                                              🚀 {language === 'sk' ? 'Odoslať Všetko' : 'Send All'}
                                          </button>
                                      </div>

                                      <div className="overflow-x-auto flex-grow custom-scrollbar">
                                          <table className="w-full text-left">
                                              <thead className="bg-gray-900/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-700">
                                                  <tr>
                                                      <th className="py-4 px-6">{t('bom_child')}</th>
                                                      <th className="py-4 px-6 text-center">{language === 'sk' ? 'Spotreba/ks' : 'Usage/pc'}</th>
                                                      <th className="py-4 px-6 text-right">{t('bom_req_qty')}</th>
                                                      <th className="py-4 px-6 text-center">{language === 'sk' ? 'Akcia' : 'Action'}</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-700/50">
                                                  {bomResults.map((res) => {
                                                      const isSent = clickedBOMTasks.has(res.childPart);
                                                      return (
                                                          <tr key={res.childPart} className={`transition-colors ${isSent ? 'bg-teal-500/5 opacity-60' : 'hover:bg-gray-700/30'}`}>
                                                              <td className="py-5 px-6">
                                                                  <p className={`font-mono font-bold ${isSent ? 'text-gray-500' : 'text-white'}`}>{res.childPart}</p>
                                                                  <p className="text-[10px] text-gray-500">Standard Component</p>
                                                              </td>
                                                              <td className="py-5 px-6 text-center text-gray-400 font-mono text-xs">
                                                                  {res.quantity}
                                                              </td>
                                                              <td className="py-5 px-6 text-right">
                                                                  <span className={`text-lg font-bold font-mono ${isSent ? 'text-gray-500' : 'text-teal-400'}`}>
                                                                      {res.requiredQty} <span className="text-xs font-normal">ks</span>
                                                                  </span>
                                                              </td>
                                                              <td className="py-5 px-6 text-center">
                                                                  <button 
                                                                      onClick={() => !isSent && handleCreateBOMTask(res.childPart, res.requiredQty)}
                                                                      disabled={isSent}
                                                                      className={`inline-flex items-center justify-center p-2 rounded-lg transition-all ${
                                                                          isSent ? 'bg-gray-700 text-teal-500' : 'bg-teal-600/20 text-teal-400 hover:bg-teal-600 hover:text-white'
                                                                      }`}
                                                                  >
                                                                      {isSent ? <CheckCircleIcon className="w-6 h-6" /> : <PlusIcon className="w-6 h-6" />}
                                                                  </button>
                                                              </td>
                                                          </tr>
                                                      );
                                                  })}
                                              </tbody>
                                          </table>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="h-full flex flex-col items-center justify-center bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700 p-12 text-center">
                                      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-6">
                                          <SearchIcon className="w-10 h-10 text-gray-500" />
                                      </div>
                                      <h3 className="text-xl font-bold text-gray-400 mb-2">{language === 'sk' ? 'Žiadne dáta na zobrazenie' : 'No data to display'}</h3>
                                      <p className="text-gray-500 max-w-xs">{language === 'sk' ? 'Zadajte číslo výrobku a plánované množstvo pre výpočet potrebného materiálu.' : 'Enter product number and planned quantity to calculate required material.'}</p>
                                  </div>
                              )}
                          </div>

                      </div>
                  </div>
              </div>
          )}
           {activeTab === 'missing' && hasPermission('perm_tab_missing') && <MissingItemsTab tasks={tasks} onDeleteMissingItem={props.onDeleteMissingItem} hasPermission={hasPermission} />}
           {activeTab === 'inventory' && hasPermission('perm_tab_inventory') && <InventoryTab currentUser={currentUser} tasks={tasks} onAddTask={onAddTask} onUpdateTask={onUpdateTask} onToggleTask={onToggleTask} onDeleteTask={props.onDeleteTask} hasPermission={hasPermission} parts={parts.map(p => p.value)} onRequestPart={props.onRequestPart} />}
           {activeTab === 'logistics' && hasPermission('perm_tab_logistics_center') && <LogisticsCenterTab tasks={tasks} onDeleteTask={props.onDeleteTask} hasPermission={hasPermission} />}
           {activeTab === 'permissions' && hasPermission('perm_tab_permissions') && <PermissionsTab roles={roles} permissions={permissions} onAddRole={onAddRole} onDeleteRole={onDeleteRole} onUpdatePermission={onUpdatePermission} onVerifyAdminPassword={onVerifyAdminPassword} />}
        </div>
      </div>

      {/* Audit Start Modal */}
      {auditStartTask && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setAuditStartTask(null)}>
              <div className="bg-gray-800 border-2 border-[#926a05] rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-white mb-6 text-center uppercase tracking-wide">{t('audit_start_title')}</h3>
                  <p className="text-gray-300 text-center mb-8">
                      {t('audit_start_desc', { part: auditStartTask.partNumber })}
                  </p>
                  <div className="flex gap-3">
                      <button onClick={() => setAuditStartTask(null)} className="flex-1 py-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors uppercase text-xs">{t('btn_cancel')}</button>
                      <button onClick={handleConfirmStartAudit} className="flex-1 py-4 bg-[#926a05] hover:bg-[#a67c06] text-white rounded-lg font-bold transition-colors shadow-lg uppercase text-xs">
                          {language === 'sk' ? 'Potvrdiť začiatok' : 'Confirm Start'}
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* Audit Finish Modal */}
      {auditFinishTask && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setAuditFinishTask(null)}>
              <div className="bg-gray-800 border-2 border-[#926a05] rounded-xl shadow-2xl w-full max-w-lg p-6 relative" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-white mb-6 text-center uppercase tracking-wide">{t('audit_finish_title')}</h3>
                  
                  <div className="mb-6">
                      <label className="block text-gray-400 text-xs font-bold uppercase mb-2">{t('audit_finish_note')}</label>
                      <textarea 
                        value={auditNote}
                        onChange={(e) => setAuditNote(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#926a05] h-32"
                        placeholder="..."
                        autoFocus
                      />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <button 
                        onClick={() => handleConfirmFinishAudit('found')}
                        disabled={!auditNote.trim()}
                        className={`py-4 rounded-lg font-bold transition-all shadow-lg uppercase text-xs flex items-center justify-center gap-2 ${!auditNote.trim() ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                      >
                          ✅ {t('audit_found_btn')}
                      </button>
                      <button 
                        onClick={() => handleConfirmFinishAudit('missing')}
                        disabled={!auditNote.trim()}
                        className={`py-4 rounded-lg font-bold transition-all shadow-lg uppercase text-xs flex items-center justify-center gap-2 ${!auditNote.trim() ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                      >
                          ❌ {t('audit_missing_btn')}
                      </button>
                  </div>

                  <button onClick={() => setAuditFinishTask(null)} className="w-full py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors uppercase text-[10px]">{t('btn_cancel')}</button>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};

export default PartSearchScreen;
