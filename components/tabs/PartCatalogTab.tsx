import React, { useState, useMemo } from 'react';
import { DBItem } from '../../App';
import { useLanguage } from '../LanguageContext';

interface PartCatalogTabProps {
  parts: DBItem[];
  onSelectPart: (part: DBItem) => void;
}

const PartCatalogTab: React.FC<PartCatalogTabProps> = ({ parts, onSelectPart }) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredParts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return parts;
    return parts.filter(p => 
      p.value.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [parts, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-teal-400 uppercase tracking-tighter">
            {language === 'sk' ? 'KATALÓG MASTER DATA' : 'MASTER DATA CATALOG'}
          </h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            {parts.length} {language === 'sk' ? 'POLOŽIEK V DATABÁZE' : 'ITEMS IN DATABASE'}
          </p>
        </div>
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_db_placeholder')}
            className="w-full h-12 bg-gray-700 border border-gray-600 rounded-xl px-4 pl-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono uppercase"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredParts.length > 0 ? (
          filteredParts.map(part => (
            <div 
              key={part.id} 
              onClick={() => onSelectPart(part)}
              className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 hover:border-teal-500 hover:bg-gray-800 transition-all cursor-pointer group shadow-sm hover:shadow-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="bg-teal-500/10 text-teal-400 text-[10px] font-black px-2 py-0.5 rounded border border-teal-500/20 uppercase tracking-widest">DIEL</span>
                <span className="text-gray-600 text-[10px] font-mono group-hover:text-teal-500/50 transition-colors">ID: {part.id.slice(-4)}</span>
              </div>
              <h3 className="text-xl font-black text-white font-mono break-all leading-tight mb-2 group-hover:text-teal-400 transition-colors">{part.value}</h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2 italic">
                {part.description || (language === 'sk' ? 'Bez popisu' : 'No description')}
              </p>
              <div className="mt-6 pt-4 border-t border-gray-700/50 flex justify-end">
                <button className="text-[10px] font-black text-teal-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  VYBRAŤ DO ÚLOHY <span className="text-sm">→</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-700">
            <p className="text-gray-600 font-black uppercase tracking-widest text-lg">Žiadne výsledky pre hľadanie</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartCatalogTab;