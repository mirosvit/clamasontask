import React, { useState } from 'react';
import { Role } from '../../App'; 
import { useLanguage } from '../LanguageContext';

interface PermissionsTabProps {
    roles: Role[];
    onAddRole: (name: string, parentId?: string, rank?: number) => void;
    onDeleteRole: (id: string) => void;
    onUpdatePermission: (permissionId: string, roleName: string, hasPermission: boolean) => void;
    onVerifyAdminPassword: (password: string) => boolean;
}

const PermissionsTab: React.FC<PermissionsTabProps> = ({ roles, onAddRole, onDeleteRole, onUpdatePermission, onVerifyAdminPassword }) => {
    const { t, language } = useLanguage();
    const [newRoleName, setNewRoleName] = useState('');
    const [selectedParentId, setSelectedParentId] = useState('');

    const permGroups = [
      {
          name: 'perm_group_tabs',
          perms: [
              'perm_tab_entry', 
              'perm_tab_tasks', 
              'perm_tab_quick_action',
              'perm_tab_bom', 
              'perm_tab_catalog',
              'perm_tab_missing', 
              'perm_tab_inventory', 
              'perm_tab_logistics_center', 
              'perm_scrap_add',
              'perm_scrap_list',
              'perm_scrap_archive',
              'perm_tab_scrap_analytics',
              'perm_tab_map',
              'perm_tab_logs',
              'perm_tab_erp',
              'perm_tab_analytics', 
              'perm_tab_settings', 
              'perm_tab_permissions', 
              'perm_logistics_mode'
          ] 
      },
      {
          name: 'perm_group_actions',
          perms: [
              'perm_btn_finish', 
              'perm_btn_edit', 
              'perm_btn_delete', 
              'perm_btn_resolve', 
              'perm_btn_missing', 
              'perm_scrap_edit',
              'perm_btn_copy', 
              'perm_btn_return', 
              'perm_btn_note', 
              'perm_btn_incorrect', 
              'perm_btn_lock', 
              'perm_btn_block_new', 
              'perm_btn_audit', 
              'perm_erp_manage', 
              'perm_erp_delete', 
              'perm_view_fullscreen', 
              'perm_play_sound', 
              'perm_push_notification', 
              'perm_view_passwords'
          ]
      },
      {
          name: 'perm_group_settings',
          perms: ['perm_view_setup', 'perm_settings_users', 'perm_settings_parts', 'perm_settings_wp', 'perm_settings_bom', 'perm_settings_qa_architect', 'perm_settings_csdb', 'perm_settings_system', 'perm_settings_maint']
      },
      {
          name: 'perm_group_mgmt',
          perms: ['perm_manage_users', 'perm_delete_users', 'perm_manage_db', 'perm_manage_logistics_ops', 'perm_manage_bom', 'perm_scrap_manage', 'perm_archive', 'perm_manage_breaks', 'perm_manage_roles'] 
      }
    ];

    const hasPermission = (role: Role, permName: string) => {
        return role.permissions ? role.permissions.includes(permName) : false;
    };

    const handleCreateRole = () => {
        if (!newRoleName.trim()) return;
        const parent = roles.find(r => r.id === selectedParentId);
        const rank = parent ? (parent.rank || 0) + 1 : 5;
        onAddRole(newRoleName, selectedParentId || undefined, rank);
        setNewRoleName('');
        setSelectedParentId('');
    };

    const canDelete = (role: Role) => !role.isSystem && role.name.toUpperCase() !== 'ADMIN';

    const handleDeleteClick = (role: Role) => {
        if (!canDelete(role)) return;
        if (window.confirm(language === 'sk' ? `Naozaj chcete vymazať rolu ${role.name}?` : `Delete role ${role.name}?`)) {
            onDeleteRole(role.id);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-12 animate-fade-in relative">
            <h1 className="text-center text-3xl font-extrabold text-orange-400 mb-8 uppercase tracking-widest">{t('sect_roles')}</h1>

            {/* Role Management Header */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-10">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Vytvoriť novú rolu</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <input 
                        type="text" 
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder={t('role_name_place')}
                        className="flex-1 bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-xl focus:border-orange-500 outline-none font-bold uppercase placeholder-gray-600"
                    />
                    <select 
                        value={selectedParentId}
                        onChange={(e) => setSelectedParentId(e.target.value)}
                        className="md:w-64 bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-xl focus:border-orange-500 outline-none font-bold uppercase"
                    >
                        <option value="">{language === 'sk' ? 'ŽIADNY NADRIADENÝ' : 'NO PARENT ROLE'}</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name} (LVL {r.rank || 0})</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleCreateRole}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-black px-10 py-3 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-sm"
                    >
                        {t('role_add_btn')}
                    </button>
                </div>
            </div>

            {permGroups.map(group => (
                 <div key={group.name} className="bg-gray-900 rounded-2xl p-8 border border-gray-700">
                     <h3 className="text-xl font-black text-gray-300 mb-6 border-b border-gray-700 pb-3 uppercase">{t(group.name as any)}</h3>
                     <div className="overflow-x-auto custom-scrollbar"> 
                         <table className="min-w-[700px] w-full text-left text-base">
                             <thead>
                                 <tr>
                                     <th className="py-4 px-5 text-gray-400 font-bold uppercase text-xs tracking-widest">{t('permission_label')}</th> 
                                     {roles.map(role => (
                                         <th key={role.id} className="py-4 px-5 text-white font-black text-center min-w-[120px]">
                                             <div className="flex flex-col items-center gap-1">
                                                 <span className="text-sm leading-tight">{role.name}</span>
                                                 <div className="flex items-center gap-2">
                                                     <span className="text-[9px] text-orange-500/70 uppercase font-black bg-orange-500/10 px-1.5 rounded border border-orange-500/20">LVL {role.rank || 0}</span>
                                                     <button 
                                                        onClick={() => handleDeleteClick(role)}
                                                        disabled={!canDelete(role)}
                                                        className={`transition-colors ${canDelete(role) ? 'text-gray-600 hover:text-red-500' : 'text-gray-800 cursor-not-allowed opacity-30'}`}
                                                     >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                     </button>
                                                 </div>
                                             </div>
                                         </th>
                                     ))}
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-800">
                                 {group.perms.map(perm => (
                                     <tr key={perm} className="hover:bg-gray-800/50 transition-colors">
                                         <td className="py-5 px-5 text-gray-300 font-medium">{t(perm as any)}</td>
                                         {roles.map(role => (
                                             <td key={`${role.id}-${perm}`} className="py-5 px-5 text-center">
                                                 <input 
                                                    type="checkbox" 
                                                    checked={hasPermission(role, perm)} 
                                                    onChange={(e) => onUpdatePermission && onUpdatePermission(perm, role.name, e.target.checked)} 
                                                    className="w-6 h-6 text-orange-500 bg-gray-700 border-gray-600 rounded cursor-pointer transition-transform active:scale-110" 
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
        </div>
    );
};

export default PermissionsTab;