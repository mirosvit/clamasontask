import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Task, SystemBreak, MapSector, DBItem, SystemConfig, UserData } from '../../../types/appTypes';
import { useLanguage } from '../../LanguageContext';
import AnalyticsExportPanel from './AnalyticsExportPanel';
import HighRunnerSection from './HighRunnerSection';
import HourlyChartSection from './HourlyChartSection';
import QualityAuditSection from './QualityAuditSection';
import WorkerDetailModal from './WorkerDetailModal';
import DrivingMetrics from './DrivingMetrics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface AnalyticsTabProps {
  tasks: Task[];
  onFetchArchivedTasks: () => Promise<Task[]>;
  systemBreaks: SystemBreak[];
  resolveName: (username?: string | null) => string;
  mapSectors: MapSector[];
  workplaces: DBItem[];
  systemConfig: SystemConfig;
  logisticsOperations: DBItem[];
  users: UserData[];
  currentUser: string;
  currentUserRole: string;
  hasPermission: (permName: string) => boolean;
}

type FilterMode = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
type SourceFilter = 'ALL' | 'PROD' | 'LOG';
type ShiftFilter = 'ALL' | 'DAY' | 'NIGHT';

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ 
  tasks: _liveTasks, systemBreaks, resolveName, mapSectors, workplaces, systemConfig, logisticsOperations,
  users, currentUser, currentUserRole 
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('TODAY');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [selectedWorkerData, setSelectedWorkerData] = useState<{ name: string; tasks: Task[] } | null>(null);
  const { t, language } = useLanguage();

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const canExport = useMemo(() => {
    return currentUserRole === 'ADMIN' || (users?.find(u => u.username === currentUser)?.canExportAnalytics === true);
  }, [currentUser, currentUserRole, users]);

  useEffect(() => {
    const load = async () => {
      const results: Task[] = [];
      try {
          const draftSnap = await getDoc(doc(db, 'settings', 'draft'));
          if (draftSnap.exists()) {
              results.push(...(draftSnap.data().data || []));
          }
      } catch (err) {
          console.error("Failed to load draft tasks", err);
      }
      setArchivedTasks(results);
    };
    load();
  }, [filterMode, customStart, customEnd]);

  const filteredTasks = useMemo(() => {
    const combined = [..._liveTasks, ...archivedTasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();

    return combined.filter(task => {
        const referenceTime = task.completedAt || task.createdAt || 0;
        if (!referenceTime) return false;

        let timeMatch = false;
        switch (filterMode) {
            case 'TODAY':
                timeMatch = referenceTime >= todayTs;
                break;
            case 'YESTERDAY':
                const yesterdayTs = todayTs - 86400000;
                timeMatch = referenceTime >= yesterdayTs && referenceTime < todayTs;
                break;
            case 'WEEK':
                const weekTs = todayTs - (today.getDay() || 7 - 1) * 86400000;
                timeMatch = referenceTime >= weekTs;
                break;
            case 'MONTH':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
                timeMatch = referenceTime >= monthStart;
                break;
            case 'CUSTOM':
                if (!customStart || !customEnd) return false;
                const startTs = new Date(customStart).getTime();
                const endTs = new Date(customEnd).getTime() + 86399999;
                timeMatch = referenceTime >= startTs && referenceTime <= endTs;
                break;
            default:
                timeMatch = true;
        }
        if (!timeMatch) return false;

        if (sourceFilter === 'PROD' && !task.isProduction && task.isLogistics) return false;
        if (sourceFilter === 'LOG' && !task.isLogistics) return false;

        if (shiftFilter !== 'ALL') {
            const hour = new Date(referenceTime).getHours();
            const isDay = hour >= 6 && hour < 18;
            if (shiftFilter === 'DAY' && !isDay) return false;
            if (shiftFilter === 'NIGHT' && isDay) return false;
        }

        return true;
    });
  }, [_liveTasks, archivedTasks, filterMode, customStart, customEnd, sourceFilter, shiftFilter]);

  const stats = useMemo(() => {
    // Basic Counters
    let total = filteredTasks.length;
    let done = 0;
    
    // Aggregation Containers
    const workerMap: Record<string, Task[]> = {};
    const workplaceMap: Record<string, {load: number, pal: number, req: number}> = {};
    const partMap: Record<string, {load: number, pal: number, req: number}> = {};
    const hourlyMap: Record<number, {prod: number, log: number}> = {};
    
    // Quality & Driving
    let realErrorsCount = 0;
    let falseAlarmsCount = 0;
    let totalAuditedMissing = 0;
    const missingPartsMap: Record<string, number> = {};
    let totalFullDist = 0;
    let totalEmptyDist = 0;
    let totalRides = 0;

    filteredTasks.forEach(task => {
        // Status Counts
        if (task.isDone) done++;

        // Worker Stats
        if (task.isDone && task.completedBy) {
            if (!workerMap[task.completedBy]) workerMap[task.completedBy] = [];
            workerMap[task.completedBy].push(task);
        }

        // Quality
        if (task.auditResult) {
            totalAuditedMissing++;
            if (task.auditResult === 'NOK') realErrorsCount++;
            else if (task.auditResult === 'OK') falseAlarmsCount++;
        }
        if (task.isMissing && task.partNumber) {
            missingPartsMap[task.partNumber] = (missingPartsMap[task.partNumber] || 0) + 1;
        }

        // Hourly Data
        const time = task.completedAt || task.createdAt || 0;
        const hour = new Date(time).getHours();
        if (!hourlyMap[hour]) hourlyMap[hour] = { prod: 0, log: 0 };
        const load = (task.quantityUnit === 'pallet' ? parseFloat(task.quantity || '0') : 1) || 1;
        if (task.isLogistics) hourlyMap[hour].log += load;
        else hourlyMap[hour].prod += load;

        // High Runners & Workplaces
        if (task.isDone) {
            const qtyVal = parseFloat((task.quantity || '0').replace(',', '.'));
            const isPal = task.quantityUnit === 'pallet';
            const points = isPal ? qtyVal : 1;
            
            if (task.workplace) {
                if (!workplaceMap[task.workplace]) workplaceMap[task.workplace] = { load: 0, pal: 0, req: 0 };
                workplaceMap[task.workplace].load += points;
                workplaceMap[task.workplace].req++;
                if (isPal) workplaceMap[task.workplace].pal += qtyVal;
            }
            if (task.partNumber) {
                if (!partMap[task.partNumber]) partMap[task.partNumber] = { load: 0, pal: 0, req: 0 };
                partMap[task.partNumber].load += points;
                partMap[task.partNumber].req++;
                if (isPal) partMap[task.partNumber].pal += qtyVal;
            }
        }
    });

    // Transform Worker Stats
    const workerStats = Object.entries(workerMap).map(([uid, tasks]) => ({
        id: uid,
        name: resolveName(uid),
        count: tasks.length,
        tasks: tasks
    })).sort((a,b) => b.count - a.count);

    // Transform Hourly Data
    const hourlyData = Object.entries(hourlyMap).map(([h, d]) => ({
        hour: parseInt(h),
        label: `${h}:00`,
        production: d.prod,
        logistics: d.log
    })).sort((a,b) => a.hour - b.hour);

    // Transform High Runners
    const topWorkplaces = Object.entries(workplaceMap)
        .map(([k, v]) => ({ workplace: k, load: v.load, pal: v.pal, taskRequests: v.req, totalTasks: v.req }))
        .sort((a,b) => b.load - a.load).slice(0, 3);
        
    const topHighRunners = Object.entries(partMap)
        .map(([k, v]) => ({ partNumber: k, load: v.load, pal: v.pal, taskRequests: v.req, totalTasks: v.req }))
        .sort((a,b) => b.load - a.load).slice(0, 3);

    // Transform Missing Parts
    const topMissingParts = Object.entries(missingPartsMap)
        .map(([p, c]) => ({ partNumber: p, count: c }))
        .sort((a,b) => b.count - a.count).slice(0, 3);

    return { 
        total, 
        done, 
        efficiency: 0, 
        totalVolume: 0, 
        grandTotalExecutionTime: 0, 
        workerStats, 
        topHighRunners, 
        topWorkplaces, 
        hourlyData, 
        quality: { realErrorsCount, falseAlarmsCount, totalAuditedMissing, topMissingParts }, 
        driving: { totalFullDist, totalEmptyDist, totalRides, logEfficiency: 50 } 
    };
  }, [filteredTasks, resolveName]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
      <h1 className="text-2xl sm:text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('analytics_title')}</h1>

      <AnalyticsExportPanel 
        canExport={canExport} 
        tasks={filteredTasks} 
        systemBreaks={systemBreaks} 
        resolveName={resolveName} 
        t={t} 
        language={language} 
      />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden mb-8 flex flex-col">
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)} 
          className="w-full flex items-center justify-between p-6 bg-slate-800/40 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50"
        >
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">FILTRÁCIA DÁT</h3>
          </div>
          <div className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isFilterOpen && (
          <div className="p-8 space-y-8 animate-fade-in">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Časový Rozsah</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'CUSTOM'] as FilterMode[]).map(m => (
                  <button 
                    key={m} 
                    onClick={() => setFilterMode(m)} 
                    className={`h-11 px-4 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                      filterMode === m ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10' : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t(`filter_${m.toLowerCase()}` as any)}
                  </button>
                ))}
              </div>
              
              {filterMode === 'CUSTOM' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Od</span>
                    <input 
                      type="date" 
                      min={firstDayOfMonth} 
                      max={lastDayOfMonth} 
                      value={customStart} 
                      onChange={e => setCustomStart(e.target.value)} 
                      className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 text-white text-sm focus:border-amber-500 transition-all outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Do</span>
                    <input 
                      type="date" 
                      min={firstDayOfMonth} 
                      max={lastDayOfMonth} 
                      value={customEnd} 
                      onChange={e => setCustomEnd(e.target.value)} 
                      className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 text-white text-sm focus:border-amber-500 transition-all outline-none" 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800/50">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Zdroj Dát</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['ALL', 'PROD', 'LOG'] as SourceFilter[]).map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSourceFilter(s)} 
                      className={`flex-1 h-10 rounded-lg text-[10px] font-black uppercase transition-all ${
                        sourceFilter === s ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {s === 'ALL' ? 'Všetko' : s === 'PROD' ? 'Výroba' : 'Logistika'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Smena</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['ALL', 'DAY', 'NIGHT'] as ShiftFilter[]).map(sh => (
                    <button 
                      key={sh} 
                      onClick={() => setShiftFilter(sh)} 
                      className={`flex-1 h-10 rounded-lg text-[10px] font-black uppercase transition-all ${
                        shiftFilter === sh ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {sh === 'ALL' ? 'Všetky' : sh === 'DAY' ? 'Denná' : 'Nočná'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-blue-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase">{t('kpi_total')}</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{stats.total}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-green-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase">{language === 'sk' ? 'DOKONČENÉ' : 'COMPLETED'}</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{stats.done}</p>
        </div>
      </div>

      <QualityAuditSection data={stats.quality} t={t} />
      <HighRunnerSection topHighRunners={stats.topHighRunners} topWorkplaces={stats.topWorkplaces} t={t} />
      <HourlyChartSection hourlyData={stats.hourlyData} t={t} />
      
      {/* WORKER PERFORMANCE CHART */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-6">
              <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{language === 'sk' ? 'VÝKONNOSŤ SKLADNÍKOV' : 'WORKER PERFORMANCE'}</h3>
          </div>
          <div className="h-[400px] w-full">
              {stats.workerStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.workerStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                          <YAxis dataKey="name" type="category" stroke="#fff" fontSize={11} fontWeight="bold" width={100} />
                          <Tooltip 
                              cursor={{ fill: '#334155', opacity: 0.4 }}
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                              itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                          />
                          <Bar 
                              dataKey="count" 
                              fill="#8b5cf6" 
                              radius={[0, 4, 4, 0]} 
                              barSize={20} 
                              onClick={(entry: any) => setSelectedWorkerData({ name: entry.name, tasks: entry.tasks })} 
                              cursor="pointer"
                          >
                              {stats.workerStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index < 3 ? '#a78bfa' : '#6d28d9'} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="flex h-full items-center justify-center">
                      <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">{t('no_data')}</p>
                  </div>
              )}
          </div>
      </div>

      <DrivingMetrics totalKm={stats.driving.totalFullDist} emptyKm={stats.driving.totalEmptyDist} rides={stats.driving.totalRides} efficiency={stats.driving.logEfficiency} vzvSpeed={systemConfig.vzvSpeed || 8} />
      
      {selectedWorkerData && (
        <WorkerDetailModal 
          name={selectedWorkerData.name} 
          tasks={selectedWorkerData.tasks} 
          periodLabel={filterMode} 
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