import React, { useState } from 'react';
import { Task, SystemBreak } from '../../../types/appTypes';

declare var XLSX: any;

interface AnalyticsExportPanelProps {
  canExport: boolean;
  tasks: Task[];
  systemBreaks: SystemBreak[];
  resolveName: (username?: string | null) => string;
  t: (key: any) => string;
  language: string;
}

const AnalyticsExportPanel: React.FC<AnalyticsExportPanelProps> = ({ canExport, tasks, systemBreaks, resolveName, t, language }) => {
  const [archiveExportStart, setArchiveExportStart] = useState('');
  const [archiveExportEnd, setArchiveExportEnd] = useState('');
  const [isExportingArchive, setIsExportingArchive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleDateString('sk-SK') : '';
  const formatTime = (ts?: number) => ts ? new Date(ts).toLocaleTimeString('sk-SK') : '';

  const handleAdminArchiveExport = async () => {
    if (!archiveExportStart || !archiveExportEnd) {
      alert(language === 'sk' ? 'Vyberte rozsah dátumov.' : 'Select date range.');
      return;
    }
    setIsExportingArchive(true);
    const startTs = new Date(archiveExportStart).getTime();
    const endTs = new Date(archiveExportEnd).getTime() + 86399999;
    const exportTasks = tasks.filter(t => t.createdAt && t.createdAt >= startTs && t.createdAt <= endTs);

    if (exportTasks.length === 0) {
      alert(t('no_data'));
      setIsExportingArchive(false);
      return;
    }

    const excelData = exportTasks.map(item => ({
      'Dátum pridania': formatDate(item.createdAt),
      'Čas pridania': formatTime(item.createdAt),
      'Kto pridal': resolveName(item.createdBy),
      'Diel': item.partNumber || '',
      'Pracovisko': item.workplace || '',
      'Počet': item.quantity || '',
      'Jednotka': item.quantityUnit || '',
      'Skladník': resolveName(item.completedBy),
      'Dátum dokončenia': formatDate(item.completedAt),
      'Čas dokončenia': formatTime(item.completedAt),
      'Status': item.isDone ? 'Dokončené' : 'Otvorené',
      'Priorita': item.priority || 'NORMAL'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EXPORT_DATA");
    XLSX.writeFile(wb, `Export_${archiveExportStart}_to_${archiveExportEnd}.xlsx`);
    setIsExportingArchive(false);
  };

  if (!canExport) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden mb-8 flex flex-col">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-6 bg-sky-900/40 hover:bg-sky-900/60 transition-colors border-b border-sky-800/50">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          EXPORTOVANIE DÁT
        </h3>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>
      {isOpen && (
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="date" value={archiveExportStart} onChange={e => setArchiveExportStart(e.target.value)} className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 text-white" />
            <input type="date" value={archiveExportEnd} onChange={e => setArchiveExportEnd(e.target.value)} className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 text-white" />
          </div>
          <button onClick={handleAdminArchiveExport} disabled={isExportingArchive} className="w-full h-14 bg-teal-600 hover:bg-teal-500 text-white font-black uppercase rounded-xl shadow-lg border-2 border-teal-500">
            {isExportingArchive ? '...' : 'STIAHNUŤ REPORT (.xlsx)'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalyticsExportPanel;