
import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, writeBatch, collection, arrayUnion } from 'firebase/firestore';

export const masterDataService = {
  async addPart(val: string, desc: string = '') {
    return await setDoc(doc(db, 'settings', 'parts'), { 
      items: arrayUnion({ value: val.toUpperCase(), description: desc }) 
    }, { merge: true });
  },

  async deletePart(val: string) {
    const ref = doc(db, 'settings', 'parts');
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const filtered = (snap.data().items || []).filter((i: any) => i.value !== val);
        return await updateDoc(ref, { items: filtered });
    }
  },

  async addBOMItem(parent: string, child: string, qty: number) {
    return await setDoc(doc(db, 'settings', 'bom'), { 
        items: arrayUnion({ parent: parent.toUpperCase(), child: child.toUpperCase(), consumption: qty }) 
    }, { merge: true });
  },

  async batchAddParts(lines: string[]) {
    const items = lines.map(l => {
        const [p, d] = l.split(';');
        return p ? { value: p.trim().toUpperCase(), description: d?.trim() || '' } : null;
    }).filter(Boolean);
    if (items.length > 0) return await setDoc(doc(db, 'settings', 'parts'), { items: arrayUnion(...items) }, { merge: true });
  }
};
