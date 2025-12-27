import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import AppAuthenticated from './AppAuthenticated';
import { useAppSecurity } from './hooks/useAppSecurity';
import { DataProvider, useData } from './context/DataContext';
import { SystemConfig, UserData, Task, DBItem, MapSector, PriorityLevel, InventorySession, Notification, PartRequest, BOMRequest, BreakSchedule, SystemBreak, BOMComponent, Role, Permission } from './types/appTypes';

// Export types for backward compatibility with components
export type { 
  UserData, Task, DBItem, MapSector, PriorityLevel, InventorySession,
  Notification, PartRequest, BOMRequest, BreakSchedule, SystemBreak,
  BOMComponent, Role, Permission, SystemConfig 
};

// --- INNER COMPONENT (Consumes Context) ---
const AppContent = ({ 
  isAuthenticated, 
  currentUser, 
  currentUserRole, 
  onLoginSuccess, 
  onLogout, 
  systemConfig, 
  isUnlocked, 
  onUnlockAttempt, 
  onUpdateAdminKey, 
  onToggleAdminLock, 
  onUpdateSystemConfig, 
  installPrompt, 
  onInstallApp 
}: any) => {
  const { users } = useData(); 
  const [unlockKey, setUnlockKey] = useState("");

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLoginSuccess={onLoginSuccess} 
        users={users} 
        systemConfig={systemConfig} 
      />
    );
  }

  // Admin Lock Screen
  if (currentUserRole === 'ADMIN' && systemConfig.adminLockEnabled && !isUnlocked) {
    return (
        <div className="flex flex-col items-center justify-center p-10 bg-gray-900 w-full h-full">
            <div className="flex flex-col items-center justify-center p-10 bg-gray-900 rounded-2xl border-2 border-amber-600 shadow-2xl">
                <div className="text-amber-500 mb-6 animate-pulse">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-white text-2xl font-black mb-6 tracking-widest uppercase">Zabezpečený prístup</h2>
                <input 
                    type="password" 
                    value={unlockKey} 
                    onChange={(e) => setUnlockKey(e.target.value)}
                    placeholder="ZADAJTE ADMIN KĽÚČ"
                    className="bg-gray-800 border-2 border-gray-700 text-white text-center px-4 py-3 rounded-xl mb-4 focus:border-amber-500 outline-none font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && onUnlockAttempt(unlockKey)}
                />
                <button 
                    onClick={() => onUnlockAttempt(unlockKey)}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black transition-all"
                >
                    ODOMKNÚŤ SYSTÉM
                </button>
                <button onClick={onLogout} className="mt-4 text-gray-500 hover:text-white text-xs uppercase font-bold transition-colors">Odhlásiť sa</button>
            </div>
        </div>
    );
  }

  return (
    <AppAuthenticated
      currentUser={currentUser}
      currentUserRole={currentUserRole}
      onLogout={onLogout}
      systemConfig={systemConfig}
      onUpdateSystemConfig={onUpdateSystemConfig}
      onUpdateAdminKey={onUpdateAdminKey}
      onToggleAdminLock={onToggleAdminLock}
      installPrompt={installPrompt}
      onInstallApp={onInstallApp}
    />
  );
};

// --- MAIN COMPONENT ---
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<'ADMIN' | 'USER' | 'LEADER'>('USER');

  // Security Hooks
  const { 
    isUnlocked, 
    setIsUnlocked, 
    systemConfig, 
    handleUnlockAttempt, 
    handleUpdateAdminKey, 
    handleUpdateSystemConfig 
  } = useAppSecurity(currentUserRole, isAuthenticated);

  // Auth Restoration
  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    const storedRole = localStorage.getItem('app_role');
    if (storedUser && storedRole) {
      setCurrentUser(storedUser);
      setCurrentUserRole(storedRole as any);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (u: string, r: any) => { 
    setIsAuthenticated(true); 
    setCurrentUser(u); 
    setCurrentUserRole(r); 
    localStorage.setItem('app_user', u); 
    localStorage.setItem('app_role', r); 
    
    if (r !== 'ADMIN' || !systemConfig.adminLockEnabled) { 
        setIsUnlocked(true); 
        sessionStorage.setItem('app_unlocked', 'true'); 
    }
  };

  const handleLogout = () => { 
    setIsAuthenticated(false); 
    setIsUnlocked(false);
    setCurrentUser(''); 
    setCurrentUserRole('USER'); 
    localStorage.removeItem('app_user'); 
    localStorage.removeItem('app_role'); 
    sessionStorage.removeItem('app_unlocked');
  };

  // PWA Logic
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((result: any) => {
      if (result.outcome === 'accepted') setInstallPrompt(null);
    });
  };

  return (
    <div className={`min-h-screen bg-gray-900 flex flex-col ${!isAuthenticated ? 'items-center justify-center' : ''}`}>
       <DataProvider isAuthenticated={isAuthenticated} currentUserRole={currentUserRole}>
          <AppContent 
             isAuthenticated={isAuthenticated}
             currentUser={currentUser}
             currentUserRole={currentUserRole}
             onLoginSuccess={handleLogin}
             onLogout={handleLogout}
             systemConfig={systemConfig}
             isUnlocked={isUnlocked}
             onUnlockAttempt={handleUnlockAttempt}
             onUpdateAdminKey={handleUpdateAdminKey}
             onToggleAdminLock={(val: boolean) => handleUpdateSystemConfig({ adminLockEnabled: val })}
             onUpdateSystemConfig={handleUpdateSystemConfig}
             installPrompt={installPrompt}
             onInstallApp={handleInstallApp}
          />
       </DataProvider>
    </div>
  );
};

export default App;