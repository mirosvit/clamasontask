
import React from 'react';
import { useLanguage } from '../../LanguageContext';

interface DrivingStatsData {
  fullDist: number;   // metre
  emptyDist: number;  // metre
  fullRides: number;
  emptyRides: number;
  efficiency: number;
}

interface DrivingMetricsProps {
  productionStats: DrivingStatsData;
  logisticsStats: DrivingStatsData;
  vzvSpeed: number;
}

const DrivingMetrics: React.FC<DrivingMetricsProps> = ({ productionStats, logisticsStats, vzvSpeed }) => {
  const { language } = useLanguage();

  const renderSection = (title: string, stats: DrivingStatsData, themeColor: 'rose' | 'sky') => {
    const isRose = themeColor === 'rose';
    const borderClass = isRose ? 'border-rose-500/30' : 'border-sky-500/30';
    const textClass = isRose ? 'text-rose-500' : 'text-sky-500';
    const bgClass = isRose ? 'bg-rose-500/5' : 'bg-sky-500/5';
    const tileBg = "bg-slate-900/40 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col items-center text-center group hover:bg-slate-900/60 transition-all";
    
    return (
      <div className={`${bgClass} border-2 ${borderClass} rounded-[2rem] p-6 space-y-6 relative overflow-hidden`}>
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className={`w-2 h-2 rounded-full ${isRose ? 'bg-rose-500' : 'bg-sky-500'} animate-pulse`}></div>
            <h4 className={`text-xs font-black uppercase tracking-[0.3em] ${textClass}`}>{title}</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TILE 1: PLNÉ JAZDY */}
          <div className={tileBg}>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Celkovo jazdy (PLNÉ)</p>
            <p className="text-3xl font-black text-white font-mono">{stats.fullRides}</p>
            {/* VÝRAZNE ZVÄČŠENÉ: text-lg font-bold */}
            <p className="text-lg font-bold text-slate-400 mt-1">
              {(stats.fullDist / 1000).toFixed(2)} km
            </p>
          </div>

          {/* TILE 2: JALOVÉ JAZDY */}
          <div className={tileBg}>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Celkovo jazdy (JALOVÉ)</p>
            <p className="text-3xl font-black text-slate-400 font-mono">{stats.emptyRides}</p>
            {/* VÝRAZNE ZVÄČŠENÉ: text-lg font-bold */}
            <p className="text-lg font-bold text-slate-400 mt-1">
              {(stats.emptyDist / 1000).toFixed(2)} km
            </p>
          </div>

          {/* TILE 3: JAZDY SPOLU */}
          <div className={tileBg}>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Jazdy spolu</p>
            <p className="text-3xl font-black text-white font-mono">{stats.fullRides + stats.emptyRides}</p>
            {/* VÝRAZNE ZVÄČŠENÉ: text-lg font-bold */}
            <p className="text-lg font-bold text-slate-400 mt-1">
              {((stats.fullDist + stats.emptyDist) / 1000).toFixed(2)} km
            </p>
          </div>

          {/* TILE 4: EFEKTIVITA */}
          <div className={tileBg}>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Efektivita trás</p>
            <p className={`text-3xl font-black font-mono ${stats.efficiency > 70 ? 'text-green-400' : 'text-amber-500'}`}>
                {stats.efficiency.toFixed(1)}%
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                style={{ width: `${stats.efficiency}%` }} 
                className={`h-full transition-all duration-1000 ${stats.efficiency > 70 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-amber-500'}`}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-3xl shadow-2xl overflow-hidden animate-fade-in space-y-10">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-teal-500 rounded-full"></div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">GLOBÁLNE JAZDNÉ METRIKY</h3>
        </div>
        <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">
          * Validované rýchlosťou {vzvSpeed} km/h
        </p>
      </div>
      
      <div className="space-y-8">
        {renderSection(language === 'sk' ? 'VÝROBA (PRODUCTION)' : 'PRODUCTION', productionStats, 'rose')}
        {renderSection(language === 'sk' ? 'LOGISTIKA (LOGISTICS)' : 'LOGISTICS', logisticsStats, 'sky')}
      </div>

      <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 text-center">
         <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            {language === 'sk' 
                ? 'Metriky zahŕňajú plné cykly, vratné jazdy a tieňovú logistiku (transit medzi úlohami).' 
                : 'Metrics include full cycles, empty returns, and shadow logistics (transit between tasks).'}
         </p>
      </div>
    </div>
  );
};

export default DrivingMetrics;
