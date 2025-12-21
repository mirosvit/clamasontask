
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { UserData, DBItem, PartRequest, BreakSchedule, BOMItem, BOMRequest, Role, Permission, SystemConfig } from '../App';
import { useLanguage } from './LanguageContext';

interface SettingsTabProps {
  currentUserRole: 'ADMIN' | 'USER' | 'LEADER';
  users: UserData[];
  onAddUser: (user: UserData) => void;
  onUpdatePassword: (username: string, newPass: string) => void;
  onUpdateUserRole: (username: string, newRole: 'ADMIN' | 'USER' | 'LEADER') => void;
  onDeleteUser: (username: string) => void;
  // DB Props
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
  logisticsOperations?: DBItem[];
  onAddLogisticsOperation?: (val: string, time?: number) => void;
  onDeleteLogisticsOperation?: (id: string) => void;
  // Requests
  partRequests: PartRequest[];
  onApprovePartRequest: (req: PartRequest) => void;
  onRejectPartRequest: (id: string) => void;
  // Archive
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
  // Breaks
  breakSchedules: BreakSchedule[];
  onAddBreakSchedule: (start: string, end: string) => void;
  onDeleteBreakSchedule: (id: string) => void;
  // BOM
  bomItems: BOMItem[]; 
  bomRequests: BOMRequest[]; 
  onAddBOMItem: (parent: string, child: string, qty: number) => void;
  onBatchAddBOMItems: (vals: string[]) => void;
  onDeleteBOMItem: (id: string) => void;
  onDeleteAllBOMItems: () => void;
  onApproveBOMRequest: (req: BOMRequest) => void;
  onRejectBOMRequest: (id: string) => void;
  // Roles
  roles: Role[];
  permissions: Permission[]; 
  onAddRole: (name: string) => void;
  onDeleteRole: (id: string) => void;
  onUpdatePermission: (permissionId: string, roleName: string, hasPermission: boolean) => void;
  // PWA
  installPrompt: any;
  onInstallApp: () => void;
  // System Config
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  dbLoadWarning?: boolean;
}

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

const UserPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
);

const ExclamationIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const SettingsTab: React.FC<SettingsTabProps> = ({ 
  currentUserRole,
  users, onAddUser, onUpdatePassword, onUpdateUserRole, onDeleteUser,
  parts, workplaces, missingReasons, onAddPart, onBatchAddParts, onDeletePart, onDeleteAllParts,
  onAddWorkplace, onBatchAddWorkplaces, onDeleteWorkplace, onDeleteAllWorkplaces,
  onAddMissingReason, onDeleteMissingReason,
  logisticsOperations = [], onAddLogisticsOperation, onDeleteLogisticsOperation,
  partRequests, onApprovePartRequest, onRejectPartRequest, onArchiveTasks,
  breakSchedules, onAddBreakSchedule, onDeleteBreakSchedule,
  bomItems, bomRequests, onAddBOMItem, onBatchAddBOMItems, onDeleteBOMItem, onDeleteAllBOMItems, onApproveBOMRequest, onRejectBOMRequest,
  roles, permissions, onAddRole, onDeleteRole, onUpdatePermission,
  installPrompt, onInstallApp,
  systemConfig, onUpdateSystemConfig,
  dbLoadWarning
}) => {
  const [activeSection, setActiveSection] = useState('1');

  // User State
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<'USER' | 'ADMIN' | 'LEADER'>('USER');
  const [userError, setUserError] = useState('');
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // DB State
  const [newPart, setNewPart] = useState('');
  const [newPartDesc, setNewPartDesc] = useState('');
  const [bulkParts, setBulkParts] = useState('');
  const [partSearch, setPartSearch] = useState('');
  
  const [newWorkplace, setNewWorkplace] = useState('');
  const [newWorkplaceTime, setNewWorkplaceTime] = useState('');
  const [bulkWorkplaces, setBulkWorkplaces] = useState('');
  const [wpSearch, setWpSearch] = useState('');

  const [newMissingReason, setNewMissingReason] = useState('');
  const [reasonSearch, setReasonSearch] = useState('');

  const [newLogOp, setNewLogOp] = useState('');
  const [newLogOpTime, setNewLogOpTime] = useState('');
  const [logOpSearch, setLogOpSearch] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  
  // Break State
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');

  // BOM State
  const [bomParent, setBomParent] = useState('');
  const [bomChild, setBomChild] = useState('');
  const [bomQty, setBomQty] = useState('');
  const [bomBulk, setBomBulk] = useState('');
  const [bomSearchQuery, setBomSearchQuery] = useState('');
  
  // Security State
  const [scheduleStart, setScheduleStart] = useState(systemConfig.maintenanceStart || '');
  const [scheduleEnd, setScheduleEnd] = useState(systemConfig.maintenanceEnd || '');
  const [newIp, setNewIp] = useState('');
  const [myIp, setMyIp] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string | React.ReactNode;
      onConfirm: () => void;
  }>({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {}
  });

  const { t, language } = useLanguage();

  const isAdmin = currentUserRole === 'ADMIN';
  const canManageDB = isAdmin;
  
  const currentRoleId = roles.find(r => r.name === currentUserRole)?.id;
  const hasPermission = (permName: string) => {
      if (currentUserRole === 'ADMIN') return true;
      if (!currentRoleId) return false;
      return permissions.some(p => p.roleId === currentRoleId && p.permissionName === permName);
  };

  const canManageLogOps = hasPermission('perm_manage_logistics_ops');

  useEffect(() => {
      if (isAdmin) {
          fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setMyIp(data.ip))
            .catch(() => setMyIp('Error fetching IP'));
      }
  }, [isAdmin]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const uniqueUsers = useMemo(() => {
      const seen = new Set();
      return users.filter(user => {
          const upperName = user.username.toUpperCase();
          const isDuplicate = seen.has(upperName);
          seen.add(upperName);
          return !isDuplicate;
      });
  }, [users]);

  const openConfirmModal = (title: string, message: string, action: () => void) => {
      setConfirmModal({
          isOpen: true,
          title,
          message,
          onConfirm: action
      });
  };

  const closeConfirmModal = () => {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = () => {
      confirmModal.onConfirm();
      closeConfirmModal();
  };

  const filteredParts = parts.filter(p => 
      p.value.toLowerCase().includes(partSearch.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(partSearch.toLowerCase()))
  );
  const filteredWorkplaces = workplaces.filter(w => w.value.toLowerCase().includes(wpSearch.toLowerCase()));
  const filteredReasons = missingReasons.filter(r => r.value.toLowerCase().includes(reasonSearch.toLowerCase()));
  const filteredLogOps = logisticsOperations.filter(op => op.value.toLowerCase().includes(logOpSearch.toLowerCase()));

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.trim() || !newPass.trim()) { setUserError(t('user_fill')); return; }
    if (users.some(u => u.username.toUpperCase() === newUser.toUpperCase())) { setUserError(t('user_exists')); return; }
    onAddUser({ username: newUser, password: newPass, role: newRole });
    setNewUser(''); setNewPass(''); setUserError('');
    showSuccess(t('user_added_success', { username: newUser }));
  };

  const handleSavePassword = (username: string) => {
    const pass = passwordInputs[username];
    if (!pass?.trim()) return;
    onUpdatePassword(username, pass);
    setPasswordInputs(prev => ({ ...prev, [username]: '' }));
    showSuccess(t('password_changed_success', { username }));
  };

  const togglePasswordVisibility = (username: string) => {
      setVisiblePasswords(prev => ({ ...prev, [username]: !prev[username] }));
  };

  const handleDeleteUserClick = (username: string) => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('msg_delete_user', { name: username }),
          () => onDeleteUser(username)
      );
  };

  const handleAddSinglePart = (e: React.FormEvent) => {
    e.preventDefault();
    if(newPart.trim()) {
      onAddPart(newPart.trim(), newPartDesc.trim());
      setNewPart('');
      setNewPartDesc('');
      showSuccess(t('part_added_success'));
    }
  };

  const handleBulkAddParts = () => {
    const lines = bulkParts.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length > 0) {
      onBatchAddParts(lines);
      setBulkParts('');
      showSuccess(t('parts_bulk_added_success', { count: lines.length }));
    }
  };

  const handleDeletePartClick = (item: DBItem) => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('msg_delete_part', { name: item.value }),
          () => onDeletePart(item.id)
      );
  };

  const handleDeleteAllPartsConfirm = () => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('delete_all_parts_confirm'),
          () => {
              onDeleteAllParts();
              showSuccess(t('all_parts_deleted_success'));
          }
      );
  };

  const handleAddSingleWP = (e: React.FormEvent) => {
    e.preventDefault();
    if(newWorkplace.trim()) {
      const time = parseInt(newWorkplaceTime, 10);
      onAddWorkplace(newWorkplace.trim(), isNaN(time) ? 0 : time);
      setNewWorkplace('');
      setNewWorkplaceTime('');
      showSuccess(t('wp_added_success'));
    }
  };

  const handleBulkAddWP = () => {
    const lines = bulkWorkplaces.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length > 0) {
      onBatchAddWorkplaces(lines);
      setBulkWorkplaces('');
      showSuccess(t('wp_bulk_added_success', { count: lines.length }));
    }
  };

  const handleDeleteWorkplaceClick = (item: DBItem) => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('msg_delete_wp', { name: item.value }),
          () => onDeleteWorkplace(item.id)
      );
  };

  const handleDeleteAllWPConfirm = () => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('delete_all_workplaces_confirm'),
          () => {
              onDeleteAllWorkplaces();
              showSuccess(t('all_workplaces_deleted_success'));
          }
      );
  };
  
  const handleAddReason = (e: React.FormEvent) => {
      e.preventDefault();
      if(newMissingReason.trim()) {
          onAddMissingReason(newMissingReason.trim());
          setNewMissingReason('');
          showSuccess(t('reason_added_success'));
      }
  };

  const handleDeleteReasonClick = (item: DBItem) => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('msg_delete_reason', { name: item.value }),
          () => onDeleteMissingReason(item.id)
      );
  };

  const handleAddLogOp = (e: React.FormEvent) => {
      e.preventDefault();
      if(newLogOp.trim() && onAddLogisticsOperation) {
          const time = parseInt(newLogOpTime, 10);
          onAddLogisticsOperation(newLogOp.trim(), isNaN(time) ? 0 : time);
          setNewLogOp('');
          setNewLogOpTime('');
          showSuccess(t('op_added_success'));
      }
  };

  const handleDeleteLogOpClick = (item: DBItem) => {
      if(onDeleteLogisticsOperation) {
          openConfirmModal(
              t('modal_confirm_title'),
              t('msg_delete_log_op', { name: item.value }),
              () => onDeleteLogisticsOperation(item.id)
          );
      }
  };
  
  const handleRunArchiving = async () => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('archive_confirm'),
          async () => {
              setIsArchiving(true);
              const result = await onArchiveTasks();
              setIsArchiving(false);
              
              if (result.success) {
                  if (result.count === 0 && result.message) {
                       alert(result.message);
                  } else {
                       alert(t('archive_success', { count: result.count || 0 }));
                  }
              } else {
                  alert(t('archive_error', { error: result.error || 'Unknown' }));
              }
          }
      );
  };

  const handleAddBreak = (e: React.FormEvent) => {
      e.preventDefault();
      if (newBreakStart && newBreakEnd) {
          onAddBreakSchedule(newBreakStart, newBreakEnd);
          setNewBreakStart('');
          setNewBreakEnd('');
          showSuccess(t('break_added_success'));
      }
  };

  const handleDeleteBreakClick = (id: string) => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('msg_delete_break'),
          () => onDeleteBreakSchedule(id)
      );
  };

  const handleAddBOM = (e: React.FormEvent) => {
      e.preventDefault();
      if(bomParent && bomChild && bomQty) {
          onAddBOMItem(bomParent, bomChild, parseFloat(bomQty));
          setBomParent(''); setBomChild(''); setBomQty('');
          showSuccess(t('bom_added_success'));
      }
  };

  const handleBulkAddBOM = () => {
      const lines = bomBulk.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length > 0) {
          onBatchAddBOMItems(lines);
          setBomBulk('');
          showSuccess(t('bom_bulk_added_success', { count: lines.length }));
      }
  }

  const handleDeleteBOMClick = (item: BOMItem) => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('msg_delete_bom', { parent: item.parentPart, child: item.childPart }),
          () => onDeleteBOMItem(item.id)
      );
  };

  const handleDeleteAllBOMConfirm = () => {
      openConfirmModal(
          t('modal_confirm_title'),
          t('delete_all_bom_confirm'),
          () => {
              onDeleteAllBOMItems();
              showSuccess(t('all_bom_deleted_success'));
          }
      );
  }

  const filteredBOMItems = useMemo(() => {
    return bomItems.filter(item => 
        item.parentPart.toLowerCase().includes(bomSearchQuery.toLowerCase()) || 
        item.childPart.toLowerCase().includes(bomSearchQuery.toLowerCase())
    );
  }, [bomItems, bomSearchQuery]);
  
  const handleToggleMaintenance = () => {
      onUpdateSystemConfig({ maintenanceMode: !systemConfig.maintenanceMode });
  };
  
  const handleSaveMaintenanceSchedule = () => {
      if (scheduleStart && scheduleEnd) {
          onUpdateSystemConfig({ maintenanceStart: scheduleStart, maintenanceEnd: scheduleEnd });
          showSuccess('Schedule saved');
      }
  };
  
  const handleClearSchedule = () => {
      setScheduleStart('');
      setScheduleEnd('');
      onUpdateSystemConfig({ maintenanceStart: '', maintenanceEnd: '' });
  };
  
  const handleToggleIpCheck = () => {
      onUpdateSystemConfig({ ipCheckEnabled: !systemConfig.ipCheckEnabled });
  };
  
  const handleAddIp = () => {
      if (newIp.trim()) {
          const updated = [...(systemConfig.allowedIPs || []), newIp.trim()];
          onUpdateSystemConfig({ allowedIPs: updated });
          setNewIp('');
          showSuccess(t('sec_ip_added'));
      }
  };
  
  const handleRemoveIp = (ip: string) => {
      const updated = (systemConfig.allowedIPs || []).filter(i => i !== ip);
      onUpdateSystemConfig({ allowedIPs: updated });
      showSuccess(t('sec_ip_removed'));
  };

  // Industriálne Tailwind triedy - KOMPAKTNÉ PRE MOBIL
  const industrialCardClass = "bg-[#1a1f2e] border border-slate-800 rounded-xl p-3 md:p-6 shadow-2xl relative ring-1 ring-white/5 h-full min-h-[500px]";
  const subPanelClass = "bg-slate-900/50 rounded-lg p-3 md:p-5 border border-white/5 backdrop-blur-sm shadow-inner mb-4";
  const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2";
  const inputModernClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 md:py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all font-mono";
  const dbSectionClass = "bg-slate-900/40 border border-slate-800 rounded-xl p-4 md:p-6 shadow-xl flex flex-col h-full";

  const navLinks = [
    { id: '1', label: '1. Tím' },
    { id: '2', label: '2. Diely' },
    { id: '3', label: '3. Pracoviská' },
    { id: '4', label: '4. Prestoje' },
    { id: '5', label: '5. Operácie' },
    { id: '6', label: '6. Údržba' },
    { id: '7', label: '7. Prestávky' },
    { id: '8', label: '8. Inštalácia' },
    { id: '9', label: '9. BOM' },
    { id: '10', label: '10. Bezpečnosť' }
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in relative px-2 md:px-0">
      {successMsg && <div className="fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-xl z-[100] animate-bounce">{successMsg}</div>}

      <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 md:mb-4">NASTAVENIA</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* NAVIGÁCIA - SIDEBAR NA DESKTOPE, HORIZONTÁLNY POSUV NA MOBILE */}
        <div className="w-full md:w-64 flex-shrink-0">
            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 scrollbar-hide md:sticky md:top-4">
                {navLinks.map(link => (
                    <button 
                        key={link.id} 
                        onClick={() => setActiveSection(link.id)}
                        className={`whitespace-nowrap px-3 py-2 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border text-left flex items-center justify-between min-w-[100px] md:min-w-0 ${activeSection === link.id ? 'bg-teal-500/10 text-teal-400 border-teal-500/50 border-b-2' : 'bg-slate-900/50 text-slate-500 border-slate-800'}`}
                    >
                        <span>{link.label}</span>
                        {link.id === '1' && (partRequests.length > 0 || bomRequests.length > 0) && (
                            <span className="ml-2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{partRequests.length + bomRequests.length}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-grow min-w-0">
            {activeSection === '1' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-gray-900 rounded-xl p-3 md:p-6 shadow-lg border border-yellow-700/50">
                        <h2 className="text-lg font-bold text-yellow-400 mb-4 uppercase">{t('req_title')}</h2>
                        {partRequests.length > 0 || bomRequests.length > 0 ? ( 
                            <div className="space-y-3">
                                {partRequests.map(req => (
                                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 gap-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-white text-base font-mono truncate">{req.partNumber}</p>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{t('requested_by')}: {req.requestedBy}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => onApprovePartRequest(req)} className="bg-green-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest">✓ {t('req_approve')}</button>
                                            <button onClick={() => onRejectPartRequest(req.id)} className="bg-red-900 text-red-200 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest">✕ {t('req_reject')}</button>
                                        </div>
                                    </div>
                                ))}
                                {bomRequests.map(req => (
                                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 gap-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-white text-base font-mono truncate">{req.parentPart}</p>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{t('requested_by')}: {req.requestedBy}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => onApproveBOMRequest(req)} className="bg-green-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest">✓ {t('req_approve')}</button>
                                            <button onClick={() => onRejectBOMRequest(req.id)} className="bg-red-900 text-red-200 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest">✕ {t('req_reject')}</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-gray-500 italic text-center py-2 text-xs uppercase font-black">{t('no_requests')}</p>}
                    </div>

                    <div className={industrialCardClass}>
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-4">{t('sect_users_manage')}</h2>
                        <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {uniqueUsers.map((user) => (
                                <div key={user.id || user.username} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/40 border border-white/5 p-3 rounded-lg gap-3">
                                    <div className="flex items-center gap-3 min-w-[150px]">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-teal-500/10 text-teal-500 border-teal-500/20'}`}>
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-white text-xs truncate">{user.username}</p>
                                                {isAdmin && <button onClick={() => togglePasswordVisibility(user.username)} className="text-slate-600 hover:text-white"><EyeIcon className="w-3 h-3" /></button>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isAdmin && user.username !== 'ADMIN' ? ( 
                                                    <select value={user.role} onChange={(e) => onUpdateUserRole(user.username, e.target.value as any)} className="bg-slate-800 text-[9px] font-black text-slate-400 border border-slate-700 rounded px-1 py-0.5 outline-none uppercase">
                                                        {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                                    </select>
                                                ) : <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{user.role}</p>}
                                                {visiblePasswords[user.username] && isAdmin && <span className="text-[9px] text-yellow-500/80 font-mono bg-yellow-500/5 px-1 rounded border border-yellow-500/20">{user.password}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex flex-1 gap-2 items-center">
                                            <input type="text" placeholder={t('new_password_placeholder')} value={passwordInputs[user.username] || ''} onChange={(e) => setPasswordInputs(p => ({ ...p, [user.username]: e.target.value }))} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none" />
                                            <button onClick={() => handleSavePassword(user.username)} disabled={!passwordInputs[user.username]} className={`p-2 rounded-lg ${!passwordInputs[user.username] ? 'bg-slate-800 text-slate-700' : 'bg-teal-600/10 text-teal-500 border border-teal-500/20'}`} title={t('btn_save')}><SaveIcon className="w-3.5 h-3.5" /></button>
                                            {isAdmin && user.username !== 'ADMIN' && <button onClick={() => handleDeleteUserClick(user.username)} className="p-2 bg-red-900/5 text-slate-600 hover:text-red-500 rounded-lg"><TrashIcon className="w-3.5 h-3.5" /></button>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className={subPanelClass}>
                            <h3 className={labelClass}>{t('user_add_title')}</h3>
                            <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                                <input value={newUser} onChange={e => setNewUser(e.target.value)} className={inputModernClass} placeholder="MENO" />
                                <input value={newPass} onChange={e => setNewPass(e.target.value)} className={inputModernClass} placeholder="HESLO" />
                                <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className={`${inputModernClass} font-black text-[10px]`}>
                                    {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded-lg uppercase tracking-widest text-[10px] h-[38px] md:h-[46px]">{t('user_add_btn')}</button>
                            </form>
                            {userError && <p className="text-red-400 text-[9px] font-bold mt-2 uppercase">{userError}</p>}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === '2' && (
                <div className={industrialCardClass}>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">{t('sect_parts')}</h2>
                        {canManageDB && parts.length > 0 && <button onClick={handleDeleteAllPartsConfirm} className="text-[9px] font-black bg-red-900/30 text-red-400 border border-red-900/40 px-2 py-1 rounded uppercase">{t('delete_all')}</button>}
                    </div>
                    <div className="mb-4 relative">
                        <input value={partSearch} onChange={e=>setPartSearch(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none font-mono" placeholder={t('search_db_placeholder')} />
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-64 bg-slate-900/50 rounded-lg mb-4 p-2 space-y-1 custom-scrollbar border border-white/5">
                        {filteredParts.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-800/60 px-3 py-1.5 rounded border border-white/5 group">
                                <span className="text-[11px] font-mono font-bold text-slate-200">{item.value} {item.description && <span className="text-slate-500 ml-2 italic font-normal text-[9px]">- {item.description}</span>}</span>
                                {canManageDB && <button onClick={() => handleDeletePartClick(item)} className="text-slate-600 hover:text-red-500 px-2">×</button>}
                            </div>
                        ))}
                    </div>
                    {canManageDB && (
                        <div className="space-y-4">
                            <form onSubmit={handleAddSinglePart} className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input value={newPart} onChange={e => setNewPart(e.target.value)} placeholder={t('new_part_place')} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-[10px] outline-none" />
                                    <input value={newPartDesc} onChange={e => setNewPartDesc(e.target.value)} placeholder={t('part_desc_placeholder')} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-[10px] outline-none" />
                                </div>
                                <button type="submit" className="w-full bg-teal-600 text-white font-black py-2 rounded-lg text-[10px] uppercase tracking-widest">{t('add_single')}</button>
                            </form>
                            <div className="pt-2 border-t border-slate-800">
                                <textarea value={bulkParts} onChange={e => setBulkParts(e.target.value)} className="w-full h-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-[9px] font-mono outline-none resize-none" placeholder={t('bulk_parts_placeholder')} />
                                <button onClick={handleBulkAddParts} className="mt-2 w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest">{t('bulk_btn_parts')}</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeSection === '3' && (
                <div className={industrialCardClass}>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">{t('sect_wp')}</h2>
                        {canManageDB && workplaces.length > 0 && <button onClick={handleDeleteAllWPConfirm} className="text-[9px] font-black bg-red-900/30 text-red-400 border border-red-900/40 px-2 py-1 rounded uppercase">{t('delete_all')}</button>}
                    </div>
                    <div className="mb-4 relative">
                        <input value={wpSearch} onChange={e=>setWpSearch(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none font-mono" placeholder={t('search_db_placeholder')} />
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-64 bg-slate-900/50 rounded-lg mb-4 p-2 space-y-1 custom-scrollbar border border-white/5">
                        {filteredWorkplaces.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-800/60 px-3 py-1.5 rounded border border-white/5 group">
                                <span className="text-[11px] font-mono font-bold text-slate-200">{item.value} {item.standardTime ? <span className="text-teal-500/70 ml-1 text-[9px]">({item.standardTime}m)</span> : ''}</span>
                                {canManageDB && <button onClick={() => handleDeleteWorkplaceClick(item)} className="text-slate-600 hover:text-red-500 px-2">×</button>}
                            </div>
                        ))}
                    </div>
                    {canManageDB && (
                        <div className="space-y-4">
                            <form onSubmit={handleAddSingleWP} className="flex gap-2">
                                <input value={newWorkplace} onChange={e => setNewWorkplace(e.target.value)} placeholder={t('new_wp_place')} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-[10px] outline-none" />
                                <input type="number" value={newWorkplaceTime} onChange={e => setNewWorkplaceTime(e.target.value)} placeholder="min" className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-[10px] outline-none" />
                                <button type="submit" className="bg-teal-600 text-white font-black px-3 py-2 rounded-lg text-[10px] uppercase tracking-widest">{t('add_single')}</button>
                            </form>
                            <div className="pt-2 border-t border-slate-800">
                                <textarea value={bulkWorkplaces} onChange={e => setBulkWorkplaces(e.target.value)} className="w-full h-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-[9px] font-mono outline-none resize-none" placeholder={t('bulk_wp_placeholder')} />
                                <button onClick={handleBulkAddWP} className="mt-2 w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black py-2 rounded-lg text-[10px] uppercase tracking-widest">{t('bulk_btn_wp')}</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeSection === '4' && (
                <div className={industrialCardClass}>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4">{t('sect_reasons')}</h2>
                    <div className="mb-4 relative">
                        <input value={reasonSearch} onChange={e=>setReasonSearch(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none" placeholder={t('search_db_placeholder')} />
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-80 bg-slate-900/50 rounded-lg mb-4 p-2 space-y-1 custom-scrollbar border border-white/5">
                        {filteredReasons.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-800/60 px-3 py-2 rounded border border-white/5 group">
                                <span className="text-[11px] font-bold text-slate-200">{item.value}</span>
                                {canManageDB && <button onClick={() => handleDeleteReasonClick(item)} className="text-slate-600 hover:text-red-500 px-2">×</button>}
                            </div>
                        ))}
                    </div>
                    {canManageDB && (
                        <form onSubmit={handleAddReason} className="flex gap-2">
                            <input value={newMissingReason} onChange={e => setNewMissingReason(e.target.value)} placeholder={t('new_reason_place')} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-[10px] outline-none" />
                            <button type="submit" className="bg-teal-600 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest">{t('add_single')}</button>
                        </form>
                    )}
                </div>
            )}

            {activeSection === '5' && (
                <div className={industrialCardClass}>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4">{t('sect_log_ops')}</h2>
                    <div className="mb-4 relative">
                        <input value={logOpSearch} onChange={e=>setLogOpSearch(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-600 outline-none font-mono" placeholder={t('search_db_placeholder')} />
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-80 bg-slate-900/50 rounded-lg mb-4 p-2 space-y-1 custom-scrollbar border border-white/5">
                        {filteredLogOps.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-800/60 px-3 py-2 rounded border border-white/5 group">
                                <span className="text-[11px] font-mono font-bold text-slate-200">{item.value} {item.standardTime ? <span className="text-teal-500/70 ml-2 text-[9px]">({item.standardTime}m)</span> : ''}</span>
                                {canManageLogOps && <button onClick={() => handleDeleteLogOpClick(item)} className="text-slate-600 hover:text-red-500 px-2">×</button>}
                            </div>
                        ))}
                    </div>
                    {canManageLogOps && (
                        <form onSubmit={handleAddLogOp} className="flex gap-2">
                            <input value={newLogOp} onChange={e => setNewLogOp(e.target.value)} placeholder={t('new_op_place')} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-[10px] outline-none" />
                            <input type="number" value={newLogOpTime} onChange={e => setNewLogOpTime(e.target.value)} placeholder="min" className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-[10px] outline-none" />
                            <button type="submit" className="bg-teal-600 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest">{t('add_single')}</button>
                        </form>
                    )}
                </div>
            )}

            {activeSection === '6' && (
                <div className="bg-slate-950/50 rounded-xl p-4 md:p-8 shadow-2xl border-2 border-slate-800 h-full flex flex-col justify-center">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4">{t('sect_maint')}</h2>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed font-medium max-w-xl">{t('maint_desc')}</p>
                    <div className="space-y-4 max-w-md">
                        <button onClick={handleRunArchiving} disabled={isArchiving} className={`w-full py-4 px-6 rounded-lg font-black shadow-lg flex items-center justify-center gap-3 transition-all ${isArchiving ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'}`}>
                            <span className="uppercase tracking-[0.2em] text-[10px] md:text-xs">{isArchiving ? t('archiving') : t('archive_btn')}</span>
                        </button>
                        <div className="pt-2">
                            <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-slate-900/80 border border-slate-700 rounded-lg">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('sect_maint_db_link')}</span>
                                <span className="text-slate-600 text-lg">→</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === '7' && (
                <div className={industrialCardClass}>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4 border-b border-slate-800 pb-2">{t('sect_breaks')}</h2>
                    <div className="space-y-2 mb-6 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                        {breakSchedules.length > 0 ? breakSchedules.map(b => (
                            <div key={b.id} className="flex justify-between items-center bg-slate-800/60 px-4 py-3 rounded-lg border border-white/5 transition-all group shadow-sm">
                                <span className="text-sm font-mono font-black text-slate-200 tracking-wider">{b.start} — {b.end}</span>
                                <button onClick={() => handleDeleteBreakClick(b.id)} className="text-slate-600 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        )) : <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20"><span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">No Breaks</span></div>}
                    </div>
                    <form onSubmit={handleAddBreak} className="mt-auto bg-slate-900/50 p-4 rounded-xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2">
                            <input type="time" value={newBreakStart} onChange={e => setNewBreakStart(e.target.value)} required className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none font-mono" />
                            <span className="text-slate-600 font-black">—</span>
                            <input type="time" value={newBreakEnd} onChange={e => setNewBreakEnd(e.target.value)} required className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none font-mono" />
                            <button type="submit" className="bg-teal-600 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest shadow-lg">ADD</button>
                        </div>
                    </form>
                </div>
            )}

            {activeSection === '8' && (activeSection === '8' && (
                <div className="bg-slate-950/50 rounded-xl p-6 md:p-12 shadow-2xl border-2 border-slate-800 h-full flex flex-col justify-center items-center text-center">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-4">{t('sect_pwa')}</h2>
                    <p className="text-xs md:text-sm text-slate-400 mb-8 max-w-sm leading-relaxed">{t('pwa_desc')}</p>
                    <button onClick={onInstallApp} disabled={!installPrompt} className={`w-full max-w-xs py-4 rounded-lg font-black shadow-lg flex items-center justify-center gap-3 transition-all ${!installPrompt ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white'}`}>
                        <span className="uppercase tracking-[0.2em] text-[10px] md:text-xs">{installPrompt ? t('pwa_install_btn') : t('pwa_installed')}</span>
                    </button>
                </div>
            ))}

            {activeSection === '9' && (
                <div className={industrialCardClass}>
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2">
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter">{t('sect_bom')}</h2>
                        {isAdmin && bomItems.length > 0 && <button onClick={handleDeleteAllBOMConfirm} className="bg-red-900/30 text-red-400 border border-red-900/50 px-2 py-1 rounded text-[9px] font-black uppercase">{t('delete_all')}</button>}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                        <div className="lg:col-span-4 space-y-4">
                            <div className={subPanelClass}>
                                <h3 className={labelClass}>{t('bom_add_single')}</h3>
                                <form onSubmit={handleAddBOM} className="space-y-2">
                                    <input value={bomParent} onChange={e=>setBomParent(e.target.value.toUpperCase())} placeholder="RODIČ" className={inputModernClass} />
                                    <input value={bomChild} onChange={e=>setBomChild(e.target.value.toUpperCase())} placeholder="DIEŤA" className={inputModernClass} />
                                    <input type="number" step="0.0001" value={bomQty} onChange={e=>setBomQty(e.target.value)} placeholder="KS/KUS" className={inputModernClass} />
                                    <button type="submit" className="w-full bg-teal-600 text-white font-black py-2 rounded-lg text-[10px] uppercase tracking-widest">{t('add_single')}</button>
                                </form>
                            </div>
                            <div className={subPanelClass}>
                                <h3 className={labelClass}>{t('bom_bulk_label')}</h3>
                                <textarea value={bomBulk} onChange={e=>setBomBulk(e.target.value)} className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-[10px] font-mono outline-none resize-none" placeholder="PARENT;CHILD;QTY" />
                                <button onClick={handleBulkAddBOM} className="mt-2 w-full bg-blue-600 text-white font-black py-2 rounded-lg text-[10px] uppercase tracking-widest">{t('bom_bulk_btn')}</button>
                            </div>
                        </div>
                        <div className="lg:col-span-8 flex flex-col">
                            <input value={bomSearchQuery} onChange={e=>setBomSearchQuery(e.target.value)} className={`${inputModernClass} mb-2 text-xs`} placeholder={t('bom_search_placeholder')} />
                            <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden shadow-inner flex flex-col">
                                <div className="overflow-y-auto custom-scrollbar flex-1 relative max-h-[350px]">
                                    <table className="w-full text-left text-[11px] border-collapse">
                                        <thead className="sticky top-0 z-20 bg-[#1a1f2e] border-b border-slate-800">
                                            <tr className="text-slate-500 font-black uppercase tracking-widest">
                                                <th className="py-2 px-3">Parent</th>
                                                <th className="py-2 px-3">Child</th>
                                                <th className="py-2 px-3 text-right">Qty</th>
                                                <th className="py-2 px-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/40">
                                            {filteredBOMItems.map(item => (
                                                <tr key={item.id} className="hover:bg-teal-500/5 transition-colors group even:bg-slate-800/10">
                                                    <td className="py-2 px-3 font-mono font-black text-white">{item.parentPart}</td>
                                                    <td className="py-2 px-3 font-mono text-slate-400">{item.childPart}</td>
                                                    <td className="py-2 px-3 text-right font-mono text-teal-400 font-bold">{item.quantity}</td>
                                                    <td className="py-2 px-3 text-right"><button onClick={() => handleDeleteBOMClick(item)} className="text-slate-600 hover:text-red-500 px-1">×</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === '10' && (
                <div className={industrialCardClass}>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-4 border-b border-slate-800 pb-2">{t('sect_security')}</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className={`${subPanelClass} ${systemConfig.maintenanceMode ? 'bg-red-900/10 border-red-500/30' : ''}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-black text-white uppercase">{t('sec_maint_mode')}</h3>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${systemConfig.maintenanceMode ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>{systemConfig.maintenanceMode ? t('sec_maint_active') : t('sec_maint_inactive')}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-4">{t('sec_maint_desc')}</p>
                                <button onClick={handleToggleMaintenance} className={`w-full py-2 rounded-lg font-black text-[10px] uppercase tracking-widest ${systemConfig.maintenanceMode ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>{systemConfig.maintenanceMode ? t('sec_btn_disable') : t('sec_btn_enable')}</button>
                            </div>
                            <div className={subPanelClass}>
                                <h4 className={labelClass}>{t('sec_schedule_title')}</h4>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <input type="datetime-local" value={scheduleStart} onChange={e=>setScheduleStart(e.target.value)} className={inputModernClass} />
                                    <input type="datetime-local" value={scheduleEnd} onChange={e=>setScheduleEnd(e.target.value)} className={inputModernClass} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSaveMaintenanceSchedule} className="flex-1 bg-teal-600 text-white text-[9px] font-black py-2 rounded uppercase">{t('sec_btn_schedule')}</button>
                                    <button onClick={handleClearSchedule} className="bg-slate-800 text-slate-400 text-[9px] font-black py-2 px-3 rounded uppercase">{t('sec_btn_clear_schedule')}</button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className={subPanelClass}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-black text-white uppercase">{t('sec_ip_whitelist')}</h3>
                                    <button onClick={handleToggleIpCheck} className={`text-[9px] font-black px-2 py-1 rounded border ${systemConfig.ipCheckEnabled ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-slate-800 text-slate-500'}`}>{systemConfig.ipCheckEnabled ? 'ON' : 'OFF'}</button>
                                </div>
                                <div className="bg-black/20 p-2 rounded border border-white/5 mb-4 flex justify-between items-center text-[10px]">
                                    <span className="text-slate-500 uppercase font-black">{t('sec_my_ip')}</span>
                                    <span className="font-mono text-teal-400">{myIp}</span>
                                </div>
                                <div className="space-y-1 mb-4 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                    {(systemConfig.allowedIPs || []).map(ip => (
                                        <div key={ip} className="flex justify-between items-center bg-slate-900/60 px-3 py-1.5 rounded border border-white/5 text-[10px]">
                                            <span className="font-mono text-slate-300">{ip}</span>
                                            <button onClick={() => handleRemoveIp(ip)} className="text-slate-600 hover:text-red-500">×</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    <input value={newIp} onChange={e=>setNewIp(e.target.value)} placeholder="0.0.0.0" className={`${inputModernClass} !py-2 text-[10px]`} />
                                    <button onClick={handleAddIp} className="bg-blue-600 text-white px-3 rounded-lg font-black">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Confirmation Modal Portal */}
      {confirmModal.isOpen && createPortal(
           <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={closeConfirmModal}>
               <div className="bg-[#1a1f2e] border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                   <div className="text-center mb-6">
                       <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">{confirmModal.title}</h3>
                       <div className="text-slate-400 text-xs font-medium leading-relaxed uppercase">{confirmModal.message}</div>
                   </div>
                   <div className="flex gap-3">
                       <button onClick={closeConfirmModal} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-lg font-black uppercase text-[10px] tracking-widest">{t('btn_cancel')}</button>
                       <button onClick={handleConfirmAction} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-black shadow-lg uppercase text-[10px] tracking-widest">OK</button>
                   </div>
               </div>
           </div>,
           document.body
       )}
    </div>
  );
};

export default SettingsTab;
