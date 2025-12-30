import React from 'react';
import { createPortal } from 'react-dom';
import { Notification } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface NotificationModalProps {
  notification: Notification;
  onConfirm: () => void;
  resolveName: (username?: string | null) => string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onConfirm, resolveName }) => {
  const { t, language } = useLanguage();

  // Rozlíšenie štýlu podľa typu správy (AUDIT vs CHÝBA)
  const isAudit = notification.reason.includes('AUDIT');
  const isMissing = notification.reason.includes('CHÝBA') || notification.reason.includes('MISSING');
  
  const borderColor = isAudit 
    ? (notification.reason.includes('OK') ? 'border-green-500' : 'border-amber-500')
    : 'border-red-500';
    
  const iconColor = isAudit 
    ? (notification.reason.includes('OK') ? 'text-green-500' : 'text-amber-500')
    : 'text-red-500';

  const bgColor = isAudit 
    ? (notification.reason.includes('OK') ? 'bg-green-500/10' : 'bg-amber-500/10')
    : 'bg-red-500/10';

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className={`bg-slate-900 border-2 ${borderColor} rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden relative flex flex-col`}>
        
        {/* Header */}
        <div className={`${bgColor} p-6 border-b border-white/5 text-center`}>
            <div className={`w-16 h-16 rounded-2xl bg-slate-900 border-2 ${borderColor} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                {language === 'sk' ? 'DÔLEŽITÁ SPRÁVA' : 'IMPORTANT NOTICE'}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                {language === 'sk' ? 'Aktualizácia stavu vašej úlohy' : 'Update on your task'}
            </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Diel / Part Number</p>
                <p className="text-2xl font-mono font-black text-white bg-slate-800 p-3 rounded-xl border border-slate-700 text-center shadow-inner">
                    {notification.partNumber}
                </p>
            </div>

            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Správa / Message</p>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <p className={`font-bold text-base ${isMissing ? 'text-red-400' : 'text-white'}`}>
                        {notification.reason}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {language === 'sk' ? 'Nahlásil:' : 'Reported by:'}
                </span>
                <span className="text-sm font-black text-teal-400 uppercase">
                    {resolveName(notification.reportedBy)}
                </span>
            </div>
        </div>

        {/* Footer Action */}
        <button 
            onClick={onConfirm} 
            className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs tracking-[0.2em] transition-all border-t border-slate-700 hover:text-teal-400"
        >
            {language === 'sk' ? 'BERIEM NA VEDOMIE' : 'ACKNOWLEDGE'}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default NotificationModal;