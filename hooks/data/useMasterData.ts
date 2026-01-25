import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  arrayUnion,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { DBItem, MapSector, PartRequest, BOMRequest, BOMComponent, MapObstacle, CSItem, QuickActionConfig } from '../../types/appTypes';

export const useMasterData = () => {
  const [partsMap, setPartsMap] = useState<Record<string, string>>({});
  const [bomMap, setBomMap] = useState<Record<string, BOMComponent[]>>({});
  const [workplaces, setWorkplaces] = useState<DBItem[]>([]);
  const [logisticsOperations, setLogisticsOperations] = useState<DBItem[]>([]);
  const [mapSectors, setMapSectors] = useState<MapSector[]>([]);
  const [mapObstacles, setMapObstacles] = useState<MapObstacle[]>([]);
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [bomRequests, setBomRequests] = useState<BOMRequest[]>([]);
  const [quickActions, setQuickActions] = useState<QuickActionConfig[]>([]);
  
  const [customers, setCustomers] = useState<CSItem[]>([]);
  const [suppliers, setSuppliers] = useState<CSItem[]>([]);

  useEffect(() => {
    const unsubWp = onSnapshot(query(collection(db, 'workplaces'), orderBy('value')), s => setWorkplaces(s.docs.map(d => ({id:d.id, ...d.data()} as DBItem))));
    const unsubLogOps = onSnapshot(query(collection(db, 'logistics_operations'), orderBy('value')), s => setLogisticsOperations(s.docs.map(d => ({id:d.id, ...d.data()} as DBItem))));
    const unsubSectors = onSnapshot(collection(db, 'map_sectors'), (snapshot) => {
        const sectors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapSector));
        setMapSectors(sectors.sort((a, b) => (a.order || 0) - (b.order || 0)));
    });
    const unsubPartReq = onSnapshot(collection(db, 'part_requests'), s => setPartRequests(s.docs.map(d => ({id:d.id, ...d.data()} as PartRequest))));
    const unsubBomReq = onSnapshot(collection(db, 'bom_requests'), s => setBomRequests(s.docs.map(d => ({id:d.id, ...d.data()} as BOMRequest))));

    const unsubParts = onSnapshot(doc(db, 'settings', 'parts'), (docSnap) => {
        const cleanMap: Record<string, string> = {};
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.items && Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                    if (item.value) cleanMap[item.value] = item.description || '';
                });
            }
        }
        setPartsMap(cleanMap);
    });

    const unsubBOM = onSnapshot(doc(db, 'settings', 'bom'), (docSnap) => {
        const cleanMap: Record<string, BOMComponent[]> = {};
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.items && Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                    if (item.parent && item.child) {
                        if (!cleanMap[item.parent]) cleanMap[item.parent] = [];
                        cleanMap[item.parent].push({ child: item.child, consumption: item.consumption || 0 });
                    }
                });
            }
        }
        setBomMap(cleanMap);
    });

    const unsubQuickActions = onSnapshot(doc(db, 'settings', 'quick_actions'), (s) => {
        setQuickActions(s.exists() ? (s.data().items || []) : []);
    });

    const unsubObstacles = onSnapshot(doc(db, 'settings', 'map_layout'), (docSnap) => {
        if (docSnap.exists()) {
            setMapObstacles(docSnap.data().obstacles || []);
        } else {
            setMapObstacles([]);
        }
    });

    const unsubCustomers = onSnapshot(doc(db, 'CSDB', 'customers'), (s) => {
        setCustomers(s.exists() ? (s.data().items || []) : []);
    });
    const unsubSuppliers = onSnapshot(doc(db, 'CSDB', 'suppliers'), (s) => {
        setSuppliers(s.exists() ? (s.data().items || []) : []);
    });

    return () => { 
        unsubWp(); unsubLogOps(); unsubSectors(); unsubPartReq(); unsubBomReq();
        unsubParts(); unsubBOM(); unsubObstacles();
        unsubCustomers(); unsubSuppliers(); unsubQuickActions();
    };
  }, []);

  const onAddQuickAction = async (config: Omit<QuickActionConfig, 'id'>) => {
      const newAction = { ...config, id: crypto.randomUUID() };
      await setDoc(doc(db, 'settings', 'quick_actions'), { items: arrayUnion(newAction) }, { merge: true });
  };

  const onDeleteQuickAction = async (id: string) => {
      const ref = doc(db, 'settings', 'quick_actions');
      const snap = await getDoc(ref);
      if (snap.exists()) {
          const filtered = (snap.data().items || []).filter((i: any) => i.id !== id);
          await updateDoc(ref, { items: filtered });
      }
  };

  // CSDB Actions
  const onAddCSItem = async (category: 'customers' | 'suppliers', name: string, description: string = '') => {
      try {
          const newItem: CSItem = { id: crypto.randomUUID(), name: name.toUpperCase(), description };
          await setDoc(doc(db, 'CSDB', category), { items: arrayUnion(newItem) }, { merge: true });
      } catch (e) { console.error(e); }
  };

  const onBatchAddCSItems = async (category: 'customers' | 'suppliers', lines: string[]) => {
      try {
          const itemsToAdd = lines.map(line => {
              if (!line.trim()) return null;
              const [n, d] = line.split(';');
              return { id: crypto.randomUUID(), name: n.trim().toUpperCase(), description: d ? d.trim() : '' };
          }).filter(Boolean);
          if (itemsToAdd.length > 0) {
              await setDoc(doc(db, 'CSDB', category), { items: arrayUnion(...itemsToAdd) }, { merge: true });
          }
      } catch (e) { console.error(e); }
  };

  const onDeleteCSItem = async (category: 'customers' | 'suppliers', id: string) => {
      try {
          const ref = doc(db, 'CSDB', category);
          const snap = await getDoc(ref);
          if (snap.exists()) {
              const current = snap.data().items || [];
              const filtered = current.filter((i: any) => i.id !== id);
              await updateDoc(ref, { items: filtered });
          }
      } catch (e) { console.error(e); }
  };

  const onDeleteAllCSItems = async (category: 'customers' | 'suppliers') => {
      try { await setDoc(doc(db, 'CSDB', category), { items: [] }); } catch (e) { console.error(e); }
  };

  // Obstacles
  const onAddMapObstacle = async (obs: Omit<MapObstacle, 'id'>) => {
      const id = `obs_${Date.now()}`;
      await setDoc(doc(db, 'settings', 'map_layout'), { 
          obstacles: arrayUnion({ ...obs, id }) 
      }, { merge: true });
  };
  const onDeleteMapObstacle = async (id: string) => {
      const ref = doc(db, 'settings', 'map_layout');
      const snap = await getDoc(ref);
      if (snap.exists()) {
          const filtered = (snap.data().obstacles || []).filter((o: any) => o.id !== id);
          await updateDoc(ref, { obstacles: filtered });
      }
  };

  // Workplaces
  const onAddWorkplace = async (val: string, time: number = 0, x: number = 0, y: number = 0) => {
      await addDoc(collection(db, 'workplaces'), { value: val, standardTime: time, coordX: x, coordY: y });
  };
  const onUpdateWorkplace = async (id: string, updates: Partial<DBItem>) => {
      await updateDoc(doc(db, 'workplaces', id), updates);
  };
  const onDeleteWorkplace = async (id: string) => {
      await deleteDoc(doc(db, 'workplaces', id));
  };
  const onDeleteAllWorkplaces = async () => {
      const snap = await getDocs(collection(db, 'workplaces'));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
  };
  const onBatchAddWorkplaces = async (vals: string[]) => {
      const batch = writeBatch(db);
      vals.forEach(line => {
          if (!line.trim()) return;
          const [val, time] = line.split(';');
          const ref = doc(collection(db, 'workplaces'));
          batch.set(ref, { value: val.trim(), standardTime: parseInt(time) || 0 });
      });
      await batch.commit();
  };

  // Logistics Operations
  const onAddLogisticsOperation = async (val: string, time: number = 0, dist: number = 0, x: number = 0, y: number = 0, defaultSource?: string, defaultTarget?: string) => { 
      await addDoc(collection(db, 'logistics_operations'), { 
          value: val, 
          standardTime: time, 
          distancePx: dist, 
          coordX: x, 
          coordY: y,
          defaultSourceSectorId: defaultSource || null,
          defaultTargetSectorId: defaultTarget || null
      }); 
  };
  const onUpdateLogisticsOperation = async (id: string, updates: Partial<DBItem>) => { 
      await updateDoc(doc(db, 'logistics_operations', id), updates); 
  };
  const onDeleteLogisticsOperation = async (id: string) => { await deleteDoc(doc(db, 'logistics_operations', id)); };
  const onDeleteAllLogisticsOperations = async () => {
      const snap = await getDocs(collection(db, 'logistics_operations'));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
  };

  // Map Sectors
  const onAddMapSector = async (name: string, x: number, y: number, color?: string) => { await addDoc(collection(db, 'map_sectors'), { name, coordX: x, coordY: y, color }); };
  const onUpdateMapSector = async (id: string, updates: Partial<MapSector>) => { await updateDoc(doc(db, 'map_sectors', id), updates); };
  const onDeleteMapSector = async (id: string) => { await deleteDoc(doc(db, 'map_sectors', id)); };

  // Parts (Single Doc Pattern)
  const onAddPart = async (value: string, description: string = '') => {
      try {
          const newItem = { 
            value: value.toUpperCase(), 
            description 
          };
          await setDoc(doc(db, 'settings', 'parts'), { items: arrayUnion(newItem) }, { merge: true });
      } catch (e) { console.error(e); }
  };
  const onBatchAddParts = async (vals: string[]) => {
    try {
      const itemsToAdd: any[] = [];
      vals.forEach((valLine) => {
        if (!valLine.trim()) return;
        const [p, d] = valLine.split(';');
        if(p) { 
          itemsToAdd.push({ 
            value: p.trim().toUpperCase(), 
            description: d ? d.trim() : '' 
          }); 
        }
      });
      if (itemsToAdd.length > 0) { await setDoc(doc(db, 'settings', 'parts'), { items: arrayUnion(...itemsToAdd) }, { merge: true }); }
    } catch (error) { console.error("Error batch adding parts:", error); throw error; }
  };
  const onDeletePart = async (val: string) => {
      try {
          const ref = doc(db, 'settings', 'parts');
          const snap = await getDoc(ref);
          if (snap.exists()) {
              const currentItems = snap.data().items || [];
              const newItems = currentItems.filter((i: any) => i.value !== val);
              await updateDoc(ref, { items: newItems });
          }
      } catch (e) { console.error("Error deleting part:", e); }
  };
  const onDeleteAllParts = async () => { try { await setDoc(doc(db, 'settings', 'parts'), { items: [] }); } catch (e) { console.error("Error clearing parts:", e); } };

  // BOM (Single Doc Pattern - Optimized for Quota Guard)
  const onAddBOMItem = async (parent: string, child: string, qty: number) => {
      try {
          const newItem = { 
              parent: parent.toUpperCase(), 
              child: child.toUpperCase(), 
              consumption: qty 
          };
          await setDoc(doc(db, 'settings', 'bom'), { items: arrayUnion(newItem) }, { merge: true });
      } catch (e) { console.error(e); }
  };
  const onBatchAddBOMItems = async (vals: string[]) => {
      try {
          const itemsToAdd: any[] = [];
          vals.forEach(line => {
              if (!line.trim()) return;
              const [p, c, q] = line.split(';');
              if (p && c) { 
                  itemsToAdd.push({ 
                      parent: p.trim().toUpperCase(), 
                      child: c.trim().toUpperCase(), 
                      consumption: parseFloat(q?.replace(',', '.') || '0') 
                  }); 
              }
          });
          if (itemsToAdd.length > 0) { await setDoc(doc(db, 'settings', 'bom'), { items: arrayUnion(...itemsToAdd) }, { merge: true }); }
      } catch (e) { console.error(e); }
  };
  const onDeleteBOMItem = async (parent: string, child: string) => {
      try {
          const ref = doc(db, 'settings', 'bom');
          const snap = await getDoc(ref);
          if (snap.exists()) {
              const currentItems = snap.data().items || [];
              const newItems = currentItems.filter((i: any) => !(i.parent === parent && i.child === child));
              await updateDoc(ref, { items: newItems });
          }
      } catch (e) { console.error(e); }
  };
  const onDeleteAllBOMItems = async () => { try { await setDoc(doc(db, 'settings', 'bom'), { items: [] }); } catch (e) { console.error("Error clearing BOM:", e); } };

  // Requests
  const onRequestPart = async (part: string) => {
    try {
        const user = localStorage.getItem('app_user') || 'Unknown';
        await addDoc(collection(db, 'part_requests'), { partNumber: part, requestedBy: user, requestedAt: Date.now() });
        return true;
    } catch (e) { return false; }
  };
  const onDeletePartRequest = async (id: string) => { 
      try { await deleteDoc(doc(db, 'part_requests', id)); } catch(e) { console.error(e); }
  };

  const onRequestBOM = async (parent: string) => {
    try {
        const user = localStorage.getItem('app_user') || 'Unknown';
        await addDoc(collection(db, 'bom_requests'), { parentPart: parent, requestedBy: user, requestedAt: Date.now() });
        return true;
    } catch (e) { return false; }
  };
  const onDeleteBOMRequest = async (id: string) => { 
      try { await deleteDoc(doc(db, 'bom_requests', id)); } catch(e) { console.error(e); }
  };

  return {
    partsMap, bomMap, workplaces, logisticsOperations, mapSectors, mapObstacles, partRequests, bomRequests,
    customers, suppliers, quickActions,
    onAddWorkplace, onUpdateWorkplace, onDeleteWorkplace, onDeleteAllWorkplaces, onBatchAddWorkplaces,
    onAddLogisticsOperation, onUpdateLogisticsOperation, onDeleteLogisticsOperation, onDeleteAllLogisticsOperations,
    onAddMapSector, onUpdateMapSector, onDeleteMapSector,
    onAddMapObstacle, onDeleteMapObstacle,
    onAddPart, onBatchAddParts, onDeletePart, onDeleteAllParts,
    onAddBOMItem, onBatchAddBOMItems, onDeleteBOMItem, onDeleteAllBOMItems,
    onAddCSItem, onBatchAddCSItems, onDeleteCSItem, onDeleteAllCSItems,
    onAddQuickAction, onDeleteQuickAction,
    onRequestPart, onDeletePartRequest, 
    onRequestBOM, onDeleteBOMRequest
  };
};