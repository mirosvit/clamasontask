import React, { useState, useEffect, useRef } from 'react';
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
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const statsDropdownRef = useRef<HTMLDivElement>(null);
  const logisticsDropdownRef = useRef<HTMLDivElement>(null);
  
  const currentOrder = systemConfig?.tabOrder || DEFAULT_TAB_ORDER;

  // Definície skupín
  const ADMIN_TAB_IDS = ['settings', 'permissions'];
  const STAT_TAB_IDS = ['map', 'analytics', 'logs'];
  const LOG_TAB_IDS = ['logistics', 'catalog'];
  
  const isAdminTabActive = ADMIN_TAB_IDS.includes(activeTab);
  const isStatsTabActive = STAT_TAB_IDS.includes(activeTab);
  const isLogisticsTabActive = LOG_TAB_IDS.includes(activeTab);

  // Zatvorenie dropdownov pri kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
        setIsAdminOpen(false);
      }
      if (statsDropdownRef.current && !statsDropdownRef.current.contains(event.target as Node)) {
        setIsStatsOpen(false);
      }
      if (logisticsDropdownRef.current && !logisticsDropdownRef.current.contains(event.target as Node)) {
        setIsLogisticsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrovanie hlavných horizontálnych kariet (vylúčime všetky grupované ID)
  const topLevelTabIds = currentOrder.filter(id => 
    !ADMIN_TAB_IDS.includes(id) && 
    !STAT_TAB_IDS.includes(id) && 
    !LOG_TAB_IDS.includes(id)
  );
  
  const allowedAdminTabs = TAB_CONFIG.filter(config => 
    ADMIN_TAB_IDS.includes(config.id) && 
    (config.adminOnly ? currentUserRole === 'ADMIN' : true) &&
    hasPermission(config.permission)
  );

  const allowedStatsTabs = TAB_CONFIG.filter(config => 
    STAT_TAB_IDS.includes(config.id) && 
    (config.adminOnly ? currentUserRole === 'ADMIN' : true) &&
    hasPermission(config.permission)
  );

  const allowedLogisticsTabs = TAB_CONFIG.filter(config => 
    LOG_TAB_IDS.includes(config.id) && 
    (config.adminOnly ? currentUserRole === 'ADMIN' : true) &&
    hasPermission(config.permission)
  );

  const renderDropdown = (
    labelKey: string, 
    isOpen: boolean, 
    setIsOpen: (val: boolean) => void, 
    isActive: boolean, 
    tabs: typeof TAB_CONFIG, 
    ref: React.RefObject<HTMLDivElement | null>
  ) => {
    if (tabs.length === 0) return null;

    return (
      <div className="relative ml-2 sm:ml-4 flex-shrink-0" ref={ref}>
        <button
          onClick={() => {
              // Zatvoríme ostatné
              if (!isOpen) {
                  setIsAdminOpen(false);
                  setIsStatsOpen(false);
                  setIsLogisticsOpen(false);
              }
              setIsOpen(!isOpen);
          }}
          className={`flex items-center gap-1 sm:gap-2 py-3 px-2 sm:px-3 border-b-4 font-black text-sm transition-all ${
            isActive 
              ? 'border-teal-500 text-teal-400' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className="whitespace-nowrap">{t(labelKey as any)}</span>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-400' : 'text-gray-600'}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
          
          {/* Celkový badge pre skupinu */}
          {(() => {
            const totalBadge = tabs.reduce((acc, curr) => acc + (curr.badgeKey ? counts[curr.badgeKey] : 0), 0);
            return totalBadge > 0 ? (
              <span className="bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center animate-bounce">
                !
              </span>
            ) : null;
          })()}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-56 bg-gray-900 border-2 border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in z-[100]">
            <div className="py-2">
              {tabs.map(config => {
                const isTabActive = activeTab === config.id;
                const badgeValue = config.badgeKey ? counts[config.badgeKey] : 0;
                
                return (
                  <button
                    key={config.id}
                    onClick={() => {
                      setActiveTab(config.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold transition-all ${
                      isTabActive 
                        ? 'bg-teal-600/20 text-teal-400' 
                        : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="uppercase tracking-wide">{t(config.labelKey as any)}</span>
                    {badgeValue > 0 && (
                      <span className={`text-[10px] text-white px-1.5 py-0.5 rounded-full ${config.id === 'settings' ? 'bg-red-500' : 'bg-orange-600'}`}>
                        {badgeValue}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 shadow-sm z-30">
      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 flex items-center">
        
        {/* Hlavný horizontálny zoznam */}
        <div className="flex space-x-4 sm:space-x-6 overflow-x-auto custom-scrollbar flex-grow py-1">
          {topLevelTabIds.map(tabId => {
            const config = TAB_CONFIG.find(c => c.id === tabId);
            if (!config) return null;

            if (config.adminOnly && currentUserRole !== 'ADMIN') return null;
            if (!hasPermission(config.permission)) return null;

            const isActive = activeTab === config.id;
            const badgeValue = config.badgeKey ? counts[config.badgeKey] : 0;
            const hasBadge = badgeValue > 0;

            const activeColorClass = config.color || 'border-teal-500 text-teal-400';

            return (
              <button
                key={config.id}
                onClick={() => { 
                    setActiveTab(config.id); 
                    setIsAdminOpen(false); 
                    setIsStatsOpen(false); 
                    setIsLogisticsOpen(false);
                }}
                className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${
                  isActive 
                    ? activeColorClass 
                    : `border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 ${hasBadge ? 'text-orange-400/80' : ''}`
                }`}
              >
                {t(config.labelKey as any)}
                {hasBadge && (
                  <span className={`ml-1 sm:ml-2 text-white text-[10px] rounded-full px-1.5 sm:px-2 py-0.5 bg-orange-600`}>
                    {badgeValue}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dropdowny */}
        {renderDropdown('tab_logistics_group', isLogisticsOpen, setIsLogisticsOpen, isLogisticsTabActive, allowedLogisticsTabs, logisticsDropdownRef)}
        {renderDropdown('tab_statistics', isStatsOpen, setIsStatsOpen, isStatsTabActive, allowedStatsTabs, statsDropdownRef)}
        {renderDropdown('tab_administration', isAdminOpen, setIsAdminOpen, isAdminTabActive, allowedAdminTabs, adminDropdownRef)}

      </div>
    </div>
  );
};

export default TabNavigator;