
import React, { useState } from 'react';
import { SystemConfig } from '../../App';
import { useLanguage } from '../LanguageContext';

interface MaintenanceSectionProps {
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
}

const Icons = {
  Archive: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
};

const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({ systemConfig, onUpdateSystemConfig, onArchiveTasks }) => {
  const { t } = useLanguage();
  const [isArchiving, setIsArchiving] = useState(false);
  const [scheduleStart, setScheduleStart] = useState(systemConfig.maintenanceStart || '');
  const [scheduleEnd, setScheduleEnd] = useState(systemConfig.maintenanceEnd || '');
  const [newIp, setNewIp] = useState('');

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-12 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3";

  return (
    <div className="space-y-8">
      <div className={cardClass}>
        <div className="space-y-10">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">SYSTÉM & BEZPEČNOSŤ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className={`p-8 rounded-3xl border transition-all ${systemConfig.maintenanceMode ? 'bg-red-900/10 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-slate-950/40 border-white/5'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-base font-black text-white uppercase tracking-widest">MAINTENANCE MODE</h4>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black ${systemConfig.maintenanceMode ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>{systemConfig.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">Keď je aktívny, bežní užívatelia sú automaticky odhlásení a nemôžu sa prihlásiť.</p>
                <button onClick={() => onUpdateSystemConfig({maintenanceMode: !systemConfig.maintenanceMode})} className={`w-full py-5 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all border-2 ${systemConfig.maintenanceMode ? 'bg-white text-red-600 border-white shadow-xl' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  {systemConfig.maintenanceMode ? 'DEAKTIVOVAŤ' : 'AKTIVOVAŤ SERVISNÝ MÓD'}
                </button>
              </div>
              <div className="bg-slate-950/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                <h4 className={labelClass}>SCHEDULED MAINTENANCE</h4>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <input type="datetime-local" value={scheduleStart} onChange={e=>setScheduleStart(e.target.value)} className={inputClass} />
                  <input type="datetime-local" value={scheduleEnd} onChange={e=>setScheduleEnd(e.target.value)} className={inputClass} />
                </div>
                <div className="flex gap-4">
                  <button onClick={() => onUpdateSystemConfig({maintenanceStart:scheduleStart, maintenanceEnd:scheduleEnd})} className="flex-1 h-12 bg-teal-600 text-white font-black rounded-xl text-xs uppercase tracking-widest border-2 border-teal-500 shadow-lg">ULOŽIŤ PLÁN</button>
                  <button onClick={() => { setScheduleStart(''); setScheduleEnd(''); onUpdateSystemConfig({maintenanceStart:'', maintenanceEnd:''}); }} className="h-12 bg-slate-800 text-slate-400 font-black px-6 rounded-xl text-xs uppercase tracking-widest border-2 border-slate-700">ZRUŠIŤ</button>
                </div>
              </div>
            </div>
            <div className="bg-slate-950/40 p-8 rounded-3xl border border-white/5 space-y-8 shadow-inner">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black text-white uppercase tracking-widest">IP WHITELIST</h4>
                <button onClick={() => onUpdateSystemConfig({ipCheckEnabled: !systemConfig.ipCheckEnabled})} className={`text-xs font-black px-5 h-10 flex items-center rounded-full border-2 transition-all ${systemConfig.ipCheckEnabled ? 'bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{systemConfig.ipCheckEnabled ? 'ENABLED' : 'DISABLED'}</button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-3">
                {(systemConfig.allowedIPs || []).map(ip => (
                  <div key={ip} className="bg-slate-900 px-5 h-12 rounded-xl border border-white/5 flex justify-between items-center text-xs font-mono group hover:bg-slate-800 transition-colors">
                    <span className="text-slate-300 font-bold">{ip}</span>
                    <button onClick={() => onUpdateSystemConfig({allowedIPs: (systemConfig.allowedIPs||[]).filter(i=>i!==ip)})} className="text-red-500 opacity-0 group-hover:opacity-100 font-black px-2 text-xl">×</button>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-slate-800">
                <h5 className={labelClass}>ADD IP / WILDCARD</h5>
                <div className="flex gap-4">
                  <input value={newIp} onChange={e=>setNewIp(e.target.value)} placeholder="0.0.0.0" className={inputClass} />
                  <button onClick={() => { if(newIp) { onUpdateSystemConfig({allowedIPs: [...(systemConfig.allowedIPs||[]), newIp.trim()]}); setNewIp(''); } }} className="h-12 w-16 bg-blue-600 text-white rounded-xl font-black text-2xl border-2 border-blue-500 shadow-lg">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="h-full flex flex-col justify-center items-center py-16 space-y-10 text-center">
          <div className="p-8 bg-purple-500/10 rounded-full border-2 border-purple-500/20 text-purple-400 mb-6 animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.2)]"><Icons.Archive /></div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">ÚDRŽBA DÁT</h3>
            <p className="text-slate-400 max-w-lg mx-auto text-base leading-relaxed font-medium">{t('maint_desc')}</p>
          </div>
          <button onClick={() => { setIsArchiving(true); onArchiveTasks().then(() => setIsArchiving(false)); }} disabled={isArchiving} className="bg-purple-600 hover:bg-purple-500 text-white font-black py-8 px-16 rounded-2xl uppercase tracking-[0.2em] text-xl shadow-2xl shadow-purple-900/40 transition-all active:scale-95 border-2 border-purple-400">
            {isArchiving ? t('archiving') : t('archive_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSection;
