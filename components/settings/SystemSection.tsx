
import React, { useState } from 'react';
import { DBItem, BreakSchedule, SystemConfig } from '../../App';
import { useLanguage } from '../LanguageContext';
import { useData } from '../../context/DataContext';

interface SystemSectionProps {
  missingReasons: DBItem[];
  breakSchedules: BreakSchedule[];
  onAddMissingReason: (val: string) => void;
  onDeleteMissingReason: (id: string) => void;
  onAddBreakSchedule: (start: string, end: string) => void;
  onDeleteBreakSchedule: (id: string) => void;
  onUpdateAdminKey: (oldK: string, newK: string) => Promise<void>;
  isAdminLockEnabled: boolean;
  onToggleAdminLock: (val: boolean) => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
}

const Icons = {
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Mega: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
};

const SystemSection: React.FC<SystemSectionProps> = ({ 
  missingReasons, breakSchedules, onAddMissingReason, onDeleteMissingReason, onAddBreakSchedule, onDeleteBreakSchedule, onUpdateAdminKey,
  isAdminLockEnabled, onToggleAdminLock, systemConfig, onUpdateSystemConfig
}) => {
  const { language } = useLanguage();
  const { onBroadcastNotification } = useData();
  
  const [newMissingReason, setNewMissingReason] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');

  const [oldKey, setOldKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Broadcast state
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleBroadcast = async () => {
      if (!broadcastText.trim()) return;
      if (!window.confirm(language === 'sk' ? 'Odoslať túto správu všetkým užívateľom?' : 'Send this message to all users?')) return;
      
      setIsBroadcasting(true);
      const currentUser = localStorage.getItem('app_user') || 'ADMIN';
      const success = await onBroadcastNotification(broadcastText, currentUser);
      
      if (success) {
          setBroadcastText('');
          alert(language === 'sk' ? 'Správa bola úspešne rozoslaná.' : 'Message sent successfully.');
      } else {
          alert('Error sending message.');
      }
      setIsBroadcasting(false);
  };

  const handleUpdateKey = async () => {
    if (!isAdminLockEnabled) return;
    if (!oldKey || !newKey || !confirmKey) {
        alert(language === 'sk' ? 'Prosím, vyplňte všetky polia.' : 'Please fill all fields.');
        return;
    }
    if (newKey !== confirmKey) {
        alert(language === 'sk' ? 'Nové kľúče sa nezhodujú.' : 'New keys do not match.');
        return;
    }

    setIsUpdating(true);
    try {
        await onUpdateAdminKey(oldKey, newKey);
        setOldKey('');
        setNewKey('');
        setConfirmKey('');
    } catch (e) {
    } finally {
        setIsUpdating(false);
    }
  };

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-12 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3";

  return (
    <div className="space-y-8">
      
      {/* Hromadná správa */}
      <div className={`${cardClass} border-amber-500/30 ring-1 ring-amber-500/10`}>
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                  <Icons.Mega />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">HROMADNÁ SPRÁVA (BROADCAST)</h3>
          </div>
          <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {language === 'sk' 
                    ? 'Táto správa sa okamžite zobrazí ako vyskakovacie okno všetkým prihláseným užívateľom v systéme.' 
                    : 'This message will immediately appear as a popup to all logged-in users in the system.'}
              </p>
              <textarea 
                value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)}
                placeholder={language === 'sk' ? "Zadajte text správy..." : "Enter message text..."}
                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none transition-all resize-none"
              />
              <button 
                onClick={handleBroadcast}
                disabled={isBroadcasting || !broadcastText.trim()}
                className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 border-2 ${
                    isBroadcasting || !broadcastText.trim() 
                    ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed' 
                    : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                }`}
              >
                {isBroadcasting ? 'ODOSIELAM...' : '📢 ODOSLAŤ VŠETKÝM UŽÍVATEĽOM'}
              </button>
          </div>
      </div>

      <div className={cardClass}>
        <div className="space-y-8">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">DÔVODY PRESTOJOV</h3>
          <div className="flex-1 overflow-y-auto max-h-80 bg-slate-950/40 rounded-3xl p-6 space-y-3 border border-white/5 shadow-inner">
            {missingReasons.map(r => (
              <div key={r.id} className="flex justify-between items-center bg-slate-800/50 px-5 h-12 rounded-xl border border-white/5 group hover:bg-slate-700/50 transition-colors">
                <span className="text-base font-bold text-slate-300 uppercase tracking-widest">{r.value}</span>
                <button onClick={() => onDeleteMissingReason(r.id)} className="text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 px-2 text-xl font-black">×</button>
              </div>
            ))}
          </div>
          <div className="pt-6">
            <h4 className={labelClass}>PRIDAŤ DÔVOD</h4>
            <div className="flex gap-4">
              <input value={newMissingReason} onChange={e=>setNewMissingReason(e.target.value)} placeholder="Napr. Fyzicky chýba" className={inputClass} />
              <button onClick={() => { if(newMissingReason) { onAddMissingReason(newMissingReason); setNewMissingReason(''); } }} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-8 rounded-xl uppercase tracking-widest text-xs transition-all border-2 border-teal-500 shadow-lg">PRIDAŤ</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="space-y-8">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">PRESTÁVKY</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto custom-scrollbar">
            {breakSchedules.map(b => (
              <div key={b.id} className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 flex justify-between items-center group shadow-md hover:bg-slate-900 transition-colors">
                <span className="text-xl font-mono font-black text-slate-200">{b.startTime} — {b.endTime}</span>
                <button onClick={() => onDeleteBreakSchedule(b.id)} className="text-slate-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 p-2"><Icons.Trash /></button>
              </div>
            ))}
          </div>
          <div className="bg-slate-950/30 p-8 rounded-3xl border border-white/5 mt-auto shadow-inner">
            <h4 className={labelClass}>NOVO DEFINOVANÁ PRESTÁVKA</h4>
            <div className="flex items-center gap-5">
              <input type="time" value={newBreakStart} onChange={e=>setNewBreakStart(e.target.value)} className={inputClass} />
              <span className="text-slate-600 font-black text-2xl">—</span>
              <input type="time" value={newBreakEnd} onChange={e=>setNewBreakEnd(e.target.value)} className={inputClass} />
              <button onClick={() => { if(newBreakStart && newBreakEnd) { onAddBreakSchedule(newBreakStart, newBreakEnd); setNewBreakStart(''); setNewBreakEnd(''); } }} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-4 px-8 rounded-xl uppercase tracking-widest text-xs transition-all border-2 border-teal-500 shadow-lg">PRIDAŤ</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="space-y-8">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">KALIBRÁCIA MAPY</h3>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <h4 className={labelClass}>GLOBÁLNY ORIGIN X</h4>
                <input 
                  type="number" 
                  value={systemConfig.mapOriginX || 0} 
                  onChange={e => onUpdateSystemConfig({ mapOriginX: parseInt(e.target.value) || 0 })}
                  className={inputClass}
                />
             </div>
             <div>
                <h4 className={labelClass}>GLOBÁLNY ORIGIN Y</h4>
                <input 
                  type="number" 
                  value={systemConfig.mapOriginY || 0} 
                  onChange={e => onUpdateSystemConfig({ mapOriginY: parseInt(e.target.value) || 0 })}
                  className={inputClass}
                />
             </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">ADMIN BEZPEČNOSŤ</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {isAdminLockEnabled ? 'ZÁMOK AKTÍVNY' : 'ZÁMOK VYPNUTÝ'}
              </span>
              <button 
                onClick={() => onToggleAdminLock(!isAdminLockEnabled)}
                className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${isAdminLockEnabled ? 'bg-teal-600' : 'bg-slate-700'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 transform ${isAdminLockEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className={`space-y-6 transition-opacity duration-300 ${isAdminLockEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none select-none'}`}>
            <div>
              <h4 className={labelClass}>STARÝ KĽÚČ</h4>
              <input 
                type="password" 
                value={oldKey} 
                onChange={e => setOldKey(e.target.value)} 
                placeholder="••••••••" 
                className={inputClass} 
                disabled={!isAdminLockEnabled}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className={labelClass}>NOVÝ KĽÚČ</h4>
                <input 
                  type="password" 
                  value={newKey} 
                  onChange={e => setNewKey(e.target.value)} 
                  placeholder="••••••••" 
                  className={inputClass} 
                  disabled={!isAdminLockEnabled}
                />
              </div>
              <div>
                <h4 className={labelClass}>POTVRDIŤ NOVÝ KĽÚČ</h4>
                <input 
                  type="password" 
                  value={confirmKey} 
                  onChange={e => setConfirmKey(e.target.value)} 
                  placeholder="••••••••" 
                  className={inputClass} 
                  disabled={!isAdminLockEnabled}
                />
              </div>
            </div>
            <button 
                onClick={handleUpdateKey}
                disabled={isUpdating || !isAdminLockEnabled}
                className={`w-full py-4 bg-blue-700 hover:bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest text-xs transition-all border-2 border-blue-500 shadow-lg ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isUpdating ? 'AKTUALIZUJEM...' : 'AKTUALIZOVAŤ BEZPEČNOSTNÝ KĽÚČ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSection;
