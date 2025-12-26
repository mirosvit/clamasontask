
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Role, Permission } from '../../App'; 
import { useLanguage } from '../LanguageContext';

interface PermissionsTabProps {
    roles: Role[];
    permissions: Permission[];
    onAddRole: (name: string) => void;
    onDeleteRole: (id: string) => void;
    onUpdatePermission: (permissionId: string, roleName: string, hasPermission: boolean) => void;
    onVerifyAdminPassword: (password: string) => boolean;
}

const PermissionsTab: React.FC<PermissionsTabProps> = ({ roles, permissions, onAddRole, onDeleteRole, onUpdatePermission, onVerifyAdminPassword }) => {
    const { t } = useLanguage();
    
    const permGroups = [
      {
          name: 'perm_group_tabs',
          perms: ['perm_tab_entry', 'perm_tab_tasks', 'perm_tab_bom', 'perm_tab_missing', 'perm_tab_inventory', 'perm_tab_logistics_center', 'perm_tab_analytics', 'perm_tab_settings', 'perm_tab_permissions', 'perm_logistics_mode'] 
      },
      {
          name: 'perm_group_actions',
          perms: ['perm_btn_finish', 'perm_btn_edit', 'perm_btn_delete', 'perm_btn_resolve', 'perm_btn_missing', 'perm_btn_copy', 'perm_btn_return', 'perm_btn_note', 'perm_btn_incorrect', 'perm_btn_lock', 'perm_btn_block_new', 'perm_btn_audit', 'perm_view_fullscreen', 'perm_play_sound', 'perm_push_notification', 'perm_view_passwords']
      },
      {
          name: 'perm_group_settings',
          perms: ['perm_view_setup', 'perm_settings_users', 'perm_settings_parts', 'perm_settings_wp', 'perm_settings_bom', 'perm_settings_system', 'perm_settings_maint']
      },
      {
          name: 'perm_group_mgmt',
          perms: ['perm_manage_users', 'perm_delete_users', 'perm_manage_db', 'perm_manage_logistics_ops', 'perm_manage_bom', 'perm_archive', 'perm_manage_breaks', 'perm_manage_roles'] 
      }
    ];

    const hasPermission = (roleId: string, permName: string) => {
        return permissions?.some(p => p.roleId === roleId && p.permissionName === permName) || false;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-12 animate-fade-in relative">
            <h1 className="text-center text-3xl font-extrabold text-orange-400 mb-8 uppercase tracking-widest">{t('sect_roles')}</h1>
            {permGroups.map(group => (
                 <div key={group.name} className="bg-gray-900 rounded-2xl p-8 border border-gray-700">
                     <h3 className="text-xl font-black text-gray-300 mb-6 border-b border-gray-700 pb-3 uppercase">{t(group.name as any)}</h3>
                     <div className="overflow-x-auto custom-scrollbar"> 
                         <table className="min-w-[700px] w-full text-left text-base">
                             <thead>
                                 <tr>
                                     <th className="py-4 px-5 text-gray-400 font-bold uppercase text-xs tracking-widest">{t('permission_label')}</th> 
                                     {roles.map(role => <th key={role.id} className="py-4 px-5 text-white font-black text-center text-sm">{role.name}</th>)}
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-800">
                                 {group.perms.map(perm => (
                                     <tr key={perm} className="hover:bg-gray-800/50 transition-colors">
                                         <td className="py-5 px-5 text-gray-300 font-medium">{t(perm as any)}</td>
                                         {roles.map(role => (
                                             <td key={`${role.id}-${perm}`} className="py-5 px-5 text-center">
                                                 <input type="checkbox" checked={hasPermission(role.id, perm)} onChange={(e) => onUpdatePermission(perm, role.name, e.target.checked)} className="w-6 h-6 text-orange-500 bg-gray-700 border-gray-600 rounded cursor-pointer" />
                                             </td>
                                         ))}
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </div>
             ))}
        </div>
    );
};

export default PermissionsTab;
