
import React, { useState, useEffect } from 'react';
import { UserData, SystemConfig } from '../App';
import { useLanguage } from './LanguageContext';

interface LoginScreenProps {
  onLoginSuccess: (username: string, role: 'ADMIN' | 'USER' | 'LEADER') => void;
  users: UserData[];
  systemConfig: SystemConfig;
}

const OrimLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 370 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2dd4bf" /> {/* teal-400 */}
        <stop offset="100%" stopColor="#059669" /> {/* emerald-600 */}
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* OK Unity Mark - Pulse remains for life, but discreet due to parent opacity */}
    <g className="animate-pulse-slow" style={{ animation: 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
      {/* The "O" Ring Frame */}
      <path 
        d="M45 15C28.4315 15 15 28.4315 15 45C15 61.5685 28.4315 75 45 75C53.2843 75 60.7843 71.6421 66.2132 66.2132L57.7279 57.7279C54.5208 60.935 50.0208 63 45 63C35.0589 63 27 54.9411 27 45C27 35.0589 35.0589 27 45 27C50.0208 27 54.5208 29.065 57.7279 32.2721L66.2132 23.7868C60.7843 18.3579 53.2843 15 45 15Z" 
        fill="url(#logo-gradient)" 
      />
      
      {/* The "K" Stems */}
      <path 
        d="M50 45L72 23V37L58 45L72 53V67L50 45Z" 
        fill="white" 
      />
      
      {/* Accent Vertical Bar of the K */}
      <rect x="42" y="30" width="7" height="30" rx="1.5" fill="white" />
    </g>
    
    {/* Text Section - Preserved colors but low visibility via container */}
    <g transform="translate(95, 42)">
      <text 
        fill="white" 
        style={{ 
          font: '36px ui-sans-serif, system-ui', 
          textTransform: 'uppercase'
        }}
      >
        <tspan style={{ fontWeight: 900, letterSpacing: '0.02em' }}>ORIM</tspan>
        <tspan style={{ fontWeight: 400, letterSpacing: '0.08em' }}> KOTIVS</tspan>
      </text>
      <text 
        y="20" 
        fill="#cbd5e1" 
        style={{ 
          font: '700 10px ui-sans-serif, system-ui', 
          letterSpacing: '0.7em',
          textTransform: 'uppercase'
        }}
      >
        INTELLIGENCE
      </text>
    </g>
  </svg>
);

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
          setIsIpAllowed(true);
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
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4">
      
      {/* High-End App Logo Section - Styled as a Watermark */}
      <div className="mb-12 w-full max-w-[340px] mx-auto transform opacity-[0.12] hover:opacity-25 hover:scale-[1.02] transition-all duration-1000 ease-in-out pointer-events-none sm:pointer-events-auto">
          <OrimLogo className="w-full h-auto" />
      </div>

      {/* Maintenance Banner */}
      {isMaintenance && (
          <div className="w-full mb-6 bg-yellow-900/40 border border-yellow-500/50 backdrop-blur-md p-4 rounded-2xl text-center animate-pulse shadow-2xl">
              <h3 className="text-sm font-black text-yellow-500 uppercase tracking-[0.2em]">{t('maint_active_title')}</h3>
              <p className="text-yellow-100/70 text-[10px] font-bold mt-1 uppercase">{t('maint_active_desc')}</p>
          </div>
      )}

      {/* IP Block Banner */}
      {systemConfig.ipCheckEnabled && !loadingIp && !isIpAllowed && (
           <div className="w-full mb-6 bg-red-900/40 border border-red-500/50 backdrop-blur-md p-4 rounded-2xl text-center shadow-2xl">
               <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.2em]">{t('ip_blocked_title')}</h3>
               <p className="text-red-100/70 text-[10px] font-bold mt-1 uppercase">{t('ip_blocked_desc', { ip: clientIP || 'Unknown' })}</p>
           </div>
      )}

      <div className="w-full p-8 sm:p-10 space-y-8 bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.4)] border border-white/5 relative overflow-hidden">
        {/* Decorative inner glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-[80px]"></div>
        
        {loadingIp && (
            <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em]">{t('checking_ip')}</p>
                </div>
            </div>
        )}

        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2 whitespace-pre-line leading-tight tracking-tight">
            {t('login_title')}
          </h2>
          {/* Jasnejšia farba podnadpisu */}
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
            {t('login_subtitle')}
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                required
                autoFocus
                className="w-full h-14 bg-slate-900/50 border-2 border-slate-700/50 rounded-2xl px-6 text-white font-bold focus:outline-none focus:border-teal-500/50 transition-all uppercase placeholder:text-slate-500"
                placeholder={t('username').toUpperCase()}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="w-full h-14 bg-slate-900/50 border-2 border-slate-700/50 rounded-2xl px-6 text-white font-bold focus:outline-none focus:border-teal-500/50 transition-all placeholder:text-slate-500"
                placeholder={t('password').toUpperCase()}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 py-3 rounded-xl">
              <p className="text-[10px] text-red-500 text-center font-black uppercase tracking-wider">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={systemConfig.ipCheckEnabled && !isIpAllowed}
            className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.25em] text-xs transition-all shadow-xl active:scale-[0.98] border-b-4 
                ${systemConfig.ipCheckEnabled && !isIpAllowed 
                  ? 'bg-slate-700 border-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
                  : 'bg-teal-600 border-teal-800 hover:bg-teal-500 text-white shadow-[0_10px_30px_rgba(20,184,166,0.25)]'
                }`}
          >
            {t('login_btn')}
          </button>
        </form>
      </div>
      
      {/* Footer - Updated with custom string as requested */}
      <div className="mt-10 text-center">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">
            created by: Miroslav Svítok © 2026
          </p>
      </div>
    </div>
  );
};

export default LoginScreen;
