export const PRIORITY_ORDER: Record<string, number> = { 
  'URGENT': 0, 
  'NORMAL': 1, 
  'LOW': 2 
};

export const COLOR_MAP = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  orange: 'bg-orange-600',
  teal: 'bg-teal-600',
  pink: 'bg-pink-600',
  red: 'bg-red-600',
  slate: 'bg-slate-700'
};

export interface TabDefinition {
  id: string;
  labelKey: any; 
  permission: string;
  badgeKey?: 'tasks' | 'pendingRequests' | 'erpBlockages';
  color?: string;
  adminOnly?: boolean;
}

export const TAB_CONFIG: TabDefinition[] = [
  { id: 'entry', labelKey: 'tab_entry', permission: 'perm_tab_entry' },
  { id: 'tasks', labelKey: 'tab_tasks', permission: 'perm_tab_tasks', badgeKey: 'tasks' },
  { id: 'quick_action', labelKey: 'tab_quick_action', permission: 'perm_tab_quick_action', color: 'border-fuchsia-500 text-fuchsia-400' },
  { id: 'bom', labelKey: 'tab_bom', permission: 'perm_tab_bom' },
  { id: 'catalog', labelKey: 'tab_catalog', permission: 'perm_tab_catalog' },
  { id: 'missing', labelKey: 'tab_missing', permission: 'perm_tab_missing' },
  { id: 'inventory', labelKey: 'tab_inventory', permission: 'perm_tab_inventory' },
  { id: 'logistics', labelKey: 'tab_logistics_center', permission: 'perm_tab_logistics_center' },
  { id: 'scrap_weighing', labelKey: 'tab_scrap_weighing', permission: 'perm_scrap_add' }, 
  { id: 'scrap_warehouse', labelKey: 'tab_scrap_warehouse', permission: 'perm_scrap_list' },
  { id: 'scrap_archive', labelKey: 'tab_scrap_archive', permission: 'perm_scrap_archive' },
  { id: 'scrap_analytics', labelKey: 'tab_scrap_analytics', permission: 'perm_tab_scrap_analytics' },
  { id: 'erp', labelKey: 'tab_erp', permission: 'perm_tab_erp', badgeKey: 'erpBlockages', color: 'border-orange-500 text-orange-400' },
  { id: 'map', labelKey: 'tab_map', permission: 'perm_tab_map', color: 'border-amber-500 text-amber-400' },
  { id: 'logs', labelKey: 'tab_logs', permission: 'perm_tab_logs', color: 'border-cyan-500 text-cyan-400', adminOnly: true },
  { id: 'analytics', labelKey: 'tab_analytics', permission: 'perm_tab_analytics' },
  { id: 'settings', labelKey: 'tab_settings', permission: 'perm_tab_settings', badgeKey: 'pendingRequests' },
  { id: 'permissions', labelKey: 'tab_permissions', permission: 'perm_tab_permissions' }
];

export const DEFAULT_TAB_ORDER = TAB_CONFIG.map(t => t.id);