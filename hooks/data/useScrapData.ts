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
import { ScrapBin, ScrapMetal, ScrapPrice } from '../../types/appTypes';

export const useScrapData = () => {
  const [scrapBins, setScrapBins] = useState<ScrapBin[]>([]);
  const [scrapMetals, setScrapMetals] = useState<ScrapMetal[]>([]);
  const [scrapPrices, setScrapPrices] = useState<ScrapPrice[]>([]);

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

    return () => { unsubBins(); unsubMetals(); unsubPrices(); };
  }, []);

  const onAddScrapBin = async (name: string, tara: number) => {
    const newBin: ScrapBin = { id: crypto.randomUUID(), name, tara };
    await setDoc(doc(db, 'scrap', 'bins'), { items: arrayUnion(newBin) }, { merge: true });
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

  return {
    scrapBins, scrapMetals, scrapPrices,
    onAddScrapBin, onDeleteScrapBin, onUpdateScrapBin,
    onAddScrapMetal, onDeleteScrapMetal, onUpdateScrapMetal,
    onAddScrapPrice, onDeleteScrapPrice
  };
};