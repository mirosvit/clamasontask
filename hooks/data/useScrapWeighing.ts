import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  getDoc,
  collection,
  deleteDoc
} from 'firebase/firestore';
import { ScrapRecord } from '../../types/appTypes';

export const useScrapWeighing = () => {
  const [actualScrap, setActualScrap] = useState<ScrapRecord[]>([]);
  const [scrapSanons, setScrapSanons] = useState<any[]>([]);

  useEffect(() => {
    // Sledovanie archívnych šanónov
    const unsubSanons = onSnapshot(collection(db, 'scrap_archives'), (s) => {
      setScrapSanons(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Sledovanie aktuálneho skladu šrotu
    const unsubActual = onSnapshot(doc(db, 'scrap', 'actualscrap'), (s) => {
      if (s.exists()) setActualScrap(s.data().items || []);
      else setActualScrap([]);
    });

    return () => { unsubSanons(); unsubActual(); };
  }, []);

  // Pridanie jedného záznamu (legacy/debug)
  const onAddScrapRecord = async (record: ScrapRecord) => {
    await setDoc(doc(db, 'scrap', 'actualscrap'), { 
      items: arrayUnion(record) 
    }, { merge: true });
  };

  // Hromadné pridanie záznamov z ukončenej relácie
  const onBulkAddScrapRecords = async (records: ScrapRecord[]) => {
    if (records.length === 0) return;
    await setDoc(doc(db, 'scrap', 'actualscrap'), { 
      items: arrayUnion(...records) 
    }, { merge: true });
  };

  const onDeleteScrapRecord = async (id: string) => {
    const ref = doc(db, 'scrap', 'actualscrap');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const items = (snap.data().items || []) as ScrapRecord[];
      await updateDoc(ref, { items: items.filter(i => i.id !== id) });
    }
  };

  const onUpdateScrapRecord = async (id: string, updates: Partial<ScrapRecord>) => {
    const ref = doc(db, 'scrap', 'actualscrap');
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const items = (snap.data().items || []) as ScrapRecord[];
        const newItems = items.map(i => i.id === id ? { ...i, ...updates } : i);
        await updateDoc(ref, { items: newItems });
    }
  };

  const onUpdateArchivedScrapItem = async (sanonId: string, itemId: string, updates: Partial<ScrapRecord>) => {
    const ref = doc(db, 'scrap_archives', sanonId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const items = (snap.data().items || []) as ScrapRecord[];
        const newItems = items.map(i => i.id === itemId ? { ...i, ...updates } : i);
        await updateDoc(ref, { items: newItems });
    }
  };

  const onDeleteArchivedScrapItem = async (sanonId: string, itemId: string) => {
    const ref = doc(db, 'scrap_archives', sanonId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const items = (snap.data().items || []) as ScrapRecord[];
        const newItems = items.filter(i => i.id !== itemId);
        await updateDoc(ref, { items: newItems });
    }
  };

  const onDeleteScrapArchive = async (id: string) => {
      await deleteDoc(doc(db, 'scrap_archives', id));
  };

  const onExpediteScrap = async (worker: string, dispatchDate?: string) => {
      if (actualScrap.length === 0) return;

      const dateObj = dispatchDate ? new Date(dispatchDate) : new Date();
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      const timestamp = Date.now();
      
      // ID sanonu teraz obsahuje zvolený dátum expedície
      const sanonId = `SCRAP_SANON_${dd}${mm}${yyyy}_${String(timestamp).slice(-4)}`;
      
      const archiveDoc = {
          id: sanonId,
          dispatchDate: dispatchDate || dateObj.toISOString().split('T')[0],
          items: actualScrap,
          finalizedBy: worker,
          finalizedAt: timestamp
      };

      // 1. Uložiť do archívu
      await setDoc(doc(db, 'scrap_archives', sanonId), archiveDoc);
      
      // 2. Vymazať aktuálny sklad
      await updateDoc(doc(db, 'scrap', 'actualscrap'), { items: [] });
      
      return sanonId;
  };

  const onFinalizeScrapArchive = async (dispatchDate: string, worker: string, records: ScrapRecord[]) => {
      if (records.length === 0) return;

      const dateStr = dispatchDate.split('-').reverse().join('');
      const sanonId = `scrap_sanon_${dateStr}_${Date.now().toString().slice(-4)}`;
      
      const archiveDoc = {
          id: sanonId,
          dispatchDate,
          items: records,
          finalizedBy: worker,
          finalizedAt: Date.now()
      };

      await setDoc(doc(db, 'scrap_archives', sanonId), archiveDoc);
      return sanonId;
  };

  return {
    actualScrap, scrapSanons,
    onAddScrapRecord, onBulkAddScrapRecords, onDeleteScrapRecord, onUpdateScrapRecord, onExpediteScrap, onFinalizeScrapArchive, onUpdateArchivedScrapItem, onDeleteArchivedScrapItem, onDeleteScrapArchive
  };
};