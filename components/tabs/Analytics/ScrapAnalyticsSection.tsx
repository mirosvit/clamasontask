import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { useLanguage } from '../../LanguageContext';

interface ScrapAnalyticsProps {
  data: {
    totalNetto: number;
    totalValue: number;
    weightDistribution: { name: string, value: number }[];
    trendData: { month: string, weight: number, value: number }[];
  };
  prices: any[];
  metals: any[];
}

const COLORS = ['#14b8a6', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ScrapAnalyticsSection: React.FC<ScrapAnalyticsProps> = ({ data, prices, metals }) => {
  const { t } = useLanguage();

  if (data.weightDistribution.length === 0) {
    return (
      <div className="bg-slate-950/40 border border-slate-800 p-12 rounded-3xl text-center">
        <p className="text-slate-600 font-black uppercase tracking-widest italic">{t('scrap_empty_data')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 mb-10 border-b border-white/5 pb-6">
          <div className="w-2 h-6 bg-teal-500 rounded-full"></div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('scrap_analytics_title')}</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* STATS & PIE CHART */}
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('scrap_total_weight')}</p>
                <p className="text-4xl font-black text-white mt-2 font-mono">{data.totalNetto.toLocaleString()} <span className="text-sm font-normal text-slate-600">kg</span></p>
              </div>
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('scrap_total_value')}</p>
                <p className="text-4xl font-black text-white mt-2 font-mono">{data.totalValue.toLocaleString()} <span className="text-sm font-normal text-slate-600">€</span></p>
              </div>
            </div>

            <div className="h-64">
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
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TREND CHART */}
          <div className="space-y-8">
             <div className="h-80 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">{t('scrap_export_stats')} (KG vs €)</p>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trendData}>
                        <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        />
                        <Bar yAxisId="left" dataKey="weight" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Hmotnosť (kg)" />
                        <Bar yAxisId="right" dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Hodnota (€)" />
                    </BarChart>
                </ResponsiveContainer>
             </div>

             {/* PRICE LIST MINI */}
             <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t('scrap_price_trend')}</p>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {metals.map(m => {
                        const latestPrice = prices.filter(p => p.metalId === m.id).sort((a,b) => b.year - a.year || b.month - a.month)[0];
                        return (
                            <div key={m.id} className="flex justify-between items-center bg-slate-950/30 px-4 py-2 rounded-lg border border-white/5">
                                <span className="text-xs font-bold text-white uppercase">{m.type}</span>
                                <span className="text-xs font-black text-teal-400 font-mono">{latestPrice?.price.toFixed(3) || '0.000'} €/kg</span>
                            </div>
                        );
                    })}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ScrapAnalyticsSection;