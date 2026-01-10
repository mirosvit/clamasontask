
import React from 'react';
import { TAB_CONFIG, DEFAULT_TAB_ORDER } from '../constants/uiConstants';
import { SystemConfig } from '../types/appTypes';

interface TabNavigatorProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  hasPermission: (perm: string) => boolean;
  t: (key: any) => string;
  counts: {
    tasks: number;
    pendingRequests: number;
    erpBlockages: number;
  };
  currentUserRole?: string;
  systemConfig?: SystemConfig;
}

const TabNavigator: React.FC<TabNavigatorProps> = ({
  activeTab,
  setActiveTab,
  hasPermission,
  t,
  counts,
  currentUserRole,
  systemConfig
}) => {
  const currentOrder = systemConfig?.tabOrder || DEFAULT_TAB_ORDER;

  return (
    <div className="bg-gray-800 border-t border-gray-700 shadow-sm z-10">
      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 overflow-x-auto custom-scrollbar">
        <div className="flex space-x-4 sm:space-x-6">
          {currentOrder.map(tabId => {
            const config = TAB_CONFIG.find(c => c.id === tabId);
            if (!config) return null;

            // Admin bypass check
            if (config.adminOnly && currentUserRole !== 'ADMIN') return null;
            
            // Standard permission check
            if (!hasPermission(config.permission)) return null;

            const isActive = activeTab === config.id;
            const badgeValue = config.badgeKey ? counts[config.badgeKey] : 0;
            const hasBadge = badgeValue > 0;

            const activeColorClass = config.color || 'border-teal-500 text-teal-400';
            const badgeColorClass = config.id === 'settings' ? 'bg-red-500' : 'bg-orange-600';

            return (
              <button
                key={config.id}
                onClick={() => setActiveTab(config.id)}
                className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                  isActive 
                    ? activeColorClass 
                    : `border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 ${hasBadge ? 'text-orange-400/80' : ''}`
                }`}
              >
                {t(config.labelKey)}
                {hasBadge && (
                  <span className={`ml-1 sm:ml-2 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5 ${badgeColorClass}`}>
                    {badgeValue}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabNavigator;
