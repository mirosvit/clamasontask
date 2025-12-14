
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PartNumberInput from './PartNumberInput';
import TaskList from './TaskList';
import SettingsTab from './SettingsTab';
import AnalyticsTab from './AnalyticsTab';
import MissingItemsTab from './MissingItemsTab';
import LogisticsCenterTab from './LogisticsCenterTab'; // NEW IMPORT
import PermissionsTab from './PermissionsTab';
import { UserData, DBItem, PartRequest, BreakSchedule, SystemBreak, BOMItem, BOMRequest, Role, Permission, Task, Notification, PriorityLevel, SystemConfig } from '../App';
import { useLanguage } from './LanguageContext';

declare var XLSX: any;

interface PartSearchScreenProps {
  currentUser: string;
  currentUserRole: 'ADMIN' | 'USER' | 'LEADER';
  onLogout: () => void;
  tasks: Task[];
  onAddTask: (partNumber: string, workplace: string | null, quantity: string | null, quantityUnit: string | null, priority: PriorityLevel, type?: 'production' | 'logistics') => void; 
  onToggleTask: (id: string) => void;
  onMarkAsIncorrect: (id: string) => void;
  onEditTask: (id: string, newText: string, newPriority?: PriorityLevel) => void;
  onDeleteTask: (id: string) => void;
  onToggleMissing: (id: string, reason?: string) => void; 
  onSetInProgress: (id: string) => void;
  onToggleBlock: (id: string) => void; 
  onAddNote: (id: string, note: string) => void;
  onReleaseTask: (id: string) => void;
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
  // Logistics Ops
  logisticsOperations: DBItem[];
  onAddLogisticsOperation: (val: string, time?: number) => void; // Updated signature
  onDeleteLogisticsOperation: (id: string) => void;
  partRequests: PartRequest[];
  onRequestPart: (part: string) => Promise<boolean>;
  onApprovePartRequest: (req: PartRequest) => void;
  onRejectPartRequest: (id: string) => void;
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
  onFetchArchivedTasks: () => Promise<Task[]>;
  onDeleteMissingItem: (id: string) => void;
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
  notifications: Notification[];
  onClearNotification: (id: string) => void;
  installPrompt: any;
  onInstallApp: () => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  dbLoadWarning: boolean;
}

const FullscreenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 10L4 4m0 0v4m0-4h4M14 10l6-6m0 0v4m0-4h-4M14 14l6 6m0 0v-4m0 4h-4M10 14l-6 6m0 0v-4m0 4h4" />
    </svg>
);

const ExitFullscreenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l6 6m0 0v-4m0 4h-4M20 4l-6 6m0 0v-4m0 4h4M20 20l-6-6m0 0v4m0-4h4M4 20l6-6m0 0v4m0-4h-4" />
    </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>);
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
const ExclamationIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);


