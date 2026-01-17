import React, { useState, memo } from 'react';
import { UserData, Role } from '../../App';
import { useLanguage } from '../LanguageContext';

interface UserSectionProps {
  users: UserData[];
  roles: Role[];
  onAddUser: (user: UserData) => void;
  onUpdatePassword: (username: string, newPass: string) => void;
  onUpdateNickname: (username: string, newNick: string) => void;
  onUpdateUserRole: (username: string, newRole: string) => void;
  onUpdateExportPermission: (username: string, canExport: boolean) => void;
  onDeleteUser: (username: string) => void;
}

const Icons = {
  Save: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  EyeOff: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
};

const UserSection: React.FC<UserSectionProps> = memo(({ users, roles, onAddUser, onUpdatePassword, onUpdateNickname, onUpdateUserRole, onUpdateExportPermission, onDeleteUser }) => {
  const { t, language } = useLanguage();
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<'USER' | 'ADMIN' | 'LEADER'>('USER');
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [nicknameInputs, setNicknameInputs] = useState<Record<string, string>>({});
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const toggleReveal = (username: string) => {
    setRevealedPasswords(prev => ({ ...prev, [username]: !prev[username] }));
  };

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full h-12 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono placeholder-gray-500 uppercase";
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3";

  return (
    <div className={cardClass}>
      <div className="space-y-10">
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">SPRÁVA TÍMU</h3>
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{users.length} UŽÍVATEĽOV</span>
        </div>
        <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {users.map(u => {
            const isRevealed = revealedPasswords[u.username] || false;
            return (
              <div key={u.id || u.username} className="bg-slate-950/30 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 group">
                <div className="flex items-center gap-6 min-w-[220px]">
                  <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-black text-xl">{(u.nickname || u.username).charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-black text-white text-base truncate max-w-[120px]">{u.nickname || u.username}</p>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{u.username} • {u.role}</p>
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-4 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-grow">
                      <div className="relative">
                        <input 
                          type={isRevealed ? "text" : "password"}
                          placeholder={isRevealed ? u.password : "Zmeniť Heslo"}
                          value={passwordInputs[u.username] || ''}
                          onChange={(e) => setPasswordInputs(p => ({ ...p, [u.username]: e.target.value }))}
                          className={`${inputClass} pr-10`}
                        />
                        <button 
                          onClick={() => toggleReveal(u.username)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors"
                        >
                          {isRevealed ? <Icons.EyeOff /> : <Icons.Eye />}
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Nickname"
                        value={nicknameInputs[u.username] === undefined ? (u.nickname || '') : nicknameInputs[u.username]}
                        onChange={(e) => setNicknameInputs(p => ({ ...p, [u.username]: e.target.value }))}
                        className={inputClass}
                      />
                      {/* ROLE SELECTOR */}
                      <select 
                          value={u.role}
                          onChange={(e) => onUpdateUserRole(u.username, e.target.value)}
                          disabled={u.username === 'ADMIN'}
                          className={`${inputClass} ${u.username === 'ADMIN' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                          {roles.map(r => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                      </select>
                      {/* EXPORT CHECKBOX */}
                      <label className="flex items-center justify-center gap-2 bg-slate-800/50 rounded-xl border border-slate-700 px-4 cursor-pointer hover:bg-slate-800 transition-colors h-12">
                        <input 
                          type="checkbox" 
                          checked={u.canExportAnalytics || false}
                          onChange={(e) => onUpdateExportPermission(u.username, e.target.checked)}
                          className="form-checkbox h-5 w-5 text-teal-500 rounded border-gray-600 bg-gray-700 focus:ring-teal-500"
                        />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Export</span>
                      </label>
                  </div>
                  <button onClick={() => { 
                      if(passwordInputs[u.username]) { onUpdatePassword(u.username, passwordInputs[u.username]); setPasswordInputs(p => ({...p, [u.username]: ''})); }
                      if(nicknameInputs[u.username] !== undefined) { onUpdateNickname(u.username, nicknameInputs[u.username]); }
                  }} className="h-12 w-12 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-teal-400 hover:bg-slate-700 transition-all flex-shrink-0 shadow-lg"><Icons.Save /></button>
                  {u.username !== 'ADMIN' && <button onClick={() => { if(window.confirm('Vymazať užívateľa?')) onDeleteUser(u.username); }} className="h-12 w-12 flex items-center justify-center text-slate-600 hover:text-red-500 transition-all flex-shrink-0"><Icons.Trash /></button>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-8 border-t border-slate-800">
          <h4 className={labelClass}>PRIDAŤ NOVÉHO ČLENA</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input value={newUser} onChange={e=>setNewUser(e.target.value)} placeholder="MENO" className={inputClass} />
            <input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="HESLO" className={inputClass} />
            <select value={newRole} onChange={e=>setNewRole(e.target.value as any)} className={inputClass}>
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            <button onClick={() => { if(newUser && newPass) { onAddUser({username:newUser, password:newPass, role:newRole, canExportAnalytics: false}); setNewUser(''); setNewPass(''); } }} className="h-12 bg-teal-600 hover:bg-teal-500 text-white font-black px-6 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl border-2 border-teal-500">PRIDAŤ</button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default UserSection;