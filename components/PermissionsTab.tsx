
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Role, Permission } from '../App'; 
import { useLanguage } from './LanguageContext';

interface PermissionsTabProps {
    roles: Role[];
    permissions: Permission[];
    onAddRole: (name: string) => void;
    onDeleteRole: (id: string) => void;
    onUpdatePermission: (permissionId: string, roleName: string, hasPermission: boolean) => void;
    onVerifyAdminPassword: (password: string) => boolean;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
);

const PermissionsTab: React.FC<PermissionsTabProps> = ({ roles, permissions, onAddRole, onDeleteRole, onUpdatePermission, onVerifyAdminPassword }) => {
    const { t } = useLanguage();
    const [newRoleName, setNewRoleName] = useState('');
    
    // Modal State
    const [deleteModalRole, setDeleteModalRole] = useState<Role | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState('');

    const permGroups = [
      {
          name: 'perm_group_tabs',
          perms: ['perm_tab_entry', 'perm_tab_tasks', 'perm_tab_bom', 'perm_tab_missing', 'perm_tab_logistics_center', 'perm_tab_analytics', 'perm_tab_settings', 'perm_tab_permissions', 'perm_logistics_mode'] 
      },
      {
          name: 'perm_group_actions',
          perms: ['perm_btn_finish', 'perm_btn_edit', 'perm_btn_delete', 'perm_btn_resolve', 'perm_btn_missing', 'perm_btn_copy', 'perm_btn_return', 'perm_btn_note', 'perm_btn_incorrect', 'perm_btn_lock', 'perm_btn_block_new', 'perm_view_fullscreen', 'perm_play_sound', 'perm_push_notification', 'perm_view_passwords']
      },
      {
          name: 'perm_group_mgmt',
          perms: ['perm_manage_users', 'perm_delete_users', 'perm_manage_db', 'perm_manage_logistics_ops', 'perm_manage_bom', 'perm_archive', 'perm_manage_breaks', 'perm_manage_roles'] 
      }
    ];

    const handleAddRole = (e: React.FormEvent) => {
      e.preventDefault();
      if (newRoleName.trim()) {
          onAddRole(newRoleName.trim());
          setNewRoleName('');
      }
    };
    
    const hasPermission = (roleId: string, permName: string) => {
        return permissions?.some(p => p.roleId === roleId && p.permissionName === permName) || false;
    };
    
    // Sort roles: System roles first, then custom roles alphabetically
    const sortedRoles = [...roles].sort((a, b) => {
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        return a.name.localeCompare(b.name);
    });

    const handleDeleteClick = (e: React.MouseEvent, role: Role) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteModalRole(role);
        setPasswordInput('');
        setError('');
    };

    const handleConfirmDelete = () => {
        if (deleteModalRole) {
            if (onVerifyAdminPassword(passwordInput)) {
                onDeleteRole(deleteModalRole.id);
                setDeleteModalRole(null);
                setPasswordInput('');
                setError('');
            } else {
                setError(t('err_pass_incorrect'));
            }
        }
    };

    const handleCloseModal = () => {
        setDeleteModalRole(null);
        setPasswordInput('');
        setError('');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-8 animate-fade-in relative">
            <h1 className="text-center text-2xl sm:text-3xl font-bold text-orange-400 mb-6 sm:mb-8">{t('sect_roles')}</h1>
            
            {permGroups.map(group => (
                 <div key={group.name} className="bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-700">
                     <h3 className="text-lg font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">{t(group.name as any)}</h3>
                     <div className="overflow-x-auto custom-scrollbar"> 
                         <table className="min-w-[600px] w-full text-left text-sm border-collapse">
                             <thead>
                                 <tr className="border-b-2 border-gray-700">
                                     <th className="py-3 px-4 text-gray-400 font-semibold w-1/3 min-w-[200px]">{t('permission_label')}</th> 
                                     {sortedRoles.map(role => (
                                         <th key={role.id} className="py-3 px-4 text-white font-bold text-center">
                                             <div className="flex items-center justify-center gap-1">
                                                 {role.name}
                                                 {role.name !== 'ADMIN' && (
                                                     <button 
                                                         type="button"
                                                         onClick={(e) => handleDeleteClick(e, role)} 
                                                         className="ml-2 text-red-600 hover:text-red-400 transition-colors p-1 focus:outline-none"
                                                         title={t('perm_btn_delete')}
                                                     >
                                                         <TrashIcon className="w-4 h-4" />
                                                     </button>
                                                 )}
                                             </div>
                                         </th>
                                     ))}
                                 </tr>
                             </thead>
                             <tbody>
                                 {group.perms.map(perm => (
                                     <tr key={perm} className="border-b border-gray-800 hover:bg-gray-800/50">
                                         <td className="py-3 px-4 text-gray-300">{t(perm as any)}</td>
                                         {sortedRoles.map(role => (
                                             <td key={`${role.id}-${perm}`} className="py-3 px-4 text-center">
                                                 <input 
                                                     type="checkbox" 
                                                     checked={hasPermission(role.id, perm)} 
                                                     onChange={(e) => onUpdatePermission(perm, role.name, e.target.checked)}
                                                     className="w-5 h-5 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2" 
                                                 />
                                             </td>
                                         ))}
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </div>
             ))}
            
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-700">
                 <h3 className="text-lg font-bold text-gray-300 mb-4">{t('role_add_new_title')}</h3> 
                 <form onSubmit={handleAddRole} className="flex flex-col sm:flex-row gap-2 max-w-sm mt-4">
                     <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder={t('role_name_place')} className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm uppercase" />
                     <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-semibold">{t('role_add_btn')}</button>
                 </form>
             </div>

             {/* Delete Confirmation Modal */}
             {deleteModalRole && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={handleCloseModal}>
                    <div className="bg-gray-800 border-2 border-red-600 rounded-xl shadow-2xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                                <LockIcon className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{t('role_delete_modal_title')}</h3>
                            <p className="text-gray-400 text-sm">
                                {t('role_delete_confirm')}
                                <br/>
                                <span className="font-bold text-red-400">{deleteModalRole.name}</span>
                            </p>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-gray-400 text-xs font-bold uppercase mb-2">{t('role_delete_pass_label')}</label>
                            <input 
                                type="password" 
                                value={passwordInput} 
                                onChange={(e) => {
                                    setPasswordInput(e.target.value);
                                    setError('');
                                }}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="********"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-sm mt-2 font-bold animate-pulse">{error}</p>}
                        </div>

                        <div className="flex gap-3">
                             <button 
                                onClick={handleCloseModal} 
                                className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold transition-colors"
                            >
                                {t('btn_cancel')}
                            </button>
                            <button 
                                onClick={handleConfirmDelete} 
                                disabled={!passwordInput}
                                className={`flex-1 py-3 text-white rounded-lg font-bold transition-colors shadow-lg flex items-center justify-center gap-2 ${!passwordInput ? 'bg-red-900/50 cursor-not-allowed text-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                                {t('role_delete_btn')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PermissionsTab;
