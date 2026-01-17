import React, { useMemo, useState } from 'react';
import { ScrapPrice, ScrapMetal } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';
import { processScrapAnalytics } from '../../utils/scrapAnalyticsUtils';
import ScrapAnalyticsSection from './Analytics/ScrapAnalyticsSection';

interface ScrapAnalyticsTabProps {
    scrapSanons: any[];
    scrapPrices: ScrapPrice[];
    scrapMetals: ScrapMetal[];
    onFetchArchives: (from: string, to: string) => Promise<any[]>;
}

type FilterMode = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const ScrapAnalyticsTab: React.FC<ScrapAnalyticsTabProps> = (props) => {
    const { t, language } = useLanguage();
    const [filterMode, setFilterMode] = useState<FilterMode>('MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    
    // Výber roka pre ročné grafy (Výnosy aj Ceny)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // HANDLER: Manuálne načítanie dát pre štatistiky
    const handleLoadAnalytics = async () => {
        setIsLoading(true);
        try {
            // Načítame celý kalendárny rok, aby trendové grafy boli zmysluplné
            const from = `${selectedYear}-01-01`;
            const to = `${selectedYear}-12-31`;
            await props.onFetchArchives(from, to);
            setHasLoaded(true);
        } finally {
            setIsLoading(false);
        }
    };

    // 1. FILTROVANÉ ŠTATISTIKY (Hmotnosť, Hodnota, Koláčový graf podľa výberu obdobia)
    const filteredStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTs = today.getTime();
        
        let startTime = 0;
        let endTime = Date.now();

        switch (filterMode) {
            case 'TODAY': startTime = todayTs; break;
            case 'YESTERDAY': startTime = todayTs - 86400000; endTime = todayTs; break;
            case 'WEEK': startTime = todayTs - (today.getDay() || 7 - 1) * 86400000; break;
            case 'MONTH': startTime = new Date(today.getFullYear(), today.getMonth(), 1).getTime(); break;
            case 'CUSTOM':
                if (customStart && customEnd) {
                    startTime = new Date(customStart).getTime();
                    endTime = new Date(customEnd).getTime() + 86399999;
                }
                break;
        }

        return processScrapAnalytics(
            props.scrapSanons,
            props.scrapPrices,
            props.scrapMetals,
            startTime,
            endTime
        );
    }, [props.scrapSanons, props.scrapPrices, props.scrapMetals, filterMode, customStart, customEnd]);

    // 2. CELOROČNÉ DÁTA (Nezávislé od horného filtra, riadené vybraným rokom)
    const yearlyScrapStats = useMemo(() => {
        const startOfYear = new Date(selectedYear, 0, 1).getTime();
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59).getTime();

        return processScrapAnalytics(
            props.scrapSanons, 
            props.scrapPrices,
            props.scrapMetals,
            startOfYear,
            endOfYear
        );
    }, [props.scrapSanons, props.scrapPrices, props.scrapMetals, selectedYear]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
            <h1 className="text-3xl font-black text-teal-400 uppercase tracking-tighter">
                {t('tab_scrap_analytics')}
            </h1>

            {/* FILTER PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden mb-8 flex flex-col">
                <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)} 
                    className="w-full flex items-center justify-between p-6 bg-slate-800/40 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50"
                >
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{language === 'sk' ? 'NASTAVENIE ANALYTIKY' : 'ANALYTICS SETTINGS'}</h3>
                    </div>
                    <div className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </button>

                {isFilterOpen && (
                    <div className="p-8 space-y-8 animate-fade-in">
                        <div className="flex flex-col lg:flex-row items-end gap-6">
                            <div className="flex-1 space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('time_range_label')}</label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'CUSTOM'] as FilterMode[]).map(m => (
                                        <button 
                                            key={m} 
                                            onClick={() => setFilterMode(m)} 
                                            className={`h-11 px-4 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterMode === m ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10' : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {t(`filter_${m.toLowerCase()}` as any)}
                                        </button>
                                    ))}
                                </div>
                                {filterMode === 'CUSTOM' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fade-in">
                                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 text-white text-sm focus:border-amber-500 transition-all outline-none" />
                                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full h-12 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 text-white text-sm focus:border-amber-500 transition-all outline-none" />
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleLoadAnalytics}
                                disabled={isLoading}
                                className={`w-full lg:w-auto h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-b-4 flex items-center justify-center gap-3 shadow-xl active:scale-95 ${isLoading ? 'bg-slate-800 border-slate-900 text-slate-600' : 'bg-indigo-600 border-indigo-800 text-white hover:bg-indigo-500'}`}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                )}
                                {isLoading ? 'NAČÍTAVAM...' : 'GENEROVAŤ ŠTATISTIKY'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ANALYTICS CONTENT */}
            {!hasLoaded ? (
                <div className="py-40 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800">
                    <div className="flex flex-col items-center gap-6">
                        <div className="p-6 bg-slate-800/50 rounded-full text-slate-700">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-sm">Zvoľte rok a vygenerujte štatistické reporty</p>
                    </div>
                </div>
            ) : (
                <ScrapAnalyticsSection 
                    data={filteredStats} 
                    yearlyData={yearlyScrapStats.trendData}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                    prices={props.scrapPrices} 
                    metals={props.scrapMetals} 
                />
            )}
        </div>
    );
};

export default ScrapAnalyticsTab;