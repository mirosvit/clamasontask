import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  getDoc 
} from 'firebase/firestore';
import { ScrapBin, ScrapMetal, ScrapPrice, ScrapConfig } from '../../types/appTypes';

export const useScrapData = () => {
  const [scrapBins, setScrapBins] = useState<ScrapBin[]>([]);
  const [scrapMetals, setScrapMetals] = useState<ScrapMetal[]>([]);
  const [scrapPrices, setScrapPrices] = useState<ScrapPrice[]>([]);
  const [scrapConfig, setScrapConfig] = useState<ScrapConfig>({ scrapLogisticsOpId: '' });

  useEffect(() => {
    const unsubBins = onSnapshot(doc(db, 'scrap', 'bins'), (s) => {
      setScrapBins(s.exists() ? (s.data().items || []) : []);
    });
    const unsubMetals = onSnapshot(doc(db, 'scrap', 'metals'), (s) => {
      setScrapMetals(s.exists() ? (s.data().items || []) : []);
    });
    const unsubPrices = onSnapshot(doc(db, 'scrap', 'prices'), (s) => {
      setScrapPrices(s.exists() ? (s.data().items || []) : []);
    });
    const unsubConfig = onSnapshot(doc(db, 'scrap', 'config'), (s) => {
      if (s.exists()) setScrapConfig(s.data() as ScrapConfig);
    });

    return () => { unsubBins(); unsubMetals(); unsubPrices(); unsubConfig(); };
  }, []);

  const onAddScrapBin = async (name: string, tara: number) => {
    const newBin: ScrapBin = { id: crypto.randomUUID(), name, tara };
    await setDoc(doc(db, 'scrap', 'bins'), { items: arrayUnion(newBin) }, { merge: true });
  };

  const onBatchAddScrapBins = async (lines: string[]) => {
    const ref = doc(db, 'scrap', 'bins');
    const snap = await getDoc(ref);
    const currentItems = snap.exists() ? (snap.data().items || []) : [];
    
    const newItems = lines.map(line => {
      if (!line.trim()) return null;
      const [name, tara] = line.split(';');
      if (!name) return null;
      return {
        id: crypto.randomUUID(),
        name: name.trim().toUpperCase(),
        tara: parseFloat(tara?.replace(',', '.') || '0')
      };
    }).filter(Boolean);

    if (newItems.length > 0) {
      await setDoc(ref, { items: [...currentItems, ...newItems] }, { merge: true });
    }
  };

  const onDeleteScrapBin = async (id: string) => {
    const ref = doc(db, 'scrap', 'bins');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const items = snap.data().items || [];
      await updateDoc(ref, { items: items.filter((i: any) => i.id !== id) });
    }
  };

  const onUpdateScrapBin = async (id: string, updates: Partial<ScrapBin>) => {
    const ref = doc(db, 'scrap', 'bins');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const items = snap.data().items || [];
      const newItems = items.map((i: any) => i.id === id ? { ...i, ...updates } : i);
      await updateDoc(ref, { items: newItems });
    }
  };

  const onAddScrapMetal = async (type: string, description: string) => {
    const newMetal: ScrapMetal = { id: crypto.randomUUID(), type, description };
    await setDoc(doc(db, 'scrap', 'metals'), { items: arrayUnion(newMetal) }, { merge: true });
  };

  const onDeleteScrapMetal = async (id: string) => {
    const ref = doc(db, 'scrap', 'metals');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const items = snap.data().items || [];
      await updateDoc(ref, { items: items.filter((i: any) => i.id !== id) });
    }
  };

  const onUpdateScrapMetal = async (id: string, updates: Partial<ScrapMetal>) => {
    const ref = doc(db, 'scrap', 'metals');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const items = snap.data().items || [];
      const newItems = items.map((i: any) => i.id === id ? { ...i, ...updates } : i);
      await updateDoc(ref, { items: newItems });
    }
  };

  const onAddScrapPrice = async (metalId: string, month: number, year: number, price: number) => {
    const newPrice: ScrapPrice = { id: crypto.randomUUID(), metalId, month, year, price };
    await setDoc(doc(db, 'scrap', 'prices'), { items: arrayUnion(newPrice) }, { merge: true });
  };

  const onDeleteScrapPrice = async (id: string) => {
    const ref = doc(db, 'scrap', 'prices');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const items = snap.data().items || [];
      await updateDoc(ref, { items: items.filter((i: any) => i.id !== id) });
    }
  };

  const onUpdateScrapConfig = async (config: Partial<ScrapConfig>) => {
    await setDoc(doc(db, 'scrap', 'config'), config, { merge: true });
  };

  return {
    scrapBins, scrapMetals, scrapPrices, scrapConfig,
    onAddScrapBin, onBatchAddScrapBins, onDeleteScrapBin, onUpdateScrapBin,
    onAddScrapMetal, onDeleteScrapMetal, onUpdateScrapMetal,
    onAddScrapPrice, onDeleteScrapPrice, onUpdateScrapConfig
  };
};