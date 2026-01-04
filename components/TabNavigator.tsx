
import React from 'react';

interface TabNavigatorProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  hasPermission: (perm: string) => boolean;
  t: (key: any) => string;
  counts: {
    tasks: number;
    pendingRequests: number;
  };
  currentUserRole?: string; // Pridané pre kontrolu roly
}

const TabNavigator: React.FC<TabNavigatorProps> = ({
  activeTab,
  setActiveTab,
  hasPermission,
  t,
  counts,
  currentUserRole
}) => {
  return (
    <div className="bg-gray-800 border-t border-gray-700 shadow-sm z-10">
      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 overflow-x-auto custom-scrollbar">
        <div className="flex space-x-4 sm:space-x-6">
          {hasPermission('perm_tab_entry') && (
            <button
              onClick={() => setActiveTab('entry')}
              className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'entry' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_entry')}
            </button>
          )}

          {hasPermission('perm_tab_tasks') && (
            <button
              onClick={() => setActiveTab('tasks')}
              className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'tasks' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } ${counts.tasks > 0 ? 'text-orange-400' : ''}`}
            >
              {t('tab_tasks')}{' '}
              {counts.tasks > 0 && (
                <span className="ml-1 sm:ml-2 bg-orange-600 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5">
                  {counts.tasks}
                </span>
              )}
            </button>
          )}

          {hasPermission('perm_tab_bom') && (
            <button
              onClick={() => setActiveTab('bom')}
              className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'bom' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_bom')}
            </button>
          )}

          {hasPermission('perm_tab_catalog') && (
            <button
              onClick={() => setActiveTab('catalog')}
              className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'catalog' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_catalog')}
            </button>
          )}

          {hasPermission('perm_tab_missing') && (
            <button
              onClick={() => setActiveTab('missing')}
              className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'missing' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_missing')}
            </button>
          )}

          {hasPermission('perm_tab_inventory') && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'inventory' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_inventory')}
            </button>
          )}

          {hasPermission('perm_tab_logistics_center') && (
            <button
              onClick={() => setActiveTab('logistics')}
              className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'logistics' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_logistics_center')}
            </button>
          )}

          {/* NOVÝ TAB: Mapa trás */}
          {hasPermission('perm_tab_map') && (
            <button
              onClick={() => setActiveTab('map')}
              className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'map' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_map')}
            </button>
          )}

          {/* NOVÝ TAB: Transakcie (LOG) - Len pre ADMIN */}
          {currentUserRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'logs' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_logs')}
            </button>
          )}

          {hasPermission('perm_tab_analytics') && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'analytics' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_analytics')}
            </button>
          )}

          {hasPermission('perm_tab_settings') && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'settings' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } ${counts.pendingRequests > 0 ? 'text-red-400' : ''}`}
            >
              {t('tab_settings')}{' '}
              {counts.pendingRequests > 0 && (
                <span className="ml-1 sm:ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5">
                  {counts.pendingRequests}
                </span>
              )}
            </button>
          )}

          {hasPermission('perm_tab_permissions') && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                activeTab === 'permissions' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {t('tab_permissions')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabNavigator;
