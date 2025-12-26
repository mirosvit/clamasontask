import React from 'react';
import { Task, MapSector } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';
import { COLOR_MAP } from '../../constants/uiConstants';

interface SectorPickerModalProps {
    task: Task;
    mapSectors: MapSector[];
    onClose: () => void;
    onConfirm: (sectorId: string) => void;
}

const SectorPickerModal: React.FC<SectorPickerModalProps> = ({ task, mapSectors, onClose, onConfirm }) => {
    const { t, language } = useLanguage();
    
    // Zoradenie sektorov podľa poradia (order)
    const sortedSectors = [...mapSectors].sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border-2 border-teal-500/50 rounded-3xl shadow-[0_0_50px_rgba(20,184,166,0.2)] w-full max-w-3xl p-6 sm:p-8 relative" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-8">
                    <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 uppercase tracking-tighter">
                        {language === 'sk' ? 'ODKIAĽ SI TOVAR VZAL?' : 'WHERE DID YOU PICK IT?'}
                    </h3>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">
                        {language === 'sk' ? 'VYBER SEKTOR PRE DIEL: ' : 'SELECT SECTOR FOR PART: '}
                        <span className="text-teal-400 font-mono ml-1">{task.partNumber}</span>
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mb-8">
                    {sortedSectors.map(sector => {
                        const bgColorClass = COLOR_MAP[sector.color as keyof typeof COLOR_MAP] || 'bg-slate-700';
                        return (
                            <button
                                key={sector.id}
                                onClick={() => onConfirm(sector.id)}
                                className={`w-full h-24 sm:h-28 rounded-2xl ${bgColorClass} hover:brightness-125 transition-all active:scale-95 flex flex-col items-center justify-center p-4 border-2 border-white/10 shadow-lg group`}
                            >
                                <span className="text-white font-black text-lg sm:text-xl uppercase tracking-tighter group-hover:scale-110 transition-transform text-center leading-tight">{sector.name}</span>
                                <span className="text-white/50 text-[8px] sm:text-[9px] font-bold mt-1 uppercase tracking-widest">Sektor</span>
                            </button>
                        );
                    })}
                </div>

                <button 
                    onClick={onClose}
                    className="w-full py-4 bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-slate-300 transition-all border border-slate-700 shadow-inner active:scale-[0.99]"
                >
                    {t('btn_cancel')}
                </button>
            </div>
        </div>
    );
};

export default SectorPickerModal;