import React, { useState } from 'react';
import { UserData, Role } from '../App';
import { useLanguage } from './LanguageContext';

interface UserSectionProps {
  users: UserData[];
  roles: Role[];
  onAddUser: (user: UserData) => void;
  onUpdatePassword: (username: string, newPass: string) => void;
  onDeleteUser: (username: string) => void;
}

const Icons = {
  Save: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
};

const UserSection: React.FC<UserSectionProps> = ({ users, roles, onAddUser, onUpdatePassword, onDeleteUser }) => {
  const { t } = useLanguage();
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<'USER' | 'ADMIN' | 'LEADER'>('USER');
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});

  const cardClass = "bg-gray-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm";
  const inputClass = "w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2";

  return (
    <div className={cardClass}>
      <div className="space-y-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">SPRÁVA TÍMU</h3>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{users.length} UŽÍVATEĽOV</span>
        </div>
        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {users.map(u => (
            <div key={u.id || u.username} className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 group">
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-black">{u.username.charAt(0).toUpperCase()}</div>
                <div>
                  <p className="font-black text-white text-sm">{u.username}</p>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{u.role}</p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-2 w-full">
                <input 
                  type="text" 
                  placeholder="Nové heslo"
                  value={passwordInputs[u.username] || ''}
                  onChange={(e) => setPasswordInputs(p => ({ ...p, [u.username]: e.target.value }))}
                  className={inputClass.replace('py-3', 'py-2')}
                />
                <button onClick={() => { if(passwordInputs[u.username]) { onUpdatePassword(u.username, passwordInputs[u.username]); setPasswordInputs(p => ({...p, [u.username]: ''})); } }} className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-teal-400 hover:bg-slate-700 transition-all"><Icons.Save /></button>
                {u.username !== 'ADMIN' && <button onClick={() => { if(window.confirm('Vymazať užívateľa?')) onDeleteUser(u.username); }} className="p-2.5 text-slate-600 hover:text-red-500 transition-all"><Icons.Trash /></button>}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-slate-800">
          <h4 className={labelClass}>PRIDAŤ NOVÉHO ČLENA</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={newUser} onChange={e=>setNewUser(e.target.value)} placeholder="MENO" className={inputClass} />
            <input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="HESLO" className={inputClass} />
            <select value={newRole} onChange={e=>setNewRole(e.target.value as any)} className={inputClass}>
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            <button onClick={() => { if(newUser && newPass) { onAddUser({username:newUser, password:newPass, role:newRole}); setNewUser(''); setNewPass(''); } }} className="bg-teal-600 hover:bg-teal-500 text-white font-black py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg">PRIDAŤ</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSection;