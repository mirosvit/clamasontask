
import React, { useState } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  writeBatch,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';
import { MapSector } from '../../types/appTypes';

declare var XLSX: any;

interface YearlyClosingProps {
  resolveName: (username?: string | null) => string;
  fetchSanons: () => Promise<any[]>;
  mapSectors: MapSector[];
}

const YearlyClosing: React.FC<YearlyClosingProps> = ({ resolveName, fetchSanons, mapSectors }) => {
  const { t, language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasExported, setHasExported] = useState(false);
  const [progress, setProgress] = useState('');

  const formatDate = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (ts?: number) => {
    if (!ts) return '';
    return `${formatDate(ts)} ${formatTime(ts)}`;
  };

  const resolveSectorName = (sectorId?: string) => {
      if (!sectorId) return '';
      const sector = mapSectors.find(s => s.id === sectorId);
      return sector ? sector.name : sectorId;
  };

  const fetchYearlyData = async () => {
    setIsExporting(true);
    setProgress(t('yearly_prep_download'));
    
    const allTasks: any[] = [];
    const currentYear = new Date().getFullYear();
    
    try {
      setProgress(t('yearly_fetch_live'));
      const snapTasks = await getDocs(collection(db, 'tasks'));
      snapTasks.forEach(d => allTasks.push({ id: d.id, ...d.data() }));

      setProgress(t('yearly_fetch_draft'));
      const draftSnap = await getDoc(doc(db, 'settings', 'draft'));
      if (draftSnap.exists()) {
          (draftSnap.data().data || []).forEach((t: any) => allTasks.push(t));
      }

      setProgress(t('yearly_fetch_weekly'));
      const sanons = await fetchSanons();
      
      sanons.forEach(sanon => {
          if (sanon.tasks && Array.isArray(sanon.tasks)) {
              allTasks.push(...sanon.tasks);
          }
      });

      if (allTasks.length === 0) {
        alert(t('yearly_no_data'));
        setIsExporting(false);
        return;
      }

      const excelData = allTasks.map(item => {
        let searchResult = '';
        if (item.searchedBy) {
          if (item.searchExhausted || item.auditResult) {
            searchResult = language === 'sk' ? 'Nie' : 'No';
          } else if (item.isMissing === false) {
            searchResult = language === 'sk' ? 'Áno' : 'Yes';
          } else {
            searchResult = language === 'sk' ? 'Prebieha' : 'In progress';
          }
        }

        let statusText = language === 'sk' ? 'Otvorené' : 'Open';
        if (item.status === 'incorrectly_entered') {
            statusText = language === 'sk' ? 'Chybne zadané' : 'Incorrectly entered';
        } else if (item.auditResult) {
            statusText = language === 'sk' ? 'Auditované' : 'Audited';
        } else if (item.isDone) {
            statusText = language === 'sk' ? 'Dokončené' : 'Completed';
        }

        let sourceVal = '';
        let targetVal = '';

        if (item.isLogistics) {
            const op = (item.workplace || '').toUpperCase();
            const isUnloading = op.includes('VYKL') || op.includes('UNLOAD') || op.includes('PRÍJEM') || op.includes('INBOUND');
            const isLoading = op.includes('NAKL') || op.includes('LOAD') || op.includes('EXPED') || op.includes('OUTBOUND');

            if (isUnloading) {
                 sourceVal = item.note || (language === 'sk' ? 'EXTERNY ZDROJ' : 'EXTERNAL SOURCE');
                 targetVal = resolveSectorName(item.targetSectorId) || (language === 'sk' ? 'PRÍJEM' : 'RECEIVING');
            } else if (isLoading) {
                 sourceVal = resolveSectorName(item.sourceSectorId) || (language === 'sk' ? 'SKLAD' : 'WAREHOUSE');
                 targetVal = item.note || (language === 'sk' ? 'EXTERNY CIEĽ' : 'EXTERNAL TARGET');
            } else {
                 sourceVal = resolveSectorName(item.sourceSectorId) || '';
                 targetVal = resolveSectorName(item.targetSectorId) || '';
            }
        } else {
            sourceVal = resolveSectorName(item.pickedFromSectorId) || '';
            targetVal = item.workplace || '';
        }

        return {
          [language === 'sk' ? 'Dátum pridania' : 'Added Date']: formatDate(item.createdAt),
          [language === 'sk' ? 'Čas pridania' : 'Added Time']: formatTime(item.createdAt),
          [language === 'sk' ? 'Kto pridal' : 'Created By']: resolveName(item.createdBy),
          [language === 'sk' ? 'Diel / Referencia' : 'Part / Ref']: item.partNumber || '',
          [language === 'sk' ? 'Pracovisko / Operácia' : 'Workplace / Op']: item.workplace || '',
          [language === 'sk' ? 'SPZ / Prepravca' : 'Plate / Carrier']: item.isLogistics ? (item.note || '') : '',
          [language === 'sk' ? 'Počet' : 'Quantity']: item.quantity || '',
          [language === 'sk' ? 'Jednotka' : 'Unit']: item.quantityUnit || '',
          [language === 'sk' ? 'Poznámka' : 'Note']: !item.isLogistics ? (item.note || '') : '',
          [language === 'sk' ? 'Skladník' : 'Picker']: resolveName(item.completedBy),
          [language === 'sk' ? 'Dátum dokončenia' : 'Done Date']: formatDate(item.completedAt),
          [language === 'sk' ? 'Čas dokončenia' : 'Done Time']: formatTime(item.completedAt),
          'Status': statusText,
          [language === 'sk' ? 'Nahlásil chýbajúce' : 'Reported Missing By']: resolveName(item.missingReportedBy),
          [language === 'sk' ? 'Dôvod chýbania' : 'Missing Reason']: item.missingReason || '',
          [language === 'sk' ? 'Čas nahlásenia chyby' : 'Report Time']: item.missingReportedBy ? formatTime(item.completedAt || item.createdAt) : '',
          [language === 'sk' ? 'Kto hľadal' : 'Searched By']: item.searchedBy || '',
          [language === 'sk' ? 'Výsledok hľadania' : 'Search Result']: searchResult,
          [language === 'sk' ? 'Audit (Výsledok)' : 'Audit Result']: item.auditResult || '',
          [language === 'sk' ? 'Poznámka k auditu' : 'Audit Note']: item.auditNote || '',
          [language === 'sk' ? 'Audit vykonal' : 'Audited By']: resolveName(item.auditedBy) || item.auditBy || '',
          [language === 'sk' ? 'Dátum a čas auditu' : 'Audit Datetime']: formatDateTime(item.auditedAt ?? undefined),
          [language === 'sk' ? 'Odkiaľ (Zdroj)' : 'From (Source)']: sourceVal,
          [language === 'sk' ? 'Kam (Cieľ)' : 'To (Target)']: targetVal
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wscols = Array(24).fill({wch: 20});
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "YEARLY_CLOSING");
      XLSX.writeFile(wb, `COMPLETE_ARCHIVE_${currentYear}_${new Date().getTime()}.xlsx`);
      
      setHasExported(true);
      setProgress(t('yearly_export_success'));
    } catch (error) {
      console.error(error);
      alert('Error during export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = async () => {
    if (!hasExported) return;
    
    if (!window.confirm(t('yearly_reset_warning_1'))) return;
    if (!window.confirm(t('yearly_reset_warning_2'))) return;

    setIsResetting(true);
    setProgress(t('yearly_cleaning_db'));

    try {
      await updateDoc(doc(db, 'settings', 'draft'), { data: [] });
      
      const sanonsToDelete = await fetchSanons();
      if (sanonsToDelete.length > 0) {
          const batch = writeBatch(db);
          let opCount = 0;
          for (const sanon of sanonsToDelete) {
              batch.delete(doc(db, 'sanony', sanon.id));
              opCount++;
              if (opCount >= 498) { await batch.commit(); }
          }
          if (opCount > 0) await batch.commit();
      }

      const snapTasks = await getDocs(collection(db, 'tasks'));
      let batchTasks = writeBatch(db);
      let count = 0;
      for (const d of snapTasks.docs) {
        batchTasks.delete(d.ref);
        count++;
        if (count === 500) { await batchTasks.commit(); batchTasks = writeBatch(db); count = 0; }
      }
      if (count > 0) await batchTasks.commit();

      alert(t('yearly_reset_success'));
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Error during data cleanup.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-gray-800/40 border border-slate-700/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-rose-500/20 rounded-xl">
          <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t('yearly_closing_title')}</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{t('yearly_closing_subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-sm font-black text-teal-400 uppercase tracking-widest">{t('yearly_step1')}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('yearly_step1_desc')}
          </p>
          <button 
            onClick={fetchYearlyData}
            disabled={isExporting || isResetting}
            className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all border-2 shadow-lg flex items-center justify-center gap-3 ${
              isExporting ? 'bg-gray-700 border-gray-600 text-gray-400 animate-pulse' : 'bg-teal-600 hover:bg-teal-500 text-white border-teal-500'
            }`}
          >
            {isExporting ? '...' : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {t('yearly_download_btn')}
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-sm font-black text-rose-400 uppercase tracking-widest">{t('yearly_step2')}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('yearly_step2_desc')}
          </p>
          <button 
            onClick={handleReset}
            disabled={!hasExported || isResetting || isExporting}
            className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all border-2 shadow-lg flex items-center justify-center gap-3 ${
              !hasExported ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
            }`}
          >
            {isResetting ? '...' : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {t('yearly_reset_btn')}
              </>
            )}
          </button>
        </div>
      </div>

      {progress && (
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-xs font-mono font-bold text-amber-500 bg-amber-500/5 py-2 px-4 rounded-full inline-block border border-amber-500/20 uppercase tracking-widest">
            {progress}
          </p>
        </div>
      )}
    </div>
  );
};

export default YearlyClosing;