const PartSearchScreen: React.FC<PartSearchScreenProps> = (props) => {
  const { 
    currentUser, currentUserRole, onLogout, tasks, onAddTask, roles, permissions,
    notifications, onClearNotification, installPrompt, onInstallApp, parts, workplaces,
    onToggleTask, onEditTask, onDeleteTask, onToggleMissing, onSetInProgress, onToggleBlock, onMarkAsIncorrect, onAddNote, onReleaseTask, missingReasons,
    users, onAddUser, onUpdatePassword, onUpdateUserRole, onDeleteUser,
    onAddPart, onBatchAddParts, onDeletePart, onDeleteAllParts,
    onAddWorkplace, onBatchAddWorkplaces, onDeleteWorkplace, onDeleteAllWorkplaces,
    onAddMissingReason, onDeleteMissingReason,
    onAddLogisticsOperation, onDeleteLogisticsOperation,
    onApprovePartRequest, onRejectPartRequest,
    onArchiveTasks,
    breakSchedules, onAddBreakSchedule, onDeleteBreakSchedule,
    bomItems, bomRequests, onAddBOMItem, onBatchAddBOMItems, onDeleteBOMItem, onDeleteAllBOMItems, onApproveBOMRequest, onRejectBOMRequest,
    onAddRole, onDeleteRole, onUpdatePermission, onVerifyAdminPassword,
    systemConfig, onUpdateSystemConfig,
    dbLoadWarning
  } = props;
  
  const { t, language, setLanguage } = useLanguage();
  
  // Entry Mode: Production vs Logistics
  const [entryMode, setEntryMode] = useState<'production' | 'logistics'>('production');

  const [selectedPart, setSelectedPart] = useState<DBItem | null>(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState<string | null>(null);
  
  // Logistics specific
  const [logisticsRef, setLogisticsRef] = useState('');
  const [logisticsOp, setLogisticsOp] = useState('');

  const [quantity, setQuantity] = useState<string>('');
  const [quantityUnit, setQuantityUnit] = useState<'pcs' | 'boxes' | 'pallet'>('pcs');
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'entry' | 'tasks' | 'settings' | 'analytics' | 'bom' | 'missing' | 'logistics' | 'permissions'>('entry');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // BOM Tab specific states
  const [bomParentQuery, setBomParentQuery] = useState('');
  const [bomQuantity, setBomQuantity] = useState('');
  const [bomSelectedWorkplace, setBomSelectedWorkplace] = useState<string | null>(null);
  const [clickedBOMTasks, setClickedBOMTasks] = useState<Set<string>>(new Set());
  const [bomRequestStatus, setBomRequestStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // New states to control when BOM results are displayed (after explicit calculation)
  const [displayedBomParent, setDisplayedBomParent] = useState<string | null>(null);
  const [displayedBomQuantity, setDisplayedBomQuantity] = useState<number | null>(null);


  const currentRoleId = roles.find(r => r.name === currentUserRole)?.id;
  const hasPermission = useCallback((permName: string) => {
      // Safety: Admin always has access to permissions and settings to avoid lockout
      if (currentUserRole === 'ADMIN' && (permName === 'perm_tab_permissions' || permName === 'perm_manage_roles' || permName === 'perm_tab_settings')) {
          return true;
      }

      if (!currentRoleId) return false;
      return permissions.some(p => p.roleId === currentRoleId && p.permissionName === permName);
  }, [currentUserRole, currentRoleId, permissions]);
  
  const unfinishedTasksCount = tasks.filter(t => !t.isDone).length;
  const pendingRequestsCount = props.partRequests.length + props.bomRequests.length;
  const workplaceStrings = useMemo(() => workplaces.map(w => w.value), [workplaces]);
  
  // Use DB operations if available, otherwise fallback
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

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Push notification permission granted.');
      }
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Update quantity unit based on mode
  useEffect(() => {
      if (entryMode === 'logistics') {
          setQuantityUnit('pallet');
      } else {
          setQuantityUnit('pcs');
      }
  }, [entryMode]);

  // Special Rule for S0001S (Forces Pallet)
  const isS0001S = useMemo(() => {
      return selectedPart?.description?.includes('S0001S') || false;
  }, [selectedPart]);

  // Special Rule for S0002S (Forces Pcs)
  const isS0002S = useMemo(() => {
      return selectedPart?.description?.includes('S0002S') || false;
  }, [selectedPart]);

  useEffect(() => {
      if (isS0001S) {
          setQuantityUnit('pallet');
      } else if (isS0002S) {
          setQuantityUnit('pcs');
      }
  }, [isS0001S, isS0002S]);
  
  const handleSendToTasks = () => {
    if (entryMode === 'production') {
        if (!selectedPart || !selectedWorkplace || !quantity) {
            alert(t('fill_all_fields')); 
            return;
        }
        onAddTask(selectedPart.value, selectedWorkplace, quantity, quantityUnit, priority, 'production');
    } else {
        // Logistics Mode
        if (!logisticsRef || !logisticsOp || !quantity) {
            alert(t('fill_all_fields'));
            return;
        }
        onAddTask(logisticsRef, logisticsOp, quantity, quantityUnit, priority, 'logistics');
    }

    // Reset fields
    setSelectedPart(null);
    setSelectedWorkplace(null);
    setLogisticsRef('');
    setLogisticsOp('');
    setQuantity('');
    // Reset unit based on current mode (pallet for logistics, pcs for production)
    if (entryMode === 'logistics') {
         setQuantityUnit('pallet'); 
    } else {
         setQuantityUnit('pcs'); 
    }
    setPriority('NORMAL'); 
    
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 2000);
  };
  
  const handleCreateTaskFromBOM = (childPart: string, requiredQty: number, bomItemId: string) => {
      if (!bomSelectedWorkplace) {
          alert(t('select_bom_workplace')); 
          return;
      }
      const roundedQty = Math.ceil(requiredQty);
      
      onAddTask(childPart, bomSelectedWorkplace, roundedQty.toString(), 'pcs', 'NORMAL', 'production');
      
      setClickedBOMTasks(prev => new Set(prev).add(bomItemId));
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
    setClickedBOMTasks(new Set()); // Reset tasks for new BOM calculation
  };
  
  const handleRequestBOM = async () => {
      if (displayedBomParent && bomRequestStatus === 'idle') {
          setBomRequestStatus('loading');
          const success = await props.onRequestBOM(displayedBomParent);
          if (success) {
              setBomRequestStatus('success');
              setTimeout(() => setBomRequestStatus('idle'), 3000);
          } else {
              setBomRequestStatus('idle');
          }
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
  
  const handleExportTasks = () => {
      if (typeof XLSX === 'undefined') {
          alert('Export library missing.');
          return;
      }
      const data = tasks.map(task => ({
          ID: task.id,
          [t('miss_th_created')]: task.createdAt ? new Date(task.createdAt).toLocaleString('sk-SK') : '-',
          [t('miss_th_part')]: task.partNumber || task.text,
          [t('miss_th_wp')]: task.workplace || '-',
          [t('kpi_quantity')]: task.quantity || '-',
          [t('status_label')]: task.isDone ? t('status_completed') : t('status_open'),
          [t('task_completed_by')]: task.completedBy || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tasks");
      XLSX.writeFile(wb, `Tasks_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Filter BOM items based on displayed (calculated) states
  const filteredBomItems = useMemo(() => {
    if (!displayedBomParent || !displayedBomQuantity) return [];
    return props.bomItems
        .filter(item => item.parentPart.toLowerCase() === displayedBomParent.toLowerCase());
  }, [props.bomItems, displayedBomParent, displayedBomQuantity]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
        case 'ADMIN': return 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]';
        case 'LEADER': return 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]';
        default: return 'bg-teal-600 border-teal-500 text-white shadow-[0_0_10px_rgba(13,148,136,0.5)]'; // USER
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Notification Modal */}
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

      {/* Break Active Banner */}
      {props.isBreakActive && (
        <div className="w-full px-2 sm:px-4 pt-2 z-50 bg-gray-900">
            <div className="w-full bg-red-600 text-white py-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.6)] flex items-center justify-center gap-3 animate-pulse border-2 border-red-400">
                <ClockIcon className="w-8 h-8 flex-shrink-0" />
                <span className="font-extrabold text-xl sm:text-2xl uppercase tracking-widest leading-none text-center">PREBIEHA PRESTÁVKA</span>
            </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-20 right-4 bg-green-600 text-white p-4 rounded-lg shadow-xl z-50 animate-bounce">
          {t('sent_msg')}
        </div>
      )}

      {/* RE-DESIGNED HEADER */}
      <div className="bg-gray-900 shadow-2xl z-40 p-3 border-b border-gray-800 relative">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between relative">
          
          {/* LEFT: Language Toggle */}
          <div className="flex items-center z-10">
             <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 shadow-inner">
                <button 
                    onClick={() => setLanguage('sk')} 
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${language === 'sk' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    SK
                </button>
                <button 
                    onClick={() => setLanguage('en')} 
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${language === 'en' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    EN
                </button>
             </div>
          </div>

          {/* RIGHT: User Info Pill & Buttons */}
          <div className="flex items-center gap-3 z-10">
             
             {/* User Role Pill */}
             <div className={`hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full border ${getRoleBadgeColor(currentUserRole)} transition-all duration-300 shadow-lg`}>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">{currentUser} | {currentUserRole}</span>
            </div>

             {/* Small Mobile User Name */}
             <span className="md:hidden text-xs font-bold text-gray-400">{currentUser}</span>

            {/* PWA Button */}
            {installPrompt && hasPermission('perm_install_pwa') && (
                <button 
                    onClick={onInstallApp}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors shadow-md border border-blue-500/50"
                    title={t('pwa_install_btn')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2z"/><path fillRule="evenodd" d="M3.5 9.25a.75.75 0 00-1.5 0v7a2 2 0 002 2h11a2 2 0 002-2v-7a.75.75 0 00-1.5 0v7a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-7z" clipRule="evenodd"/></svg>
                </button>
            )}

            {/* Fullscreen Button */}
            {hasPermission('perm_view_fullscreen') && (
                <button 
                    onClick={handleToggleFullscreen} 
                    className="bg-gray-700 hover:bg-gray-600 text-teal-400 hover:text-white p-2 rounded-lg transition-all shadow-md border border-gray-600" 
                    title={isFullscreen ? t('fullscreen_off') : t('fullscreen_on')}
                >
                    {isFullscreen ? <ExitFullscreenIcon className="h-5 w-5" /> : <FullscreenIcon className="h-5 w-5" />}
                </button>
            )}

            {/* Logout Button */}
            <button 
                onClick={onLogout} 
                className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-all shadow-md border border-red-500/50" 
                title={t('logout')}
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-t border-gray-700 shadow-sm z-10">
        <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 overflow-x-auto custom-scrollbar">
          <div className="flex space-x-4 sm:space-x-6">
            {hasPermission('perm_tab_entry') && (
              <button onClick={() => setActiveTab('entry')} className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'entry' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                {t('tab_entry')}
              </button>
            )}
            {hasPermission('perm_tab_tasks') && (
              <button onClick={() => setActiveTab('tasks')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'tasks' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} ${unfinishedTasksCount > 0 ? 'text-orange-400' : ''}`}>
                {t('tab_tasks')} {unfinishedTasksCount > 0 && <span className="ml-1 sm:ml-2 bg-orange-600 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5">{unfinishedTasksCount}</span>}
              </button>
            )}
            {hasPermission('perm_tab_bom') && (
              <button onClick={() => setActiveTab('bom')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'bom' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                {t('tab_bom')}
              </button>
            )}
            {hasPermission('perm_tab_missing') && (
              <button onClick={() => setActiveTab('missing')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'missing' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                {t('tab_missing')}
              </button>
            )}
            {hasPermission('perm_tab_logistics_center') && (
              <button onClick={() => setActiveTab('logistics')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'logistics' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                {t('tab_logistics_center')}
              </button>
            )}
            {hasPermission('perm_tab_analytics') && (
              <button onClick={() => setActiveTab('analytics')} className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'analytics' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                {t('tab_analytics')}
              </button>
            )}
            {hasPermission('perm_tab_settings') && (
              <button onClick={() => setActiveTab('settings')} className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'settings' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} ${pendingRequestsCount > 0 ? 'text-red-400' : ''}`}>
                {t('tab_settings')} {pendingRequestsCount > 0 && <span className="ml-1 sm:ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5">{pendingRequestsCount}</span>}
              </button>
            )}
            {hasPermission('perm_tab_permissions') && (
                <button onClick={() => setActiveTab('permissions')} className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === 'permissions' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                    {t('tab_permissions')}
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-grow overflow-y-auto p-2 md:p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto w-full h-full">
          
          {activeTab === 'entry' && hasPermission('perm_tab_entry') && (
            <div className="h-full flex flex-col items-center animate-fade-in pb-20">
                <div className="w-full max-w-2xl">
                    
                    {/* Main Form Card */}
                    <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700 relative overflow-hidden">
                        
                        {/* Mode Switcher */}
                        {hasPermission('perm_logistics_mode') && (
                             <div className="flex justify-center mb-6 z-10 relative">
                                <div className="bg-gray-900 p-1 rounded-lg flex border border-gray-600 shadow-inner">
                                    <button 
                                        onClick={() => setEntryMode('production')}
                                        className={`px-4 sm:px-6 py-2 rounded-md font-bold text-sm sm:text-base transition-all duration-200 flex items-center gap-2 ${entryMode === 'production' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        🏭 {t('mode_production')}
                                    </button>
                                    <button 
                                        onClick={() => setEntryMode('logistics')}
                                        className={`px-4 sm:px-6 py-2 rounded-md font-bold text-sm sm:text-base transition-all duration-200 flex items-center gap-2 ${entryMode === 'logistics' ? 'bg-sky-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        🚛 {t('mode_logistics')}
                                    </button>
                                </div>
                             </div>
                        )}

                        <h1 className={`text-2xl sm:text-3xl font-extrabold text-center mb-2 ${entryMode === 'production' ? 'text-teal-400' : 'text-sky-400'}`}>
                            {t('search_title')}
                        </h1>
                        <p className="text-gray-400 text-center mb-6 text-sm">{t('search_subtitle')}</p>

                        <div className="space-y-4 sm:space-y-6">
                            {entryMode === 'production' ? (
                                // --- PRODUCTION FORM ---
                                <>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('part_number')}</label>
                                        <PartNumberInput 
                                            parts={parts.map(p => p.value)}
                                            onPartSelect={(p) => setSelectedPart(p ? (parts.find(i => i.value === p) || null) : null)}
                                            placeholder={t('part_placeholder')}
                                            value={selectedPart ? selectedPart.value : ''}
                                            onRequestPart={props.onRequestPart}
                                        />
                                        {selectedPart && selectedPart.description && (
                                            <p className="text-teal-400 text-xs mt-2 font-mono bg-teal-900/30 p-2 rounded border border-teal-800 inline-block">
                                                {selectedPart.description}
                                            </p>
                                        )}
                                    </div>
        
                                    <div>
                                        <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('workplace')}</label>
                                        <div className="relative">
                                            <select 
                                                value={selectedWorkplace || ''} 
                                                onChange={(e) => setSelectedWorkplace(e.target.value)} 
                                                className="block appearance-none w-full bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                            >
                                                <option value="">{t('workplace_placeholder')}</option>
                                                {workplaces.map((wp) => (
                                                    <option key={wp.id} value={wp.value}>{wp.value}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // --- LOGISTICS FORM ---
                                <>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('log_reference')}</label>
                                        <input 
                                            type="text"
                                            value={logisticsRef}
                                            onChange={(e) => setLogisticsRef(e.target.value)}
                                            placeholder={t('log_reference_place')}
                                            className="w-full pl-4 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('log_operation')}</label>
                                        <div className="relative">
                                            <select 
                                                value={logisticsOp} 
                                                onChange={(e) => setLogisticsOp(e.target.value)} 
                                                className="block appearance-none w-full bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                                            >
                                                <option value="">{t('workplace_placeholder')}</option>
                                                {logisticsOperationsList.map((op) => (
                                                    <option key={op.id} value={op.value}>{op.value}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* QUANTITY SECTION */}
                            <div>
                                <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('quantity')}</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        type="number" 
                                        inputMode="decimal"
                                        value={quantity} 
                                        onChange={(e) => setQuantity(e.target.value)} 
                                        className={`w-full sm:w-1/2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg font-mono placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${entryMode === 'production' ? 'focus:ring-teal-500' : 'focus:ring-sky-500'}`}
                                        placeholder={t('pcs_placeholder')}
                                    />
                                    <div className="flex w-full sm:w-1/2 bg-gray-700 rounded-lg p-1 border border-gray-600">
                                        <button 
                                            onClick={() => setQuantityUnit('pcs')} 
                                            disabled={entryMode === 'logistics' || isS0001S}
                                            className={`flex-1 py-2 rounded text-sm font-bold transition-all ${quantityUnit === 'pcs' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} ${entryMode === 'logistics' || isS0001S ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            {t('unit_pcs_short')}
                                        </button>
                                        <button 
                                            onClick={() => setQuantityUnit('boxes')} 
                                            disabled={isS0001S || isS0002S}
                                            className={`flex-1 py-2 rounded text-sm font-bold transition-all ${quantityUnit === 'boxes' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} ${isS0001S || isS0002S ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            {t('unit_boxes_short')}
                                        </button>
                                        <button 
                                            onClick={() => setQuantityUnit('pallet')} 
                                            disabled={isS0002S}
                                            className={`flex-1 py-2 rounded text-sm font-bold transition-all ${quantityUnit === 'pallet' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} ${isS0002S ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            {t('unit_pallet_short')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* PRIORITY SELECTION */}
                            <div>
                                <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('priority_label')}</label>
                                <div className="flex bg-gray-700 rounded-lg p-1 border border-gray-600">
                                    <button 
                                        onClick={() => setPriority('LOW')} 
                                        className={`flex-1 py-2 rounded text-sm font-bold transition-all ${priority === 'LOW' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        {t('prio_low')}
                                    </button>
                                    <button 
                                        onClick={() => setPriority('NORMAL')} 
                                        className={`flex-1 py-2 rounded text-sm font-bold transition-all ${priority === 'NORMAL' ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        {t('prio_normal')}
                                    </button>
                                    <button 
                                        onClick={() => setPriority('URGENT')} 
                                        className={`flex-1 py-2 rounded text-sm font-bold transition-all ${priority === 'URGENT' ? 'bg-red-600 text-white shadow-md animate-pulse' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        {t('prio_urgent')}
                                    </button>
                                </div>
                            </div>
                            
                            {/* SEND BUTTON */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button 
                                    onClick={handleSendToTasks} 
                                    className={`w-full text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 ${entryMode === 'production' ? 'bg-teal-600 hover:bg-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.4)]' : 'bg-sky-600 hover:bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]'}`}
                                >
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
                  <input 
                    type="text" 
                    value={taskSearchQuery} 
                    onChange={e => setTaskSearchQuery(e.target.value)} 
                    className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    placeholder={t('task_search_placeholder')}
                  />
              </div>
              <TaskList 
                currentUser={currentUserRole}
                currentUserName={currentUser}
                tasks={tasks.filter(t => {
                   const q = taskSearchQuery.toLowerCase();
                   return (t.partNumber && t.partNumber.toLowerCase().includes(q)) || 
                          (t.text && t.text.toLowerCase().includes(q)) ||
                          (t.workplace && t.workplace.toLowerCase().includes(q));
                })}
                onToggleTask={onToggleTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onToggleMissing={onToggleMissing}
                onSetInProgress={onSetInProgress}
                onToggleBlock={onToggleBlock}
                onMarkAsIncorrect={onMarkAsIncorrect}
                onAddNote={onAddNote}
                onReleaseTask={onReleaseTask}
                missingReasons={missingReasons}
                hasPermission={hasPermission}
              />
            </div>
          )}

          {activeTab === 'analytics' && hasPermission('perm_tab_analytics') && (
             <AnalyticsTab tasks={tasks} onFetchArchivedTasks={props.onFetchArchivedTasks} systemBreaks={props.systemBreaks} />
          )}

          {activeTab === 'settings' && hasPermission('perm_tab_settings') && (
            <SettingsTab 
                currentUserRole={currentUserRole}
                users={users}
                onAddUser={onAddUser}
                onUpdatePassword={onUpdatePassword}
                onUpdateUserRole={onUpdateUserRole}
                onDeleteUser={onDeleteUser}
                parts={parts}
                onAddPart={onAddPart}
                onBatchAddParts={onBatchAddParts}
                onDeletePart={onDeletePart}
                onDeleteAllParts={onDeleteAllParts}
                workplaces={workplaces}
                onAddWorkplace={onAddWorkplace}
                onBatchAddWorkplaces={onBatchAddWorkplaces}
                onDeleteWorkplace={onDeleteWorkplace}
                onDeleteAllWorkplaces={onDeleteAllWorkplaces}
                missingReasons={missingReasons}
                onAddMissingReason={onAddMissingReason}
                onDeleteMissingReason={onDeleteMissingReason}
                logisticsOperations={logisticsOperationsList}
                onAddLogisticsOperation={onAddLogisticsOperation}
                onDeleteLogisticsOperation={onDeleteLogisticsOperation}
                partRequests={props.partRequests}
                onApprovePartRequest={onApprovePartRequest}
                onRejectPartRequest={onRejectPartRequest}
                onArchiveTasks={onArchiveTasks}
                breakSchedules={breakSchedules}
                onAddBreakSchedule={onAddBreakSchedule}
                onDeleteBreakSchedule={onDeleteBreakSchedule}
                bomItems={bomItems}
                bomRequests={bomRequests}
                onAddBOMItem={onAddBOMItem}
                onBatchAddBOMItems={onBatchAddBOMItems}
                onDeleteBOMItem={onDeleteBOMItem}
                onDeleteAllBOMItems={onDeleteAllBOMItems}
                onApproveBOMRequest={onApproveBOMRequest}
                onRejectBOMRequest={onRejectBOMRequest}
                roles={roles}
                permissions={permissions}
                onAddRole={onAddRole}
                onDeleteRole={onDeleteRole}
                onUpdatePermission={onUpdatePermission}
                installPrompt={installPrompt}
                onInstallApp={onInstallApp}
                systemConfig={systemConfig}
                onUpdateSystemConfig={onUpdateSystemConfig}
                dbLoadWarning={dbLoadWarning} // ADDED
            />
          )}

          {activeTab === 'bom' && hasPermission('perm_tab_bom') && (
              <div className="h-full flex flex-col items-center animate-fade-in pb-20">
                  <div className="w-full max-w-3xl bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                      <h1 className="text-3xl font-extrabold text-center text-teal-400 mb-2">{t('bom_title')}</h1>
                      <p className="text-gray-400 text-center mb-8 text-sm">{t('bom_subtitle')}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div>
                              <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('bom_parent')}</label>
                              <PartNumberInput 
                                  parts={parts.map(p => p.value)}
                                  value={bomParentQuery}
                                  onInputChange={(val) => setBomParentQuery(val)}
                                  onPartSelect={(val) => { if (val) setBomParentQuery(val); }}
                                  placeholder={t('part_placeholder')}
                              />
                          </div>
                          <div>
                              <label className="block text-gray-300 text-sm font-bold mb-2 uppercase tracking-wide">{t('bom_qty')}</label>
                              <input 
                                  type="number" 
                                  value={bomQuantity} 
                                  onChange={(e) => setBomQuantity(e.target.value)} 
                                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  placeholder="1000..."
                              />
                          </div>
                      </div>

                      <button 
                          onClick={handleCalculateBOM}
                          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl shadow-lg transform transition-all active:scale-95 mb-8 flex items-center justify-center gap-2"
                      >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          {t('bom_calc_btn')}
                      </button>

                      {/* WORKPLACE SELECTOR FOR TASK CREATION */}
                      {filteredBomItems.length > 0 && (
                          <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-teal-800">
                               <label className="block text-teal-400 text-sm font-bold mb-2 uppercase tracking-wide flex items-center gap-2">
                                   <SearchIcon className="w-4 h-4"/>
                                   {t('bom_select_wp')}
                               </label>
                               <select 
                                    value={bomSelectedWorkplace || ''} 
                                    onChange={(e) => setBomSelectedWorkplace(e.target.value)} 
                                    className="block w-full bg-gray-800 border border-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:border-teal-500"
                                >
                                    <option value="">{t('workplace_placeholder')}</option>
                                    {workplaces.map((wp) => (
                                        <option key={wp.id} value={wp.value}>{wp.value}</option>
                                    ))}
                                </select>
                          </div>
                      )}

                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 min-h-[200px]">
                          <h3 className="text-gray-400 text-sm font-bold uppercase mb-4 border-b border-gray-800 pb-2">{t('bom_results')}</h3>
                          
                          {filteredBomItems.length > 0 ? (
                              <div className="space-y-3">
                                  {filteredBomItems.map(item => {
                                      const reqQty = item.quantity * (parseFloat(displayedBomQuantity?.toString() || '0'));
                                      const isAdded = clickedBOMTasks.has(item.id);

                                      return (
                                          <div key={item.id} className="flex flex-col sm:flex-row justify-between items-center bg-gray-800 p-3 rounded border border-gray-700">
                                              <div className="mb-2 sm:mb-0">
                                                  <span className="text-sm text-gray-500 block">{t('bom_child')}</span>
                                                  <span className="text-xl font-mono font-bold text-white">{item.childPart}</span>
                                              </div>
                                              <div className="text-right flex items-center gap-4">
                                                  <div>
                                                      <span className="text-sm text-gray-500 block">{t('bom_req_qty')}</span>
                                                      <span className="text-xl font-mono font-bold text-yellow-400">{Math.ceil(reqQty)}</span>
                                                  </div>
                                                  <button 
                                                      onClick={() => handleCreateTaskFromBOM(item.childPart, reqQty, item.id)}
                                                      disabled={isAdded}
                                                      className={`p-2 rounded-lg font-bold transition-colors ${isAdded ? 'bg-green-900 text-green-300 cursor-default' : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md'}`}
                                                      title={t('bom_create_task')}
                                                  >
                                                      {isAdded ? <CheckCircleIcon className="w-6 h-6"/> : <PlusIcon className="w-6 h-6"/>}
                                                  </button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                                  {displayedBomParent ? (
                                      <>
                                          <p className="mb-4">{t('bom_no_results')}</p>
                                          <button 
                                              onClick={handleRequestBOM}
                                              disabled={bomRequestStatus !== 'idle'}
                                              className={`px-4 py-2 rounded font-bold text-sm transition-colors ${bomRequestStatus === 'success' ? 'bg-green-600 text-white' : 'bg-yellow-700 text-white hover:bg-yellow-600'}`}
                                          >
                                              {bomRequestStatus === 'loading' ? t('report_btn_loading') : bomRequestStatus === 'success' ? t('report_btn_success') : t('bom_request_btn')}
                                          </button>
                                          {bomRequestStatus === 'success' && <p className="text-green-400 text-xs mt-2">{t('bom_req_success')}</p>}
                                      </>
                                  ) : <p className="italic text-sm">Zadajte výrobok a množstvo...</p>}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

           {activeTab === 'missing' && hasPermission('perm_tab_missing') && (
             <MissingItemsTab 
                tasks={tasks} 
                onDeleteMissingItem={props.onDeleteMissingItem}
                hasPermission={hasPermission}
             />
           )}
           
           {activeTab === 'logistics' && hasPermission('perm_tab_logistics_center') && (
             <LogisticsCenterTab 
                tasks={tasks}
                onDeleteTask={props.onDeleteTask}
                hasPermission={hasPermission}
             />
           )}
           
           {activeTab === 'permissions' && hasPermission('perm_tab_permissions') && (
               <PermissionsTab 
                    roles={roles}
                    permissions={permissions}
                    onAddRole={onAddRole}
                    onDeleteRole={onDeleteRole}
                    onUpdatePermission={onUpdatePermission}
                    onVerifyAdminPassword={onVerifyAdminPassword}
               />
           )}

        </div>
      </div>
    </div>
  );
};

export default PartSearchScreen;
