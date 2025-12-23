
import React, { useState } from 'react';
import { SystemConfig } from '../../App';
import { useLanguage } from '../LanguageContext';

interface MaintenanceSectionProps {
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
}

const Icons = {
  Archive: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
};

const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({ systemConfig, onUpdateSystemConfig, onArchiveTasks }) => {
  const { t } = useLanguage();
  const [isArchiving, setIsArchiving] = useState(false);
  const [scheduleStart, setScheduleStart] = useState(systemConfig.maintenanceStart || '');
  const [scheduleEnd, setScheduleEnd] = useState(systemConfig.maintenanceEnd || '');
  const [newIp, setNewIp] = useState('');

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-10 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2";

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="space-y-8">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">SYSTÉM & BEZPEČNOSŤ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border transition-all ${systemConfig.maintenanceMode ? 'bg-red-900/10 border-red-500' : 'bg-slate-950/40 border-white/5'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">MAINTENANCE MODE</h4>
                  <span className={`px-2 py-1 rounded-full text-[8px] font-black ${systemConfig.maintenanceMode ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>{systemConfig.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">Keď je aktívny, bežní užívatelia sú automaticky odhlásení a nemôžu sa prihlásiť.</p>
                <button onClick={() => onUpdateSystemConfig({maintenanceMode: !systemConfig.maintenanceMode})} className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all ${systemConfig.maintenanceMode ? 'bg-white text-red-600' : 'bg-slate-800 text-slate-300'}`}>
                  {systemConfig.maintenanceMode ? 'DEAKTIVOVAŤ' : 'AKTIVOVAŤ SERVISNÝ MÓD'}
                </button>
              </div>
              <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5">
                <h4 className={labelClass}>SCHEDULED MAINTENANCE</h4>
                <div className="grid grid-cols-1 gap-2 mb-4">
                  <input type="datetime-local" value={scheduleStart} onChange={e=>setScheduleStart(e.target.value)} className={inputClass} />
                  <input type="datetime-local" value={scheduleEnd} onChange={e=>setScheduleEnd(e.target.value)} className={inputClass} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onUpdateSystemConfig({maintenanceStart:scheduleStart, maintenanceEnd:scheduleEnd})} className="flex-1 h-10 bg-teal-600 text-white font-black rounded-lg text-[9px] uppercase tracking-widest">ULOŽIŤ PLÁN</button>
                  <button onClick={() => { setScheduleStart(''); setScheduleEnd(''); onUpdateSystemConfig({maintenanceStart:'', maintenanceEnd:''}); }} className="h-10 bg-slate-800 text-slate-400 font-black px-4 rounded-lg text-[9px] uppercase tracking-widest">ZRUŠIŤ</button>
                </div>
              </div>
            </div>
            <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-black text-white uppercase tracking-widest">IP WHITELIST</h4>
                <button onClick={() => onUpdateSystemConfig({ipCheckEnabled: !systemConfig.ipCheckEnabled})} className={`text-[9px] font-black px-3 h-8 flex items-center rounded-full border transition-all ${systemConfig.ipCheckEnabled ? 'bg-green-500 text-white border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{systemConfig.ipCheckEnabled ? 'ENABLED' : 'DISABLED'}</button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {(systemConfig.allowedIPs || []).map(ip => (
                  <div key={ip} className="bg-slate-900 px-4 h-10 rounded-xl border border-white/5 flex justify-between items-center text-[10px] font-mono group">
                    <span className="text-slate-300">{ip}</span>
                    <button onClick={() => onUpdateSystemConfig({allowedIPs: (systemConfig.allowedIPs||[]).filter(i=>i!==ip)})} className="text-red-500 opacity-0 group-hover:opacity-100 font-black px-1">×</button>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <h5 className={labelClass}>ADD IP / WILDCARD</h5>
                <div className="flex gap-2">
                  <input value={newIp} onChange={e=>setNewIp(e.target.value)} placeholder="0.0.0.0" className={inputClass} />
                  <button onClick={() => { if(newIp) { onUpdateSystemConfig({allowedIPs: [...(systemConfig.allowedIPs||[]), newIp.trim()]}); setNewIp(''); } }} className="h-10 bg-blue-600 text-white px-4 rounded-xl font-black">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="h-full flex flex-col justify-center items-center py-10 space-y-8 text-center">
          <div className="p-6 bg-purple-500/10 rounded-full border border-purple-500/20 text-purple-400 mb-4 animate-pulse"><Icons.Archive /></div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">ÚDRŽBA DÁT</h3>
            <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">{t('maint_desc')}</p>
          </div>
          <button onClick={() => { setIsArchiving(true); onArchiveTasks().then(() => setIsArchiving(false)); }} disabled={isArchiving} className="bg-purple-600 hover:bg-purple-500 text-white font-black py-6 px-12 rounded-xl uppercase tracking-widest text-lg shadow-xl shadow-purple-900/20 transition-all active:scale-95">
            {isArchiving ? t('archiving') : t('archive_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSection;
