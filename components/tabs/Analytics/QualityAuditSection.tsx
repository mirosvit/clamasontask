
import React from 'react';
import { useLanguage } from '../../LanguageContext';

interface QualityAuditData {
  totalAuditedMissing: number;
  realErrorsCount: number;
  falseAlarmsCount: number;
  topMissingParts: { partNumber: string, count: number }[];
}

interface QualityAuditSectionProps {
  data: QualityAuditData;
  t: (key: any) => string;
}

const QualityAuditSection: React.FC<QualityAuditSectionProps> = ({ data, t }) => {
  const { language } = useLanguage();
  const successRate = data.totalAuditedMissing > 0 
    ? Math.round((data.realErrorsCount / data.totalAuditedMissing) * 100) 
    : 0;

  const cardBaseClass = "bg-slate-900/40 border-t-4 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:bg-slate-900/60 transition-all";

  return (
    <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
        <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.25em]">{t('inventory_health')}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${cardBaseClass} border-t-red-500`}>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl font-black italic">!</span>
          </div>
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">{t('system_errors')}</p>
          <h4 className="text-4xl font-black text-white font-mono tracking-tight mb-2">
            {data.realErrorsCount}
          </h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {t('audit_confirmed')}
          </p>
        </div>

        <div className={`${cardBaseClass} border-t-orange-500`}>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl font-black italic">?</span>
          </div>
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4">{t('worker_errors')}</p>
          <h4 className="text-4xl font-black text-white font-mono tracking-tight mb-2">
            {data.falseAlarmsCount}
          </h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {t('audit_found_false')}
          </p>
        </div>

        <div className={`${cardBaseClass} border-t-blue-500`}>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="text-8xl font-black italic">%</span>
          </div>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">{t('audit_success_rate')}</p>
          <h4 className="text-4xl font-black text-white font-mono tracking-tight mb-2">
            {successRate}%
          </h4>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div style={{ width: `${successRate}%` }} className="bg-blue-500 h-full"></div>
          </div>
        </div>
      </div>

      {data.topMissingParts.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/5">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            {t('top_missing_parts')}
          </h4>
          <div className="flex flex-wrap gap-3">
            {data.topMissingParts.map((item, idx) => (
              <div key={item.partNumber} className="bg-slate-900/50 border border-white/5 px-4 py-2 rounded-xl flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-700 font-mono">#0{idx + 1}</span>
                <span className="text-sm font-black text-slate-300 font-mono uppercase">{item.partNumber}</span>
                <span className="text-xs font-black text-red-500 font-mono ml-2">{item.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityAuditSection;
