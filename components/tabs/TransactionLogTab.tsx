
import React, { useState, useMemo, useEffect } from 'react';
import { Task, UserData, MapSector } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

declare var XLSX: any;

interface TransactionLogTabProps {
  tasks: Task[]; // Živé úlohy
  draftTasks: Task[]; // Draft (denný)
  fetchSanons: () => Promise<any[]>; // Archív
  users: UserData[];
  mapSectors: MapSector[];
  resolveName: (username?: string | null) => string;
}

const TransactionLogTab: React.FC<TransactionLogTabProps> = ({ 
  tasks, draftTasks, fetchSanons, users, mapSectors, resolveName 
}) => {
  const { t, language } = useLanguage();
  
  // Filtre
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [timeFrom, setTimeFrom] = useState('06:00');
  const [timeTo, setTimeTo] = useState('18:00');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dáta
  const [historicalData, setHistoricalData] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Načítanie historických dát pri zmene dátumu
  useEffect(() => {
    const loadHistory = async () => {
      // Ak je rozsah len dnešok, neťaháme históriu
      const today = new Date().toISOString().split('T')[0];
      if (dateFrom === today && dateTo === today) {
          setHistoricalData([]);
          return;
      }

      setIsLoading(true);
      try {
        const sanons = await fetchSanons();
        const relevantTasks: Task[] = [];
        
        // Jednoduchý filter: prechádzame šanóny a vyberáme tie, ktoré spadajú do rozsahu
        // Pozn: V reálnejšom nasadení by sme filtrovali už query, ale tu využívame existujúci fetchSanons
        sanons.forEach(sanon => {
           if (sanon.tasks && Array.isArray(sanon.tasks)) {
               // Optimalizácia: Check ak aspoň jedna taska v šanóne spadá do dátumu
               // Tu pre istotu berieme všetko a filtrujeme v memory (Archive Tasks logic)
               relevantTasks.push(...sanon.tasks);
           }
        });
        setHistoricalData(relevantTasks);
      } catch (e) {
        console.error("Failed to load archive for logs", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [dateFrom, dateTo, fetchSanons]);

  // Helper na prevod ID sektoru na názov
  const resolveSector = (sectorId?: string) => {
      if (!sectorId) return '';
      const s = mapSectors.find(x => x.id === sectorId);
      return s ? s.name : sectorId;
  };

  // Hlavný filter dát
  const filteredLogs = useMemo(() => {
    const startTs = new Date(dateFrom).setHours(0,0,0,0);
    const endTs = new Date(dateTo).setHours(23,59,59,999);
    
    // Spojenie zdrojov: Live + Draft + History
    const allSource = [...tasks, ...draftTasks, ...historicalData];
    
    // Odstránenie duplikátov podľa ID
    const unique = new Map();
    allSource.forEach(t => unique.set(t.id, t));
    const combined = Array.from(unique.values());

    return combined.filter(task => {
        // 1. Dátum
        const taskTime = task.completedAt || task.createdAt || 0;
        if (taskTime < startTs || taskTime > endTs) return false;

        // 2. Čas (Time Range)
        const dateObj = new Date(taskTime);
        const taskHHMM = dateObj.getHours().toString().padStart(2, '0') + ':' + dateObj.getMinutes().toString().padStart(2, '0');
        if (taskHHMM < timeFrom || taskHHMM > timeTo) return false;

        // 3. Užívateľ
        if (selectedUser) {
            // Hľadáme zhodu v createdBy alebo completedBy
            if (task.completedBy !== selectedUser && task.createdBy !== selectedUser) return false;
        }

        // 4. Search Query (Fulltext)
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const content = `${task.partNumber} ${task.workplace} ${task.note} ${resolveName(task.completedBy)}`.toLowerCase();
            if (!content.includes(q)) return false;
        }

        return true;
    }).sort((a,b) => (b.completedAt || b.createdAt || 0) - (a.completedAt || a.createdAt || 0));
  }, [tasks, draftTasks, historicalData, dateFrom, dateTo, timeFrom, timeTo, selectedUser, searchQuery, resolveName]);

  const handleExport = () => {
      if (filteredLogs.length === 0) {
          alert('Žiadne dáta na export.');
          return;
      }

      const exportData = filteredLogs.map(t => {
          // LOGIKA ODKIAĽ / KAM (Rovnaká ako v YearlyClosing)
          let sourceVal = '';
          let targetVal = '';

          if (t.isLogistics) {
                const op = (t.workplace || '').toUpperCase();
                const isUnloading = op.includes('VYKL') || op.includes('UNLOAD') || op.includes('PRÍJEM');
                const isLoading = op.includes('NAKL') || op.includes('LOAD') || op.includes('EXPED');

                if (isUnloading) {
                    sourceVal = t.note || 'EXT';
                    targetVal = resolveSector(t.targetSectorId) || 'PRÍJEM';
                } else if (isLoading) {
                    sourceVal = resolveSector(t.sourceSectorId) || 'SKLAD';
                    targetVal = t.note || 'EXT';
                } else {
                    // Presun
                    sourceVal = resolveSector(t.sourceSectorId) || '';
                    targetVal = resolveSector(t.targetSectorId) || '';
                }
          } else {
              // Výroba
              sourceVal = resolveSector(t.pickedFromSectorId) || '';
              targetVal = t.workplace || '';
          }

          return {
              'ID Transakcie': t.id,
              'Dátum': new Date(t.completedAt || t.createdAt || 0).toLocaleDateString('sk-SK'),
              'Čas': new Date(t.completedAt || t.createdAt || 0).toLocaleTimeString('sk-SK'),
              'Operátor': resolveName(t.completedBy || t.createdBy),
              'Číslo dielu': t.partNumber,
              'Množstvo': t.quantity,
              'Jednotka': t.quantityUnit,
              'Odkiaľ (Zdroj)': sourceVal,
              'Kam (Cieľ)': targetVal,
              'Typ operácie': t.isLogistics ? 'LOGISTIKA' : 'VÝROBA',
              'Operácia/Pracovisko': t.workplace,
              'Status': t.auditResult ? `AUDIT ${t.auditResult}` : (t.isMissing ? 'CHÝBA' : 'OK')
          };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TRANSAKCIE_LOG");
      XLSX.writeFile(wb, `LOG_EXPORT_${dateFrom}_${timeFrom.replace(':','')}-${timeTo.replace(':','')}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in px-2 md:px-0">
        
        {/* CONTROL PANEL */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-4 gap-4">
                <h2 className="text-xl font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    TRANSAKCIE (LOG)
                </h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleExport} className="flex-1 md:flex-none bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg border border-green-500 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        EXPORT RAW DATA
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Dátum Od</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 outline-none" />
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Dátum Do</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 outline-none" />
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Časové Okno (Zmena)</label>
                    <div className="flex gap-1">
                        <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs focus:border-cyan-500 outline-none text-center" />
                        <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs focus:border-cyan-500 outline-none text-center" />
                    </div>
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Užívateľ</label>
                    <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 outline-none">
                        <option value="">VŠETCI</option>
                        {users.map(u => <option key={u.username} value={u.username}>{u.nickname || u.username}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hľadať (Part No)</label>
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 outline-none uppercase font-mono" />
                </div>
            </div>
        </div>

        {/* DATA GRID */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <p className="text-cyan-500 font-black animate-pulse uppercase tracking-widest">Načítavam archívy...</p>
                </div>
            ) : (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em] sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-32">DÁTUM & ČAS</th>
                                <th className="p-4 w-32">UŽÍVATEĽ</th>
                                <th className="p-4 w-40">DIEL (PART)</th>
                                <th className="p-4 w-24 text-right">POČET</th>
                                <th className="p-4 w-48">POHYB (ODKIAĽ → KAM)</th>
                                <th className="p-4 w-32">STATUS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-xs font-mono text-slate-300">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map(item => {
                                    // Rozlíšenie smeru pohybu pre zobrazenie
                                    let fromStr = '';
                                    let toStr = '';
                                    if (item.isLogistics) {
                                        const op = (item.workplace || '').toUpperCase();
                                        if (op.includes('VYKL') || op.includes('UNLOAD')) {
                                            fromStr = item.note || 'EXT'; toStr = resolveSector(item.targetSectorId) || 'PRÍJEM';
                                        } else if (op.includes('NAKL') || op.includes('LOAD')) {
                                            fromStr = resolveSector(item.sourceSectorId) || 'SKLAD'; toStr = item.note || 'EXT';
                                        } else {
                                            fromStr = resolveSector(item.sourceSectorId) || '?'; toStr = resolveSector(item.targetSectorId) || '?';
                                        }
                                    } else {
                                        fromStr = resolveSector(item.pickedFromSectorId) || 'SKLAD';
                                        toStr = item.workplace || 'VÝROBA';
                                    }

                                    const ts = item.completedAt || item.createdAt || 0;
                                    return (
                                        <tr key={item.id} className="hover:bg-cyan-900/10 transition-colors">
                                            <td className="p-4 border-r border-slate-800/50">
                                                <div className="font-bold text-slate-200">{new Date(ts).toLocaleDateString('sk-SK')}</div>
                                                <div className="text-[10px] text-slate-500">{new Date(ts).toLocaleTimeString('sk-SK')}</div>
                                            </td>
                                            <td className="p-4 border-r border-slate-800/50 font-bold text-cyan-400">
                                                {resolveName(item.completedBy || item.createdBy)}
                                            </td>
                                            <td className="p-4 border-r border-slate-800/50">
                                                <span className="bg-slate-800 px-2 py-1 rounded text-white font-bold">{item.partNumber}</span>
                                            </td>
                                            <td className="p-4 text-right border-r border-slate-800/50">
                                                <span className="font-black text-white">{item.quantity}</span> <span className="text-[10px] text-slate-500">{item.quantityUnit}</span>
                                            </td>
                                            <td className="p-4 border-r border-slate-800/50">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 truncate max-w-[80px]" title={fromStr}>{fromStr}</span>
                                                    <span className="text-cyan-600">→</span>
                                                    <span className="text-white font-bold truncate max-w-[100px]" title={toStr}>{toStr}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {item.auditResult === 'NOK' ? (
                                                    <span className="text-red-500 font-black bg-red-500/10 px-2 py-1 rounded">AUDIT NOK</span>
                                                ) : item.isMissing ? (
                                                    <span className="text-orange-500 font-black">CHÝBA</span>
                                                ) : (
                                                    <span className="text-green-500 font-black text-[10px]">OK</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-600 italic font-bold uppercase tracking-widest">
                                        Žiadne záznamy pre zadaný filter
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        
        <div className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Zobrazených {filteredLogs.length} záznamov
        </div>
    </div>
  );
};

export default TransactionLogTab;
