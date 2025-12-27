
import React, { useState, useEffect } from 'react';
import { UserData } from '../types/appTypes';

interface AppHeaderProps {
  currentUser: string;
  currentUserRole: string;
  users: UserData[];
  onLogout: () => void;
  language: 'sk' | 'en';
  setLanguage: (lang: 'sk' | 'en') => void;
  t: (key: any) => string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  installPrompt: any;
  onInstallApp: () => void;
  hasPermission: (perm: string) => boolean;
  resolveName: (username?: string | null) => string;
}

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const FullscreenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 10L4 4m0 0v4m0-4h4M14 10l6-6m0 0v4m0-4h-4M14 14l6 6m0 0v-4m0 4h-4M10 14l-6 6m0 0v-4m0 4h4" />
    </svg>
);

const ExitFullscreenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l6 6m0 0v-4m0-4h-4M20 4l-6 6m0 0v-4m0 4h4M20 20l-6-6m0 0v4m0-4h4M4 20l6-6m0 0v-4m0-4h-4" />
    </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser, currentUserRole, onLogout, language, setLanguage, t,
  isFullscreen, onToggleFullscreen, installPrompt, onInstallApp, hasPermission, resolveName
}) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleLogoutWithCheck = () => {
        const savedScans = localStorage.getItem('inventory_scans');
        if (savedScans) {
            try {
                const scans = JSON.parse(savedScans);
                // OPRAVA: Kontrola scans na null/undefined pred length
                if (scans && scans.length > 0) {
                    const confirmMsg = language === 'sk' 
                      ? `Pozor! V Inventúre máte ${scans.length} neexportovaných položiek. Po odhlásení zostanú v pamäti tohto tabletu, ale odporúčame ich najskôr exportovať. Naozaj sa chcete odhlásiť?`
                      : `Warning! You have ${scans.length} unexported items in Inventory. They will remain in this tablet's memory, but we recommend exporting them first. Do you really want to log out?`;
                    
                    if (!window.confirm(confirmMsg)) return;
                }
            } catch (e) {}
        }
        onLogout();
    };

    return (
        <div className="bg-gray-900 shadow-2xl z-40 p-3 border-b border-gray-800 relative">
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between relative">
                <div className="flex items-center gap-4 z-10">
                    <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 shadow-inner">
                        <button onClick={() => setLanguage('sk')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${language === 'sk' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>SK</button>
                        <button onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${language === 'en' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>EN</button>
                    </div>
                    {/* Network Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${isOnline ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10 animate-pulse'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                            {isOnline ? 'ONLINE' : 'OFFLINE REŽIM'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3 z-10">
                    <div className="hidden sm:flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full shadow-sm">
                        <UserIcon className="w-4 h-4 text-teal-400" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-white leading-none truncate max-w-[120px]">{resolveName(currentUser)}</span>
                            <span className={`text-[9px] font-bold uppercase leading-none mt-1 ${currentUserRole === 'ADMIN' ? 'text-red-400' : currentUserRole === 'LEADER' ? 'text-sky-400' : 'text-teal-500 opacity-80'}`}>
                                {currentUserRole}
                            </span>
                        </div>
                    </div>

                    {installPrompt && hasPermission('perm_install_pwa') && (
                        <button onClick={onInstallApp} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors shadow-md border border-blue-500/50" title={t('pwa_install_btn')}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2z"/><path fillRule="evenodd" d="M3.5 9.25a.75.75 0 00-1.5 0v7a2 2 0 002 2h11a2 2 0 002-2v-7a.75.75 0 00-1.5 0v7a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-7z" clipRule="evenodd"/></svg>
                        </button>
                    )}
                    {hasPermission('perm_view_fullscreen') && (
                        <button onClick={onToggleFullscreen} className="bg-gray-700 hover:bg-gray-600 text-teal-400 hover:text-white p-2 rounded-lg transition-all shadow-md border border-gray-600" title={isFullscreen ? t('fullscreen_off') : t('fullscreen_on')}>
                            {isFullscreen ? <ExitFullscreenIcon className="h-5 w-5" /> : <FullscreenIcon className="h-5 w-5" />}
                        </button>
                    )}
                    <button onClick={handleLogoutWithCheck} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-all shadow-md border border-red-500/50" title={t('logout')}>
                        <LogoutIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppHeader;
