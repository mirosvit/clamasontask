import React from 'react';
import { UserData, DBItem, BreakSchedule, BOMItem, SystemConfig } from '../App';
import { useLanguage } from './LanguageContext';

interface SetupViewProps {
  users: UserData[];
  parts: DBItem[];
  workplaces: DBItem[];
  missingReasons: DBItem[];
  logisticsOperations: DBItem[];
  breakSchedules: BreakSchedule[];
  bomItems: BOMItem[];
  systemConfig: SystemConfig;
}

const Icons = {
  Status: () => <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Users: () => <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Time: () => <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Factory: () => <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Database: () => <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.105 3.582 2 8 2s8-.895 8-2V7M4 7c0 1.105 3.582 2 8 2s8-.895 8-2M4 7c0-1.105 3.582-2 8-2s8 .895 8 2m-8 4v10" /></svg>,
  List: () => <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
};

const SetupView: React.FC<SetupViewProps> = (props) => {
  const { t, language } = useLanguage();
  
  const cardClass = "bg-slate-900/40 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-4";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]";
  const valueClass = "text-sm font-bold text-slate-200";
  const dividerClass = "border-b border-slate-800/60 my-1";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
      
      {/* SYSTEM SECURITY CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.Status />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'STAV SYSTÉMU' : 'SYSTEM STATUS'}</h4>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className={labelClass}>Maintenance:</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${props.systemConfig.maintenanceMode ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'}`}>
              {props.systemConfig.maintenanceMode ? 'ACTIVE' : 'READY'}
            </span>
          </div>
          <div className={dividerClass}></div>
          <div className="flex justify-between items-center">
            <span className={labelClass}>IP Check:</span>
            <span className={valueClass}>{props.systemConfig.ipCheckEnabled ? 'ENABLED' : 'OFF'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={labelClass}>IP Whitelist:</span>
            <span className={valueClass}>{(props.systemConfig.allowedIPs || []).length} items</span>
          </div>
        </div>
      </div>

      {/* USER DIRECTORY CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.Users />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'UŽÍVATELIA' : 'DIRECTORY'}</h4>
        </div>
        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {props.users.map(u => (
            <div key={u.username} className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-lg border border-white/5">
              <span className="text-xs font-bold text-slate-300 font-mono">{u.username}</span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${u.role === 'ADMIN' ? 'text-red-400' : u.role === 'LEADER' ? 'text-sky-400' : 'text-teal-500'}`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* BREAK SCHEDULE CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.Time />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'PRESTÁVKY' : 'BREAKS'}</h4>
        </div>
        <div className="space-y-2">
          {props.breakSchedules.length > 0 ? (
            props.breakSchedules.sort((a,b) => a.start.localeCompare(b.start)).map((b, idx) => (
              <div key={b.id} className="flex items-center gap-4 text-xs font-mono font-bold text-amber-500/80 bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
                <span className="text-[9px] text-slate-600">P{idx+1}</span>
                <span>{b.start} — {b.end}</span>
              </div>
            ))
          ) : (
            <p className="text-xs italic text-slate-600">No scheduled breaks</p>
          )}
        </div>
      </div>

      {/* WORKPLACES CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.Factory />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'PRACOVISKÁ' : 'SITES'}</h4>
        </div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
          {props.workplaces.map(w => (
            <div key={w.id} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{w.value}</span>
              {w.standardTime ? <span className="text-[9px] text-slate-600 ml-2">({w.standardTime}m)</span> : null}
            </div>
          ))}
        </div>
      </div>

      {/* DATABASE STATS CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.Database />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'DATABÁZA' : 'DB STATS'}</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <p className={labelClass}>{language === 'sk' ? 'DIELY' : 'PARTS'}</p>
            <p className="text-2xl font-black text-rose-500">{props.parts.length}</p>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <p className={labelClass}>BOM LINKS</p>
            <p className="text-2xl font-black text-teal-400">{props.bomItems.length}</p>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <p className={labelClass}>LOG OPS</p>
            <p className="text-2xl font-black text-sky-400">{props.logisticsOperations.length}</p>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <p className={labelClass}>REASONS</p>
            <p className="text-2xl font-black text-emerald-400">{props.missingReasons.length}</p>
          </div>
        </div>
      </div>

      {/* CONFIG SUMMARY CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.List />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'DÔVODY PRESTOJOV' : 'REASONS'}</h4>
        </div>
        <ul className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-2">
          {props.missingReasons.map(r => (
            <li key={r.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></span>
              {r.value}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};

export default SetupView;