
import React, { useState } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

declare var XLSX: any;

interface YearlyClosingProps {
  resolveName: (username?: string | null) => string;
}

const YearlyClosing: React.FC<YearlyClosingProps> = ({ resolveName }) => {
  const { t, language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasExported, setHasExported] = useState(false);
  const [progress, setProgress] = useState('');

  const fetchYearlyData = async () => {
    setIsExporting(true);
    setProgress(language === 'sk' ? 'Pripravujem sťahovanie...' : 'Preparing download...');
    
    const allTasks: any[] = [];
    const currentYear = new Date().getFullYear();
    
    // Zoznam kolekcií na prechádzanie - dynamicky podľa aktuálneho roku
    const collectionsToFetch = ['tasks', 'archive_drafts'];
    for (let i = 1; i <= 53; i++) {
      collectionsToFetch.push(`sanon_${currentYear}_${i}`);
    }

    try {
      for (const colName of collectionsToFetch) {
        setProgress(`${language === 'sk' ? 'Sťahujem' : 'Fetching'} ${colName}...`);
        const snap = await getDocs(collection(db, colName));
        snap.forEach(d => {
          const data = d.data();
          allTasks.push({
            id: d.id,
            ...data
          });
        });
      }

      if (allTasks.length === 0) {
        alert(language === 'sk' ? 'Nenašli sa žiadne dáta pre aktuálny rok.' : 'No data found for current year.');
        setIsExporting(false);
        return;
      }

      // Mapovanie na stĺpce Excelu
      const excelData = allTasks.map(item => ({
        [language === 'sk' ? 'Dátum' : 'Date']: item.createdAt ? new Date(item.createdAt).toLocaleString('sk-SK') : '-',
        [language === 'sk' ? 'Číslo dielu' : 'Part Number']: item.partNumber || '-',
        [language === 'sk' ? 'Popis' : 'Description']: item.text || '-',
        [language === 'sk' ? 'Množstvo' : 'Quantity']: item.quantity || '0',
        [language === 'sk' ? 'Jednotka' : 'Unit']: item.quantityUnit || '-',
        [language === 'sk' ? 'Skladník' : 'Worker']: resolveName(item.completedBy || item.inProgressBy),
        [language === 'sk' ? 'Stav' : 'Status']: item.status || (item.isDone ? 'COMPLETED' : 'OPEN'),
        [language === 'sk' ? 'Dôvod chýbania' : 'Missing Reason']: item.missingReason || '-',
        [language === 'sk' ? 'Audit vykonal' : 'Audited By']: resolveName(item.auditedBy)
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ARCHIV_SYSTEM");
      XLSX.writeFile(wb, `KOMPLETNY_ARCHIV_${currentYear}_${new Date().getTime()}.xlsx`);
      
      setHasExported(true);
      setProgress(language === 'sk' ? 'Export úspešný!' : 'Export successful!');
    } catch (error) {
      console.error(error);
      alert('Chyba pri exporte.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = async () => {
    if (!hasExported) return;
    
    const confirm1 = window.confirm(language === 'sk' 
      ? "VAROVANIE: Chystáte sa definitívne vymazať VŠETKY úlohy a archívy z aktuálneho roku! Máte stiahnutú Excel zálohu?" 
      : "WARNING: You are about to permanently delete ALL tasks and archives from the current year! Do you have your Excel backup?");
    
    if (!confirm1) return;

    const confirm2 = window.confirm(language === 'sk'
      ? "Posledné varovanie: Táto akcia je nevratná. Pokračovať?"
      : "Final warning: This action is irreversible. Proceed?");

    if (!confirm2) return;

    setIsResetting(true);
    const currentYear = new Date().getFullYear();
    setProgress(language === 'sk' ? 'Premazávam databázu...' : 'Cleaning database...');

    try {
      const collectionsToDelete = ['tasks', 'archive_drafts'];
      for (let i = 1; i <= 53; i++) {
        collectionsToDelete.push(`sanon_${currentYear}_${i}`);
      }

      for (const colName of collectionsToDelete) {
        setProgress(`${language === 'sk' ? 'Mažem' : 'Deleting'} ${colName}...`);
        const snap = await getDocs(collection(db, colName));
        
        let batch = writeBatch(db);
        let count = 0;

        for (const d of snap.docs) {
          batch.delete(d.ref);
          count++;
          if (count === 500) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      }

      alert(language === 'sk' ? 'Systém bol úspešne zresetovaný.' : 'System successfully reset.');
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Chyba pri čistení dát.');
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
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">ROČNÁ UZÁVIERKA</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Archivácia a čistenie systémových dát</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-sm font-black text-teal-400 uppercase tracking-widest">1. KROK: EXPORT DÁT</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Stiahne všetky záznamy z aktuálnych úloh aj týždenných šanónov do jedného Excel súboru.
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
                STIAHNUŤ KOMPLETNÝ ARCHÍV (.xlsx)
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-sm font-black text-rose-400 uppercase tracking-widest">2. KROK: RESET SYSTÉMU</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Vymaže všetky archívne dáta a aktuálne úlohy. Tlačidlo sa sprístupní až po stiahnutí archívu.
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
                VYMAZAŤ ARCHÍV A RESETOVAŤ SYSTÉM
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
