
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Task, SystemBreak, MapSector, DBItem, SystemConfig } from '../../../App';
import { useLanguage } from '../../LanguageContext';

interface WorkerDetailModalProps {
  name: string;
  tasks: Task[];
  periodLabel: string;
  systemBreaks: SystemBreak[];
  onClose: () => void;
  mapSectors: MapSector[];
  workplaces: DBItem[];
  systemConfig: SystemConfig;
  logisticsOperations: DBItem[];
}

const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({ name, tasks, periodLabel, systemBreaks, onClose, mapSectors, workplaces, systemConfig, logisticsOperations }) => {
  const { t, language } = useLanguage();
  const VZV_SPEED_MPS = (systemConfig.vzvSpeed || 8) / 3.6;

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
    
    let totalFullDist = 0;
    let totalEmptyDist = 0;

    const workplacesMap: Record<string, number> = {};
    const partsMap: Record<string, number> = {};
    const missingHistory: Task[] = [];
    const uniqueDaysWorked = new Set<string>();

    const sortedTasks = [...tasks].sort((a,b) => (a.completedAt || 0) - (b.completedAt || 0));

    sortedTasks.forEach(task => {
      if (task.completedAt) {
        const dateKey = new Date(task.completedAt).toLocaleDateString('sk-SK');
        uniqueDaysWorked.add(dateKey);
      }

      const qtyVal = parseFloat((task.quantity || '0').replace(',', '.'));
      const loadPoints = (task.quantityUnit === 'pallet' && !isNaN(qtyVal)) ? qtyVal : 1;
      totalLoad += loadPoints;

      if (task.quantityUnit === 'pallet') palCount += qtyVal;
      else pcsTasks++;

      if (task.isDone && task.completedBy) {
          let validatedTrips = 0;
          let oneWayD = 0;

          if (task.isLogistics) {
              const logOp = logisticsOperations.find(o => o.value === task.workplace);
              if (logOp && logOp.distancePx) {
                  oneWayD = logOp.distancePx;
                  const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
                  const possibleTrips = Math.round(( (durationMs / 1000) * VZV_SPEED_MPS ) / (2 * oneWayD));
                  const maxQty = !isNaN(qtyVal) ? Math.max(1, Math.floor(qtyVal)) : 1;
                  validatedTrips = Math.min(maxQty, Math.max(1, possibleTrips));
              }
          } else if (task.pickedFromSectorId && task.workplace) {
              const sector = mapSectors.find(s => s.id === task.pickedFromSectorId);
              const wp = workplaces.find(w => w.value === task.workplace);
              if (sector && wp) {
                  const dx = (wp.coordX || 0) - (sector.coordX || 0);
                  const dy = (wp.coordY || 0) - (sector.coordY || 0);
                  oneWayD = Math.sqrt(dx*dx + dy*dy) / 10;
                  const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
                  const possibleTrips = Math.round(( (durationMs / 1000) * VZV_SPEED_MPS ) / (2 * oneWayD));
                  const maxQty = !isNaN(qtyVal) ? Math.max(1, Math.floor(qtyVal)) : 1;
                  validatedTrips = Math.min(maxQty, Math.max(1, possibleTrips));
              }
          }

          if (validatedTrips > 0) {
              totalFullDist += validatedTrips * oneWayD;
              totalEmptyDist += validatedTrips * oneWayD;
          }
      }

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
    const performanceRatio = (totalStandardMin > 0 && pureWorkMinutes > 0) ? (totalStandardMin / pureWorkMinutes) * 100 : 0;
    const avgReactionSeconds = reactionCount > 0 ? (totalReactionMs / reactionCount) / 1000 : 0;
    const confidenceRating = missingReported > 0 ? ((missingReported - realErrors) / missingReported) * 100 : 100;
    const logEfficiency = (totalFullDist + totalEmptyDist) > 0 ? (totalFullDist / (totalFullDist + totalEmptyDist)) * 100 : 50;

    const scoreQuality = (confidenceRating / 100) * 3.0;
    const scoreUtilization = (Math.min(utilizationPercent, 100) / 100) * 2.5;
    const scoreStandards = performanceRatio > 0 ? (Math.min(performanceRatio, 120) / 120) * 2.0 : 1.5; 
    const scoreReaction = avgReactionSeconds > 0 ? (avgReactionSeconds < 60 ? 1.0 : avgReactionSeconds < 180 ? 0.5 : 0) : 0.5;
    const scoreLogistics = (logEfficiency / 100) * 1.0;

    const workerIndex = parseFloat((scoreQuality + scoreUtilization + scoreStandards + scoreReaction + scoreLogistics).toFixed(1));
    
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
      avgReactionSeconds,
      totalFullDist,
      totalEmptyDist,
      logEfficiency
    };
  }, [tasks, systemBreaks, mapSectors, workplaces, systemConfig, VZV_SPEED_MPS, logisticsOperations]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto custom-scrollbar relative" onClick={e => e.stopPropagation()}>
        
        <div className="p-8 sm:p-10 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-800/30">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
               <span className="bg-teal-500/20 text-teal-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-500/30">{periodLabel}</span>
               <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{tasks.length} {t('records')}</span>
            </div>
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{name}</h2>
          </div>
          
          <div className="flex gap-3">
             <button onClick={onClose} className="p-4 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 transition-all border border-slate-700 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        <div className="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className={`col-span-1 md:col-span-2 bg-slate-950/40 border-l-[12px] p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 ${getIndexBorderColor(stats.workerIndex)}`}>
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-2">CELKOVÝ INDEX SCORE</h3>
              <p className="text-xs text-slate-600 font-bold uppercase leading-relaxed max-w-sm">Komplexné vyhodnotenie kvality, využitia zmeny, plnenia noriem, logistickej efektivity a rýchlosti reakcie.</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-8xl font-black font-mono leading-none tracking-tighter ${getIndexTextColor(stats.workerIndex)}`}>{stats.workerIndex.toFixed(1)}</span>
              <span className="text-2xl font-black text-slate-700 font-mono">/10</span>
            </div>
          </div>

          <div className={`${cardStyle} ${getUtilColor(stats.utilizationPercent)}`}>
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">{t('shift_utilization')}</h3>
              <span className="bg-slate-900 px-3 py-1 rounded-full text-[9px] font-black text-slate-500 uppercase">
                {stats.numDays} {stats.numDays === 1 ? 'DEŇ' : 'DNI'} @ 7.5h
              </span>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Čistý čas práce</p>
                  <p className="text-xl font-black text-white font-mono">{formatMinutes(stats.pureWorkMinutes)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Využitie kapacity</p>
                  <p className={`text-4xl font-black font-mono leading-none ${stats.utilizationPercent > 85 ? 'text-emerald-400' : 'text-white'}`}>{stats.utilizationPercent.toFixed(1)}%</p>
                </div>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Efektívny čas (+15% réžia):</span>
                <span className="text-xl font-black text-white font-mono">{formatMinutes(stats.effectiveWorkMinutes)}</span>
              </div>

              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden shadow-inner border border-white/5">
                <div 
                  style={{ width: `${Math.min(stats.utilizationPercent, 100)}%` }} 
                  className={`h-full transition-all duration-1000 ${getUtilBarColor(stats.utilizationPercent)}`}
                ></div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 flex justify-between items-center shadow-inner">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  OČAKÁVANÝ FOND ({stats.numDays} {stats.numDays === 1 ? 'DEŇ' : 'DNI'}):
                </p>
                <p className="text-2xl font-black text-teal-500 font-mono leading-none">
                  {stats.totalAvailableMinutes} <span className="text-xs font-bold text-slate-600 font-sans">MIN</span>
                </p>
              </div>
            </div>
          </div>

          <div className={`${cardStyle} border-t-teal-500`}>
            <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-4">VÝKONOVÉ UKAZOVATELE</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">LOAD SCORE</p>
                <p className="text-2xl font-black text-teal-400 font-mono">{stats.totalLoad.toFixed(1)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">HOTOVÉ ÚLOHY</p>
                <p className="text-2xl font-black text-white font-mono">{tasks.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PRIEM. REAKCIA</p>
                <p className="text-2xl font-black text-blue-400 font-mono">{Math.round(stats.avgReactionSeconds)}s</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">PLNENIE NORMY</p>
                <p className="text-2xl font-black text-white font-mono">{stats.performanceRatio > 0 ? stats.performanceRatio.toFixed(0) : '---'}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('pallets')}</p>
                <p className="text-2xl font-black text-white font-mono">{stats.palCount.toFixed(1)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">KUSY</p>
                <p className="text-2xl font-black text-white font-mono">{stats.pcsTasks}</p>
              </div>
              <div className="col-span-3 pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase">Aktívny čas na úlohách:</span>
                <span className="text-xl font-black text-teal-400 font-mono">{formatDuration(stats.totalExecMs)}</span>
              </div>
            </div>
          </div>

          <div className={`${cardStyle} border-t-sky-500`}>
             <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
               <h3 className="text-xs font-black text-sky-400 uppercase tracking-[0.2em]">LOGISTICKÉ KM</h3>
               <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pomer plných jázd</p>
                  <p className={`text-2xl font-black font-mono ${stats.logEfficiency > 70 ? 'text-green-400' : 'text-amber-400'}`}>{stats.logEfficiency.toFixed(0)}%</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> REÁLNA LOGISTIKA
                  </p>
                  <p className="text-2xl font-black text-white font-mono">{stats.totalFullDist.toFixed(1)} <span className="text-xs font-bold text-slate-500">m</span></p>
                </div>
                <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/50"></span> JALOVÉ JAZDY
                  </p>
                  <p className="text-2xl font-black text-slate-400 font-mono">{stats.totalEmptyDist.toFixed(1)} <span className="text-xs font-bold text-slate-500">m</span></p>
                </div>
            </div>
            <p className="mt-4 text-[9px] text-slate-600 italic leading-tight">* Vzdialenosť validovaná limitom {systemConfig.vzvSpeed || 8} km/h. Počet reálnych otočiek je určený podľa času trvania úlohy a fyzickej vzdialenosti (m).</p>
          </div>

          <div className={`${cardStyle} border-t-red-500`}>
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
               <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.2em]">INTEGRITA & KVALITA</h3>
               <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confidence Rating</p>
                  <p className={`text-2xl font-black font-mono ${stats.confidenceRating > 80 ? 'text-green-400' : 'text-red-400'}`}>{stats.confidenceRating.toFixed(0)}%</p>
               </div>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Posledné hlásenia chýb:</p>
              {stats.missingHistory.length > 0 ? stats.missingHistory.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-white/5 text-[11px]">
                  <span className="font-mono text-slate-300 font-bold uppercase truncate max-w-[150px]">{m.partNumber}</span>
                  <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] ${m.auditResult === 'OK' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {m.auditResult || 'PENDING'}
                  </span>
                </div>
              )) : (
                <div className="py-6 text-center text-slate-600 italic text-xs">Bez nahlásených chýb</div>
              )}
            </div>
          </div>

          <div className={`${cardStyle} border-t-blue-500`}>
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-4">ČASOVÁ EFEKTIVITA</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Najrýchlejšia úloha</p>
                  <p className="text-xl font-black text-white font-mono">{formatDuration(stats.fastest)}</p>
                </div>
                <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Najdlhšia úloha</p>
                  <p className="text-xl font-black text-white font-mono">{formatDuration(stats.longest)}</p>
                </div>
              </div>
              <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 flex justify-between items-center">
                 <div className="space-y-1">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Priemer na 1 bod náporu</p>
                   <p className="text-xs text-slate-500">Menej je lepšie (rýchlosť vybavenia)</p>
                 </div>
                 <p className="text-3xl font-black text-white font-mono">{Number((stats.avgMsPerPoint / 60000).toFixed(2))} <span className="text-xs font-normal text-slate-500">min</span></p>
              </div>
            </div>
          </div>

          <div className={`${cardStyle} border-t-amber-500 col-span-1 md:col-span-2`}>
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-4">GEOGRAFIA & MATERIÁL</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TOP 3 PRACOVISKÁ</p>
                  <div className="space-y-2">
                    {stats.topWorkplaces.map((w, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300 truncate max-w-[200px]">{w.name}</span>
                        <span className="font-mono text-amber-500 font-black">{w.count}×</span>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="space-y-4 md:border-l md:border-white/5 md:pl-8">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TOP 3 DIELY</p>
                  <div className="space-y-2">
                    {stats.topParts.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300 truncate max-w-[200px]">{p.name}</span>
                        <span className="font-mono text-teal-500 font-black">{p.count}×</span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] shadow-inner animate-fade-in">
            <h3 className="text-xs font-black text-teal-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {language === 'sk' ? 'LEGENDA HODNOTENIA (INDEX SCORE)' : 'RATING LEGEND (INDEX SCORE)'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🎯 KVALITA (30%)</p>
                <p className="text-[10px] text-slate-500 leading-tight">Presnosť hlásení a výsledky auditov (max 3.0b).</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">⏱️ VYUŽITIE (25%)</p>
                <p className="text-[10px] text-slate-500 leading-tight">Čas strávený prácou z fondu 450 min (max 2.5b).</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🚀 NORMY (20%)</p>
                <p className="text-[10px] text-slate-500 leading-tight">Rýchlosť voči technickej norme (max 2.0b).</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🚚 LOGISTIKA (15%)</p>
                <p className="text-[10px] text-slate-500 leading-tight">Pomer plných vs. jalových jázd (max 1.5b).</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📱 REAKCIA (10%)</p>
                <p className="text-[10px] text-slate-500 leading-tight">Rýchlosť prijatia úlohy (max 1.0b).</p>
              </div>
            </div>
          </div>

        </div>

        <div className="p-8 sm:p-10 border-t border-slate-800 bg-slate-800/30 flex justify-center">
          <button 
            onClick={onClose}
            className="w-full max-w-md py-5 bg-slate-700 hover:bg-slate-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] transition-all shadow-xl active:scale-[0.98] border-2 border-slate-600"
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
