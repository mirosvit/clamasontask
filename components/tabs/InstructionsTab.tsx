import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../LanguageContext';
import { useData } from '../../context/DataContext';
import { Instruction } from '../../types/appTypes';

const Icons = {
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Book: () => <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Close: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
};

const categoryColors = {
  PROD: 'border-pink-500 text-pink-400 bg-pink-500/10',
  LOG: 'border-indigo-500 text-indigo-400 bg-indigo-500/10',
  SAFE: 'border-amber-500 text-amber-400 bg-amber-500/10',
  OTHER: 'border-slate-500 text-slate-400 bg-slate-500/10'
};

const InstructionsTab: React.FC = () => {
    const { t, language } = useLanguage();
    const { instructions } = useData();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | Instruction['category']>('ALL');
    const [selectedInst, setSelectedInst] = useState<Instruction | null>(null);

    const filtered = useMemo(() => {
        let items = [...instructions];
        if (activeFilter !== 'ALL') items = items.filter(i => i.category === activeFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(i => 
              (i.title || '').toLowerCase().includes(q) || 
              (i.content || '').toLowerCase().includes(q)
            );
        }
        return items.sort((a,b) => b.updatedAt - a.updatedAt);
    }, [instructions, activeFilter, searchQuery]);

    const formatContent = (text: string) => {
        if (!text) return null;
        return text.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in text-slate-200">
            {/* SEARCH & FILTERS */}
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="relative w-full md:w-[400px]">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={language === 'sk' ? "Hľadať v dokumentácii..." : "Search documentation..."}
                            className="w-full h-14 bg-slate-950 border border-slate-700 rounded-2xl pl-14 pr-6 text-white font-bold uppercase focus:border-teal-500 outline-none transition-all shadow-inner"
                        />
                        <div className="absolute left-5 top-4.5 text-slate-600"><Icons.Search /></div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center">
                        {(['ALL', 'PROD', 'LOG', 'SAFE', 'OTHER'] as const).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveFilter(cat)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${activeFilter === cat ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-900/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                            >
                                {cat === 'ALL' ? 'VŠETKO' : t(`inst_cat_${cat.toLowerCase()}` as any)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map(inst => (
                    <div 
                        key={inst.id}
                        onClick={() => setSelectedInst(inst)}
                        className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-teal-500/50 hover:bg-slate-800/40 transition-all cursor-pointer group flex flex-col min-h-[220px]"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${categoryColors[inst.category] || categoryColors.OTHER}`}>
                                {t(`inst_cat_${(inst.category || 'OTHER').toLowerCase()}` as any)}
                            </span>
                            <span className="text-[9px] font-mono text-slate-600">ID: {(inst.id || '').slice(0,4)}</span>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-tight group-hover:text-teal-400 transition-colors mb-4 line-clamp-2">
                            {inst.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 italic mb-auto">
                            {inst.content}
                        </p>
                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-600 uppercase">{inst.updatedAt ? new Date(inst.updatedAt).toLocaleDateString() : '-'}</span>
                            <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">ČÍTAŤ <span className="text-lg">→</span></span>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="col-span-full py-32 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-slate-800/50 rounded-full text-slate-700"><Icons.Book /></div>
                            <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-xs">Dokumentácia nie je k dispozícii</p>
                        </div>
                    </div>
                )}
            </div>

            {/* DETAIL MODAL */}
            {selectedInst && createPortal(
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setSelectedInst(null)}>
                    <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <div className="p-8 sm:p-12 border-b border-white/5 bg-slate-950/40 flex justify-between items-start gap-8">
                            <div className="space-y-4">
                                <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${categoryColors[selectedInst.category] || categoryColors.OTHER}`}>
                                    {t(`inst_cat_${(selectedInst.category || 'OTHER').toLowerCase()}` as any)}
                                </span>
                                <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-tight">{selectedInst.title}</h2>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-slate-600 uppercase">Autor:</span>
                                        <span className="text-xs font-bold text-teal-500 uppercase">{selectedInst.author}</span>
                                    </div>
                                    <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                                        <span className="text-[9px] font-black text-slate-600 uppercase">Aktualizácia:</span>
                                        <span className="text-xs font-mono font-bold text-slate-400">{selectedInst.updatedAt ? new Date(selectedInst.updatedAt).toLocaleDateString('sk-SK') : '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInst(null)} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all shadow-lg active:scale-90 flex-shrink-0">
                                <Icons.Close />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-8 sm:p-12 custom-scrollbar">
                            <div className="markdown-body">
                                <ReactMarkdown>{selectedInst.content}</ReactMarkdown>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-950/40 border-t border-white/5 flex justify-end">
                            <button 
                                onClick={() => setSelectedInst(null)}
                                className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-xl"
                            >
                                ZAVRIEŤ DOKUMENT
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default InstructionsTab;