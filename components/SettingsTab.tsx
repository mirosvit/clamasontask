
import React, { useState, useEffect } from 'react';
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
  onAddLogisticsOperation?: (val: string, time?: number) => void; // Updated signature
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
  const [newLogOpTime, setNewLogOpTime] = useState(''); // Added time state
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

  const { t } = useLanguage();

  const isAdmin = currentUserRole === 'ADMIN';
  const canManageDB = isAdmin; // Simplified since Logistician removed
  
  const currentRoleId = roles.find(r => r.name === currentUserRole)?.id;
  const hasPermission = (permName: string) => {
      // Safety: Admin always has access 
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

  // Helper to open confirm modal
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

  // --- Filter Helpers ---
  const filteredParts = parts.filter(p => 
      p.value.toLowerCase().includes(partSearch.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(partSearch.toLowerCase()))
  );
  const filteredWorkplaces = workplaces.filter(w => w.value.toLowerCase().includes(wpSearch.toLowerCase()));
  const filteredReasons = missingReasons.filter(r => r.value.toLowerCase().includes(reasonSearch.toLowerCase()));
  const filteredLogOps = logisticsOperations.filter(op => op.value.toLowerCase().includes(logOpSearch.toLowerCase()));

  // --- User Handlers ---
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.trim() || !newPass.trim()) { setUserError(t('user_fill')); return; }
    if (users.some(u => u.username.toUpperCase() === newUser.toUpperCase())) { setUserError(t('user_exists')); return; }
    onAddUser({ username: newUser, password: newPass, role: newRole });
    setNewUser(''); setNewPass(''); setUserError('');
    showSuccess(t('user_added_success', { username: newUser })); // Added translation
  };

  const handleSavePassword = (username: string) => {
    const pass = passwordInputs[username];
    if (!pass?.trim()) return;
    onUpdatePassword(username, pass);
    setPasswordInputs(prev => ({ ...prev, [username]: '' }));
    showSuccess(t('password_changed_success', { username })); // Added translation
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

  // --- DB Handlers ---
  const handleAddSinglePart = (e: React.FormEvent) => {
    e.preventDefault();
    if(newPart.trim()) {
      onAddPart(newPart.trim(), newPartDesc.trim());
      setNewPart('');
      setNewPartDesc('');
      showSuccess(t('part_added_success')); // Added translation
    }
  };

  const handleBulkAddParts = () => {
    const lines = bulkParts.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length > 0) {
      onBatchAddParts(lines);
      setBulkParts('');
      showSuccess(t('parts_bulk_added_success', { count: lines.length })); // Added translation
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
      showSuccess(t('wp_added_success')); // Added translation
    }
  };

  const handleBulkAddWP = () => {
    const lines = bulkWorkplaces.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length > 0) {
      onBatchAddWorkplaces(lines);
      setBulkWorkplaces('');
      showSuccess(t('wp_bulk_added_success', { count: lines.length })); // Added translation
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
          showSuccess(t('reason_added_success')); // Added translation
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
          showSuccess(t('break_added_success')); // Added translation
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
          showSuccess(t('bom_added_success')); // Added translation
      }
  };

  const handleBulkAddBOM = () => {
      const lines = bomBulk.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length > 0) {
          onBatchAddBOMItems(lines);
          setBomBulk('');
          showSuccess(t('bom_bulk_added_success', { count: lines.length })); // Added translation
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

  const filteredBOMItems = bomItems.filter(item => 
      item.parentPart.toLowerCase().includes(bomSearchQuery.toLowerCase()) || 
      item.childPart.toLowerCase().includes(bomSearchQuery.toLowerCase())
  );
  
  // Security Handlers
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


  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-8 animate-fade-in relative">
      {successMsg && <div className="fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-xl z-50 animate-bounce">{successMsg}</div>}

      {/* REQUESTS */}
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-yellow-700/50">
          <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
              <h2 className="text-xl font-bold text-yellow-400">{t('req_title')}</h2>
              {(partRequests.length > 0 || bomRequests.length > 0) && <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">{partRequests.length + bomRequests.length} {t('req_waiting')}</span>}
          </div>
          {partRequests.length > 0 || bomRequests.length > 0 ? ( 
              <div className="space-y-3">
                  {/* Part Requests */}
                  {partRequests.map(req => (
                      <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <div>
                            <p className="font-bold text-white text-lg font-mono">
                                <span className="text-gray-400 font-normal text-base mr-2">{t('req_type_part')}:</span>
                                {req.partNumber}
                            </p>
                            <p className="text-sm text-gray-400">{t('requested_by')}: {req.requestedBy} ({new Date(req.requestedAt).toLocaleString('sk-SK')})</p>
                          </div>
                          <div className="flex gap-2 mt-3 sm:mt-0">
                               <button onClick={() => onApprovePartRequest(req)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-sm font-bold">✓ {t('req_approve')}</button>
                               <button onClick={() => onRejectPartRequest(req.id)} className="bg-red-900 hover:bg-red-700 text-red-200 px-4 py-2 rounded text-sm font-bold">✕ {t('req_reject')}</button>
                          </div>
                      </div>
                  ))}
                  {/* BOM Requests */}
                  {bomRequests.map(req => (
                      <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <div>
                            <p className="font-bold text-white text-lg font-mono">
                                <span className="text-gray-400 font-normal text-base mr-2">{t('req_type_bom')}:</span>
                                {req.parentPart}
                            </p>
                            <p className="text-sm text-gray-400">{t('requested_by')}: {req.requestedBy} ({new Date(req.requestedAt).toLocaleString('sk-SK')})</p>
                          </div>
                          <div className="flex gap-2 mt-3 sm:mt-0">
                               <button onClick={() => onApproveBOMRequest(req)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-sm font-bold">✓ {t('req_approve')}</button>
                               <button onClick={() => onRejectBOMRequest(req.id)} className="bg-red-900 hover:bg-red-700 text-red-200 px-4 py-2 rounded text-sm font-bold">✕ {t('req_reject')}</button>
                          </div>
                      </div>
                  ))}
              </div>
          ) : <p className="text-gray-500 italic text-center py-4">{t('no_requests')}</p>}
      </div>

      {/* 1. USERS */}
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700">
        <h2 className="text-xl font-bold text-teal-400 mb-6 border-b border-gray-700 pb-2">{t('sect_users_manage')}</h2>
        <div className="space-y-4 mb-8">
          {users.map((user) => (
              <div key={user.username} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-800 p-4 rounded-lg gap-4">
                <div className="flex items-center gap-3 min-w-[150px]">
                  <div className={`w-3 h-3 rounded-full ${user.role === 'ADMIN' ? 'bg-red-500' : 'bg-teal-500'}`}></div>
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-white">{user.username}</p>
                        {isAdmin && (
                            <button onClick={() => togglePasswordVisibility(user.username)} className="text-gray-500 hover:text-white" title={t('user_show_pass')}><EyeIcon className="w-4 h-4" /></button>
                        )}
                    </div>
                    {visiblePasswords[user.username] && isAdmin && <p className="text-xs text-yellow-400 font-mono mt-1">{user.password}</p>}
                    {isAdmin && user.username !== 'ADMIN' ? ( 
                       <select value={user.role} onChange={(e) => onUpdateUserRole(user.username, e.target.value as any)} className="mt-1 text-xs bg-gray-700 text-white border border-gray-600 rounded">
                           {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                       </select>
                    ) : <p className="text-xs text-gray-500">{user.role}</p>}
                  </div>
                </div>
                {(isAdmin) && (
                  <div className="flex flex-1 gap-2 items-center">
                    <input type="text" placeholder={t('new_password_placeholder')} value={passwordInputs[user.username] || ''} onChange={(e) => setPasswordInputs(p => ({ ...p, [user.username]: e.target.value }))} className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white" />
                    <button onClick={() => handleSavePassword(user.username)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm font-semibold whitespace-nowrap">{t('btn_save')}</button>
                    {(isAdmin && user.username !== 'ADMIN') && <button onClick={() => handleDeleteUserClick(user.username)} className="bg-red-900 hover:bg-red-700 text-red-100 px-3 py-2 rounded text-sm">X</button>}
                  </div>
                )}
              </div>
          ))}
        </div>
        <form onSubmit={handleAddUser} className="bg-gray-800 p-4 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div><input value={newUser} onChange={e => setNewUser(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" placeholder={t('user_name')} /></div>
            <div><input value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" placeholder={t('user_pass')} /></div>
            <div>
              <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold">{t('user_add_btn')}</button>
          </div>
          {userError && <p className="text-red-400 text-sm mt-2">{userError}</p>}
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 2. PARTS */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
              <h2 className="text-xl font-bold text-teal-400">{t('sect_parts')}</h2>
              {canManageDB && parts.length > 0 && <button onClick={handleDeleteAllPartsConfirm} className="text-xs bg-red-900 hover:bg-red-800 text-red-100 px-3 py-1 rounded">{t('delete_all')}</button>}
          </div>
          <div className="mb-2 relative"><SearchIcon className="absolute top-2 left-2 w-4 h-4 text-gray-500"/><input value={partSearch} onChange={e=>setPartSearch(e.target.value)} className="w-full pl-8 pr-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white" placeholder={t('search_db_placeholder')} /></div>
          <div className="flex-1 overflow-y-auto max-h-60 bg-gray-800 rounded mb-4 p-2 space-y-1 custom-scrollbar">
            {filteredParts.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-700 px-3 py-1 rounded hover:bg-gray-600">
                <span className="text-sm font-mono">
                    {item.value} 
                    {item.description && <span className="text-gray-400 ml-2 italic">- {item.description}</span>}
                </span>
                {canManageDB && <button onClick={() => handleDeletePartClick(item)} className="text-red-400 hover:text-red-200">×</button>}
              </div>
            ))}
          </div>
          {canManageDB && (
            <>
              <form onSubmit={handleAddSinglePart} className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2">
                    <input value={newPart} onChange={e => setNewPart(e.target.value)} placeholder={t('new_part_place')} className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                    <input value={newPartDesc} onChange={e => setNewPartDesc(e.target.value)} placeholder={t('part_desc_placeholder')} className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                </div>
                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded text-sm">{t('add_single')}</button>
              </form>
              <div className="mt-auto pt-4 border-t border-gray-700">
                <textarea value={bulkParts} onChange={e => setBulkParts(e.target.value)} className="w-full h-24 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-xs font-mono" placeholder={t('bulk_parts_placeholder')} />
                <button onClick={handleBulkAddParts} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">{t('bulk_btn_parts')}</button>
              </div>
            </>
          )}
        </div>

        {/* 3. WORKPLACES */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
              <h2 className="text-xl font-bold text-teal-400">{t('sect_wp')}</h2>
              {canManageDB && workplaces.length > 0 && <button onClick={handleDeleteAllWPConfirm} className="text-xs bg-red-900 hover:bg-red-800 text-red-100 px-3 py-1 rounded">{t('delete_all')}</button>}
          </div>
          <div className="mb-2 relative"><SearchIcon className="absolute top-2 left-2 w-4 h-4 text-gray-500"/><input value={wpSearch} onChange={e=>setWpSearch(e.target.value)} className="w-full pl-8 pr-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white" placeholder={t('search_db_placeholder')} /></div>
          <div className="flex-1 overflow-y-auto max-h-60 bg-gray-800 rounded mb-4 p-2 space-y-1 custom-scrollbar">
            {filteredWorkplaces.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-700 px-3 py-1 rounded hover:bg-gray-600">
                <span className="text-sm font-mono">{item.value} {item.standardTime ? `(${item.standardTime} min)` : ''}</span>
                {canManageDB && <button onClick={() => handleDeleteWorkplaceClick(item)} className="text-red-400 hover:text-red-200">×</button>}
              </div>
            ))}
          </div>
          {canManageDB && (
            <>
              <form onSubmit={handleAddSingleWP} className="flex gap-2 mb-4">
                <input value={newWorkplace} onChange={e => setNewWorkplace(e.target.value)} placeholder={t('new_wp_place')} className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                <input type="number" value={newWorkplaceTime} onChange={e => setNewWorkplaceTime(e.target.value)} placeholder="min" className="w-16 bg-gray-700 border border-gray-600 rounded text-white text-center" />
                <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded text-sm">{t('add_single')}</button>
              </form>
              <div className="mt-auto pt-4 border-t border-gray-700">
                <textarea value={bulkWorkplaces} onChange={e => setBulkWorkplaces(e.target.value)} className="w-full h-24 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-xs font-mono" placeholder={t('bulk_wp_placeholder')} />
                <button onClick={handleBulkAddWP} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">{t('bulk_btn_wp')}</button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* 4. MISSING REASONS */}
      {(isAdmin) && (
          <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700">
              <h2 className="text-xl font-bold text-teal-400 mb-6 border-b border-gray-700 pb-2">{t('sect_reasons')}</h2>
              <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                      <div className="mb-2 relative"><SearchIcon className="absolute top-2 left-2 w-4 h-4 text-gray-500"/><input value={reasonSearch} onChange={e=>setReasonSearch(e.target.value)} className="w-full pl-8 pr-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white" placeholder={t('search_db_placeholder')} /></div>
                      <div className="bg-gray-800 rounded p-4 mb-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {filteredReasons.map(r => (
                              <div key={r.id} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded">
                                  <span className="text-white">{r.value}</span>
                                  <button onClick={() => handleDeleteReasonClick(r)} className="text-red-400 hover:text-red-200">×</button>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="md:w-1/3">
                      <form onSubmit={handleAddReason} className="flex flex-col gap-2"> 
                          <input value={newMissingReason} onChange={e => setNewMissingReason(e.target.value)} placeholder={t('new_reason_place')} className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"/>
                          <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded text-sm">{t('add_single')}</button>
                      </form>
                      <p className="text-xs text-gray-500 mt-2">{t('reason_hint')}</p>
                  </div>
              </div>
          </div>
      )}

      {/* 5. LOGISTICS OPERATIONS */}
      {canManageLogOps && (
          <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-sky-500/50">
              <h2 className="text-xl font-bold text-sky-400 mb-6 border-b border-gray-700 pb-2">{t('sect_log_ops')}</h2>
              <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                      <div className="mb-2 relative"><SearchIcon className="absolute top-2 left-2 w-4 h-4 text-gray-500"/><input value={logOpSearch} onChange={e=>setLogOpSearch(e.target.value)} className="w-full pl-8 pr-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white" placeholder={t('search_db_placeholder')} /></div>
                      <div className="bg-gray-800 rounded p-4 mb-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {filteredLogOps.map(op => (
                              <div key={op.id} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded">
                                  <span className="text-white text-sm font-mono">{op.value} {op.standardTime ? `(${op.standardTime} min)` : ''}</span>
                                  <button onClick={() => handleDeleteLogOpClick(op)} className="text-red-400 hover:text-red-200">×</button>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="md:w-1/3">
                      <form onSubmit={handleAddLogOp} className="flex gap-2"> 
                          <input value={newLogOp} onChange={e => setNewLogOp(e.target.value)} placeholder={t('new_op_place')} className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"/>
                          <input type="number" value={newLogOpTime} onChange={e => setNewLogOpTime(e.target.value)} placeholder="min" className="w-16 bg-gray-700 border border-gray-600 rounded text-white text-center" />
                          <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded text-sm">{t('add_single')}</button>
                      </form>
                      <p className="text-xs text-gray-500 mt-2">{t('op_hint')}</p>
                  </div>
              </div>
          </div>
      )}

      {/* 6. MAINTENANCE */}
       {isAdmin && (
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-red-900/50">
             <h2 className="text-xl font-bold text-red-400 mb-4 border-b border-gray-700 pb-2">{t('sect_maint')}</h2>
             
             {/* Data Health Warning */}
             {/* Note: In production we would pass the actual task count as a prop to be more specific */}
             <div className="mb-4 bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                 <div>
                     <p className="text-gray-300 font-bold text-sm">Database Health Monitor</p>
                     <p className="text-xs text-gray-500">Optimum task load: &lt; 500 items</p>
                 </div>
                 {/* This relies on the parent passing dbLoadWarning prop, if not available yet, default to false */}
                 {dbLoadWarning ? (
                     <span className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold animate-pulse">OVERLOADED</span>
                 ) : (
                     <span className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">HEALTHY</span>
                 )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                    <p className="text-gray-400 text-sm mb-4">{t('maint_desc')}</p>
                    <p className="text-gray-500 text-xs mb-4">{t('maint_info')}</p>
                    <button onClick={handleRunArchiving} disabled={isArchiving} className={`w-full sm:w-auto bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${isArchiving ? 'opacity-50 cursor-wait' : ''}`}>
                        {isArchiving ? t('archiving') : t('archive_btn')}
                    </button>
                </div>
                <div className="border-t md:border-t-0 md:border-l border-gray-700 pt-4 md:pt-0 md:pl-6 space-y-4">
                    <a href="https://console.firebase.google.com/project/sklad-ulohy/firestore/data" target="_blank" rel="noopener noreferrer" className="block text-center bg-blue-800 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                        <span className="flex items-center justify-center gap-2">
                             {t('sect_maint_db_link')} 
                             <span className="bg-green-500 w-2 h-2 rounded-full animate-pulse"></span>
                        </span>
                    </a>
                    <p className="text-xs text-gray-500 text-center">{t('sect_maint_db_desc')}</p>
                    <a href="https://github.com/MiroslavSvitok/clamason-task-manager" target="_blank" rel="noopener noreferrer" className="block text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors border border-gray-500">{t('sect_maint_gh_link')}</a>
                </div>
             </div>
        </div>
       )}

       {/* 7. BREAKS */}
       {(isAdmin) && (
           <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-purple-700/50">
               <h2 className="text-xl font-bold text-purple-400 mb-6 border-b border-gray-700 pb-2">{t('sect_breaks')}</h2>
               <div className="flex flex-col md:flex-row gap-8">
                   <div className="flex-1">
                       <div className="bg-gray-800 rounded p-4 mb-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar"> 
                           {breakSchedules.map(b => (
                               <div key={b.id} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded">
                                   <span className="text-white font-mono">{b.start} - {b.end}</span>
                                   <button onClick={() => handleDeleteBreakClick(b.id)} className="text-red-400 hover:text-red-200">×</button>
                               </div>
                           ))}
                       </div>
                   </div>
                   <div className="md:w-1/3">
                       <form onSubmit={handleAddBreak} className="flex gap-2">
                           <input type="time" value={newBreakStart} onChange={e => setNewBreakStart(e.target.value)} className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm" required />
                           <span className="text-gray-400 self-center">-</span>
                           <input type="time" value={newBreakEnd} onChange={e => setNewBreakEnd(e.target.value)} className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm" required />
                           <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm">{t('add_single')}</button>
                       </form>
                   </div>
               </div>
           </div>
       )}

       {/* 8. PWA */}
       {(isAdmin) && (
           <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-blue-600/50">
               <h2 className="text-xl font-bold text-blue-400 mb-4 border-b border-gray-700 pb-2">{t('sect_pwa')}</h2>
               {installPrompt ? (
                   <>
                        <button onClick={onInstallApp} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg">
                            {t('pwa_install_btn')}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">{t('pwa_desc')}</p>
                   </>
               ) : <p className="text-gray-500 italic text-sm">{t('pwa_installed')}</p>}
           </div>
       )}

       {/* 9. BOM */}
       {canManageDB && (
           <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-green-700/50">
               <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
                   <h2 className="text-xl font-bold text-green-400">{t('sect_bom')}</h2>
                   {bomItems.length > 0 && <button onClick={handleDeleteAllBOMConfirm} className="text-xs bg-red-900 hover:bg-red-800 text-red-100 px-3 py-1 rounded">{t('delete_all')}</button>}
               </div>
               <div className="flex flex-col md:flex-row gap-8">
                   <div className="flex-1">
                       <div className="relative mb-2"><SearchIcon className="absolute top-2 left-2 w-4 h-4 text-gray-500"/><input type="text" value={bomSearchQuery} onChange={(e) => setBomSearchQuery(e.target.value)} placeholder={t('bom_search_placeholder')} className="w-full bg-gray-700 border border-gray-600 rounded pl-8 pr-3 py-2 text-white text-sm" /></div>
                       <div className="bg-gray-800 rounded p-4 mb-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                           {filteredBOMItems.map(b => (
                               <div key={b.id} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded">
                                   <span className="text-white text-sm font-mono">{b.parentPart} → {b.childPart} <span className="text-green-400">({b.quantity})</span></span>
                                   <button onClick={() => handleDeleteBOMClick(b)} className="text-red-400 hover:text-red-200">×</button>
                               </div>
                           ))}
                       </div>
                   </div>
                   <div className="md:w-1/3 space-y-4">
                       <form onSubmit={handleAddBOM} className="flex flex-col gap-2">
                           <input value={bomParent} onChange={e => setBomParent(e.target.value)} placeholder={t('bom_parent_place')} className="bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm" />
                           <input value={bomChild} onChange={e => setBomChild(e.target.value)} placeholder={t('bom_child_place')} className="bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm" />
                           <input type="number" step="0.00001" value={bomQty} onChange={e => setBomQty(e.target.value)} placeholder={t('bom_qty_place')} className="bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm" />
                           <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm">{t('bom_add_single')}</button>
                       </form>
                       <div className="pt-4 border-t border-gray-700">
                           <textarea value={bomBulk} onChange={e => setBomBulk(e.target.value)} className="w-full h-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-xs font-mono" placeholder={t('bom_bulk_placeholder')} />
                           <button onClick={handleBulkAddBOM} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">{t('bom_bulk_btn')}</button>
                       </div>
                   </div>
               </div>
           </div>
       )}

      {/* 10. SECURITY & MAINTENANCE (Admin Only) */}
      {isAdmin && (
          <div className="bg-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-red-500">
              <h2 className="text-xl font-bold text-red-400 mb-6 border-b border-gray-700 pb-2">{t('sect_security')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Maintenance Mode */}
                  <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-bold text-white mb-2">{t('sec_maint_mode')}</h3>
                      <p className="text-gray-400 text-sm mb-4">{t('sec_maint_desc')}</p>
                      
                      <div className="flex items-center gap-4 mb-6">
                          <span className={`px-3 py-1 rounded font-bold text-sm ${systemConfig.maintenanceMode ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}>
                              {systemConfig.maintenanceMode ? t('sec_maint_active') : t('sec_maint_inactive')}
                          </span>
                          <button 
                              onClick={handleToggleMaintenance}
                              className={`px-4 py-2 rounded font-bold text-sm transition-colors ${systemConfig.maintenanceMode ? 'bg-gray-600 text-white' : 'bg-red-600 text-white hover:bg-red-500'}`}
                          >
                              {systemConfig.maintenanceMode ? t('sec_btn_disable') : t('sec_btn_enable')}
                          </button>
                      </div>

                      <div className="border-t border-gray-700 pt-4">
                          <h4 className="text-sm font-bold text-gray-300 mb-2">{t('sec_schedule_title')}</h4>
                          <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-500 w-8">{t('sec_start')}</label>
                                  <input type="datetime-local" value={scheduleStart} onChange={e => setScheduleStart(e.target.value)} className="bg-gray-700 text-white text-xs p-2 rounded flex-1"/>
                              </div>
                              <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-500 w-8">{t('sec_end')}</label>
                                  <input type="datetime-local" value={scheduleEnd} onChange={e => setScheduleEnd(e.target.value)} className="bg-gray-700 text-white text-xs p-2 rounded flex-1"/>
                              </div>
                              <div className="flex gap-2 mt-2">
                                  <button onClick={handleSaveMaintenanceSchedule} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-1 rounded text-xs font-bold">{t('sec_btn_schedule')}</button>
                                  <button onClick={handleClearSchedule} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-1 rounded text-xs font-bold">{t('sec_btn_clear_schedule')}</button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* IP Whitelist */}
                  <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-bold text-white">{t('sec_ip_whitelist')}</h3>
                          <button 
                              onClick={handleToggleIpCheck}
                              className={`text-xs px-2 py-1 rounded font-bold ${systemConfig.ipCheckEnabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                          >
                              {systemConfig.ipCheckEnabled ? t('sec_ip_check_enabled') : t('sec_ip_check_disabled')}
                          </button>
                      </div>
                      <p className="text-gray-400 text-sm mb-4">{t('sec_ip_desc')}</p>
                      <p className="text-xs text-teal-400 mb-2 font-mono">{t('sec_my_ip')} {myIp}</p>

                      <div className="flex gap-2 mb-4">
                          <input 
                              type="text" 
                              value={newIp} 
                              onChange={e => setNewIp(e.target.value)} 
                              placeholder={t('sec_ip_placeholder')}
                              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                          />
                          <button onClick={handleAddIp} className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded text-sm font-bold">+</button>
                      </div>

                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                          {systemConfig.allowedIPs && systemConfig.allowedIPs.map(ip => (
                              <div key={ip} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded">
                                  <span className="text-white font-mono text-sm">{ip}</span>
                                  <button onClick={() => handleRemoveIp(ip)} className="text-red-400 hover:text-red-200">×</button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

       {/* Confirmation Modal Portal */}
       {confirmModal.isOpen && createPortal(
           <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={closeConfirmModal}>
               <div className="bg-gray-800 border-2 border-red-600 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                   <div className="text-center mb-6">
                       <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                           <ExclamationIcon className="w-8 h-8 text-red-500" />
                       </div>
                       <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
                       <p className="text-gray-400 text-sm">{confirmModal.message}</p>
                   </div>
                   <div className="flex gap-3">
                       <button 
                           onClick={closeConfirmModal} 
                           className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors"
                       >
                           {t('btn_cancel')}
                       </button>
                       <button 
                           onClick={handleConfirmAction} 
                           className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                       >
                           <TrashIcon className="w-5 h-5" />
                           {t('btn_confirm_delete')}
                       </button>
                   </div>
               </div>
           </div>,
           document.body
       )}
    </div>
  );
};

export default SettingsTab;