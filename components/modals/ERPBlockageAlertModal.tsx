import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ERPBlockage } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface ERPBlockageAlertModalProps {
  blockage: ERPBlockage;
  queueCount: number;
  canOpenErpTab: boolean;
  onAcknowledge: () => void;
  onOpenErpTab: () => void;
  resolveName: (username?: string | null) => string;
}

const ERPBlockageAlertModal: React.FC<ERPBlockageAlertModalProps> = ({
  blockage,
  queueCount,
  canOpenErpTab,
  onAcknowledge,
  onOpenErpTab,
  resolveName,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopyPart = () => {
    const text = blockage.partNumber;
    if (!text) return;

    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(markCopied).catch(() => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-999999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          markCopied();
        } catch {
          // ignore copy failure
        }
      });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-999999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        markCopied();
      } catch {
        // ignore copy failure
      }
    }
  };

  const formattedTime = blockage.timestamp
    ? new Date(blockage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '-';

  return createPortal(
    <div className="fixed inset-0 z-[11500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border-2 border-orange-500 rounded-3xl shadow-[0_0_60px_rgba(249,115,22,0.35)] w-full max-w-md overflow-hidden relative flex flex-col">
        {/* Header */}
        <div className="bg-orange-500/15 p-6 border-b border-orange-500/20 text-center relative">
          {queueCount > 1 && (
            <span className="absolute top-4 right-4 bg-orange-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              +{queueCount - 1} {language === 'sk' ? 'ďalšie' : 'more'}
            </span>
          )}
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
            {language === 'sk' ? 'NOVÁ CHYBA ODVODU (ERP)' : 'NEW ERP POSTING ERROR'}
          </h3>
          <p className="text-[11px] font-bold text-orange-300/80 uppercase tracking-widest mt-2">
            {language === 'sk' ? `Nahlásené o ${formattedTime}` : `Reported at ${formattedTime}`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {language === 'sk' ? 'Číslo dielu / Part Number' : 'Part Number'}
              </p>
              {copied && (
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                  {language === 'sk' ? 'SKOPÍROVANÉ' : 'COPIED'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopyPart}
              title={language === 'sk' ? 'Kliknutím skopírujete' : 'Click to copy'}
              className="w-full text-2xl font-mono font-black text-white bg-slate-800 hover:bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 hover:border-orange-500/60 text-center shadow-inner transition-colors flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>{blockage.partNumber}</span>
              <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                {language === 'sk' ? 'Množstvo' : 'Quantity'}
              </p>
              <p className="text-lg font-black text-orange-400 font-mono">
                {blockage.quantity}
              </p>
            </div>
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                {language === 'sk' ? 'Nahlásil' : 'Reported by'}
              </p>
              <p className="text-sm font-black text-teal-400 uppercase truncate">
                {resolveName(blockage.createdBy)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              {language === 'sk' ? 'Popis chyby / Poznámka' : 'Error Description / Note'}
            </p>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 max-h-36 overflow-y-auto custom-scrollbar">
              <p className="font-bold text-sm text-slate-100 whitespace-pre-wrap break-words">
                {blockage.userNote}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 flex flex-col sm:flex-row">
          {canOpenErpTab && (
            <button
              type="button"
              onClick={onOpenErpTab}
              className="flex-1 py-4 px-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xs tracking-[0.15em] transition-all cursor-pointer"
            >
              {language === 'sk' ? 'PREJSŤ NA CHYBU ODVODU' : 'OPEN POSTING ERROR'}
            </button>
          )}
          <button
            type="button"
            onClick={onAcknowledge}
            className={`flex-1 py-4 px-4 bg-slate-800 hover:bg-slate-700 text-white hover:text-orange-400 font-black uppercase text-xs tracking-[0.15em] transition-all cursor-pointer ${canOpenErpTab ? 'border-t sm:border-t-0 sm:border-l border-slate-700' : ''}`}
          >
            {language === 'sk' ? 'BERIEM NA VEDOMIE' : 'ACKNOWLEDGE'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ERPBlockageAlertModal;
