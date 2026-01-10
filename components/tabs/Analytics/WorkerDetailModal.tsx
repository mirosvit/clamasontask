
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Task, SystemBreak, MapSector, DBItem, SystemConfig } from '../../../types/appTypes';
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
    let sumPerformance = 0;
    let countPerformanceTasks = 0;
    let totalFullDist = 0;
    let totalEmptyDist = 0;
    let totalTransitBetweenTasksDist = 0;

    const workplacesMap: Record<string, number> = {};
    const partsMap: Record<string, number> = {};
    const uniqueDaysWorked = new Set<string>();

    const sortedTasks = [...tasks].sort((a,b) => (a.completedAt || 0) - (b.completedAt || 0));
    let lastWorkplaceCoords: { x: number, y: number } | null = null;

    sortedTasks.forEach(task => {
      if (task.completedAt) {
        const dateKey = new Date(task.completedAt).toLocaleDateString('sk-SK');
        uniqueDaysWorked.add(dateKey);
      }

      const qtyVal = parseFloat((task.quantity || '1').replace(',', '.'));
      const loadMultiplier = (task.quantityUnit === 'pallet') ? qtyVal : 1;
      totalLoad += loadMultiplier;

      if (task.quantityUnit === 'pallet') palCount += qtyVal;
      else pcsTasks++;

      if (task.isDone && task.completedBy) {
          let validatedTrips = 0;
          let oneWayD = 0;

          if (lastWorkplaceCoords && !task.isLogistics && task.pickedFromSectorId) {
              const sector = mapSectors.find(s => s.id === task.pickedFromSectorId);
              if (sector) {
                  const transitD = (Math.abs(sector.coordX - lastWorkplaceCoords.x) + Math.abs(sector.coordY - lastWorkplaceCoords.y)) / 10;
                  totalTransitBetweenTasksDist += transitD;
              }
          }

          if (task.isLogistics) {
              const logOp = logisticsOperations.find(o => o.value === task.workplace);
              if (logOp && logOp.distancePx) {
                  oneWayD = logOp.distancePx;
                  const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
                  const possibleTrips = Math.round(( (durationMs / 1000) * VZV_SPEED_MPS ) / (2 * oneWayD));
                  validatedTrips = Math.min(Math.max(1, Math.floor(loadMultiplier)), Math.max(1, possibleTrips));
              }
          } else if (task.pickedFromSectorId && task.workplace) {
              const sector = mapSectors.find(s => s.id === task.pickedFromSectorId);
              const wp = workplaces.find(w => w.value === task.workplace);
              if (sector && wp) {
                  const dx = (wp.coordX || 0) - (sector.coordX || 0);
                  const dy = (wp.coordY || 0) - (sector.coordY || 0);
                  oneWayD = (Math.abs(dx) + Math.abs(dy)) / 10;
                  const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
                  const possibleTrips = Math.round(( (durationMs / 1000) * VZV_SPEED_MPS ) / (2 * oneWayD));
                  validatedTrips = Math.min(Math.max(1, Math.floor(loadMultiplier)), Math.max(1, possibleTrips));
                  lastWorkplaceCoords = { x: wp.coordX || 0, y: wp.coordY || 0 };
              }
          }

          if (validatedTrips > 0) {
              totalFullDist += validatedTrips * oneWayD;
              totalEmptyDist += (validatedTrips > 1 ? (validatedTrips - 1) * oneWayD : 0);
          }
      }

      if (task.startedAt && task.completedAt) {
        const rawDurationMs = task.completedAt - task.startedAt;
        const blockedMs = calculateBlockedTime(task.inventoryHistory, task.startedAt, task.completedAt);
        const realDurationMs = Math.max(rawDurationMs - blockedMs, 0);

        totalExecMs += realDurationMs;
        durations.push(realDurationMs);

        const standardTime = task.isLogistics 
            ? (logisticsOperations.find(o => o.value === task.workplace)?.standardTime || 0)
            : (workplaces.find(w => w.value === task.workplace)?.standardTime || 0);
        
        const targetMin = standardTime * loadMultiplier;
        const durationMin = realDurationMs / 60000;

        let adjustedMin;
        if (durationMin < 0.5) { adjustedMin = (targetMin * 2) || 2; } 
        else if (durationMin < 1) { adjustedMin = 1; } 
        else { adjustedMin = durationMin; }

        if (targetMin > 0) {
            const taskPerf = (targetMin / adjustedMin) * 100;
            const cappedPerf = Math.min(taskPerf, 200);
            sumPerformance += cappedPerf;
            countPerformanceTasks++;
            totalStandardMin += targetMin;
        }
      }

      if (task.createdAt && task.startedAt && task.startedAt > task.createdAt) {
        const react = task.startedAt - task.createdAt;
        totalReactionMs += react; reactionCount++;
      }

      const isProd = (task.isProduction === true) || (!task.isLogistics && !!task.workplace);
      if (isProd && task.workplace) workplacesMap[task.workplace] = (workplacesMap[task.workplace] || 0) + 1;
      if (task.partNumber) partsMap[task.partNumber] = (partsMap[task.partNumber] || 0) + 1;

      if (task.isMissing) {
        missingReported++;
        if (task.auditResult === 'NOK') realErrors++;
      }
    });

    const numDays = Math.max(uniqueDaysWorked.size, 1);
    const SHIFT_MINUTES = 450;
    const totalAvailableMinutes = numDays * SHIFT_MINUTES;
    const pureWorkMinutes = totalExecMs / 60000;
    
    const performanceRatio = countPerformanceTasks > 0 ? (sumPerformance / countPerformanceTasks) : 0;
    const avgReactionSeconds = reactionCount > 0 ? (totalReactionMs / reactionCount) / 1000 : 0;
    const confidenceRating = missingReported > 0 ? ((missingReported - realErrors) / missingReported) * 100 : 100;
    const grandTotalEmptyDist = totalEmptyDist + totalTransitBetweenTasksDist;
    const logEfficiency = (totalFullDist + grandTotalEmptyDist) > 0 ? (totalFullDist / (totalFullDist + grandTotalEmptyDist)) * 100 : 50;

    const utilizationPercent = (pureWorkMinutes * 1.15 / totalAvailableMinutes) * 100;

    const scoreQuality = (confidenceRating / 100) * 3.0;
    const scoreUtilization = (Math.min(utilizationPercent, 100) / 100) * 2.5;
    const scoreStandards = performanceRatio > 0 ? (Math.min(performanceRatio, 200) / 200) * 2.0 : 1.0; 
    const scoreReaction = avgReactionSeconds > 0 ? (avgReactionSeconds < 60 ? 1.0 : avgReactionSeconds < 180 ? 0.5 : 0) : 0.5;
    const scoreLogistics = (logEfficiency / 100) * 1.0;

    const workerIndex = parseFloat((scoreQuality + scoreUtilization + scoreStandards + scoreReaction + scoreLogistics).toFixed(1));
    
    return {
      totalLoad, palCount, pcsTasks, 
      confidenceRating, realErrors, missingReported,
      totalExecMs, 
      avgMsPerPoint: durations.length > 0 ? totalExecMs / totalLoad : 0,
      topWorkplaces: Object.entries(workplacesMap).sort(([,a],[,b]) => b-a).slice(0, 3).map(([name, count]) => ({ name, count })),
      topParts: Object.entries(partsMap).sort(([,a],[,b]) => b-a).slice(0, 3).map(([name, count]) => ({ name, count })),
      utilizationPercent, pureWorkMinutes, workerIndex, performanceRatio, avgReactionSeconds,
      totalFullDist, totalEmptyDist: grandTotalEmptyDist, transitOnlyDist: totalTransitBetweenTasksDist,
      logEfficiency, totalStandardMin
    };
  }, [tasks, systemBreaks, mapSectors, workplaces, systemConfig, VZV_SPEED_MPS, logisticsOperations]);

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '-';
    const minutes = Math.round(ms / 60000);
    if (minutes < 1) return language === 'sk' ? '< 1 min' : '< 1 min';
    if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${minutes} min`;
  };

  const formatMinutes = (totalMin: number) => {
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-6xl p-8 relative overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full -ml-48 -mb-48 blur-[100px]"></div>

        <div className="flex justify-between items-start mb-10 relative z-10 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-2xl font-black">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{name}</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">
                  {t('detail_period')}: <span className="text-teal-500">{periodLabel}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">WORKER INDEX</p>
            <p className="text-6xl font-black text-white tracking-tighter tabular-nums leading-none">
              {stats.workerIndex}<span className="text-xl text-slate-600">/10</span>
            </p>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 space-y-10 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{t('detail_total_load')}</p>
                <p className="text-3xl font-black text-white mt-1">{stats.totalLoad.toFixed(1)} <span className="text-sm font-normal text-slate-600">{t('points')}</span></p>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{language === 'sk' ? 'Naložené paliet' : 'Pallets handled'}</p>
                <p className="text-3xl font-black text-sky-400 mt-1">{stats.palCount} <span className="text-sm font-normal text-slate-600">{t('unit_pallet_short')}</span></p>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{t('detail_utilization')}</p>
                <p className={`text-3xl font-black mt-1 ${stats.utilizationPercent > 80 ? 'text-green-400' : stats.utilizationPercent > 50 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {stats.utilizationPercent.toFixed(1)}%
                </p>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{t('detail_avg_reaction')}</p>
                <p className="text-3xl font-black text-purple-400 mt-1">
                  {stats.avgReactionSeconds > 60 ? `${(stats.avgReactionSeconds/60).toFixed(1)}m` : `${Math.round(stats.avgReactionSeconds)}s`}
                </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-3xl space-y-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] border-b border-white/5 pb-4">{t('detail_log_section')}</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase">{t('detail_efficiency')}</p>
                    <p className="text-lg font-black text-white">{stats.logEfficiency.toFixed(1)}%</p>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${stats.logEfficiency}%` }} className={`h-full transition-all duration-700 ${stats.logEfficiency > 75 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div>
                    <p className="text-slate-500 text-[9px] font-black uppercase">{t('detail_dist_full')}</p>
                    <p className="text-xl font-black text-sky-500 mt-1">{(stats.totalFullDist / 1000).toFixed(3)} km</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[9px] font-black uppercase">{t('detail_dist_empty')}</p>
                    <p className="text-xl font-black text-rose-500 mt-1">{(stats.totalEmptyDist / 1000).toFixed(3)} km</p>
                  </div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('detail_shadow_log')}</p>
                  <p className="text-sm font-bold text-slate-300">
                    {t('detail_shadow_desc', { m: stats.transitOnlyDist.toFixed(0) })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-3xl space-y-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] border-b border-white/5 pb-4">{t('detail_quality_section')}</h3>
              <div className="flex items-center gap-8">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                    <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={264} 
                      strokeDashoffset={264 - (264 * stats.confidenceRating) / 100} 
                      className={`${stats.confidenceRating > 90 ? 'text-teal-500' : 'text-amber-500'} transition-all duration-1000`} 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-white leading-none">{Math.round(stats.confidenceRating)}</span>
                    <span className="text-[8px] text-slate-500 uppercase font-black">Score</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {language === 'sk' 
                      ? `Skladník nahlásil ${stats.missingReported}x chýbajúci tovar, z čoho ${stats.realErrors} boli reálne chyby.`
                      : `Worker reported ${stats.missingReported}x missing items, ${stats.realErrors} were real errors.`
                    }
                  </p>
                  <div className="px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-lg w-fit">
                      <p className="text-[8px] font-black text-teal-500 uppercase">{t('detail_trust')}</p>
                      <p className="text-sm font-black text-teal-400">{stats.confidenceRating > 80 ? t('detail_trust_high') : t('detail_trust_mod')}</p>
                  </div>
                </div>
              </div>
              {stats.topParts.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{t('chart_parts_label')}</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.topParts.map(p => (
                      <span key={p.name} className="bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 text-[10px] font-mono font-bold text-slate-400">
                        {p.name} <span className="text-white ml-2">({p.count}x)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-3xl">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] border-b border-white/5 pb-4 mb-8">{t('detail_perf_section')}</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="space-y-2">
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{t('detail_net_work')}</p>
                  <p className="text-3xl font-black text-white">{formatMinutes(stats.pureWorkMinutes)}</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase italic">{t('detail_net_desc')}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{t('detail_std_perf')}</p>
                  <p className={`text-3xl font-black ${stats.performanceRatio > 100 ? 'text-green-400' : 'text-slate-300'}`}>
                    {stats.performanceRatio.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase">{t('detail_std_sum')}: {stats.totalStandardMin.toFixed(0)} min</p>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{t('detail_tempo')}</p>
                  <p className="text-3xl font-black text-amber-500">{formatDuration(stats.avgMsPerPoint)} <span className="text-sm font-normal text-slate-600">/ {t('load')}</span></p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase italic">{t('detail_tempo_desc')}</p>
                </div>
             </div>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            {t('detail_audit_tag')}
          </p>
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-xl"
          >
            {t('map_close_detail')}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default WorkerDetailModal;
