import React, { useState, useMemo, useEffect } from 'react';
import { Task, UserData, MapSector } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

declare var XLSX: any;

interface TransactionLogTabProps {
  tasks: Task[];
  draftTasks: Task[];
  fetchSanons: () => Promise<any[]>;
  users: UserData[];
  mapSectors: MapSector[];
  resolveName: (username?: string | null) => string;
}

const TransactionLogTab: React.FC<TransactionLogTabProps> = ({ 
  tasks, draftTasks, fetchSanons, users, mapSectors, resolveName 
}) => {
  const { t, language } = useLanguage();
  
  // Oprava 1: Predvolené časové okno na celý deň (00:00 - 23:59)
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [historicalData, setHistoricalData] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedArchiveRange, setLoadedArchiveRange] = useState<string>('');

  // Načítanie histórie len ak je to potrebné
  useEffect(() => {
    const loadHistory = async () => {
      const today = new Date().toISOString().split('T')[0];
      // Ak pozeráme len dnešok, stačia nám live dáta a draft
      if (dateFrom === today && dateTo === today) return;
      
      // Ak už sme archív raz načítali, neťaháme ho znova (Quota Guard)
      if (historicalData.length > 0) return;

      setIsLoading(true);
      try {
        const sanons = await fetchSanons();
        const relevantTasks: Task[] = [];
        sanons.forEach(sanon => { 
            if (sanon.tasks && Array.isArray(sanon.tasks)) { 
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
  }, [dateFrom, dateTo, fetchSanons, historicalData.length]);

  const resolveSector = (sectorId?: string | null) => {
      if (!sectorId) return '';
      const s = mapSectors.find(x => x.id === sectorId);
      return s ? s.name : sectorId;
  };

  const filteredLogs = useMemo(() => {
    // Oprava 2: Robustné parsovanie dátumu v lokálnom čase
    const startTs = new Date(dateFrom + 'T00:00:00').getTime();
    const endTs = new Date(dateTo + 'T23:59:59').getTime();
    
    const allSource = [...tasks, ...draftTasks, ...historicalData];
    const unique = new Map();
    allSource.forEach(t => {
        if (t && t.id) unique.set(t.id, t);
    });
    const combined = Array.from(unique.values());

    return combined.filter(task => {
        // Logy zobrazujú len hotové veci
        if (!task.isDone) return false;

        const taskTime = task.completedAt || task.createdAt || 0;
        if (taskTime < startTs || taskTime > endTs) return false;

        // Kontrola časového okna (HH:mm)
        const dateObj = new Date(taskTime);
        const taskHHMM = dateObj.getHours().toString().padStart(2, '0') + ':' + 
                         dateObj.getMinutes().toString().padStart(2, '0');
        
        if (taskHHMM < timeFrom || taskHHMM > timeTo) return false;

        // Filter na užívateľa
        if (selectedUser && task.completedBy !== selectedUser && task.createdBy !== selectedUser) return false;

        // Fulltext search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const content = `${task.partNumber} ${task.workplace} ${task.note} ${resolveName(task.completedBy)}`.toLowerCase();
            if (!content.includes(q)) return false;
        }

        return true;
    }).sort((a,b) => (b.completedAt || b.createdAt || 0) - (a.completedAt || a.createdAt || 0));
  }, [tasks, draftTasks, historicalData, dateFrom, dateTo, timeFrom, timeTo, selectedUser, searchQuery, resolveName, mapSectors]);

  const getMovementInfo = (item: Task) => {
      let fromStr = '';
      let toStr = '';

      if (item.isLogistics) {
          const op = (item.workplace || '').toUpperCase();
          // Rozšírená heuristika pre Inbound/Outbound
          const isInbound = op.includes('VYKL') || op.includes('UNLOAD') || op.includes('PRÍJEM') || op.includes('INBOUND');
          const isOutbound = op.includes('NAKL') || op.includes('LOAD') || op.includes('EXPED') || op.includes('OUTBOUND');

          if (isInbound) {
              fromStr = item.note || item.plate || 'EXTERN';
              toStr = resolveSector(item.targetSectorId) || 'PRÍJEM';
          } else if (isOutbound) {
              fromStr = resolveSector(item.sourceSectorId) || 'SKLAD';
              toStr = item.note || item.plate || 'EXPEDÍCIA';
          } else {
              // Interný presun
              fromStr = resolveSector(item.sourceSectorId) || '?';
              toStr = resolveSector(item.targetSectorId) || '?';
          }
      } else {
          // Výroba
          fromStr = resolveSector(item.pickedFromSectorId) || 'SKLAD';
          toStr = item.workplace || 'VÝROBA';
      }

      return { fromStr, toStr };
  };

  const handleExport = () => {
      if (filteredLogs.length === 0) {
          alert(language === 'sk' ? 'Žiadne dáta na export.' : 'No data to export.');
          return;
      }
      const exportData = filteredLogs.map(t => {
          const { fromStr, toStr } = getMovementInfo(t);
          return {
              'Dátum': new Date(t.completedAt || t.createdAt || 0).toLocaleDateString('sk-SK'),
              'Čas': new Date(t.completedAt || t.createdAt || 0).toLocaleTimeString('sk-SK'),
              'Operátor': resolveName(t.completedBy || t.createdBy),
              'Diel / Ref': t.partNumber,
              'Množstvo': t.quantity,
              'Jednotka': t.quantityUnit,
              'Zdroj (Odkiaľ)': fromStr,
              'Cieľ (Kam)': toStr,
              'Typ': t.isLogistics ? 'LOGISTIKA' : 'VÝROBA',
              'Operácia': t.workplace,
              'Poznámka': t.note || '',
              'Status': t.auditResult ? `AUDIT ${t.auditResult}` : (t.isMissing ? 'CHÝBAL' : 'OK')
          };
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "LOG_DATA");
      XLSX.writeFile(wb, `LOG_EXPORT_${dateFrom}_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in px-2 md:px-0">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">{t('tab_logs')}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Audit trail všetkých dokončených úloh</p>
                    </div>
                </div>
                <button onClick={handleExport} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg border-b-4 border-emerald-800 flex items-center justify-center gap-2 active:scale-95">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    EXPORT DO EXCELU
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Dátum Od</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500" />
                </div>
                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Dátum Do</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500" />
                </div>
                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Časové Okno</label>
                    <div className="flex gap-1">
                        <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white text-center font-mono" />
                        <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white text-center font-mono" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('username')}</label>
                    <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none uppercase font-bold">
                        <option value="">VŠETCI</option>
                        {users.map(u => <option key={u.username} value={u.username}>{u.nickname || u.username}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Hľadať (Part No)</label>
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none uppercase font-mono" />
                </div>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
            {isLoading ? (
                <div className="flex-grow flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-cyan-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">Načítavam archívy...</p>
                </div>
            ) : (
                <div className="overflow-x-auto custom-scrollbar flex-grow">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em] sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-32">DÁTUM / ČAS</th>
                                <th className="p-4 w-32">OPERÁTOR</th>
                                <th className="p-4 w-40">POLOŽKA</th>
                                <th className="p-4 w-24 text-right">MNOŽSTVO</th>
                                <th className="p-4 w-48">POHYB (ODKIAĽ → KAM)</th>
                                <th className="p-4 w-32 text-center">VÝSLEDOK</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-xs font-mono text-slate-300">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map(item => {
                                    const { fromStr, toStr } = getMovementInfo(item);
                                    const ts = item.completedAt || item.createdAt || 0;
                                    const isAuditFail = item.auditResult === 'NOK';
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-4 border-r border-slate-800/50">
                                                <div className="font-bold text-slate-200">{new Date(ts).toLocaleDateString('sk-SK')}</div>
                                                <div className="text-[10px] text-slate-500">{new Date(ts).toLocaleTimeString('sk-SK')}</div>
                                            </td>
                                            <td className="p-4 border-r border-slate-800/50">
                                                <div className="font-black text-cyan-400 uppercase">{resolveName(item.completedBy || item.createdBy)}</div>
                                                <div className="text-[8px] text-slate-600 uppercase">Zadal: {resolveName(item.createdBy)}</div>
                                            </td>
                                            <td className="p-4 border-r border-slate-800/50">
                                                <div className="bg-slate-800 px-2 py-1.5 rounded-lg text-white font-black inline-block tracking-tight">{item.partNumber}</div>
                                                {item.note && <div className="text-[9px] text-amber-500 mt-1 truncate max-w-[150px] font-bold uppercase italic">"{item.note}"</div>}
                                            </td>
                                            <td className="p-4 text-right border-r border-slate-800/50">
                                                <div className="font-black text-white text-lg">{item.quantity}</div>
                                                <div className="text-[9px] text-slate-500 uppercase">{item.quantityUnit}</div>
                                            </td>
                                            <td className="p-4 border-r border-slate-800/50">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-500 text-[9px] uppercase font-bold w-10">Zdroj:</span>
                                                        <span className="text-slate-300 font-bold truncate">{fromStr}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-cyan-600 text-[9px] uppercase font-bold w-10">Cieľ:</span>
                                                        <span className="text-white font-black truncate">{toStr}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {isAuditFail ? (
                                                    <span className="text-red-500 font-black bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 text-[9px] tracking-tighter">AUDIT NOK</span>
                                                ) : item.auditResult === 'OK' ? (
                                                    <span className="text-emerald-500 font-black bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 text-[9px] tracking-tighter">AUDIT OK</span>
                                                ) : item.isMissing ? (
                                                    <span className="text-orange-500 font-black text-[9px] border-b border-orange-500/30">CHÝBAL</span>
                                                ) : (
                                                    <span className="text-slate-600 font-black text-[9px] opacity-40">ŠTANDARD</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-32 text-center text-slate-700 uppercase font-black tracking-[0.4em] text-xs">
                                        Nenašli sa žiadne dokončené úlohy pre tento filter
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
  );
};

export default TransactionLogTab;