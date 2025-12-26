
import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Task, SystemBreak, MapSector, DBItem, SystemConfig } from '../../../App';
import { useLanguage } from '../../LanguageContext';
import AnalyticsExportPanel from './AnalyticsExportPanel';
import HighRunnerSection from './HighRunnerSection';
import HourlyChartSection from './HourlyChartSection';
import QualityAuditSection from './QualityAuditSection';
import WorkerDetailModal from './WorkerDetailModal';
import DrivingMetrics from './DrivingMetrics';

declare var XLSX: any;

interface AnalyticsTabProps {
  tasks: Task[];
  onFetchArchivedTasks: () => Promise<Task[]>;
  systemBreaks: SystemBreak[];
  resolveName: (username?: string | null) => string;
  mapSectors: MapSector[];
  workplaces: DBItem[];
  systemConfig: SystemConfig;
  logisticsOperations: DBItem[];
}

type FilterMode = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
type ShiftFilter = 'ALL' | 'MORNING' | 'AFTERNOON';
type SourceFilter = 'ALL' | 'PRODUCTION' | 'LOGISTICS';

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ tasks: _liveTasks, onFetchArchivedTasks, systemBreaks, resolveName, mapSectors, workplaces, systemConfig, logisticsOperations }) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('TODAY');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [canExport, setCanExport] = useState(false);
  const [selectedWorkerData, setSelectedWorkerData] = useState<{ name: string; tasks: Task[] } | null>(null);
  const { t, language } = useLanguage();

  const VZV_SPEED_MPS = (systemConfig.vzvSpeed || 8) / 3.6;
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  useEffect(() => {
    const checkExportPermission = async () => {
      const storedUser = localStorage.getItem('app_user');
      if (!storedUser) return;
      try {
        const docRef = doc(db, 'users', storedUser);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setCanExport(userData.canExportAnalytics === true);
        }
      } catch (error) { console.error("Error checking analytics permission:", error); }
    };
    checkExportPermission();
  }, []);

  const tasks = useMemo(() => archivedTasks, [archivedTasks]);

  useEffect(() => {
    const load = async () => {
      if (isLoadingArchive) return;
      setIsLoadingArchive(true);
      try {
        const results: Task[] = [];
        const startOfMonthTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        
        // 1. Načítanie Draftu (aktuálny týždeň)
        const draftSnap = await getDoc(doc(db, 'settings', 'draft'));
        if (draftSnap.exists()) {
            const draftData = draftSnap.data().data || [];
            draftData.forEach((t: any) => {
                if (t.completedAt >= startOfMonthTs) results.push(t);
            });
        }
        
        // 2. Načítanie relevantných šanónov (aktuálny a predchádzajúci týždeň pre pokrytie mesiaca)
        const currentYear = now.getFullYear();
        const firstDayOfYear = new Date(currentYear, 0, 1);
        const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
        const currentWeekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        
        const weeksToCheck = [currentWeekNum, currentWeekNum - 1, currentWeekNum - 2, currentWeekNum - 3, currentWeekNum - 4];
        const sanonPromises = weeksToCheck.filter(w => w > 0).map(w => getDoc(doc(db, 'sanony', `${currentYear}_${w}`)));
        const sanonSnaps = await Promise.all(sanonPromises);
        
        sanonSnaps.forEach(snap => {
            if (snap.exists()) {
                const tasksInSanon = snap.data().tasks || [];
                tasksInSanon.forEach((t: any) => {
                    if (t.completedAt >= startOfMonthTs) results.push(t);
                });
            }
        });
        
        setArchivedTasks(results);
      } catch (err) {
        console.error("Archive fetch error:", err);
      } finally {
        setIsLoadingArchive(false);
      }
    };
    load();
  }, [filterMode]);

  const filteredTasks = useMemo(() => {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return tasks.filter(task => {
      if (sourceFilter === 'PRODUCTION' && task.isLogistics) return false;
      if (sourceFilter === 'LOGISTICS' && !task.isLogistics) return false;

      const referenceTime = task.completedAt || task.createdAt;
      if (!referenceTime) return false;
      
      const taskDate = new Date(referenceTime);
      const taskDayStart = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      
      let passesTimeFilter = false;
      switch (filterMode) {
        case 'TODAY': passesTimeFilter = taskDayStart.getTime() === todayStart.getTime(); break;
        case 'YESTERDAY':
          const yesterdayStart = new Date(todayStart);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          passesTimeFilter = taskDayStart.getTime() === yesterdayStart.getTime();
          break;
        case 'WEEK': passesTimeFilter = referenceTime >= (todayStart.getTime() - (7 * 86400000)); break;
        case 'MONTH': passesTimeFilter = taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear(); break;
        case 'CUSTOM':
            if (!customStart || !customEnd) return false;
            const s = new Date(customStart).getTime();
            const e = new Date(customEnd).getTime() + 86399999;
            passesTimeFilter = referenceTime >= s && referenceTime <= e;
            break;
        default: passesTimeFilter = true;
      }
      
      if (!passesTimeFilter) return false;
      if (shiftFilter === 'ALL') return true;
      
      const hours = taskDate.getHours();
      if (shiftFilter === 'MORNING') return hours >= 4 && hours < 14;
      if (shiftFilter === 'AFTERNOON') return hours >= 14 && hours < 24;
      return true;
    });
  }, [tasks, filterMode, shiftFilter, sourceFilter, customStart, customEnd]);

  const stats = useMemo(() => {
    const workplacesMap: Record<string, { load: number, pal: number, taskRequests: number, totalTasks: number }> = {};
    const hourlyStatsMap: Record<number, { production: number, logistics: number }> = {};
    const missingPartsMap: Record<string, number> = {};
    const workerStatsMap: Record<string, any> = {};

    for (let i = 0; i < 24; i++) hourlyStatsMap[i] = { production: 0, logistics: 0 };
    let realErrorsCount = 0, totalAuditedMissing = 0, falseAlarmsCount = 0, grandTotalExecutionTime = 0;
    let globalFullDist = 0, globalEmptyDist = 0, globalRides = 0;

    const performanceTasks = filteredTasks.filter(t => t.status !== 'incorrectly_entered' && t.auditResult !== 'NOK');
    performanceTasks.forEach(task => {
      const qtyVal = parseFloat((task.quantity || '0').replace(',', '.'));
      const loadPoints = (task.quantityUnit === 'pallet' && !isNaN(qtyVal)) ? qtyVal : 1;
      const hour = (task.completedAt || task.createdAt) ? new Date(task.completedAt || task.createdAt!).getHours() : -1;

      if (task.isMissing === true) {
        if (task.partNumber) missingPartsMap[task.partNumber] = (missingPartsMap[task.partNumber] || 0) + 1;
        if (task.auditResult) {
          totalAuditedMissing++;
          if (task.auditResult === 'NOK') realErrorsCount++;
          else falseAlarmsCount++;
        }
      }

      if (task.isDone && task.completedBy) {
        const worker = task.completedBy;
        if (!workerStatsMap[worker]) {
            workerStatsMap[worker] = { username: worker, name: resolveName(worker), count: 0, totalVolume: 0, totalExecutionMs: 0, totalStandardMin: 0, totalReactionMs: 0, reactionCount: 0, missingReported: 0, realErrors: 0, uniqueDays: new Set(), totalFullDist: 0, totalEmptyDist: 0, totalRides: 0 };
        }
        const ws = workerStatsMap[worker];
        let validatedTrips = 0, oneWayD = 0;

        if (task.isLogistics) {
            const logOp = logisticsOperations.find(o => o.value === task.workplace);
            if (logOp?.distancePx) {
                oneWayD = logOp.distancePx;
                const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
                validatedTrips = Math.min(!isNaN(qtyVal) ? Math.max(1, Math.floor(qtyVal)) : 1, Math.max(1, Math.round(((durationMs/1000)*VZV_SPEED_MPS)/(2*oneWayD))));
            }
        } else if (task.pickedFromSectorId && task.workplace) {
            const sector = mapSectors.find(s => s.id === task.pickedFromSectorId);
            const wp = workplaces.find(w => w.value === task.workplace);
            if (sector && wp) {
                oneWayD = Math.sqrt(Math.pow(wp.coordX!-sector.coordX,2)+Math.pow(wp.coordY!-sector.coordY,2))/10;
                const durationMs = (task.completedAt || 0) - (task.startedAt || task.createdAt || 0);
                validatedTrips = Math.min(!isNaN(qtyVal) ? Math.max(1, Math.floor(qtyVal)) : 1, Math.max(1, Math.round(((durationMs/1000)*VZV_SPEED_MPS)/(2*oneWayD))));
            }
        }

        if (validatedTrips > 0) {
            globalRides += validatedTrips; ws.totalRides += validatedTrips;
            globalFullDist += validatedTrips * oneWayD; ws.totalFullDist += validatedTrips * oneWayD;
            globalEmptyDist += validatedTrips * oneWayD; ws.totalEmptyDist += validatedTrips * oneWayD;
        }
        ws.count += 1; ws.totalVolume += loadPoints;
        ws.uniqueDays.add(new Date(task.completedAt!).toLocaleDateString('sk-SK'));
        if (task.startedAt) {
            let exec = task.completedAt! - task.startedAt;
            if (exec > 0) { ws.totalExecutionMs += exec; grandTotalExecutionTime += exec; }
            ws.totalStandardMin += (task.standardTime || 0);
        }
      }

      if (task.workplace && !task.isLogistics) {
        if (!workplacesMap[task.workplace]) workplacesMap[task.workplace] = { load: 0, pal: 0, taskRequests: 0, totalTasks: 0 };
        workplacesMap[task.workplace].load += loadPoints;
      }
      if (hour >= 0 && hour < 24) {
        if (task.isLogistics) hourlyStatsMap[hour].logistics += loadPoints;
        else hourlyStatsMap[hour].production += loadPoints;
      }
    });

    const workerStats = Object.values(workerStatsMap).map((ws: any) => {
      const numDays = Math.max(ws.uniqueDays.size, 1);
      const pureWorkMin = ws.totalExecutionMs / 60000;
      const utilPercent = ((pureWorkMin * 1.15) / (numDays * 450)) * 100;
      const perfRatio = (ws.totalStandardMin > 0 && pureWorkMin > 0) ? (ws.totalStandardMin / pureWorkMin) * 100 : 0;
      const logEfficiency = (ws.totalFullDist + ws.totalEmptyDist) > 0 ? (ws.totalFullDist / (ws.totalFullDist + ws.totalEmptyDist)) * 100 : 50;
      const confidence = ws.missingReported > 0 ? ((ws.missingReported - ws.realErrors) / ws.missingReported) * 100 : 100;
      const index = parseFloat(((confidence/100*3.0) + (Math.min(utilPercent,100)/100*2.5) + (perfRatio > 0 ? Math.min(perfRatio,120)/120*2.0 : 1.5) + (logEfficiency/100*1.0)).toFixed(1));
      return { ...ws, index, utilPercent, perfRatio, logEfficiency };
    }).sort((a, b) => b.index - a.index);

    return { total: performanceTasks.length, done: performanceTasks.filter(t => t.isDone).length, efficiency: performanceTasks.length <= 0 ? 0 : Math.round((performanceTasks.filter(t => t.isDone).length / performanceTasks.length) * 100), totalVolume: Object.values(workerStatsMap).reduce((s, w) => s + w.totalVolume, 0), grandTotalExecutionTime, workerStats, topHighRunners: [], topWorkplaces: Object.entries(workplacesMap).sort(([, a], [, b]) => b.load - a.load).slice(0, 3).map(([wp, d]) => ({ workplace: wp, ...d })), hourlyData: Object.entries(hourlyStatsMap).map(([h, v]) => ({ hour: parseInt(h), label: `${h.padStart(2, '0')}:00`, production: v.production, logistics: v.logistics })), quality: { realErrorsCount, falseAlarmsCount, totalAuditedMissing, topMissingParts: Object.entries(missingPartsMap).sort(([, a], [, b]) => b - a).slice(0, 3).map(([pn, count]) => ({ partNumber: pn, count })) }, sectorStats: [], driving: { totalFullDist: globalFullDist, totalEmptyDist: globalEmptyDist, totalRides: globalRides, logEfficiency: (globalFullDist + globalEmptyDist) > 0 ? (globalFullDist / (globalFullDist + globalEmptyDist)) * 100 : 50 } };
  }, [filteredTasks, systemBreaks, resolveName, shiftFilter, mapSectors, workplaces, systemConfig, VZV_SPEED_MPS, logisticsOperations]);

  const getPeriodLabel = () => {
    switch (filterMode) {
      case 'TODAY': return language === 'sk' ? 'DNES' : 'TODAY';
      case 'YESTERDAY': return language === 'sk' ? 'VČERA' : 'YESTERDAY';
      case 'WEEK': return language === 'sk' ? 'TÝŽDEŇ' : 'WEEK';
      case 'MONTH': return language === 'sk' ? 'MESIAC' : 'MONTH';
      case 'CUSTOM': return `${customStart} - ${customEnd}`;
      default: return '';
    }
  };

  const getIndexColor = (val: number) => val >= 8 ? 'text-emerald-500' : val >= 5 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('analytics_title')}</h1>
      </div>

      <AnalyticsExportPanel canExport={canExport} tasks={tasks} systemBreaks={systemBreaks} resolveName={resolveName} t={t} language={language} />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full flex items-center justify-between p-6 bg-amber-600/10 hover:bg-amber-600/20 transition-colors border-b border-amber-600/30"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">FILTER PANEL</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Aktívny filter: {getPeriodLabel()}</p>
            </div>
          </div>
          <div className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </button>

        {isFilterOpen && (
          <div className="p-8 space-y-10 max-h-[600px] overflow-y-auto custom-scrollbar animate-fade-in bg-slate-900/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">Časový rozsah:</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'CUSTOM'] as FilterMode[]).map(m => (
                            <button key={m} onClick={() => setFilterMode(m)} className={`h-12 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === m ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-800 text-gray-400 hover:text-white'}`}>{t(`filter_${m.toLowerCase()}` as any)}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">Zmeny a Zdroj:</h4>
                    <div className="flex flex-col gap-3">
                        <div className="bg-slate-950/80 p-1.5 rounded-2xl flex border border-slate-700 shadow-inner h-14">
                            <button onClick={() => setSourceFilter('ALL')} className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest duration-200 ${sourceFilter === 'ALL' ? 'bg-teal-600 text-white' : 'text-gray-500'}`}>{language === 'sk' ? 'Všetko' : 'All'}</button>
                            <button onClick={() => setSourceFilter('PRODUCTION')} className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest duration-200 ${sourceFilter === 'PRODUCTION' ? 'bg-teal-600 text-white' : 'text-gray-500'}`}>{t('mode_production')}</button>
                            <button onClick={() => setSourceFilter('LOGISTICS')} className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest duration-200 ${sourceFilter === 'LOGISTICS' ? 'bg-teal-600 text-white' : 'text-gray-500'}`}>{t('mode_logistics')}</button>
                        </div>
                        <div className="bg-slate-950/80 p-1.5 rounded-2xl flex border border-slate-700 shadow-inner h-14">
                            <button onClick={() => setShiftFilter('ALL')} className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest duration-200 ${shiftFilter === 'ALL' ? 'bg-teal-600 text-white' : 'text-gray-500'}`}>{language === 'sk' ? 'Zmeny' : 'Shifts'}</button>
                            <button onClick={() => setShiftFilter('MORNING')} className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest duration-200 ${shiftFilter === 'MORNING' ? 'bg-teal-600 text-white' : 'text-gray-500'}`}>{language === 'sk' ? 'Ranná' : 'Morning'}</button>
                            <button onClick={() => setShiftFilter('AFTERNOON')} className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest duration-200 ${shiftFilter === 'AFTERNOON' ? 'bg-teal-600 text-white' : 'text-gray-500'}`}>{language === 'sk' ? 'Poobedná' : 'Afternoon'}</button>
                        </div>
                    </div>
                </div>
            </div>

            {filterMode === 'CUSTOM' && (
                <div className="p-6 bg-slate-950/50 rounded-2xl border-2 border-slate-800 space-y-6 animate-fade-in">
                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest text-center">Vlastný rozsah (Aktuálny mesiac)</h4>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">Od:</label>
                            <input type="date" min={firstDayOfMonth} max={lastDayOfMonth} value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full h-14 bg-slate-900 border-2 border-slate-800 rounded-xl px-4 font-black font-mono text-white focus:border-teal-500 transition-all uppercase" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">Do:</label>
                            <input type="date" min={firstDayOfMonth} max={lastDayOfMonth} value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full h-14 bg-slate-900 border-2 border-slate-800 rounded-xl px-4 font-black font-mono text-white focus:border-teal-500 transition-all uppercase" />
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-blue-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_total')}</p>
          <p className="text-3xl font-black text-white mt-2 font-mono leading-none">{stats.total}</p>
          <p className="text-xs font-bold text-blue-400/80 mt-1 uppercase tracking-widest">{stats.totalVolume.toFixed(1)} {language === 'sk' ? 'pal/ks' : 'pal/pcs'}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-emerald-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_worked')}</p>
          <p className="text-3xl font-black text-emerald-400 mt-2 font-mono">{Number((stats.grandTotalExecutionTime / 3600000).toFixed(1))}h</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-purple-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">EFEKTIVITA</p>
          <p className="text-3xl font-black text-purple-400 mt-2 font-mono">{stats.efficiency}%</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-amber-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">REAL JAZDY</p>
          <p className="text-3xl font-black text-amber-400 mt-2 font-mono">{stats.driving.totalRides}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-teal-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">KM (PLNÉ)</p>
          <p className="text-3xl font-black text-teal-400 mt-2 font-mono">{(stats.driving.totalFullDist / 1000).toFixed(1)}</p>
        </div>
      </div>

      <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
          <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('table_title')}</h3>
          <button 
            onClick={() => {}}
            className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-green-500"
          >
            EXPORT TABUĽKY
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-y-3 min-w-[700px]">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="pb-4 px-6">{t('th_rank')}</th>
                <th className="pb-4 px-2">{t('th_name')}</th>
                <th className="pb-4 px-2 text-center text-teal-400">INDEX</th>
                <th className="pb-4 px-2 text-right">{t('th_done')}</th>
                <th className="pb-4 px-2 text-right text-sky-400">OBJEM</th>
                <th className="pb-4 px-6 text-right text-emerald-400">ČAS PRÁCE</th>
              </tr>
            </thead>
            <tbody>
              {stats.workerStats.map((ws: any, idx: number) => (
                <tr key={ws.username} className={`group transition-all hover:bg-slate-800/60 ${idx === 0 ? 'bg-slate-800/40 shadow-[0_0_20px_rgba(20,184,166,0.1)]' : 'bg-slate-900/40'}`}>
                  <td className="py-5 px-6 first:rounded-l-2xl text-slate-500 font-mono text-base">{idx + 1}</td>
                  <td 
                    onClick={() => setSelectedWorkerData({ name: ws.name, tasks: filteredTasks.filter(t => t.completedBy === ws.username) })}
                    className="py-5 px-2 font-black text-lg uppercase tracking-tight cursor-pointer hover:text-teal-400 transition-colors"
                  >
                    {ws.name}
                  </td>
                  <td className={`py-5 px-2 text-center font-black font-mono text-xl ${getIndexColor(ws.index)}`}>{ws.index.toFixed(1)}</td>
                  <td className="py-5 px-2 text-right text-teal-500 font-black font-mono text-lg">{ws.count}</td>
                  <td className="py-5 px-2 text-right text-sky-400 font-black font-mono text-lg">{Number(ws.totalVolume.toFixed(1))}</td>
                  <td className="py-5 px-6 last:rounded-r-2xl text-right text-emerald-400 font-black font-mono text-base">{Number((ws.totalExecutionMs / 60000).toFixed(0))}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QualityAuditSection data={stats.quality} t={t} />
      <HighRunnerSection topHighRunners={stats.topHighRunners} topWorkplaces={stats.topWorkplaces} t={t} />
      <HourlyChartSection hourlyData={stats.hourlyData} t={t} />
      
      <DrivingMetrics 
        totalKm={stats.driving.totalFullDist} 
        emptyKm={stats.driving.totalEmptyDist} 
        rides={stats.driving.totalRides} 
        efficiency={stats.driving.logEfficiency} 
        vzvSpeed={systemConfig.vzvSpeed || 8}
      />

      {selectedWorkerData && (
        <WorkerDetailModal 
          name={selectedWorkerData.name}
          tasks={selectedWorkerData.tasks}
          periodLabel={getPeriodLabel()}
          systemBreaks={systemBreaks}
          onClose={() => setSelectedWorkerData(null)}
          mapSectors={mapSectors}
          workplaces={workplaces}
          systemConfig={systemConfig}
          logisticsOperations={logisticsOperations}
        />
      )}
    </div>
  );
};

export default AnalyticsTab;
