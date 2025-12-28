
import React, { useMemo, useState, useEffect } from 'react';
import { Task, SystemBreak, MapSector, DBItem, SystemConfig, UserData } from '../../../types/appTypes';
import { useLanguage } from '../../LanguageContext';
import AnalyticsExportPanel from './AnalyticsExportPanel';
import HighRunnerSection from './HighRunnerSection';
import HourlyChartSection from './HourlyChartSection';
import QualityAuditSection from './QualityAuditSection';
import WorkerDetailModal from './WorkerDetailModal';
import DrivingMetrics from './DrivingMetrics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useAnalyticsEngine, FilterMode, SourceFilter, ShiftFilter } from '../../../hooks/useAnalyticsEngine';

interface AnalyticsTabProps {
  tasks: Task[];
  draftTasks: Task[];
  onFetchArchivedTasks: () => Promise<Task[]>;
  fetchSanons: () => Promise<any[]>;
  settings?: any;
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

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ 
  tasks: _liveTasks, draftTasks: _draftTasks, fetchSanons, settings, systemBreaks, resolveName, mapSectors, workplaces, systemConfig, logisticsOperations,
  users, currentUser, currentUserRole 
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('TODAY');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [historicalArchive, setHistoricalArchive] = useState<Task[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedWorkerData, setSelectedWorkerData] = useState<{ name: string; tasks: Task[] } | null>(null);
  const { t, language } = useLanguage();

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const canExport = useMemo(() => {
    return currentUserRole === 'ADMIN' || (users?.find(u => u.username === currentUser)?.canExportAnalytics === true);
  }, [currentUser, currentUserRole, users]);

  // EFFECT: Fetch historical archives (Sanons) once on mount
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const sanons = await fetchSanons();
        const allArchivedTasks: Task[] = [];
        sanons.forEach(sanon => {
          if (sanon.tasks && Array.isArray(sanon.tasks)) {
            allArchivedTasks.push(...sanon.tasks);
          }
        });
        setHistoricalArchive(allArchivedTasks);
      } catch (err) {
        console.error("Failed to load historical archives", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [fetchSanons]);

  // MASTER DATA MERGE - MERGE ALL THREE SOURCES
  const masterDataset = useMemo(() => {
    const live = Array.isArray(_liveTasks) ? _liveTasks : [];
    const draft = Array.isArray(_draftTasks) ? _draftTasks : [];
    const archive = Array.isArray(historicalArchive) ? historicalArchive : [];

    // Combine Live + Daily Draft + Weekly Sanons
    const combined = [...live, ...draft, ...archive];
    
    // De-duplicate by ID to be safe
    const uniqueMap = new Map();
    combined.forEach(task => {
        if (task && task.id) uniqueMap.set(task.id, task);
    });
    return Array.from(uniqueMap.values());
  }, [_liveTasks, _draftTasks, historicalArchive]);

  // INTEGRÁCIA ANALYTICKÉHO ENGINU s MASTER DATASETOM
  const engine = useAnalyticsEngine(
    masterDataset,
    [], // archivedTasks prop in engine is now redundant since we merged it into masterDataset
    systemBreaks,
    mapSectors,
    workplaces,
    logisticsOperations,
    systemConfig,
    {
      mode: filterMode,
      source: sourceFilter,
      shift: shiftFilter,
      customStart,
      customEnd
    },
    resolveName
  );

  const { filteredTasks, globalStats, workerStats, charts, qualityStats } = engine;

  const kpiMetrics = useMemo(() => {
    const logDone = filteredTasks.filter(t => t.isLogistics && t.isDone).length;
    const prodDone = filteredTasks.filter(t => !t.isLogistics && t.isDone).length;
    const totalKm = (globalStats.totalFullDist + globalStats.totalEmptyDist) / 1000;
    const badEntriesCount = filteredTasks.filter(t => t.isMissing || t.auditResult === 'NOK').length;

    return {
      logDone,
      prodDone,
      totalKm,
      badEntriesCount
    };
  }, [filteredTasks, globalStats]);

  const chartData = useMemo(() => {
      return workerStats.map(w => ({
          ...w,
          count: w.tasksDone 
      })).sort((a, b) => b.count - a.count);
  }, [workerStats]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-black text-teal-400 uppercase tracking-tighter">{t('analytics_title')}</h1>
        {isLoadingHistory && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full animate-pulse">
            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
            <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Načítavam archívy...</span>
          </div>
        )}
      </div>

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-blue-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">CELKOVO ÚLOH</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.totalTasks}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-purple-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">LOGISTICKÉ ÚLOHY</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{kpiMetrics.logDone}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-amber-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">VÝROBNÉ ÚLOHY</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{kpiMetrics.prodDone}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-teal-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">EFEKTIVITA JÁZD</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.globalEfficiency.toFixed(1)}%</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-green-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">PLNENIE NORIEM (TEMPO)</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.globalPerformanceRatio.toFixed(1)}%</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-sky-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">NAJAZDENÉ KM (SPOLU)</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{kpiMetrics.totalKm.toFixed(2)} <span className="text-xs font-normal">km</span></p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-indigo-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">CELKOVO JÁZD</p>
          <p className="text-3xl font-black text-white mt-2 font-mono">{globalStats.totalPhysicalRides}</p>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 border-l-4 border-l-rose-500 shadow-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">CHYBNÉ ZADANIA</p>
          <p className="text-3xl font-black text-rose-500 mt-2 font-mono">{kpiMetrics.badEntriesCount}</p>
        </div>
      </div>

      <QualityAuditSection data={qualityStats} t={t} />
      <HighRunnerSection topHighRunners={charts.highRunners} topWorkplaces={charts.workplaces} t={t} />
      <HourlyChartSection hourlyData={charts.hourly} t={t} />
      
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-6">
              <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{language === 'sk' ? 'VÝKONNOSŤ SKLADNÍKOV' : 'WORKER PERFORMANCE'}</h3>
          </div>
          <div className="h-[400px] w-full">
              {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                              onClick={(entry: any) => setSelectedWorkerData({ 
                                  name: entry.name, 
                                  tasks: masterDataset.filter(t => t.completedBy === entry.id) 
                              })} 
                              cursor="pointer"
                          >
                              {chartData.map((entry, index) => (
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

      <DrivingMetrics 
        totalKm={globalStats.totalFullDist} 
        emptyKm={globalStats.totalEmptyDist} 
        rides={globalStats.totalPhysicalRides} 
        efficiency={globalStats.globalEfficiency} 
        vzvSpeed={systemConfig.vzvSpeed || 8} 
      />
      
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
