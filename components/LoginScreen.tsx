import React, { useState, useEffect } from 'react';
import { UserData, SystemConfig } from '../App';
import { useLanguage } from './LanguageContext';

interface LoginScreenProps {
  onLoginSuccess: (username: string, role: 'ADMIN' | 'USER' | 'LEADER') => void;
  users: UserData[];
  systemConfig: SystemConfig;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, users, systemConfig }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { t } = useLanguage();

  // IP Check State
  const [clientIP, setClientIP] = useState<string | null>(null);
  const [isIpAllowed, setIsIpAllowed] = useState<boolean>(true);
  const [loadingIp, setLoadingIp] = useState<boolean>(false);

  // Scheduled Maintenance Check
  const now = new Date();
  const currentISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  const isScheduledMaintenance = systemConfig.maintenanceStart && systemConfig.maintenanceEnd && 
                                 currentISO >= systemConfig.maintenanceStart && 
                                 currentISO <= systemConfig.maintenanceEnd;
  const isMaintenance = systemConfig.maintenanceMode || isScheduledMaintenance;

  useEffect(() => {
      // Fetch Client IP if check is enabled
      if (systemConfig.ipCheckEnabled) {
          setLoadingIp(true);
          fetch('https://api.ipify.org?format=json')
              .then(res => res.json())
              .then(data => {
                  setClientIP(data.ip);
                  checkIpAgainstWhitelist(data.ip);
              })
              .catch(err => {
                  console.error('IP fetch failed', err);
                  setClientIP('Unknown');
                  setIsIpAllowed(true); 
              })
              .finally(() => setLoadingIp(false));
      } else {
          setIsIpAllowed(true);
      }
  }, [systemConfig.ipCheckEnabled, systemConfig.allowedIPs]);

  const checkIpAgainstWhitelist = (ip: string) => {
      if (!systemConfig.allowedIPs || systemConfig.allowedIPs.length === 0) {
          setIsIpAllowed(true); // Empty list = allow all
          return;
      }
      
      const allowed = systemConfig.allowedIPs.some(pattern => {
          if (pattern.includes('*')) {
              const prefix = pattern.split('*')[0];
              return ip.startsWith(prefix);
          }
          return pattern === ip;
      });
      setIsIpAllowed(allowed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedInputUsername = username.trim().toUpperCase();
    
    // Check IP First
    if (systemConfig.ipCheckEnabled && !isIpAllowed) {
        const foundUser = users.find(u => u.username.toUpperCase() === normalizedInputUsername);
        
        if (foundUser && foundUser.password === password) {
             if (foundUser.role === 'ADMIN') {
                 onLoginSuccess(foundUser.username, foundUser.role);
                 return;
             }
        }
        setError(t('ip_blocked_title')); 
        return;
    }

    const foundUser = users.find(u => u.username.toUpperCase() === normalizedInputUsername);

    if (foundUser && foundUser.password === password) {
      if (isMaintenance && foundUser.role !== 'ADMIN') {
          setError(t('login_error_maint'));
      } else {
          setError('');
          onLoginSuccess(foundUser.username, foundUser.role);
      }
    } else {
      setError(t('login_error'));
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-4">
      
      {/* Maintenance Banner */}
      {isMaintenance && (
          <div className="w-full mb-6 bg-yellow-900/50 border border-yellow-600 p-4 rounded-xl text-center animate-pulse">
              <h3 className="text-xl font-bold text-yellow-500 uppercase">{t('maint_active_title')}</h3>
              <p className="text-yellow-200 text-sm mt-1">{t('maint_active_desc')}</p>
              {isScheduledMaintenance && (
                  <p className="text-xs text-yellow-400 mt-2 font-mono">
                      {t('maint_scheduled_msg', { 
                          start: new Date(systemConfig.maintenanceStart!).toLocaleString(), 
                          end: new Date(systemConfig.maintenanceEnd!).toLocaleString() 
                      })}
                  </p>
              )}
          </div>
      )}

      {/* IP Block Banner */}
      {systemConfig.ipCheckEnabled && !loadingIp && !isIpAllowed && (
           <div className="w-full mb-6 bg-red-900/50 border border-red-600 p-4 rounded-xl text-center">
               <h3 className="text-xl font-bold text-red-500 uppercase">{t('ip_blocked_title')}</h3>
               <p className="text-red-200 text-sm mt-1">{t('ip_blocked_desc', { ip: clientIP || 'Unknown' })}</p>
           </div>
      )}

      <div className="w-full p-6 sm:p-8 space-y-6 sm:space-y-8 bg-gray-800 rounded-xl shadow-lg relative overflow-hidden">
        {loadingIp && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50">
                <p className="text-teal-400 animate-pulse font-bold">{t('checking_ip')}</p>
            </div>
        )}

        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[#97bc1e] mb-2">
            {t('login_title')}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {t('login_subtitle')}
          </p>
        </div>
        <form className="mt-6 sm:mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">{t('username')}</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                autoFocus
                className={`appearance-none rounded-none rounded-t-md relative block w-full px-3 py-3 border placeholder-gray-500 text-white bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 focus:z-10 text-base sm:text-sm ${error ? 'border-red-500' : 'border-gray-600'}`}
                placeholder={t('username')}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">{t('password')}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none rounded-b-md relative block w-full px-3 py-3 border placeholder-gray-500 text-white bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 focus:z-10 text-base sm:text-sm ${error ? 'border-red-500' : 'border-gray-600'}`}
                placeholder={t('password')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400 text-center font-bold">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={systemConfig.ipCheckEnabled && !isIpAllowed}
              className={`group relative w-full flex justify-center py-3 px-4 border border-teal-400/50 text-sm font-medium rounded-md text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 
                  ${systemConfig.ipCheckEnabled && !isIpAllowed 
                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                    : 'bg-teal-700 hover:bg-teal-600 shadow-[0_0_15px_rgba(15,118,110,0.4)]'
                  }`}
            >
              {t('login_btn')}
            </button>
          </div>
        </form>
      </div>
      
      {/* Footer Credit */}
      <div className="mt-8 text-center text-xs text-gray-500 opacity-60">
          <p>{t('created_by')}</p>
          <p className="mt-1">© 2025</p>
      </div>
    </div>
  );
};

export default LoginScreen;