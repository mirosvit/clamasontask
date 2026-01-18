import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area, CartesianGrid } from 'recharts';
import { useLanguage } from '../../LanguageContext';

interface ScrapAnalyticsProps {
  data: {
    totalNetto: number;
    totalValue: number;
    totalExternalValue: number;
    weightDistribution: { name: string, value: number }[];
    trendData: { month: string, weight: number, value: number, externalValue: number, [key: string]: any }[];
  };
  yearlyData: { month: string, externalValue: number, [key: string]: any }[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  prices: any[];
  metals: any[];
}

const COLORS = ['#14b8a6', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981', '#f43f5e'];

const ScrapAnalyticsSection: React.FC<ScrapAnalyticsProps> = ({ data, yearlyData, selectedYear, onYearChange, prices, metals }) => {
  const { t, language } = useLanguage();

  const noFilteredData = data.weightDistribution.length === 0 && data.trendData.length === 0;

  // Generovanie rozsahu rokov pre dropdown
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const result = [];
    for (let i = 2024; i <= current; i++) {
        result.push(i);
    }
    return result.reverse(); 
  }, []);

  // Výpočet celkového sumáru za vybraný rok pre sekciu fakturácie
  const yearlyBillingTotal = useMemo(() => {
    return yearlyData.reduce((acc, curr) => acc + (curr.externalValue || 0), 0);
  }, [yearlyData]);

  const accuracy = data.totalValue > 0 ? (data.totalExternalValue / data.totalValue) * 100 : 100;
  const diff = data.totalExternalValue - data.totalValue;

  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* SECTION 1: FILTERED STATS (WEIGHT, VALUE, PIE) */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('scrap_total_weight')}</p>
                  <p className="text-4xl font-black text-white mt-2 font-mono">{data.totalNetto.toLocaleString()} <span className="text-sm font-normal text-slate-600">kg</span></p>
                </div>
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">SKUTOČNÝ VÝNOS (ODBERATEĽ)</p>
                  <p className="text-4xl font-black text-white mt-2 font-mono">{data.totalExternalValue.toLocaleString()} <span className="text-sm font-normal text-slate-600">€</span></p>
                </div>
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">INTERNÝ ODHAD (CENNÍK)</p>
                  <p className="text-2xl font-black text-slate-400 mt-2 font-mono">{data.totalValue.toLocaleString()} <span className="text-sm font-normal text-slate-600">€</span></p>
                </div>
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PRESNOSŤ ODHADU</p>
                  <div className="flex items-end gap-3 mt-2">
                    <p className={`text-3xl font-black font-mono ${accuracy >= 95 && accuracy <= 105 ? 'text-green-500' : 'text-orange-500'}`}>{accuracy.toFixed(1)}%</p>
                    <span className={`text-[10px] font-bold mb-1 ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>({diff > 0 ? '+' : ''}{diff.toLocaleString()} €)</span>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-teal-500/20 w-full">
                    <div className="h-full bg-teal-500" style={{ width: `${Math.min(accuracy, 100)}%` }}></div>
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

            {/* EXPORT TREND CHART */}
            <div className="space-y-8">
               <div className="h-full bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">{t('scrap_export_stats')} (Hmotnosť vs Finančné plnenie)</p>
                  <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={data.trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="left" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                              cursor={{fill: 'rgba(255,255,255,0.05)'}}
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          />
                          <Legend verticalAlign="top" height={36}/>
                          <Bar yAxisId="left" dataKey="weight" fill="#14b8a6" radius={[4, 4, 0, 0]} name={language === 'sk' ? "Hmotnosť (kg)" : "Weight (kg)"} />
                          <Bar yAxisId="right" dataKey="externalValue" fill="#10b981" radius={[4, 4, 0, 0]} name={language === 'sk' ? "Skutočná hodnota (€)" : "Actual Value (€)"} />
                          <Bar yAxisId="right" dataKey="value" fill="#f59e0b" opacity={0.4} radius={[4, 4, 0, 0]} name={language === 'sk' ? "Odhadovaná hodnota (€)" : "Estimated Value (€)"} />
                      </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW SECTION 2: YEARLY ACTUAL YIELD GRAPH (FAKTURÁCIA ODBERATEĽ) */}
      <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">SKUTOČNÝ VÝNOS (FAKTURÁCIA ODBERATEĽ)</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Mesačný prehľad finančného plnenia za rok {selectedYear}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* YEAR TOTAL KPI - NOVÝ PRVOK */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 rounded-2xl flex flex-col items-center sm:items-end shadow-inner">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">CELKOM ZA ROK {selectedYear}</span>
                    <span className="text-2xl font-black text-white font-mono tracking-tight">{yearlyBillingTotal.toLocaleString('sk-SK')} <span className="text-sm font-normal text-emerald-600">€</span></span>
                </div>

                <div className="relative group">
                    <select 
                        value={selectedYear}
                        onChange={(e) => onYearChange(parseInt(e.target.value))}
                        className="bg-slate-900 border-2 border-slate-700 text-teal-400 font-black px-6 py-2 rounded-xl outline-none focus:border-teal-500 transition-all appearance-none cursor-pointer pr-10 shadow-lg"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>
        </div>

        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyData}>
                    <defs>
                        <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                        dataKey="month" 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => {
                            const months = ['JAN','FEB','MAR','APR','MÁJ','JÚN','JÚL','AUG','SEP','OKT','NOV','DEC'];
                            const parts = v.split('-');
                            if (parts.length < 2) return v;
                            return months[parseInt(parts[1]) - 1] || v;
                        }}
                    />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toLocaleString()}€`} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="externalValue" 
                        stroke="#10b981" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorYield)" 
                        name={language === 'sk' ? "Výnos (€)" : "Yield (€)"}
                        animationDuration={2000}
                        activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: INDEPENDENT METAL PRICE TREND (YEAR SELECTABLE) */}
      <div className="bg-slate-950/40 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-sky-500 to-amber-500 opacity-30"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400 border border-teal-500/20 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">{t('scrap_price_trend')}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Prehľad trhových cien za rok {selectedYear} (€ / kg)</p>
                </div>
            </div>

            <div className="hidden lg:flex flex-wrap gap-4 bg-slate-900/60 p-3 rounded-2xl border border-white/5 shadow-inner">
                {metals.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-2 px-2">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{m.type}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                        dataKey="month" 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        padding={{ left: 30, right: 30 }}
                        tickFormatter={(v) => {
                            const months = ['JAN','FEB','MAR','APR','MÁJ','JÚN','JÚL','AUG','SEP','OKT','NOV','DEC'];
                            const parts = v.split('-');
                            if (parts.length < 2) return v;
                            const mIdx = parseInt(parts[1]) - 1;
                            return months[mIdx] || v;
                        }}
                    />
                    <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={['auto', 'auto']} 
                        tickFormatter={(v) => `${v.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}€`} 
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                        itemStyle={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '11px' }}
                        formatter={(value: any) => [`${parseFloat(value).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 5 })} €`, 'Cena']}
                    />
                    {metals.map((metal, idx) => (
                        <Line 
                            key={metal.id}
                            type="monotone"
                            dataKey={metal.type}
                            stroke={COLORS[idx % COLORS.length]}
                            strokeWidth={4}
                            dot={{ r: 5, strokeWidth: 3, fill: '#0f172a' }}
                            activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
                            name={metal.type}
                            connectNulls
                            animationDuration={1500}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] italic">
                * Dáta sú čerpané z historických záznamov cenníkov pre zvolený rok {selectedYear}
            </p>
        </div>
      </div>
    </div>
  );
};

export default ScrapAnalyticsSection;