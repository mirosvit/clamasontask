
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
  
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [timeFrom, setTimeFrom] = useState('06:00');
  const [timeTo, setTimeTo] = useState('18:00');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [historicalData, setHistoricalData] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      const today = new Date().toISOString().split('T')[0];
      if (dateFrom === today && dateTo === today) { setHistoricalData([]); return; }
      setIsLoading(true);
      try {
        const sanons = await fetchSanons();
        const relevantTasks: Task[] = [];
        sanons.forEach(sanon => { if (sanon.tasks && Array.isArray(sanon.tasks)) { relevantTasks.push(...sanon.tasks); } });
        setHistoricalData(relevantTasks);
      } catch (e) { console.error("Failed to load archive for logs", e); }
      finally { setIsLoading(false); }
    };
    loadHistory();
  }, [dateFrom, dateTo, fetchSanons]);

  const resolveSector = (sectorId?: string) => {
      if (!sectorId) return '';
      const s = mapSectors.find(x => x.id === sectorId);
      return s ? s.name : sectorId;
  };

  const filteredLogs = useMemo(() => {
    const startTs = new Date(dateFrom).setHours(0,0,0,0);
    const endTs = new Date(dateTo).setHours(23,59,59,999);
    const allSource = [...tasks, ...draftTasks, ...historicalData];
    const unique = new Map();
    allSource.forEach(t => unique.set(t.id, t));
    const combined = Array.from(unique.values());

    return combined.filter(task => {
        if (!task.isDone) return false;
        const taskTime = task.completedAt || task.createdAt || 0;
        if (taskTime < startTs || taskTime > endTs) return false;
        const dateObj = new Date(taskTime);
        const taskHHMM = dateObj.getHours().toString().padStart(2, '0') + ':' + dateObj.getMinutes().toString().padStart(2, '0');
        if (taskHHMM < timeFrom || taskHHMM > timeTo) return false;
        if (selectedUser && task.completedBy !== selectedUser && task.createdBy !== selectedUser) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const content = `${task.partNumber} ${task.workplace} ${task.note} ${resolveName(task.completedBy)}`.toLowerCase();
            if (!content.includes(q)) return false;
        }
        return true;
    }).sort((a,b) => (b.completedAt || b.createdAt || 0) - (a.completedAt || a.createdAt || 0));
  }, [tasks, draftTasks, historicalData, dateFrom, dateTo, timeFrom, timeTo, selectedUser, searchQuery, resolveName]);

  const handleExport = () => {
      if (filteredLogs.length === 0) { alert('No data to export.'); return; }
      const exportData = filteredLogs.map(t => {
          let sourceVal = ''; let targetVal = '';
          if (t.isLogistics) {
                const op = (t.workplace || '').toUpperCase();
                const isUnloading = op.includes('VYKL') || op.includes('UNLOAD') || op.includes('PRÍJEM');
                const isLoading = op.includes('NAKL') || op.includes('LOAD') || op.includes('EXPED');
                if (isUnloading) { sourceVal = t.note || 'EXT'; targetVal = resolveSector(t.targetSectorId) || 'PRÍJEM'; } 
                else if (isLoading) { sourceVal = resolveSector(t.sourceSectorId) || 'SKLAD'; targetVal = t.note || 'EXT'; } 
                else { sourceVal = resolveSector(t.sourceSectorId) || '?'; targetVal = resolveSector(t.targetSectorId) || '?'; }
          } else { sourceVal = resolveSector(t.pickedFromSectorId) || 'SKLAD'; targetVal = t.workplace || 'VÝROBA'; }
          return {
              'ID': t.id,
              'Date': new Date(t.completedAt || t.createdAt || 0).toLocaleDateString('sk-SK'),
              'Time': new Date(t.completedAt || t.createdAt || 0).toLocaleTimeString('sk-SK'),
              'Operator': resolveName(t.completedBy || t.createdBy),
              'Part': t.partNumber,
              'Qty': t.quantity,
              'Unit': t.quantityUnit,
              'Source': sourceVal,
              'Target': targetVal,
              'Type': t.isLogistics ? 'LOGISTICS' : 'PRODUCTION',
              'Operation': t.workplace,
              'Status': t.auditResult ? `AUDIT ${t.auditResult}` : (t.isMissing ? 'MISSING' : 'OK')
          };
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TRANSACTIONS_LOG");
      XLSX.writeFile(wb, `LOG_EXPORT_${dateFrom}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in px-2 md:px-0">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-4 gap-4">
                <h2 className="text-xl font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    {t('tab_logs')}
                </h2>
                <button onClick={handleExport} className="bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg border border-green-500 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    EXPORT RAW DATA
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{language === 'sk' ? 'Dátum Od' : 'Date From'}</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500" /></div>
                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{language === 'sk' ? 'Dátum Do' : 'Date To'}</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500" /></div>
                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{language === 'sk' ? 'Časové Okno' : 'Time Window'}</label><div className="flex gap-1"><input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white text-center" /><input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white text-center" /></div></div>
                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('username')}</label><select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500"><option value="">VŠETCI</option>{users.map(u => <option key={u.username} value={u.username}>{u.nickname || u.username}</option>)}</select></div>
                <div><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{language === 'sk' ? 'Hľadať (Part No)' : 'Search (Part No)'}</label><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none uppercase font-mono" /></div>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
            {isLoading ? (
                <div className="flex items-center justify-center h-64"><p className="text-cyan-500 font-black animate-pulse uppercase tracking-widest">{language === 'sk' ? 'Načítavam archívy...' : 'Loading archives...'}</p></div>
            ) : (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em] sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-32">{t('log_th_datetime')}</th>
                                <th className="p-4 w-32">{t('log_th_user')}</th>
                                <th className="p-4 w-40">{t('log_th_part')}</th>
                                <th className="p-4 w-24 text-right">{t('log_th_qty')}</th>
                                <th className="p-4 w-48">{t('log_th_movement')}</th>
                                <th className="p-4 w-32">{t('log_th_status_col')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-xs font-mono text-slate-300">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map(item => {
                                    let fromStr = ''; let toStr = '';
                                    if (item.isLogistics) {
                                        const op = (item.workplace || '').toUpperCase();
                                        if (op.includes('VYKL') || op.includes('UNLOAD')) { fromStr = item.note || 'EXT'; toStr = resolveSector(item.targetSectorId) || 'PRÍJEM'; } 
                                        else if (op.includes('NAKL') || op.includes('LOAD')) { fromStr = resolveSector(item.sourceSectorId) || 'SKLAD'; toStr = item.note || 'EXT'; } 
                                        else { fromStr = resolveSector(item.sourceSectorId) || '?'; toStr = resolveSector(item.targetSectorId) || '?'; }
                                    } else { fromStr = resolveSector(item.pickedFromSectorId) || 'SKLAD'; toStr = item.workplace || 'VÝROBA'; }
                                    const ts = item.completedAt || item.createdAt || 0;
                                    return (
                                        <tr key={item.id} className="hover:bg-cyan-900/10 transition-colors">
                                            <td className="p-4 border-r border-slate-800/50"><div className="font-bold text-slate-200">{new Date(ts).toLocaleDateString('sk-SK')}</div><div className="text-[10px] text-slate-500">{new Date(ts).toLocaleTimeString('sk-SK')}</div></td>
                                            <td className="p-4 border-r border-slate-800/50 font-bold text-cyan-400">{resolveName(item.completedBy || item.createdBy)}</td>
                                            <td className="p-4 border-r border-slate-800/50"><span className="bg-slate-800 px-2 py-1 rounded text-white font-bold">{item.partNumber}</span></td>
                                            <td className="p-4 text-right border-r border-slate-800/50"><span className="font-black text-white">{item.quantity}</span> <span className="text-[10px] text-slate-500">{item.quantityUnit}</span></td>
                                            <td className="p-4 border-r border-slate-800/50"><div className="flex items-center gap-2"><span className="text-slate-400 truncate max-w-[80px]">{fromStr}</span><span className="text-cyan-600">→</span><span className="text-white font-bold truncate max-w-[100px]">{toStr}</span></div></td>
                                            <td className="p-4 text-center">{item.auditResult === 'NOK' ? <span className="text-red-500 font-black bg-red-500/10 px-2 py-1 rounded">AUDIT NOK</span> : item.isMissing ? <span className="text-orange-500 font-black">MISSING</span> : <span className="text-green-500 font-black text-[10px]">OK</span>}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-600 italic font-bold uppercase tracking-widest">{language === 'sk' ? 'Žiadne záznamy pre zadaný filter' : 'No records for selected filter'}</td></tr>
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
