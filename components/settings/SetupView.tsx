
import React from 'react';
import { UserData, DBItem, BreakSchedule, BOMComponent, SystemConfig } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface SetupViewProps {
  users: UserData[];
  parts: DBItem[];
  workplaces: DBItem[];
  missingReasons: DBItem[];
  logisticsOperations: DBItem[];
  breakSchedules: BreakSchedule[];
  /* Fix: Switched from bomItems array to bomMap to match application state */
  bomMap: Record<string, BOMComponent[]>;
  systemConfig: SystemConfig;
}

const Icons = {
  Status: () => <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Users: () => <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Time: () => <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Factory: () => <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Database: () => <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.105 3.582 2 8 2s8-.895 8-2V7M4 7c0 1.105 3.582 2 8 2s8-.895 8-2M4 7c0-1.105 3.582-2 8-2s8 .895 8 2m-8 4v10" /></svg>,
  List: () => <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  License: () => <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'STAV SYSTÉMU' : 'STAV SYSTÉMU'}</h4>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className={labelClass}>Údržba:</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${props.systemConfig?.maintenanceMode ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'}`}>
              {props.systemConfig?.maintenanceMode ? 'AKTÍVNY' : 'PRIPRAVENÝ'}
            </span>
          </div>
          <div className={dividerClass}></div>
          <div className="flex justify-between items-center">
            <span className={labelClass}>Kontrola IP:</span>
            <span className={valueClass}>{props.systemConfig?.ipCheckEnabled ? 'ZAPNUTÉ' : 'VYPNUTÉ'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={labelClass}>Povolené IP:</span>
            <span className={valueClass}>{(props.systemConfig?.allowedIPs || []).length} položiek</span>
          </div>
        </div>
      </div>

      {/* USER DIRECTORY CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.Users />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'UŽÍVATELIA' : 'ADRESÁR'}</h4>
        </div>
        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {(props.users || []).map(u => (
            <div key={u.username} className="flex justify-between items-center bg-slate-950/30 px-3 py-2 rounded-lg border border-white/5">
              <span className="text-xs font-bold text-slate-300 font-mono truncate max-w-[120px]">{u.nickname || u.username}</span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${u.role === 'ADMIN' ? 'text-red-400' : u.role === 'LEADER' ? 'text-sky-400' : 'text-teal-500'}`}>
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
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'PRESTÁVKY' : 'PRESTÁVKY'}</h4>
        </div>
        <div className="space-y-2">
          {props.breakSchedules && props.breakSchedules.length > 0 ? (
            [...props.breakSchedules].sort((a,b) => a.startTime.localeCompare(b.startTime)).map((b, idx) => (
              <div key={b.id} className="flex items-center gap-4 text-xs font-mono font-bold text-amber-500/80 bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
                <span className="text-[9px] text-slate-600">P{idx+1}</span>
                <span>{b.startTime} — {b.endTime}</span>
              </div>
            ))
          ) : (
            <p className="text-xs italic text-slate-600">Žiadne naplánované prestávky</p>
          )}
        </div>
      </div>

      {/* WORKPLACES CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.Factory />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'PRACOVISKÁ' : 'PRACOVISKÁ'}</h4>
        </div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
          {(props.workplaces || []).map(w => (
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
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'ŠTATISTIKA DB' : 'ŠTATISTIKA DB'}</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <p className={labelClass}>{language === 'sk' ? 'DIELY' : 'DIELY'}</p>
            <p className="text-2xl font-black text-rose-500">{(props.parts || []).length}</p>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <p className={labelClass}>BOM VÄZBY</p>
            <p className="text-2xl font-black text-teal-400">
              {/* Fix: Calculating BOM links length with guard */}
              {Object.values(props.bomMap || {}).flat().length}
            </p>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <p className={labelClass}>LOG OPERÁCIE</p>
            <p className="text-2xl font-black text-sky-400">{(props.logisticsOperations || []).length}</p>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <p className={labelClass}>DÔVODY</p>
            <p className="text-2xl font-black text-emerald-400">{(props.missingReasons || []).length}</p>
          </div>
        </div>
      </div>

      {/* CONFIG SUMMARY CARD */}
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          <Icons.List />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">{language === 'sk' ? 'DÔVODY PRESTOJOV' : 'DÔVODY'}</h4>
        </div>
        <ul className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-2">
          {(props.missingReasons || []).map(r => (
            <li key={r.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></span>
              {r.value}
            </li>
          ))}
        </ul>
      </div>

      {/* LICENČNÉ PODMIENKY CARD */}
      <div className={`${cardClass} md:col-span-2 lg:col-span-3 border-t-4 border-t-teal-500/80`}>
        <div className="flex items-center gap-3">
          <Icons.License />
          <h4 className="text-sm font-black text-white uppercase tracking-tight">
            {language === 'sk' ? 'LICENČNÉ PODMIENKY A VLASTNÍCTVO' : 'LICENSE AGREEMENT & OWNERSHIP'}
          </h4>
        </div>
        <div className="bg-slate-950/40 p-5 rounded-xl border border-white/5 space-y-5">
          {language === 'sk' ? (
            <div className="text-xs text-slate-300 leading-relaxed text-justify space-y-4">
              <h5 className="font-extrabold text-teal-400 text-center uppercase tracking-wider text-[11px]">
                LICENČNÉ PODMIENKY POUŽÍVANIA SOFTVÉRU
              </h5>
              
              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">1. Úvodné ustanovenia</strong>
                <p>
                  Tento softvér (ďalej len „Aplikácia“) je autorským dielom v zmysle Autorského zákona. Výhradným vlastníkom všetkých majetkových a osobnostných autorských práv k Aplikácii je autor: <strong className="text-teal-400 font-extrabold">Miroslav Svítok</strong> (ďalej len „Poskytovateľ“).
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">2. Udelenie licencie</strong>
                <p>
                  Poskytovateľ udeľuje používateľovi (spoločnosti <strong className="text-white font-extrabold">Clamason Slovakia, s.r.o.</strong>) bezodplatnú, nevýhradnú a neprenosnú licenciu na používanie Aplikácie, a to výhradne pre interné prevádzkové potreby spoločnosti. Táto licencia oprávňuje spoločnosť iba na spustenie a užívanie Aplikácie v stave, v akom sa nachádza.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">3. Obmedzenie práv a zákaz úprav</strong>
                <p>
                  Používateľ nesmie Aplikáciu ani žiadnu jej časť kopírovať, upravovať, prekladať, vykonávať spätnú analýzu (reverse engineering), dekompilovať, predávať, prenajímať, sublicencovať ani inak distribuovať tretím stranám bez predchádzajúceho písomného súhlasu Poskytovateľa.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">4. Odvolateľnosť licencie a ukončenie</strong>
                <p>
                  Licencia sa udeľuje na dobu neurčitú. Poskytovateľ si vyhradzuje výslovné právo kedykoľvek, bez udania dôvodu a s okamžitou platnosťou túto licenciu odvolať a ukončiť tak právo spoločnosti Aplikáciu používať. V prípade odvolania licencie alebo zániku oprávnenia je spoločnosť povinná okamžite prestať Aplikáciu používať a na výzvu Poskytovateľa ju odstrániť zo svojich zariadení a serverov.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">5. Vylúčenie zodpovednosti</strong>
                <p>
                  Aplikácia je poskytovaná „tak, ako stojí a leží“ (as is). Poskytovateľ nezodpovedá za žiadne priame, nepriame ani následné škody, ušlý zisk, stratu dát alebo prerušenie prevádzky, ktoré by spoločnosti vznikli v dôsledku používania alebo nemožnosti používania Aplikácie. Spoločnosť používa Aplikáciu výhradne na vlastné riziko.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-300 leading-relaxed text-justify space-y-4">
              <h5 className="font-extrabold text-teal-400 text-center uppercase tracking-wider text-[11px]">
                LICENSE AGREEMENT FOR SOFTWARE USE
              </h5>
              
              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">1. Introductory Provisions</strong>
                <p>
                  This software (hereafter "Application") is a copyrighted work. The sole owner of all proprietary and personal copyrights to the Application is the author: <strong className="text-teal-400 font-extrabold">Miroslav Svítok</strong> (hereafter "Provider").
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">2. License Grant</strong>
                <p>
                  The Provider grants the user (company <strong className="text-white font-extrabold">Clamason Slovakia, s.r.o.</strong>) a free, non-exclusive, and non-transferable license to use the Application, solely for the company's internal operational needs. This license only entitles the company to run and use the Application in the state in which it is located.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">3. Restrictions & Prohibition of Modifications</strong>
                <p>
                  The user shall not copy, modify, translate, reverse engineer, decompile, sell, rent, sublicense, or otherwise distribute the Application or any part thereof to third parties without the prior written consent of the Provider.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">4. Revocability & Termination</strong>
                <p>
                  The license is granted for an indefinite period. The Provider reserves the explicit right to revoke this license at any time, without giving any reason, and with immediate effect, thereby terminating the company's right to use the Application. In the event of license revocation or termination of authorization, the company is obliged to immediately stop using the Application and, upon request from the Provider, remove it from its devices and servers.
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block font-black border-b border-white/5 pb-0.5 mb-1 text-[11px]">5. Disclaimer of Liability</strong>
                <p>
                  The Application is provided "as is". The Provider is not liable for any direct, indirect, or consequential damages, lost profits, data loss, or business interruption incurred by the company as a result of using or being unable to use the Application. The company uses the Application solely at its own risk.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between text-[9px] font-black text-slate-500 tracking-widest uppercase gap-2 border-t border-slate-800/60 pt-3">
            <span>© 2026 MIROSLAV SVÍTOK</span>
            <span className="text-teal-500/85">LICENSED FOR CLAMASON SLOVAKIA (INTERNAL USE ONLY)</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SetupView;
