
import React, { useState, useEffect } from 'react';
import { SystemConfig } from '../../App';
import { useLanguage } from '../LanguageContext';

interface MaintenanceSectionProps {
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
  onGetDocCount: () => Promise<number>;
  onPurgeOldTasks: () => Promise<number>;
  onExportTasksJSON: () => Promise<void>;
}

const Icons = {
  Archive: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
  Database: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.105 3.582 2 8 2s8-.895 8-2V7M4 7c0 1.105 3.582 2 8 2s8-.895 8-2M4 7c0-1.105 3.582-2 8-2s8 .895 8 2m-8 4v10" /></svg>,
  Export: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Trash: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  External: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
};

const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({ systemConfig, onUpdateSystemConfig, onArchiveTasks, onGetDocCount, onPurgeOldTasks, onExportTasksJSON }) => {
  const { t } = useLanguage();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [scheduleStart, setScheduleStart] = useState(systemConfig.maintenanceStart || '');
  const [scheduleEnd, setScheduleEnd] = useState(systemConfig.maintenanceEnd || '');
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
      onGetDocCount().then(setDocCount);
  }, []);

  const handlePurge = async () => {
      if (!window.confirm('Naozaj chcete natrvalo vymazať úlohy staršie ako 90 dní? Odporúčame najskôr vykonať JSON export.')) return;
      setIsPurging(true);
      const purged = await onPurgeOldTasks();
      alert(`Vymazaných ${purged} starých dokumentov.`);
      onGetDocCount().then(setDocCount);
      setIsPurging(false);
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className={cardClass}>
          <div className="h-full flex flex-col justify-center items-center py-10 space-y-6 text-center">
            <div className="p-6 bg-purple-500/10 rounded-full border-2 border-purple-500/20 text-purple-400 mb-2 animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.2)]"><Icons.Archive /></div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">ARCHIVÁCIA</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium px-4">{t('maint_desc')}</p>
            </div>
            <button onClick={() => { setIsArchiving(true); onArchiveTasks().then(() => setIsArchiving(false)); }} disabled={isArchiving} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 border-2 border-purple-400">
              {isArchiving ? t('archiving') : t('archive_btn')}
            </button>
          </div>
        </div>

        <div className={cardClass}>
          <div className="h-full flex flex-col justify-center items-center py-10 space-y-6 text-center">
            <div className="p-6 bg-rose-500/10 rounded-full border-2 border-rose-500/20 text-rose-400 mb-2 shadow-[0_0_30px_rgba(244,63,94,0.2)]"><Icons.Database /></div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">KAPACITA DB</h3>
              <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg inline-block">
                <span className="text-rose-400 font-black text-2xl font-mono">{docCount ?? '...'}</span>
                <span className="text-slate-500 text-[10px] ml-2 uppercase font-black">Dokumentov</span>
              </div>
              <p className="text-slate-500 text-[10px] uppercase font-bold mt-2">TTL: 90 dní automaticky</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full px-4 mb-4">
                <button onClick={onExportTasksJSON} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-black py-3 rounded-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-slate-600 transition-all active:scale-95">
                    <Icons.Export /> BACKUP
                </button>
                <button onClick={handlePurge} disabled={isPurging} className="bg-rose-900/20 hover:bg-rose-600 text-rose-500 hover:text-white font-black py-3 rounded-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-rose-900/50 transition-all active:scale-95">
                    <Icons.Trash /> {isPurging ? '...' : 'PURGE'}
                </button>
            </div>
            <div className="w-full px-4">
                <a 
                  href="https://console.firebase.google.com/u/0/project/sklad-ulohy/firestore/databases/-default-/data" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full h-10 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                    {t('sect_maint_db_link')} <Icons.External />
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSection;
