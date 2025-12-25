import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Task, SystemBreak } from '../../../App';
import { useLanguage } from '../../LanguageContext';

interface WorkerDetailModalProps {
  name: string;
  tasks: Task[];
  periodLabel: string;
  systemBreaks: SystemBreak[];
  onClose: () => void;
}

const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({ name, tasks, periodLabel, systemBreaks, onClose }) => {
  const { t, language } = useLanguage();

  const calculateBlockedTime = (history: any[] | undefined, startTime: number, endTime: number): number => {
    let totalBlocked = 0;
    if (history && history.length > 0) {
      history.forEach(session => {
        const overlapStart = Math.max(startTime, session.start);
        const overlapEnd = Math.min(endTime, session.end || endTime);
        if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
      });
    }
    systemBreaks.forEach(br => {
      const overlapStart = Math.max(startTime, br.start);
      const overlapEnd = Math.min(endTime, br.end || endTime);
      if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
    });
    return totalBlocked;
  };

  const stats = useMemo(() => {
    let totalLoad = 0;
    let palCount = 0;
    let pcsTasks = 0;
    let missingReported = 0;
    let realErrors = 0;
    let totalExecMs = 0;
    let totalStandardMin = 0;
    let totalReactionMs = 0;
    let reactionCount = 0;
    let durations: number[] = [];
    
    const workplacesMap: Record<string, number> = {};
    const partsMap: Record<string, number> = {};
    const missingHistory: Task[] = [];
    const uniqueDaysWorked = new Set<string>();

    tasks.forEach(task => {
      if (task.completedAt) {
        const dateKey = new Date(task.completedAt).toLocaleDateString('sk-SK');
        uniqueDaysWorked.add(dateKey);
      }

      const qtyVal = parseFloat((task.quantity || '0').replace(',', '.'));
      const loadPoints = (task.quantityUnit === 'pallet' && !isNaN(qtyVal)) ? qtyVal : 1;
      totalLoad += loadPoints;

      if (task.quantityUnit === 'pallet') palCount += qtyVal;
      else pcsTasks++;

      if (task.isMissing) {
        missingReported++;
        if (task.auditResult === 'NOK') realErrors++;
        if (missingHistory.length < 5) missingHistory.push(task);
      }

      if (task.startedAt && task.completedAt) {
        let exec = task.completedAt - task.startedAt;
        exec -= calculateBlockedTime(task.inventoryHistory, task.startedAt, task.completedAt);
        if (exec > 0) {
          totalExecMs += exec;
          durations.push(exec);
          totalStandardMin += (task.standardTime || 0);
        }
      }

      if (task.createdAt && task.startedAt) {
        const react = task.startedAt - task.createdAt;
        if (react > 0) {
          totalReactionMs += react;
          reactionCount++;
        }
      }

      const isProd = (task.isProduction === true) || (!task.isLogistics && !!task.workplace);
      if (isProd && task.workplace) workplacesMap[task.workplace] = (workplacesMap[task.workplace] || 0) + 1;
      if (task.partNumber) partsMap[task.partNumber] = (partsMap[task.partNumber] || 0) + 1;
    });

    const numDays = Math.max(uniqueDaysWorked.size, 1);
    const shiftTotalMinutes = 450; 
    const totalAvailableMinutes = numDays * shiftTotalMinutes;
    
    const pureWorkMinutes = totalExecMs / 60000;
    const effectiveWorkMinutes = pureWorkMinutes * 1.15; 
    const utilizationPercent = totalAvailableMinutes > 0 ? (effectiveWorkMinutes / totalAvailableMinutes) * 100 : 0;
    
    const performanceRatio = (totalStandardMin > 0 && pureWorkMinutes > 0) 
      ? (totalStandardMin / pureWorkMinutes) * 100 
      : 0;

    const avgReactionSeconds = reactionCount > 0 ? (totalReactionMs / reactionCount) / 1000 : 0;

    const confidenceRating = missingReported > 0 ? ((missingReported - realErrors) / missingReported) * 100 : 100;
    
    const scoreQuality = (confidenceRating / 100) * 3.5;
    const scoreUtilization = (Math.min(utilizationPercent, 100) / 100) * 3.0;
    const scoreStandards = performanceRatio > 0 
      ? (Math.min(performanceRatio, 120) / 120) * 2.5 
      : 2.0; 
    
    let scoreReaction = 0;
    if (avgReactionSeconds > 0) {
      if (avgReactionSeconds < 60) scoreReaction = 1.0;
      else if (avgReactionSeconds < 180) scoreReaction = 0.5;
    } else {
      scoreReaction = 0.5;
    }

    const workerIndex = parseFloat((scoreQuality + scoreUtilization + scoreStandards + scoreReaction).toFixed(1));
    
    const avgMsPerPoint = durations.length > 0 ? totalExecMs / totalLoad : 0;
    const topWorkplaces = Object.entries(workplacesMap).sort(([,a],[,b]) => b-a).slice(0, 3).map(([name, count]) => ({ name, count }));
    const topParts = Object.entries(partsMap).sort(([,a],[,b]) => b-a).slice(0, 3).map(([name, count]) => ({ name, count }));

    return {
      totalLoad, palCount, pcsTasks, 
      confidenceRating, realErrors, missingReported, missingHistory,
      totalExecMs, 
      fastest: durations.length > 0 ? Math.min(...durations) : 0,
      longest: durations.length > 0 ? Math.max(...durations) : 0,
      avgMsPerPoint,
      topWorkplaces, topParts,
      utilizationPercent,
      pureWorkMinutes,
      effectiveWorkMinutes,
      numDays,
      totalAvailableMinutes,
      workerIndex,
      performanceRatio,
      avgReactionSeconds
    };
  }, [tasks, systemBreaks]);

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '-';
    const minutes = Math.round(ms / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${minutes} min`;
  };

  const formatMinutes = (totalMin: number) => {
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const cardStyle = "bg-slate-800/40 border-t-4 p-6 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden";

  const getUtilColor = (val: number) => {
    if (val > 85) return 'border-t-emerald-500';
    if (val > 60) return 'border-t-teal-500';
    return 'border-t-amber-500';
  };

  const getUtilBarColor = (val: number) => {
    if (val > 85) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
    if (val > 60) return 'bg-teal-500';
    return 'bg-amber-500';
  };

  const getIndexBorderColor = (val: number) => {
    if (val >= 8) return 'border-emerald-500';
    if (val >= 5) return 'border-amber-500';
    return 'border-red-500';
  };

  const getIndexTextColor = (val: number) => {
    if (val >= 8) return 'text-emerald-400';
    if (val >= 5) return 'text-amber-400';
    return 'text-red-400';
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 animate-fade-in print:bg-white print:p-0 print:block print:relative print:z-0" onClick={onClose}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-black { color: black !important; border-color: #333 !important; }
          .print-no-rounded { border-radius: 0 !important; }
          .print-no-shadow { box-shadow: none !important; }
          .print-bg-white { background: white !important; }
          .print-border { border: 1px solid #eee !important; }
        }
      `}</style>
      
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto custom-scrollbar relative print:max-h-none print:overflow-visible print:border-none print:bg-white print:shadow-none print:w-full print:rounded-none" onClick={e => e.stopPropagation()}>
        
        {/* PRINT HEADER */}
        <div className="hidden print:block p-8 border-b-2 border-black mb-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black uppercase text-black">VÝKONNOSTNÝ REPORT PRACOVNÍKA</h1>
              <p className="text-xl font-bold text-slate-700 uppercase mt-1">{name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 uppercase">Vygenerované dňa:</p>
              <p className="text-sm font-black text-black font-mono">{new Date().toLocaleString('sk-SK')}</p>
            </div>
          </div>
        </div>

        {/* HEADER */}
        <div className="p-8 sm:p-10 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-800/30 no-print">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
               <span className="bg-teal-500/20 text-teal-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-500/30">{periodLabel}</span>
               <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{tasks.length} {t('records')}</span>
            </div>
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{name}</h2>
          </div>
          
          <div className="flex gap-4">
             <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-5 rounded-full transition-all border border-slate-700 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        <div className="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 print:p-4 print:gap-4 print:text-black">
          
          {/* INDEX SCORE CARD */}
          <div className={`col-span-1 md:col-span-2 bg-slate-950/40 border-l-[12px] p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 print:bg-white print:border-l-[8px] print:border-black print:shadow-none print:print-border ${getIndexBorderColor(stats.workerIndex)}`}>
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-2 print:text-black">CELKOVÝ INDEX SCORE</h3>
              <p className="text-xs text-slate-600 font-bold uppercase leading-relaxed max-w-sm print:text-slate-700">Komplexné vyhodnotenie kvality, využitia zmeny, plnenia noriem a rýchlosti reakcie.</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-8xl font-black font-mono leading-none tracking-tighter print:text-black ${getIndexTextColor(stats.workerIndex)}`}>{stats.workerIndex.toFixed(1)}</span>
              <span className="text-2xl font-black text-slate-700 font-mono print:text-slate-400">/10</span>
            </div>
          </div>

          {/* KPI VYUŽITIE ZMENY */}
          <div className={`${cardStyle} ${getUtilColor(stats.utilizationPercent)} print:bg-white print:border-black print:shadow-none print:print-border print:text-black`}>
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4 print:border-black/10">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] print:text-black">{t('shift_utilization')}</h3>
              <span className="bg-slate-900 px-3 py-1 rounded-full text-[9px] font-black text-slate-500 uppercase print:bg-slate-100">
                {stats.numDays} {stats.numDays === 1 ? 'DEŇ' : 'DNI'} @ 7.5h
              </span>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 print:text-slate-500">Čistý čas práce</p>
                  <p className="text-xl font-black text-white font-mono print:text-black">{formatMinutes(stats.pureWorkMinutes)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 print:text-slate-500">Využitie kapacity</p>
                  <p className={`text-4xl font-black font-mono leading-none print:text-black ${stats.utilizationPercent > 85 ? 'text-emerald-400' : 'text-white'}`}>{stats.utilizationPercent.toFixed(1)}%</p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex justify-between items-center print:bg-slate-50 print:border-black/5">
                <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest print:text-slate-700">Efektívny čas (+15% réžia):</span>
                <span className="text-xl font-black text-white font-mono print:text-black">{formatMinutes(stats.effectiveWorkMinutes)}</span>
              </div>

              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden shadow-inner border border-white/5 no-print">
                <div 
                  style={{ width: `${Math.min(stats.utilizationPercent, 100)}%` }} 
                  className={`h-full transition-all duration-1000 ${getUtilBarColor(stats.utilizationPercent)}`}
                ></div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 flex justify-between items-center shadow-inner print:bg-white print:border-black/20">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] print:text-slate-600">
                  OČAKÁVANÝ FOND ({stats.numDays} {stats.numDays === 1 ? 'DEŇ' : 'DNI'}):
                </p>
                <p className="text-2xl font-black text-teal-500 font-mono leading-none print:text-black">
                  {stats.totalAvailableMinutes} <span className="text-xs font-bold text-slate-600 font-sans print:text-slate-400">MIN</span>
                </p>
              </div>
            </div>
          </div>

          {/* KPI VÝKONOVÉ UKAZOVATELE */}
          <div className={`${cardStyle} border-t-teal-500 print:bg-white print:border-black print:shadow-none print:print-border print:text-black`}>
            <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-4 print:text-black print:border-black/10">VÝKONOVÉ UKAZOVATELE</h3>
            <div className="grid grid-cols-3 gap-6 print:gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">LOAD SCORE</p>
                <p className="text-2xl font-black text-teal-400 font-mono print:text-black">{stats.totalLoad.toFixed(1)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">HOTOVÉ ÚLOHY</p>
                <p className="text-2xl font-black text-white font-mono print:text-black">{tasks.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">PRIEM. REAKCIA</p>
                <p className="text-2xl font-black text-blue-400 font-mono print:text-black">{Math.round(stats.avgReactionSeconds)}s</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">PLNENIE NORMY</p>
                <p className="text-2xl font-black text-white font-mono print:text-black">{stats.performanceRatio > 0 ? stats.performanceRatio.toFixed(0) : '---'}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">{t('pallets')}</p>
                <p className="text-2xl font-black text-white font-mono print:text-black">{stats.palCount.toFixed(1)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">KUSY</p>
                <p className="text-2xl font-black text-white font-mono print:text-black">{stats.pcsTasks}</p>
              </div>
              <div className="col-span-3 pt-4 border-t border-white/5 flex justify-between items-center print:border-black/10">
                <span className="text-[10px] font-black text-slate-500 uppercase print:text-slate-500">Aktívny čas na úlohách:</span>
                <span className="text-xl font-black text-teal-400 font-mono print:text-black">{formatDuration(stats.totalExecMs)}</span>
              </div>
            </div>
          </div>

          {/* KPI KVALITA */}
          <div className={`${cardStyle} border-t-red-500 print:bg-white print:border-black print:shadow-none print:print-border print:text-black`}>
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4 print:border-black/10">
               <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.2em] print:text-black">INTEGRITA & KVALITA</h3>
               <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">Confidence Rating</p>
                  <p className={`text-2xl font-black font-mono print:text-black ${stats.confidenceRating > 80 ? 'text-green-400' : 'text-red-400'}`}>{stats.confidenceRating.toFixed(0)}%</p>
               </div>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 print:text-slate-500">Posledné hlásenia chýb:</p>
              {stats.missingHistory.length > 0 ? stats.missingHistory.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-white/5 text-[11px] print:bg-white print:border-black/10 print:text-black">
                  <span className="font-mono text-slate-300 font-bold uppercase truncate max-w-[150px] print:text-black">{m.partNumber}</span>
                  <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] print:border print:border-black/10 ${m.auditResult === 'OK' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {m.auditResult || 'PENDING'}
                  </span>
                </div>
              )) : (
                <div className="py-6 text-center text-slate-600 italic text-xs print:text-slate-400">Bez nahlásených chýb</div>
              )}
            </div>
          </div>

          {/* ČASOVÁ ANALÝZA */}
          <div className={`${cardStyle} border-t-blue-500 print:bg-white print:border-black print:shadow-none print:print-border print:text-black`}>
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-4 print:text-black print:border-black/10">ČASOVÁ EFEKTIVITA</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 print:bg-slate-50 print:border-black/10">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 print:text-slate-500">Najrýchlejšia úloha</p>
                  <p className="text-xl font-black text-white font-mono print:text-black">{formatDuration(stats.fastest)}</p>
                </div>
                <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 print:bg-slate-50 print:border-black/10">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 print:text-slate-500">Najdlhšia úloha</p>
                  <p className="text-xl font-black text-white font-mono print:text-black">{formatDuration(stats.longest)}</p>
                </div>
              </div>
              <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 flex justify-between items-center print:bg-slate-50 print:border-black/10">
                 <div className="space-y-1">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest print:text-slate-700">Priemer na 1 bod náporu</p>
                   <p className="text-xs text-slate-500 print:text-slate-400">Menej je lepšie (rýchlosť vybavenia)</p>
                 </div>
                 <p className="text-3xl font-black text-white font-mono print:text-black">{Number((stats.avgMsPerPoint / 60000).toFixed(2))} <span className="text-xs font-normal text-slate-500 print:text-slate-400">min</span></p>
              </div>
            </div>
          </div>

          {/* GEOGRAFIA SKLADU */}
          <div className={`${cardStyle} border-t-amber-500 col-span-1 md:col-span-2 print:bg-white print:border-black print:shadow-none print:print-border print:text-black`}>
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-4 print:text-black print:border-black/10">GEOGRAFIA & MATERIÁL</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-4">
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">TOP 3 PRACOVISKÁ</p>
                  <div className="space-y-2">
                    {stats.topWorkplaces.map((w, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300 truncate max-w-[200px] print:text-black">{w.name}</span>
                        <span className="font-mono text-amber-500 font-black print:text-black">{w.count}×</span>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="space-y-4 md:border-l md:border-white/5 md:pl-8 print:border-l-0 print:pl-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-slate-500">TOP 3 DIELY</p>
                  <div className="space-y-2">
                    {stats.topParts.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300 truncate max-w-[200px] print:text-black">{p.name}</span>
                        <span className="font-mono text-teal-500 font-black print:text-black">{p.count}×</span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>

          {/* LEGENDA HODNOTENIA */}
          <div className="col-span-1 md:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] shadow-inner animate-fade-in print:bg-white print:border-black print:shadow-none print:print-border print:text-black">
            <h3 className="text-xs font-black text-teal-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 print:text-black">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 no-print" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {language === 'sk' ? 'LEGENDA HODNOTENIA (INDEX SCORE)' : 'RATING LEGEND (INDEX SCORE)'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-600">🎯 KVALITA (35%)</p>
                <p className="text-[10px] text-slate-500 leading-tight print:text-black">Presnosť nahlásených chýb a výsledky auditov (max 3.5b).</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-600">⏱️ VYUŽITIE (30%)</p>
                <p className="text-[10px] text-slate-500 leading-tight print:text-black">Čas strávený reálnou prácou z fondu 450 min (max 3.0b).</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-600">🚀 NORMY (25%)</p>
                <p className="text-[10px] text-slate-500 leading-tight print:text-black">Rýchlosť plnenia úloh voči technickej norme (max 2.5b).</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-600">📱 REAKCIA (10%)</p>
                <p className="text-[10px] text-slate-500 leading-tight print:text-black">Rýchlosť prijatia úlohy po jej zobrazení (max 1.0b).</p>
              </div>
            </div>
          </div>

        </div>

        <div className="p-8 sm:p-10 border-t border-slate-800 bg-slate-800/30 flex gap-4 no-print">
          <button 
            onClick={() => window.print()}
            className="flex-1 py-5 bg-teal-600 hover:bg-teal-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] transition-all shadow-xl active:scale-[0.98] border-2 border-teal-500"
          >
            TLAČIŤ REPORT
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-5 bg-slate-700 hover:bg-slate-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] transition-all shadow-xl active:scale-[0.98]"
          >
            ZAVRIEŤ OKNO
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WorkerDetailModal;