
import React from 'react';
import { useLanguage } from '../../LanguageContext';

interface HighRunnerData {
  partNumber?: string;
  workplace?: string;
  load: number;
  pal: number;
  taskRequests: number;
}

interface HighRunnerSectionProps {
  topHighRunners: HighRunnerData[];
  topWorkplaces: HighRunnerData[];
  t: (key: any) => string;
}

const HighRunnerSection: React.FC<HighRunnerSectionProps> = ({ topHighRunners, topWorkplaces, t }) => {
  const { language } = useLanguage();

  const renderCard = (item: HighRunnerData, idx: number, isWorkplace: boolean) => {
    const title = isWorkplace ? item.workplace : item.partNumber;
    
    const rankStyles = [
      { border: 'border-t-fuchsia-500', text: 'text-fuchsia-500', badgeBorder: 'border-fuchsia-500/30' },
      { border: 'border-t-rose-500', text: 'text-rose-500', badgeBorder: 'border-rose-500/30' },
      { border: 'border-t-rose-700', text: 'text-rose-700', badgeBorder: 'border-rose-700/30' }
    ];
    
    const style = rankStyles[idx] || rankStyles[1];
    
    return (
      <div key={title} className={`bg-slate-900/40 border-t-4 ${style.border} rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:bg-slate-900/60 transition-all`}>
        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <span className="text-8xl font-black italic">{idx + 1}</span>
        </div>
        
        <div className="flex justify-between items-start mb-4">
          <span className={`text-[10px] font-black uppercase tracking-widest ${style.text}`}>{language === 'sk' ? 'Pozícia' : 'Rank'} #{idx + 1}</span>
          <span className={`bg-slate-800 text-[10px] font-black px-2 py-1 rounded border shadow-sm animate-pulse ${style.text} ${style.badgeBorder}`}>
            {t('load')}: {Number(item.load.toFixed(1))} {t('points')}
          </span>
        </div>

        <h4 className="text-2xl font-black text-white font-mono tracking-tight mb-6 truncate" title={title}>
          {title}
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('pallets')}</p>
            <p className="text-lg font-black text-slate-200 font-mono">{Number(item.pal.toFixed(1))}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('piece_requests')}</p>
            <p className="text-lg font-black text-slate-200 font-mono">{item.taskRequests}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5">
          <p className="text-[10px] font-bold text-rose-200/60 uppercase tracking-widest text-center">
            {t('included')} {item.pal.toFixed(1)} {t('unit_pallet_5')} | {item.taskRequests} {language === 'sk' ? 'požiadaviek' : 'requests'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
          <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('top_highrunners_prod')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topHighRunners.length > 0 ? (
            topHighRunners.map((runner, idx) => renderCard(runner, idx, false))
          ) : (
            <div className="col-span-3 py-12 text-center bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">{t('no_data')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
          <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('top_workplaces_prod')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topWorkplaces.length > 0 ? (
            topWorkplaces.map((wp, idx) => renderCard(wp, idx, true))
          ) : (
            <div className="col-span-3 py-12 text-center bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">{t('no_data')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HighRunnerSection;
