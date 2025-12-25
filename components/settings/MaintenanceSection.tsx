import React, { useState, useEffect } from 'react';
import { SystemConfig } from '../../App';
import { useLanguage } from '../LanguageContext';

interface MaintenanceSectionProps {
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  onArchiveTasks: () => Promise<{ success: boolean; count?: number; error?: string; message?: string }>;
  onDailyClosing: () => Promise<{ success: boolean; count: number }>;
  onWeeklyClosing: () => Promise<{ success: boolean; count: number; sanon?: string }>;
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

const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({ systemConfig, onUpdateSystemConfig, onArchiveTasks, onDailyClosing, onWeeklyClosing, onGetDocCount, onPurgeOldTasks, onExportTasksJSON }) => {
  const { t } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [newIp, setNewIp] = useState('');
  const [currentUserIp, setCurrentUserIp] = useState<string>('');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
      onGetDocCount().then(setDocCount);
      // Zistenie aktuálnej IP používateľa hneď pri načítaní
      fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .then(data => setCurrentUserIp(data.ip))
          .catch(err => console.error("Failed to fetch user IP", err));
  }, []);

  const handlePurge = async () => {
      if (!window.confirm('Naozaj chcete natrvalo vymazať úlohy staršie ako 90 dní? Odporúčame najskôr vykonať JSON export.')) return;
      setIsPurging(true);
      const purged = await onPurgeOldTasks();
      alert(`Vymazaných ${purged} starých dokumentov.`);
      onGetDocCount().then(setDocCount);
      setIsPurging(false);
  };

  const handleDaily = async () => {
      if (!window.confirm("Spustiť dennú uzávierku? Všetky hotové úlohy budú presunuté do denného archívu.")) return;
      setIsClosing(true);
      const res = await onDailyClosing();
      alert(`Denná uzávierka úspešná. Presunutých ${res.count} úloh.`);
      setIsClosing(false);
  };

  const handleWeekly = async () => {
      if (!window.confirm("Spustiť týždennú uzávierku? Denný archív bude presunutý do nového šanónu.")) return;
      setIsClosing(true);
      const res = await onWeeklyClosing();
      alert(`Týždenná uzávierka úspešná. Presunutých ${res.count} úloh do: ${res.sanon}.`);
      setIsClosing(false);
  };

  const handleManualAddIp = () => {
    if (!newIp.trim()) return;
    const currentList = systemConfig.allowedIPs || [];
    if (currentList.includes(newIp.trim())) {
      alert("Táto IP je už na zozname.");
      return;
    }
    onUpdateSystemConfig({ allowedIPs: [...currentList, newIp.trim()] });
    setNewIp('');
  };

  const handleToggleIpCheck = async () => {
    if (systemConfig.ipCheckEnabled) {
      onUpdateSystemConfig({ ipCheckEnabled: false });
      return;
    }

    const currentList = systemConfig.allowedIPs || [];
    setIsActivating(true);
    
    try {
      // 1. Zistiť aktuálnu IP (ak ešte nemáme z useEffectu)
      let myIp = currentUserIp;
      if (!myIp) {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        myIp = data.ip;
        setCurrentUserIp(myIp);
      }

      if (!myIp) {
        alert("Nepodarilo sa overiť vašu IP adresu. Aktivácia bola zrušená.");
        return;
      }

      // 2. Skontrolovať, či je IP v zozname (wildcard alebo presná zhoda)
      const isAllowed = currentList.some(pattern => {
        if (pattern.includes('*')) {
            const prefix = pattern.split('*')[0];
            return myIp.startsWith(prefix);
        }
        return pattern === myIp;
      });

      let newList = [...currentList];
      if (!isAllowed) {
        if (window.confirm(`Vaša aktuálna IP (${myIp}) nie je na zozname povolených. Chcete ju automaticky pridať a zapnúť kontrolu?`)) {
          newList.push(myIp);
        } else {
          setIsActivating(false);
          return;
        }
      }

      // 3. Poistka: Zoznam nesmie byť prázdny
      if (newList.length === 0) {
        alert("Zoznam povolených IP je prázdny. Aktivácia nie je možná.");
        setIsActivating(false);
        return;
      }

      onUpdateSystemConfig({ 
        allowedIPs: newList,
        ipCheckEnabled: true 
      });
      
    } catch (err) {
      console.error("IP activation failed", err);
      alert("Chyba pri overovaní IP adresy.");
    } finally {
      setIsActivating(false);
    }
  };

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-12 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3";

  const isListEmpty = (systemConfig.allowedIPs || []).length === 0;

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

              <div className="bg-slate-950/40 p-8 rounded-3xl border border-white/5 space-y-4 shadow-inner">
                <div className="flex justify-between items-center">
                  <h4 className="text-base font-black text-white uppercase tracking-widest">FIREBASE KONZOLA</h4>
                </div>
                <p className="text-xs text-slate-500 font-medium">Priamy prístup k archívu úloh v cloudovej databáze.</p>
                <a 
                  href="https://console.firebase.google.com/u/0/project/sklad-ulohy/firestore/databases/-default-/data/~2Farchived_tasks~2F01dqr7FtSKYS40pYag2z"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 flex items-center justify-center gap-3 bg-slate-900 px-5 rounded-xl border border-white/5 text-xs font-mono font-bold text-orange-400 hover:bg-slate-800 transition-all shadow-md group"
                >
                  <span>OPEN FIRESTORE DB</span>
                  <Icons.External />
                </a>
              </div>
            </div>
            <div className="bg-slate-950/40 p-8 rounded-3xl border border-white/5 space-y-8 shadow-inner flex flex-col">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-widest">IP WHITELIST</h4>
                  <p className="text-[10px] font-mono text-teal-500/80 tracking-wider mt-1">
                    VAŠA AKTUÁLNA IP: {currentUserIp || 'zisťujem...'}
                  </p>
                </div>
                <button 
                  onClick={handleToggleIpCheck} 
                  disabled={isActivating}
                  className={`text-xs font-black px-5 h-10 flex items-center rounded-full border-2 transition-all ${
                    systemConfig.ipCheckEnabled 
                      ? 'bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                      : isListEmpty 
                        ? 'bg-slate-800 text-rose-500 border-rose-900/30' 
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {isActivating ? '...' : (
                    <>
                      {(!systemConfig.ipCheckEnabled && isListEmpty) && <span className="mr-2">⚠️</span>}
                      {systemConfig.ipCheckEnabled ? 'ENABLED' : 'DISABLED'}
                    </>
                  )}
                </button>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-3 mb-4">
                {(systemConfig.allowedIPs || []).map(ip => (
                  <div key={ip} className="bg-slate-900 px-5 h-10 rounded-xl border border-white/5 flex justify-between items-center text-xs font-mono group hover:bg-slate-800 transition-colors">
                    <span className="text-slate-300 font-bold">{ip}</span>
                    <button onClick={() => onUpdateSystemConfig({allowedIPs: (systemConfig.allowedIPs||[]).filter(i=>i!==ip)})} className="text-red-500 opacity-0 group-hover:opacity-100 font-black px-2 text-xl">×</button>
                  </div>
                ))}
                {isListEmpty && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Whitelist je prázdny</p>
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-3">
                <div className="flex justify-between items-end">
                  <h4 className={labelClass}>MANUÁLNE PRIDAŤ IP</h4>
                  <button 
                    onClick={() => setNewIp(currentUserIp)}
                    className="text-[9px] font-black text-teal-500 hover:text-teal-400 uppercase tracking-widest mb-3 transition-colors"
                  >
                    POUŽIŤ MOJU IP
                  </button>
                </div>
                <div className="flex gap-3">
                  <input 
                    value={newIp} 
                    onChange={e => setNewIp(e.target.value)} 
                    placeholder="napr. 192.168.1.*" 
                    className={inputClass} 
                  />
                  <button 
                    onClick={handleManualAddIp}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-[10px] transition-all border-2 border-teal-500 shadow-lg whitespace-nowrap"
                  >
                    PRIDAŤ IP
                  </button>
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
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">UZÁVIERKY (ŠANÓNY)</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-medium px-4">Uzávierky presúvajú hotové úlohy do archívov pre lepšiu prehľadnosť a výkon systému.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 w-full">
                <button onClick={handleDaily} disabled={isClosing} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 border-2 border-teal-400">
                📦 DENNÁ UZÁVIERKA
                </button>
                <button onClick={handleWeekly} disabled={isClosing} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 border-2 border-blue-400">
                🗄️ TÝŽDENNÁ UZÁVIERKA
                </button>
            </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4 w-full px-4 mb-4">
                <button onClick={onExportTasksJSON} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-black py-3 rounded-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-slate-600 transition-all active:scale-95">
                    <Icons.Export /> BACKUP
                </button>
                <button onClick={handlePurge} disabled={isPurging} className="bg-rose-900/20 hover:bg-rose-600 text-rose-500 hover:text-white font-black py-3 rounded-xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-rose-900/50 transition-all active:scale-95">
                    <Icons.Trash /> {isPurging ? '...' : 'PURGE'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSection;