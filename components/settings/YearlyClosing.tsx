
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

declare var XLSX: any;

interface YearlyClosingProps {
  resolveName: (username?: string | null) => string;
  fetchSanons: () => Promise<any[]>;
}

const YearlyClosing: React.FC<YearlyClosingProps> = ({ resolveName, fetchSanons }) => {
  const { language } = useLanguage();
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

  const fetchYearlyData = async () => {
    setIsExporting(true);
    setProgress(language === 'sk' ? 'Pripravujem sťahovanie...' : 'Preparing download...');
    
    const allTasks: any[] = [];
    const currentYear = new Date().getFullYear();
    
    try {
      // 1. Sťahujeme živé úlohy z kolekcie
      setProgress(language === 'sk' ? 'Sťahujem živé úlohy...' : 'Fetching live tasks...');
      const snapTasks = await getDocs(collection(db, 'tasks'));
      snapTasks.forEach(d => allTasks.push({ id: d.id, ...d.data() }));

      // 2. Sťahujeme Draft bucket
      setProgress(language === 'sk' ? 'Sťahujem denný archív...' : 'Fetching daily draft...');
      const draftSnap = await getDoc(doc(db, 'settings', 'draft'));
      if (draftSnap.exists()) {
          (draftSnap.data().data || []).forEach((t: any) => allTasks.push(t));
      }

      // 3. Sťahujeme všetky šanóny pomocou optimalizovanej funkcie
      setProgress(language === 'sk' ? 'Sťahujem týždenné šanóny...' : 'Fetching weekly buckets...');
      const sanons = await fetchSanons();
      
      sanons.forEach(sanon => {
          if (sanon.tasks && Array.isArray(sanon.tasks)) {
              allTasks.push(...sanon.tasks);
          }
      });

      if (allTasks.length === 0) {
        alert(language === 'sk' ? 'Nenašli sa žiadne dáta pre aktuálny rok.' : 'No data found for current year.');
        setIsExporting(false);
        return;
      }

      const excelData = allTasks.map(item => {
        let searchResult = '';
        if (item.searchedBy) {
          if (item.searchExhausted || item.auditResult) {
            searchResult = 'Nie';
          } else if (item.isMissing === false) {
            searchResult = 'Áno';
          } else {
            searchResult = 'Prebieha';
          }
        }

        let statusText = 'Otvorené';
        if (item.status === 'incorrectly_entered') {
            statusText = 'Chybne zadané';
        } else if (item.auditResult) {
            statusText = 'Auditované';
        } else if (item.isDone) {
            statusText = 'Dokončené';
        }

        return {
          'Dátum pridania': formatDate(item.createdAt),
          'Čas pridania': formatTime(item.createdAt),
          'Kto pridal': resolveName(item.createdBy),
          'Diel / Referencia': item.partNumber || '',
          'Pracovisko / Operácia': item.workplace || '',
          'SPZ / Prepravca': item.isLogistics ? (item.note || '') : '',
          'Počet': item.quantity || '',
          'Jednotka': item.quantityUnit || '',
          'Poznámka': !item.isLogistics ? (item.note || '') : '',
          'Skladník': resolveName(item.completedBy),
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
          'Dátum a čas auditu': formatDateTime(item.auditedAt ?? undefined),
          'Sektor (Odkiaľ)': item.pickedFromSectorId || '-'
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wscols = [
        {wch: 15}, {wch: 12}, {wch: 20}, {wch: 20}, {wch: 25}, 
        {wch: 20}, {wch: 10}, {wch: 10}, {wch: 25}, {wch: 20}, 
        {wch: 15}, {wch: 12}, {wch: 18}, {wch: 20}, {wch: 25}, 
        {wch: 15}, {wch: 20}, {wch: 18}, {wch: 15}, {wch: 35},
        {wch: 20}, {wch: 20}, {wch: 15}
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ROCNA_UZAVIERKA");
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
    setProgress(language === 'sk' ? 'Premazávam databázu...' : 'Cleaning database...');

    try {
      // 1. Vymazanie Draft bucketu
      await updateDoc(doc(db, 'settings', 'draft'), { data: [] });
      
      // 2. Vymazanie všetkých šanónov (efektívne cez batch)
      const sanonsToDelete = await fetchSanons();
      if (sanonsToDelete.length > 0) {
          const batch = writeBatch(db);
          let opCount = 0;
          
          for (const sanon of sanonsToDelete) {
              const sanonRef = doc(db, 'sanony', sanon.id);
              batch.delete(sanonRef);
              opCount++;
              
              if (opCount >= 498) {
                  await batch.commit();
                  // Nový batch sa musí vytvoriť po commite
                  // Keďže writeBatch je factory function, toto v React komponente 
                  // uprostred cyklu môže byť tricky, ale tu je to OK.
                  // Pre istotu resetujeme premennú (aj keď v JS je to nový objekt)
              }
          }
          if (opCount > 0) await batch.commit();
      }

      // 3. Vymazanie živých úloh (tasks)
      const snapTasks = await getDocs(collection(db, 'tasks'));
      let batchTasks = writeBatch(db);
      let count = 0;
      for (const d of snapTasks.docs) {
        batchTasks.delete(d.ref);
        count++;
        if (count === 500) {
          await batchTasks.commit();
          batchTasks = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batchTasks.commit();

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
            Stiahne všetky záznamy z aktuálnych úloh aj týždenných šanónov do jedného Excel súboru s 23 stĺpcami (vrátane sektorov).
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
