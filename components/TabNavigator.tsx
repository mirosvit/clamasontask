import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  activeTab, setActiveTab, hasPermission, t, counts, currentUserRole, systemConfig
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  
  const navBarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentOrder = systemConfig?.tabOrder || DEFAULT_TAB_ORDER;

  const ADMIN_TAB_IDS = ['settings', 'permissions'];
  const STAT_TAB_IDS = ['map', 'analytics', 'logs'];
  const LOG_TAB_IDS = ['logistics', 'catalog']; 
  const PARTS_TAB_IDS: string[] = []; 
  
  const isAdminTabActive = ADMIN_TAB_IDS.includes(activeTab);
  const isStatsTabActive = STAT_TAB_IDS.includes(activeTab);
  const isLogisticsTabActive = LOG_TAB_IDS.includes(activeTab);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
        if (openMenu && !(e.target as HTMLElement).closest('.dropdown-trigger')) {
            setOpenMenu(null);
        }
    };
    const handleScroll = () => { if (openMenu) setOpenMenu(null); };

    document.addEventListener("mousedown", handleGlobalClick);
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
        document.removeEventListener("mousedown", handleGlobalClick);
        if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [openMenu]);

  const topLevelTabIds = currentOrder.filter(id => 
    !ADMIN_TAB_IDS.includes(id) && !STAT_TAB_IDS.includes(id) && !LOG_TAB_IDS.includes(id) && !PARTS_TAB_IDS.includes(id)
  );
  
  const allowedAdminTabs = TAB_CONFIG.filter(config => 
    ADMIN_TAB_IDS.includes(config.id) && (config.adminOnly ? currentUserRole === 'ADMIN' : true) && hasPermission(config.permission)
  );

  const allowedStatsTabs = TAB_CONFIG.filter(config => 
    STAT_TAB_IDS.includes(config.id) && (config.adminOnly ? currentUserRole === 'ADMIN' : true) && hasPermission(config.permission)
  );

  const allowedLogisticsTabs = TAB_CONFIG.filter(config => 
    LOG_TAB_IDS.includes(config.id) && (config.adminOnly ? currentUserRole === 'ADMIN' : true) && hasPermission(config.permission)
  );

  const handleDropdownClick = (e: React.MouseEvent, menuId: string) => {
      if (openMenu === menuId) {
          setOpenMenu(null);
          return;
      }
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDropdownPos({
          top: rect.bottom + window.scrollY,
          right: window.innerWidth - rect.right
      });
      setOpenMenu(menuId);
  };

  const renderDropdownTrigger = (labelKey: string, menuId: string, isActive: boolean, tabs: typeof TAB_CONFIG) => {
    if (tabs.length === 0) return null;
    return (
      <button
        onClick={(e) => handleDropdownClick(e, menuId)}
        className={`dropdown-trigger flex items-center gap-1 sm:gap-2 py-3 px-2 sm:px-3 border-b-4 font-black text-sm transition-all flex-shrink-0 ${isActive ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
      >
        <span className="whitespace-nowrap uppercase tracking-tighter">{t(labelKey as any)}</span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${openMenu === menuId ? 'rotate-180 text-teal-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
        {(() => {
          const totalBadge = tabs.reduce((acc, curr) => acc + (curr.badgeKey ? (counts as any)[curr.badgeKey] : 0), 0);
          return totalBadge > 0 ? <span className="bg-orange-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">!</span> : null;
        })()}
      </button>
    );
  };

  const renderPortalMenu = (menuId: string, tabs: typeof TAB_CONFIG) => {
      if (openMenu !== menuId) return null;
      return createPortal(
          <div 
            style={{ 
                position: 'fixed', 
                top: `${dropdownPos.top + 4}px`, 
                right: `${dropdownPos.right}px`,
                zIndex: 9999 
            }}
            className="w-56 bg-gray-900 border-2 border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in"
          >
              <div className="py-2">
                {tabs.map(config => (
                    <button 
                        key={config.id} 
                        onClick={() => { setActiveTab(config.id); setOpenMenu(null); }} 
                        className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold transition-all ${activeTab === config.id ? 'bg-teal-600/20 text-teal-400' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="uppercase tracking-wide">{t(config.labelKey as any)}</span>
                        {(config.badgeKey ? (counts as any)[config.badgeKey] : 0) > 0 && <span className={`text-[10px] text-white px-1.5 py-0.5 rounded-full ${config.id === 'settings' ? 'bg-red-500' : 'bg-orange-600'}`}>{(counts as any)[config.badgeKey]}</span>}
                    </button>
                ))}
              </div>
          </div>,
          document.body
      );
  };

  return (
    <>
      <div className="bg-gray-800 border-t border-gray-700 shadow-sm z-30 sticky top-0" ref={navBarRef}>
        <div 
            ref={scrollContainerRef}
            className="max-w-7xl mx-auto w-full px-4 flex items-center overflow-x-auto no-scrollbar custom-scrollbar"
        >
          <div className="flex flex-nowrap items-center min-w-full">
            <div className="flex space-x-4 sm:space-x-6 py-1">
              {topLevelTabIds.map(tabId => {
                const config = TAB_CONFIG.find(c => c.id === tabId);
                if (!config || (config.adminOnly && currentUserRole !== 'ADMIN') || !hasPermission(config.permission)) return null;
                return (
                  <button 
                    key={config.id} 
                    onClick={() => { setActiveTab(config.id); setOpenMenu(null); }} 
                    className={`relative whitespace-nowrap py-3 px-1 border-b-4 font-bold text-sm transition-colors ${activeTab === config.id ? (config.color || 'border-teal-500 text-teal-400') : `border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500`}`}
                  >
                    {t(config.labelKey as any)}
                    {(config.badgeKey ? (counts as any)[config.badgeKey] : 0) > 0 && <span className={`ml-2 text-white text-[10px] rounded-full px-1.5 py-0.5 bg-orange-600`}>{(counts as any)[config.badgeKey]}</span>}
                  </button>
                );
              })}
            </div>
            
            <div className="ml-auto flex items-center">
                {renderDropdownTrigger('tab_logistics_group', 'logistics', isLogisticsTabActive, allowedLogisticsTabs)}
                {renderDropdownTrigger('tab_statistics', 'stats', isStatsTabActive, allowedStatsTabs)}
                {renderDropdownTrigger('tab_administration', 'admin', isAdminTabActive, allowedAdminTabs)}
            </div>
          </div>
        </div>
      </div>

      {renderPortalMenu('logistics', allowedLogisticsTabs)}
      {renderPortalMenu('stats', allowedStatsTabs)}
      {renderPortalMenu('admin', allowedAdminTabs)}
    </>
  );
};

export default TabNavigator;