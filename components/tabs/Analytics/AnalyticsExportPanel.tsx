
import React, { useState } from 'react';
import { Task, SystemBreak } from '../../../App';

declare var XLSX: any;

interface AnalyticsExportPanelProps {
  canExport: boolean;
  tasks: Task[];
  systemBreaks: SystemBreak[];
  resolveName: (username?: string | null) => string;
  t: (key: any) => string;
  language: string;
}

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const AnalyticsExportPanel: React.FC<AnalyticsExportPanelProps> = ({ canExport, tasks, systemBreaks, resolveName, t, language }) => {
  const [archiveExportStart, setArchiveExportStart] = useState('');
  const [archiveExportEnd, setArchiveExportEnd] = useState('');
  const [isExportingArchive, setIsExportingArchive] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const formatTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDateTime = (ts?: number) => ts ? `${formatDate(ts)} ${formatTime(ts)}` : '';

  const calculateBlockedTime = (history: any[] | undefined, startTime: number, endTime: number): number => {
    let totalBlocked = 0;
    if (history && history.length > 0) {
      history.forEach(session => {
        const overlapStart = Math.max(startTime, session.start);
        const overlapEnd = Math.min(endTime, session.end || endTime);
        if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
      });
    }
    systemBreaks.forEach(br => {
      const overlapStart = Math.max(startTime, br.start);
      const overlapEnd = Math.min(endTime, br.end || endTime);
      if (overlapEnd > overlapStart) totalBlocked += (overlapEnd - overlapStart);
    });
    return totalBlocked;
  };

  const handleAdminArchiveExport = async () => {
    if (!archiveExportStart || !archiveExportEnd) {
      alert(language === 'sk' ? 'Vyberte rozsah dátumov.' : 'Select date range.');
      return;
    }
    if (typeof XLSX === 'undefined') {
      alert('Knižnica XLSX nie je načítaná.');
      return;
    }

    setIsExportingArchive(true);
    setExportProgress(language === 'sk' ? 'Filtrujem dáta...' : 'Filtering data...');

    const startTs = new Date(archiveExportStart).getTime();
    const endTs = new Date(archiveExportEnd).getTime() + 86399999;
    const exportTasks = tasks.filter(t => t.createdAt && t.createdAt >= startTs && t.createdAt <= endTs);

    if (exportTasks.length === 0) {
      alert(t('no_data'));
      setIsExportingArchive(false);
      return;
    }

    const workerSummary: Record<string, any> = {};
    exportTasks.forEach(task => {
        if (!task.completedBy || !task.isDone) return;
        const worker = task.completedBy;
        if (!workerSummary[worker]) {
            workerSummary[worker] = { execMs: 0, stdMin: 0, reactMs: 0, reactCount: 0, missing: 0, errors: 0, days: new Set() };
        }
        const s = workerSummary[worker];
        s.days.add(new Date(task.completedAt!).toLocaleDateString('sk-SK'));
        if (task.startedAt && task.completedAt) {
            let exec = task.completedAt - task.startedAt;
            exec -= calculateBlockedTime(task.inventoryHistory, task.startedAt, task.completedAt);
            if (exec > 0) s.execMs += exec;
            s.stdMin += (task.standardTime || 0);
        }
        if (task.createdAt && task.startedAt) {
            const r = task.startedAt - task.createdAt;
            if (r > 0) { s.reactMs += r; s.reactCount++; }
        }
        if (task.isMissing) {
            s.missing++;
            if (task.auditResult === 'NOK') s.errors++;
        }
    });

    const workerScores: Record<string, string> = {};
    Object.entries(workerSummary).forEach(([worker, s]: [string, any]) => {
        const numDays = Math.max(s.days.size, 1);
        const util = ((s.execMs / 60000 * 1.15) / (numDays * 450)) * 100;
        const perf = s.stdMin > 0 ? (s.stdMin / (s.execMs / 60000)) * 100 : 0;
        const react = s.reactCount > 0 ? (s.reactMs / s.reactCount) / 1000 : 0;
        const confidence = s.missing > 0 ? ((s.missing - s.errors) / s.missing) * 100 : 100;

        const score = (confidence / 100 * 3.5) + (Math.min(util, 100) / 100 * 3.0) + 
                      (perf > 0 ? (Math.min(perf, 120) / 120 * 2.5) : 2.0) + 
                      (react > 0 ? (react < 60 ? 1.0 : react < 180 ? 0.5 : 0) : 0.5);
        workerScores[worker] = score.toFixed(1);
    });

    const excelData = exportTasks.map(item => {
      let searchResult = item.searchedBy ? (item.searchExhausted || item.auditResult ? 'Nie' : (item.isMissing === false ? 'Áno' : 'Prebieha')) : '';
      let statusText = item.status === 'incorrectly_entered' ? 'Chybne zadané' : (item.auditResult ? 'Auditované' : (item.isDone ? 'Dokončené' : 'Otvorené'));
      const isLogi = (item.isLogistics === true) || (!item.isProduction && !item.workplace && !!item.partNumber);

      return {
        'Dátum pridania': formatDate(item.createdAt),
        'Čas pridania': formatTime(item.createdAt),
        'Kto pridal': resolveName(item.createdBy),
        'Diel / Referencia': item.partNumber || '',
        'Pracovisko / Operácia': item.workplace || '',
        'SPZ / Prepravca': isLogi ? (item.note || '') : '',
        'Počet': item.quantity || '',
        'Jednotka': item.quantityUnit || '',
        'Poznámka': !isLogi ? (item.note || '') : '',
        'Skladník': resolveName(item.completedBy),
        'Index Skladníka': item.completedBy ? (workerScores[item.completedBy] || '0.0') : '',
        'Dátum dokončenia': formatDate(item.completedAt),
        'Čas dokončenia': formatTime(item.completedAt),
        'Status': statusText,
        'Nahlásil chýbajúce': resolveName(item.missingReportedBy),
        'Dôvod chýbania': item.missingReason || '',
        'Čas nahlásenia chyby': item.missingReportedBy ? formatTime(item.completedAt || item.createdAt) : '',
        'Kto hľadal': item.searchedBy || '',
        'Výsledok hľadania': searchResult,
        'Audit (Výsledok)': item.auditResult || '',
        'Poznámka k auditu': item.auditNote || '',
        'Audit vykonal': resolveName(item.auditedBy) || item.auditBy || '',
        'Dátum a čas auditu': formatDateTime(item.auditedAt ?? undefined)
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 25 },
      { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, 
      { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, 
      { wch: 35 }, { wch: 20 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ARCHIV_EXPORT");
    XLSX.writeFile(wb, `Export_Archiv_${archiveExportStart}_to_${archiveExportEnd}.xlsx`);
    setIsExportingArchive(false);
    setExportProgress('');
  };

  if (!canExport) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-fade-in mb-8 flex flex-col">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-sky-900/40 hover:bg-sky-900/60 transition-colors border-b border-sky-800/50"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 rounded-xl">
            <DownloadIcon className="w-6 h-6 text-sky-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">EXPORT PANEL</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Kompletný report vo formáte Excel (.xlsx)</p>
          </div>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="p-8 space-y-8 max-h-[500px] overflow-y-auto custom-scrollbar animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">Dátum od:</label>
              <input 
                type="date" 
                value={archiveExportStart} 
                onChange={e => setArchiveExportStart(e.target.value)} 
                className="w-full h-14 bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 text-lg font-black font-mono text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all uppercase"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">Dátum do:</label>
              <input 
                type="date" 
                value={archiveExportEnd} 
                onChange={e => setArchiveExportEnd(e.target.value)} 
                className="w-full h-14 bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 text-lg font-black font-mono text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all uppercase"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleAdminArchiveExport} 
              disabled={isExportingArchive} 
              className={`w-full h-16 rounded-2xl font-black uppercase text-sm tracking-[0.25em] transition-all shadow-xl active:scale-[0.98] border-2 disabled:opacity-50 disabled:grayscale ${
                isExportingArchive 
                ? 'bg-slate-800 border-slate-700 text-slate-500 animate-pulse' 
                : 'bg-gradient-to-r from-teal-600 to-blue-700 hover:from-teal-500 hover:to-blue-600 text-white border-white/10 shadow-teal-500/10'
              }`}
            >
              {isExportingArchive ? 'PRIPRAVUJEM EXCEL...' : 'GENEROVAŤ REPORT (.xlsx)'}
            </button>
            
            {exportProgress && (
              <div className="text-center">
                <span className="text-[10px] font-mono font-bold text-amber-500 animate-pulse uppercase tracking-[0.2em]">
                  {exportProgress}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsExportPanel;
