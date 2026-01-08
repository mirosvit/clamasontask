
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
  Megaphone: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
  UserGroup: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
};

const SystemSection: React.FC<SystemSectionProps> = ({ 
  missingReasons, breakSchedules, onAddMissingReason, onDeleteMissingReason, onAddBreakSchedule, onDeleteBreakSchedule, onUpdateAdminKey,
  isAdminLockEnabled, onToggleAdminLock, systemConfig, onUpdateSystemConfig
}) => {
  const { language } = useLanguage();
  const { onBroadcastNotification, users } = useData();
  
  const [newMissingReason, setNewMissingReason] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');

  const [oldKey, setOldKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Broadcast State
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  const toggleRecipient = (username: string) => {
    setSelectAll(false);
    setSelectedRecipients(prev => 
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const handleToggleAll = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    if (newState) setSelectedRecipients([]);
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
        // Error handled in hook
    } finally {
        setIsUpdating(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    
    const recipientCount = selectAll ? users.length : selectedRecipients.length;
    if (recipientCount === 0) {
        alert(language === 'sk' ? 'Vyberte aspoň jedného príjemcu.' : 'Select at least one recipient.');
        return;
    }

    if (!window.confirm(language === 'sk' ? `Odoslať túto správu ${recipientCount} užívateľom?` : `Send this message to ${recipientCount} users?`)) return;
    
    setIsBroadcasting(true);
    const author = localStorage.getItem('app_user') || 'ADMIN';
    
    // Ak je selectAll true, posielame undefined (v hooku ošetríme ako všetkých)
    await onBroadcastNotification(broadcastMsg, author, selectAll ? undefined : selectedRecipients);
    
    setBroadcastMsg('');
    setIsBroadcasting(false);
    alert(language === 'sk' ? 'Správa bola rozoslaná.' : 'Message broadcasted.');
  };

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-12 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3";

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* BROADCAST SECTION */}
      <div className="bg-indigo-900/10 border-2 border-indigo-500/30 rounded-3xl p-6 shadow-xl ring-1 ring-indigo-500/20">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <Icons.Megaphone />
              </div>
              <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">HROMADNÁ SPRÁVA</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Odoslať notifikáciu vybraným užívateľom</p>
              </div>
          </div>

          <div className="space-y-6">
              {/* Recipient Selector UI */}
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                          <Icons.UserGroup />
                          PRÍJEMCOVIA
                      </div>
                      <button 
                        onClick={handleToggleAll}
                        className={`text-[10px] font-black px-3 py-1 rounded-full border transition-all ${selectAll ? 'bg-indigo-500 text-white border-indigo-400 shadow-md' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                      >
                        VŠETCI PRIHLÁSENÍ
                      </button>
                  </div>
                  
                  {!selectAll && (
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1 animate-fade-in">
                          {users.map(u => (
                              <button
                                  key={u.username}
                                  onClick={() => toggleRecipient(u.username)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${selectedRecipients.includes(u.username) ? 'bg-teal-600/20 border-teal-500 text-teal-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                              >
                                  {u.nickname || u.username}
                              </button>
                          ))}
                      </div>
                  )}
              </div>

              <div className="flex gap-3">
                  <textarea 
                      value={broadcastMsg}
                      onChange={(e) => setBroadcastMsg(e.target.value)}
                      placeholder="ZADAJTE TEXT SPRÁVY..."
                      className="w-full bg-slate-950 border border-indigo-500/30 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-medium placeholder-slate-700 resize-none h-24"
                  />
                  <button 
                      onClick={handleBroadcast}
                      disabled={isBroadcasting || !broadcastMsg.trim() || (!selectAll && selectedRecipients.length === 0)}
                      className="w-32 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95 border-2 border-indigo-500 uppercase tracking-widest text-[10px]"
                  >
                      {isBroadcasting ? '...' : 'ODOSLAŤ'}
                  </button>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* REASONS */}
        <div className={cardClass}>
          <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter">DÔVODY CHÝBANIA</h3>
          <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2 mb-6">
            {missingReasons.map(r => (
              <div key={r.id} className="flex justify-between items-center bg-slate-950/30 p-3 rounded-xl border border-white/5 group">
                <span className="text-sm font-bold text-slate-300 uppercase">{r.value}</span>
                <button onClick={() => onDeleteMissingReason(r.id)} className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Icons.Trash /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newMissingReason} onChange={e=>setNewMissingReason(e.target.value)} placeholder="NOVÝ DÔVOD" className={inputClass} />
            <button onClick={()=>{if(newMissingReason){onAddMissingReason(newMissingReason); setNewMissingReason('');}}} className="bg-teal-600 hover:bg-teal-500 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest border-2 border-teal-500 shadow-lg">PRIDAŤ</button>
          </div>
        </div>

        {/* BREAKS */}
        <div className={cardClass}>
          <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter">PLÁNOVANÉ PRESTÁVKY</h3>
          <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2 mb-6">
            {breakSchedules.map(b => (
              <div key={b.id} className="flex justify-between items-center bg-slate-950/30 p-3 rounded-xl border border-white/5 group">
                <span className="text-sm font-bold text-amber-500 font-mono">{b.startTime} - {b.endTime}</span>
                <button onClick={() => onDeleteBreakSchedule(b.id)} className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Icons.Trash /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="time" value={newBreakStart} onChange={e=>setNewBreakStart(e.target.value)} className={inputClass} />
            <input type="time" value={newBreakEnd} onChange={e=>setNewBreakEnd(e.target.value)} className={inputClass} />
            <button onClick={()=>{if(newBreakStart && newBreakEnd){onAddBreakSchedule(newBreakStart, newBreakEnd); setNewBreakStart(''); setNewBreakEnd('');}}} className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-amber-500 shadow-lg">PRIDAŤ</button>
          </div>
        </div>
      </div>

      {/* ADMIN LOCK SETTINGS */}
      <div className={cardClass}>
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">ZABEZPEČENIE ADMIN KONZOLY</h3>
            <button 
                onClick={() => onToggleAdminLock(!isAdminLockEnabled)}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${isAdminLockEnabled ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
            >
                {isAdminLockEnabled ? 'ZÁMOK AKTÍVNY' : 'ZÁMOK VYPNUTÝ'}
            </button>
        </div>

        {isAdminLockEnabled && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end animate-fade-in">
                <div>
                    <label className={labelClass}>AKTUÁLNY KĽÚČ</label>
                    <input type="password" value={oldKey} onChange={e=>setOldKey(e.target.value)} className={inputClass} placeholder="••••" />
                </div>
                <div>
                    <label className={labelClass}>NOVÝ KĽÚČ</label>
                    <input type="password" value={newKey} onChange={e=>setNewKey(e.target.value)} className={inputClass} placeholder="••••" />
                </div>
                <div>
                    <label className={labelClass}>POTVRDIŤ NOVÝ</label>
                    <input type="password" value={confirmKey} onChange={e=>setConfirmKey(e.target.value)} className={inputClass} placeholder="••••" />
                </div>
                <button 
                    onClick={handleUpdateKey}
                    disabled={isUpdating}
                    className="h-12 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border-2 border-amber-500 shadow-xl disabled:opacity-50"
                >
                    {isUpdating ? 'AKTUALIZUJEM...' : 'ZMENIŤ KĽÚČ'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SystemSection;
