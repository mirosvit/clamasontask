
import React from 'react';
import { useLanguage } from '../../LanguageContext';

interface DrivingMetricsProps {
  totalKm: number;
  emptyKm: number;
  rides: number;
  efficiency: number;
  vzvSpeed: number;
}

const DrivingMetrics: React.FC<DrivingMetricsProps> = ({ totalKm, emptyKm, rides, efficiency, vzvSpeed }) => {
  const { language } = useLanguage();

  const cardClass = "bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center group hover:bg-slate-900/60 transition-all";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2";
  const valueClass = "text-4xl font-black text-white font-mono tracking-tighter";

  return (
    <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
      <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
        <div className="w-1.5 h-6 bg-sky-500 rounded-full"></div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">GLOBÁLNE JAZDNÉ METRIKY</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={cardClass}>
          <p className={labelClass}>CELKOVÉ KM (PLNÉ)</p>
          <p className={valueClass}>{(totalKm / 1000).toFixed(2)} <span className="text-sm font-normal text-slate-500">km</span></p>
          <p className="text-[9px] text-sky-400 font-bold mt-2 uppercase tracking-widest">{totalKm.toFixed(0)} metrov</p>
        </div>

        <div className={cardClass}>
          <p className={labelClass}>JALOVÉ JAZDY (PRÁZDNE)</p>
          <p className={valueClass + " text-slate-400"}>{(emptyKm / 1000).toFixed(2)} <span className="text-sm font-normal text-slate-600">km</span></p>
          <p className="text-[9px] text-red-500/50 font-bold mt-2 uppercase tracking-widest">{emptyKm.toFixed(0)} metrov</p>
        </div>

        <div className={cardClass}>
          <p className={labelClass}>POČET JÁZD</p>
          <p className={valueClass + " text-teal-400"}>{rides}</p>
          <p className="text-[9px] text-slate-600 font-bold mt-2 uppercase tracking-widest">{language === 'sk' ? 'Vybavené cykly' : 'Completed cycles'}</p>
        </div>

        <div className={cardClass}>
          <p className={labelClass}>EFEKTIVITA TRÁS</p>
          <p className={`${valueClass} ${efficiency > 70 ? 'text-green-400' : 'text-amber-500'}`}>{efficiency.toFixed(1)}%</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div style={{ width: `${efficiency}%` }} className={`h-full ${efficiency > 70 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-white/5 text-center">
        <p className="text-slate-500 text-[10px] uppercase font-bold">
          * Všetky prejazdy sú validované normovanou rýchlosťou {vzvSpeed} km/h.
        </p>
      </div>
    </div>
  );
};

export default DrivingMetrics;
