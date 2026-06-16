import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, CartesianGrid } from 'recharts';
import { useLanguage } from '../../LanguageContext';

interface ScrapAnalyticsProps {
  data: {
    totalNetto: number;
    totalExternalWeight: number;
    weightDistribution: { name: string, value: number }[];
    trendData: { month: string, weight: number, externalWeight: number, [key: string]: any }[];
  };
}

const COLORS = ['#14b8a6', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981', '#f43f5e'];

const ScrapAnalyticsSection: React.FC<ScrapAnalyticsProps> = ({ data }) => {
  const { t, language } = useLanguage();

  const noFilteredData = data.weightDistribution.length === 0 && data.trendData.length === 0;

  const weightVariance = data.totalNetto > 0 ? ((data.totalExternalWeight - data.totalNetto) / data.totalNetto) * 100 : 0;
  const weightDiff = data.totalExternalWeight - data.totalNetto;

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* SECTION 1: FILTERED STATS (WEIGHT, PIE, TREND) */}
      <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-teal-500 rounded-full"></div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('scrap_analytics_title')}</h3>
          </div>
          <span className="text-[9px] font-black text-slate-600 bg-slate-900 px-3 py-1 rounded-full uppercase tracking-widest border border-white/5">Podľa vybraného filtra vývozov</span>
        </div>

        {noFilteredData ? (
          <div className="py-20 text-center">
            <p className="text-slate-600 font-black uppercase tracking-widest italic">{t('scrap_empty_data')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* STATS & PIE CHART */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('scrap_total_weight')}</p>
                  <p className="text-3xl font-black text-white mt-2 font-mono">{data.totalNetto.toLocaleString()} <span className="text-xs font-normal text-slate-600">kg</span></p>
                </div>
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">VÁHA (ODB.)</p>
                  <div className="flex flex-col mt-2">
                    <p className="text-3xl font-black text-white font-mono">{data.totalExternalWeight.toLocaleString()} <span className="text-xs font-normal text-slate-600">kg</span></p>
                    <span className={`text-[9px] font-bold mt-1 ${Math.abs(weightVariance) < 2 ? 'text-green-500' : 'text-orange-500'}`}>
                      ({weightVariance > 0 ? '+' : ''}{weightVariance.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PRESNOSŤ VÁHY</p>
                  <div className="flex flex-col mt-2">
                    <p className={`text-3xl font-black font-mono ${Math.abs(weightVariance) < 2 ? 'text-green-500' : 'text-orange-500'}`}>{ (100 + weightVariance).toFixed(1) }%</p>
                    <span className={`text-[9px] font-bold mt-1 ${weightDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>({weightDiff > 0 ? '+' : ''}{weightDiff.toLocaleString()} kg)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                <div className="w-full sm:w-1/2 h-56">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t('scrap_weight_dist')}</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.weightDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.weightDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* TEXT BREAKDOWN OF WEIGHTS */}
                <div className="w-full sm:w-1/2 space-y-3">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Hmotnosť podľa kovu</p>
                   <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                     {data.weightDistribution.map((item, index) => (
                       <div key={item.name} className="flex items-center justify-between group">
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                           <span className="text-[11px] font-bold text-slate-300 uppercase truncate max-w-[100px]">{item.name}</span>
                         </div>
                         <span className="text-xs font-black text-white font-mono">{item.value.toLocaleString()} <span className="text-[9px] font-normal text-slate-500 uppercase">kg</span></span>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>

            {/* EXPORT TREND CHART: INTERNAL WEIGHT VS PARTNER WEIGHT */}
            <div className="space-y-8">
               <div className="h-full bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">{t('scrap_export_stats')} (Hmotnosť interná vs odberateľská)</p>
                  <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={data.trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                              cursor={{fill: 'rgba(255,255,255,0.05)'}}
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          />
                          <Legend verticalAlign="top" height={36}/>
                          <Bar dataKey="weight" fill="#14b8a6" radius={[4, 4, 0, 0]} name={language === 'sk' ? "Interná váha (kg)" : "Internal Weight (kg)"} />
                          <Bar dataKey="externalWeight" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={language === 'sk' ? "Váha odberateľa (kg)" : "Buyer Weight (kg)"} />
                      </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrapAnalyticsSection;
