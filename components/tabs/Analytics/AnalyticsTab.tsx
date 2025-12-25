import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { Task, SystemBreak } from '../../../App';
import { useLanguage } from '../../LanguageContext';
import AnalyticsExportPanel from './AnalyticsExportPanel';
import HighRunnerSection from './HighRunnerSection';
import HourlyChartSection from './HourlyChartSection';
import QualityAuditSection from './QualityAuditSection';
import WorkerDetailModal from './WorkerDetailModal';

declare var XLSX: any;

interface AnalyticsTabProps {
  tasks: Task[];
  onFetchArchivedTasks: () => Promise<Task[]>;
  systemBreaks: SystemBreak[];
  resolveName: (username?: string | null) => string;
}

type FilterMode = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH';
type ShiftFilter = 'ALL' | 'MORNING' | 'AFTERNOON';

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ tasks: liveTasks, onFetchArchivedTasks, systemBreaks, resolveName }) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('TODAY');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [canExport, setCanExport] = useState(false);
  const [selectedWorkerData, setSelectedWorkerData] = useState<{ name: string; tasks: Task[] } | null>(null);
  const { t, language } = useLanguage();

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '-';
    const minutes = Math.round(ms / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${minutes} min`;
  };

  useEffect(() => {
    const checkExportPermission = async () => {
      const storedUser = localStorage.getItem('app_user');
      if (!storedUser) return;
      try {
        const q = query(collection(db, 'users'), where('username', '==', storedUser));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setCanExport(userData.canExportAnalytics === true);
        }
      } catch (error) { console.error("Error checking analytics permission:", error); }
    };
    checkExportPermission();
  }, []);

  const tasks = useMemo(() => [...liveTasks, ...archivedTasks], [liveTasks, archivedTasks]);

  useEffect(() => {
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (archivedTasks.length === 0 || (Date.now() - lastFetchTime > FIVE_MINUTES)) {
      const load = async () => {
        setIsLoadingArchive(true);
        try {
          const results: Task[] = [];
          const now = new Date();
          const currentYear = now.getFullYear();
          const draftsSnap = await getDocs(query(collection(db, 'archive_drafts'), limit(500)));
          draftsSnap.forEach(d => results.push({ ...(d.data() as Task), id: d.id }));

          const getISOWeek = (date: Date) => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(date.getFullYear(), 0, 1));
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          };

          const currentWeek = getISOWeek(now);
          const monthAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
          const startWeek = getISOWeek(monthAgo);
          const weekCollections = [];
          for (let w = startWeek; w <= currentWeek; w++) { weekCollections.push(`sanon_${currentYear}_${w}`); }

          for (const colName of [...new Set(weekCollections)]) {
            try {
              const s = await getDocs(collection(db, colName));
              s.forEach(d => results.push({ ...(d.data() as Task), id: d.id }));
            } catch (e) { }
          }
          setArchivedTasks(results);
          setLastFetchTime(Date.now());
        } catch (err) { console.error("Archive auto-sync error:", err); }
        finally { setIsLoadingArchive(false); }
      };
      load();
    }
  }, [lastFetchTime, archivedTasks.length]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return tasks.filter(task => {
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
        default: passesTimeFilter = true;
      }
      
      if (!passesTimeFilter) return false;
      if (shiftFilter === 'ALL') return true;
      
      const hours = taskDate.getHours();
      if (shiftFilter === 'MORNING') return hours >= 4 && hours < 14;
      if (shiftFilter === 'AFTERNOON') return hours >= 14 && hours < 24;
      return true;
    });
  }, [tasks, filterMode, shiftFilter]);

  const calculateBlockedTime = (history: any[] | undefined, startTime: number, endTime: number): number => {
    let totalBlocked = 0;
    if (history && history.length > 0) {
      history.forEach(session => {
        const overlapStart = Math.max(startTime, session.start);
        const overlapEnd = Math.min(endTime, session.end || endTime);
        if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
      });
    }
    if (systemBreaks && systemBreaks.length > 0) {
      systemBreaks.forEach(br => {
        const overlapStart = Math.max(startTime, br.start);
        const overlapEnd = Math.min(endTime, br.end || endTime);
        if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
      });
    }
    return totalBlocked;
  };

  const stats = useMemo(() => {
    const highRunnersMap: Record<string, { load: number, pal: number, taskRequests: number, totalTasks: number }> = {};
    const workplacesMap: Record<string, { load: number, pal: number, taskRequests: number, totalTasks: number }> = {};
    const hourlyStatsMap: Record<number, { production: number, logistics: number }> = {};
    const missingPartsMap: Record<string, number> = {};
    for (let i = 0; i < 24; i++) hourlyStatsMap[i] = { production: 0, logistics: 0 };

    let realErrorsCount = 0, totalAuditedMissing = 0, falseAlarmsCount = 0, grandTotalExecutionTime = 0;
    const workerStatsMap: Record<string, any> = {};

    const performanceTasks = filteredTasks.filter(t => t.status !== 'incorrectly_entered' && t.auditResult !== 'NOK');

    performanceTasks.forEach(task => {
      const qtyVal = parseFloat((task.quantity || '0').replace(',', '.'));
      const loadPoints = (task.quantityUnit === 'pallet' && !isNaN(qtyVal)) ? qtyVal : 1;
      const refTime = task.completedAt || task.createdAt;
      const hour = refTime ? new Date(refTime).getHours() : -1;

      const isProductionFallback = (task.isProduction === true) || (!task.isLogistics && !!task.workplace);
      const isLogisticsFallback = (task.isLogistics === true) || (!task.isProduction && !task.workplace && !!task.partNumber);

      if (task.isMissing === true) {
        if (task.partNumber) missingPartsMap[task.partNumber] = (missingPartsMap[task.partNumber] || 0) + 1;
        if (task.auditResult) {
          totalAuditedMissing++;
          if (task.auditResult === 'NOK') realErrorsCount++;
          else if (task.auditResult === 'OK') falseAlarmsCount++;
        }
      }

      if (isProductionFallback && task.partNumber && task.partNumber !== '-') {
        const pn = task.partNumber;
        if (!highRunnersMap[pn]) highRunnersMap[pn] = { load: 0, pal: 0, taskRequests: 0, totalTasks: 0 };
        highRunnersMap[pn].totalTasks++;
        highRunnersMap[pn].load += loadPoints;
        if (task.quantityUnit === 'pallet') highRunnersMap[pn].pal += qtyVal;
        else highRunnersMap[pn].taskRequests += 1;
      }

      if (isProductionFallback && task.workplace) {
        const wp = task.workplace;
        if (!workplacesMap[wp]) workplacesMap[wp] = { load: 0, pal: 0, taskRequests: 0, totalTasks: 0 };
        workplacesMap[wp].totalTasks++;
        workplacesMap[wp].load += loadPoints;
        if (task.quantityUnit === 'pallet') workplacesMap[wp].pal += qtyVal;
        else workplacesMap[wp].taskRequests += 1;
      }

      if (hour >= 0 && hour < 24) {
        if (isProductionFallback) hourlyStatsMap[hour].production += loadPoints;
        else if (isLogisticsFallback) hourlyStatsMap[hour].logistics += loadPoints;
      }

      if (task.isDone && task.completedBy) {
        const worker = task.completedBy;
        if (!workerStatsMap[worker]) {
          workerStatsMap[worker] = { 
            username: worker, name: resolveName(worker), count: 0, totalVolume: 0, totalExecutionMs: 0,
            totalStandardMin: 0, totalReactionMs: 0, reactionCount: 0, missingReported: 0, realErrors: 0,
            uniqueDays: new Set<string>()
          };
        }
        const ws = workerStatsMap[worker];
        ws.count += 1;
        ws.totalVolume += loadPoints;
        ws.uniqueDays.add(new Date(task.completedAt!).toLocaleDateString('sk-SK'));

        if (task.startedAt && task.completedAt) {
          let execution = task.completedAt - task.startedAt;
          execution -= calculateBlockedTime(task.inventoryHistory, task.startedAt, task.completedAt);
          if (execution > 0) { ws.totalExecutionMs += execution; grandTotalExecutionTime += execution; }
          ws.totalStandardMin += (task.standardTime || 0);
        }
        if (task.createdAt && task.startedAt) {
          const react = task.startedAt - task.createdAt;
          if (react > 0) { ws.totalReactionMs += react; ws.reactionCount++; }
        }
        if (task.isMissing) {
          ws.missingReported++;
          if (task.auditResult === 'NOK') ws.realErrors++;
        }
      }
    });

    const workerStats = Object.values(workerStatsMap).map((ws: any) => {
      const numDays = Math.max(ws.uniqueDays.size, 1);
      const totalAvailableMin = numDays * 450;
      const pureWorkMin = ws.totalExecutionMs / 60000;
      const utilPercent = ( (pureWorkMin * 1.15) / totalAvailableMin ) * 100;
      const perfRatio = (ws.totalStandardMin > 0 && pureWorkMin > 0) ? (ws.totalStandardMin / pureWorkMin) * 100 : 0;
      const avgReactSec = ws.reactionCount > 0 ? (ws.totalReactionMs / ws.reactionCount) / 1000 : 0;
      const confidence = ws.missingReported > 0 ? ((ws.missingReported - ws.realErrors) / ws.missingReported) * 100 : 100;

      const sQuality = (confidence / 100) * 3.5;
      const sUtil = (Math.min(utilPercent, 100) / 100) * 3.0;
      const sNorms = perfRatio > 0 ? (Math.min(perfRatio, 120) / 120) * 2.5 : 2.0;
      let sReact = 0;
      if (avgReactSec > 0) {
        if (avgReactSec < 60) sReact = 1.0;
        else if (avgReactSec < 180) sReact = 0.5;
      } else sReact = 0.5;

      const index = parseFloat((sQuality + sUtil + sNorms + sReact).toFixed(1));
      return { ...ws, index, pureWorkMin, utilPercent, perfRatio, avgReactSec };
    }).sort((a, b) => b.index - a.index);

    return { 
      total: performanceTasks.length, done: performanceTasks.filter(t => t.isDone).length, 
      efficiency: performanceTasks.length <= 0 ? 0 : Math.round((performanceTasks.filter(t => t.isDone).length / performanceTasks.length) * 100),
      totalVolume: Object.values(workerStatsMap).reduce((s, w) => s + w.totalVolume, 0),
      avgLead: 0, avgReaction: 0, grandTotalExecutionTime, 
      workerStats, 
      topHighRunners: Object.entries(highRunnersMap).sort(([, a], [, b]) => b.load - a.load).slice(0, 3).map(([pn, d]) => ({ partNumber: pn, ...d })),
      topWorkplaces: Object.entries(workplacesMap).sort(([, a], [, b]) => b.load - a.load).slice(0, 3).map(([wp, d]) => ({ workplace: wp, ...d })),
      hourlyData: Object.entries(hourlyStatsMap).map(([h, v]) => ({ hour: parseInt(h), label: `${h.padStart(2, '0')}:00`, production: v.production, logistics: v.logistics }))
        .filter(d => shiftFilter === 'MORNING' ? (d.hour >= 4 && d.hour < 14) : shiftFilter === 'AFTERNOON' ? (d.hour >= 14 && d.hour < 24) : true),
      quality: { realErrorsCount, falseAlarmsCount, totalAuditedMissing, topMissingParts: Object.entries(missingPartsMap).sort(([, a], [, b]) => b - a).slice(0, 3).map(([pn, count]) => ({ partNumber: pn, count })) }
    };
  }, [filteredTasks, systemBreaks, resolveName, shiftFilter]);

  const handleExportSummaryTable = () => {
    if (typeof XLSX === 'undefined') return;
    const excelData = stats.workerStats.map((ws, idx) => ({
      'Poradie': idx + 1,
      'Meno': ws.name,
      'INDEX SCORE': ws.index.toFixed(1),
      'Vybavené úlohy': ws.count,
      'Objem (pal/ks)': ws.totalVolume.toFixed(1),
      'Čistý čas práce': formatDuration(ws.totalExecutionMs),
      'Využitie zmeny': `${ws.utilPercent.toFixed(1)}%`,
      'Plnenie normy': `${ws.perfRatio.toFixed(0)}%`,
      'Priem. Reakcia': `${Math.round(ws.avgReactSec)}s`
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Výkonnosť_Skladníkov");
    XLSX.writeFile(wb, `Vykonnost_Skladnikov_${filterMode}_${new Date().getTime()}.xlsx`);
  };

  const getPeriodLabel = () => {
    switch (filterMode) {
      case 'TODAY': return language === 'sk' ? 'DNEŠNÝ PREHĽAD' : 'TODAY VIEW';
      case 'YESTERDAY': return language === 'sk' ? 'VČERAJŠÍ PREHĽAD' : 'YESTERDAY VIEW';
      case 'WEEK': return language === 'sk' ? 'TÝŽDENNÝ PREHĽAD' : 'WEEKLY VIEW';
      case 'MONTH': return language === 'sk' ? 'MESAČNÝ PREHĽAD' : 'MONTHLY VIEW';
      default: return '';
    }
  };

  const getIndexColor = (val: number) => {
    if (val >= 8) return 'text-emerald-500';
    if (val >= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('analytics_title')}</h1>
        {isLoadingArchive && (
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{t('loading_hist')}</span>
          </div>
        )}
      </div>

      <AnalyticsExportPanel canExport={canExport} tasks={tasks} systemBreaks={systemBreaks} resolveName={resolveName} t={t} language={language} />

      <div className="bg-gray-800/40 p-4 rounded-2xl shadow-md border border-gray-700 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] as FilterMode[]).map(mode => (
              <button key={mode} onClick={() => setFilterMode(mode)} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterMode === mode ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-800/50 text-gray-400 hover:text-white'}`}>{t(`filter_${mode.toLowerCase()}` as any)}</button>
            ))}
          </div>
          <div className="bg-slate-950/80 p-1.5 rounded-2xl flex border border-slate-700 shadow-inner h-14 min-w-[300px]">
            <button onClick={() => setShiftFilter('ALL')} className={`flex-1 rounded-xl text-xs font-black uppercase tracking-widest duration-200 ${shiftFilter === 'ALL' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{language === 'sk' ? 'Všetky' : 'All'}</button>
            <button onClick={() => setShiftFilter('MORNING')} className={`flex-1 rounded-xl text-xs font-black uppercase tracking-widest duration-200 ${shiftFilter === 'MORNING' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{language === 'sk' ? 'Ranná' : 'Morning'}</button>
            <button onClick={() => setShiftFilter('AFTERNOON')} className={`flex-1 rounded-xl text-xs font-black uppercase tracking-widest duration-200 ${shiftFilter === 'AFTERNOON' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{language === 'sk' ? 'Poobedná' : 'Afternoon'}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-blue-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_total')}</p>
          <p className="text-3xl font-black text-white mt-2 font-mono leading-none">{stats.total}</p>
          <p className="text-xs font-bold text-blue-400/80 mt-1 uppercase tracking-widest">{stats.totalVolume.toFixed(1)} {language === 'sk' ? 'pal/ks' : 'pal/pcs'}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-emerald-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_worked')}</p>
          <p className="text-3xl font-black text-emerald-400 mt-2 font-mono">{formatDuration(stats.grandTotalExecutionTime)}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-purple-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_lead')}</p>
          <p className="text-3xl font-black text-purple-400 mt-2 font-mono">{formatDuration(stats.avgLead)}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-amber-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('kpi_react')}</p>
          <p className="text-3xl font-black text-amber-400 mt-2 font-mono">{formatDuration(stats.avgReaction)}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-teal-500">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{language === 'sk' ? 'EFEKTIVITA' : 'EFFICIENCY'}</p>
          <p className="text-3xl font-black text-teal-400 mt-2 font-mono">{stats.efficiency} %</p>
        </div>
      </div>

      <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
          <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('table_title')}</h3>
          <button 
            onClick={handleExportSummaryTable}
            className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-green-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            EXPORT DO EXCELU
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
                <th className="pb-4 px-2 text-right text-sky-400">📦 {language === 'sk' ? 'OBJEM' : 'VOLUME'}</th>
                <th className="pb-4 px-6 text-right text-emerald-400">{t('th_work_time')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.workerStats.map((ws: any, idx: number) => (
                <tr key={ws.username} className={`group transition-all hover:bg-slate-800/60 ${idx === 0 ? 'bg-slate-800/40 shadow-[0_0_20px_rgba(20,184,166,0.1)]' : 'bg-slate-900/40'}`}>
                  <td className={`py-5 px-6 first:rounded-l-2xl text-slate-500 font-mono text-base ${idx === 0 ? 'border-y border-l border-teal-500/30' : ''}`}>{idx + 1}</td>
                  <td 
                    onClick={() => setSelectedWorkerData({ 
                      name: ws.name, 
                      tasks: filteredTasks.filter(t => t.completedBy === ws.username) 
                    })}
                    className={`py-5 px-2 font-black text-lg uppercase tracking-tight cursor-pointer hover:text-teal-400 transition-colors ${idx === 0 ? 'text-teal-400 border-y border-teal-500/30' : 'text-slate-200'}`}
                  >
                    <div className="flex items-center gap-3">{idx === 0 && <span className="text-amber-400 animate-pulse text-xl">★</span>}{ws.name}</div>
                  </td>
                  <td className={`py-5 px-2 text-center font-black font-mono text-xl ${getIndexColor(ws.index)} ${idx === 0 ? 'border-y border-teal-500/30' : ''}`}>
                    {ws.index.toFixed(1)}
                  </td>
                  <td className={`py-5 px-2 text-right text-teal-500 font-black font-mono text-lg ${idx === 0 ? 'border-y border-teal-500/30' : ''}`}>{ws.count}</td>
                  <td className={`py-5 px-2 text-right text-sky-400 font-black font-mono text-lg ${idx === 0 ? 'border-y border-teal-500/30' : ''}`}>{Number(ws.totalVolume.toFixed(1))}</td>
                  <td className={`py-5 px-6 last:rounded-r-2xl text-right text-emerald-400 font-black font-mono text-base ${idx === 0 ? 'border-y border-r border-teal-500/30' : ''}`}>{formatDuration(ws.totalExecutionMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QualityAuditSection data={stats.quality} t={t} />
      <HighRunnerSection topHighRunners={stats.topHighRunners} topWorkplaces={stats.topWorkplaces} t={t} />
      <HourlyChartSection hourlyData={stats.hourlyData} t={t} />

      {selectedWorkerData && (
        <WorkerDetailModal 
          name={selectedWorkerData.name}
          tasks={selectedWorkerData.tasks}
          periodLabel={getPeriodLabel()}
          systemBreaks={systemBreaks}
          onClose={() => setSelectedWorkerData(null)}
        />
      )}
    </div>
  );
};

export default AnalyticsTab;