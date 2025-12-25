import React from 'react';

interface HourlyData {
  hour: number;
  label: string;
  production: number;
  logistics: number;
}

interface HourlyChartSectionProps {
  hourlyData: HourlyData[];
  t: (key: any) => string;
}

const HourlyChartSection: React.FC<HourlyChartSectionProps> = ({ hourlyData, t }) => {
  
  const renderHourlyChart = (data: HourlyData[], type: 'production' | 'logistics') => {
    const maxVal = Math.max(...data.map(d => d[type]), 5);
    const colorClass = type === 'production' ? 'bg-teal-500 hover:bg-teal-400' : 'bg-blue-600 hover:bg-blue-500';
    const borderClass = type === 'production' ? 'border-t-teal-500' : 'border-t-blue-600';
    const label = type === 'production' ? t('hourly_production_load') : t('hourly_logistics_load');

    return (
      <div className={`bg-slate-900/40 p-6 rounded-2xl border border-slate-800 border-t-4 ${borderClass} shadow-xl overflow-hidden animate-fade-in`}>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-8 border-b border-white/5 pb-4">{label}</h3>
        <div className="flex items-end justify-between gap-1 sm:gap-2 h-40">
          {data.map(d => {
            const heightPercent = Math.max((d[type] / maxVal) * 100, 2);
            return (
              <div key={d.hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 px-2 py-0.5 rounded text-[9px] font-black text-white z-20 shadow-xl border border-slate-700">
                  {Number(d[type].toFixed(1))} {t('points')}
                </div>
                <div 
                  style={{ height: `${heightPercent}%` }} 
                  className={`w-full rounded-t-sm sm:rounded-t-md transition-all duration-500 shadow-lg ${colorClass} ${d[type] === maxVal && d[type] > 0 ? 'animate-pulse ring-2 ring-white/10' : ''}`}
                ></div>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 mt-2 rotate-45 sm:rotate-0">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
        <div className="w-1.5 h-6 bg-teal-600 rounded-full"></div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">HODINOVÁ ANALÝZA NÁPORU</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        {hourlyData.length > 0 ? (
          <>
            {renderHourlyChart(hourlyData, 'production')}
            {renderHourlyChart(hourlyData, 'logistics')}
          </>
        ) : (
          <div className="py-12 text-center bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
            <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Žiadne hodinové dáta pre tento filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HourlyChartSection;