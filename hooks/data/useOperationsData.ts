
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { DBItem, BreakSchedule, SystemBreak, ERPBlockage } from '../../types/appTypes';

export const useOperationsData = () => {
  const [missingReasons, setMissingReasons] = useState<DBItem[]>([]);
  const [breakSchedules, setBreakSchedules] = useState<BreakSchedule[]>([]);
  const [systemBreaks, setSystemBreaks] = useState<SystemBreak[]>([]);
  const [erpBlockages, setErpBlockages] = useState<ERPBlockage[]>([]);
  const [isBreakActive, setIsBreakActive] = useState(false);

  useEffect(() => {
    const unsubReasons = onSnapshot(query(collection(db, 'missing_reasons'), orderBy('value')), s => setMissingReasons(s.docs.map(d => ({id:d.id, value:d.data().value} as DBItem))));
    const unsubSysBreaks = onSnapshot(collection(db, 'system_breaks'), s => setSystemBreaks(s.docs.map(d => ({id:d.id, ...d.data()} as SystemBreak))));
    
    const unsubBreaks = onSnapshot(doc(db, 'settings', 'breaks'), (s) => {
      if (s.exists()) setBreakSchedules(s.data().data || []);
    });

    const unsubERP = onSnapshot(doc(db, 'settings', 'erp_blockages'), (s) => {
        if (s.exists()) setErpBlockages(s.data().items || []);
        else setErpBlockages([]);
    });

    return () => { unsubReasons(); unsubSysBreaks(); unsubBreaks(); unsubERP(); };
  }, []);

  const checkBreakStatus = useCallback(() => {
      const now = new Date();
      const currentHHMM = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0');
      const isScheduledActive = (breakSchedules || []).some(b => 
          currentHHMM >= b.startTime && currentHHMM <= b.endTime
      );
      const isManualActive = (systemBreaks || []).some(b => b.isActive);
      setIsBreakActive(isScheduledActive || isManualActive);
  }, [breakSchedules, systemBreaks]);

  useEffect(() => {
      checkBreakStatus(); 
      const interval = setInterval(checkBreakStatus, 30000); 
      return () => clearInterval(interval);
  }, [checkBreakStatus]);

  // --- ACTIONS ---

  const onAddMissingReason = async (val: string) => { await addDoc(collection(db, 'missing_reasons'), { value: val }); };
  const onDeleteMissingReason = async (id: string) => { await deleteDoc(doc(db, 'missing_reasons', id)); };

  const onAddBreakSchedule = async (start: string, end: string) => {
      try {
          const ref = doc(db, 'settings', 'breaks');
          const newBreak = {
              id: `break_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              startTime: start,
              endTime: end,
              name: 'Prestávka'
          };
          await updateDoc(ref, {
              data: arrayUnion(newBreak)
          });
      } catch (e) {
          console.error("Error adding break schedule:", e);
      }
  };

  const onDeleteBreakSchedule = async (id: string) => {
      try {
          const ref = doc(db, 'settings', 'breaks');
          const snap = await getDoc(ref);
          if (snap.exists()) {
              const currentData = snap.data().data || [];
              const filteredData = currentData.filter((b: any) => b.id !== id);
              await updateDoc(ref, { data: filteredData });
          }
      } catch (e) {
          console.error("Error deleting break schedule:", e);
      }
  };

  return {
    missingReasons, breakSchedules, systemBreaks, erpBlockages, isBreakActive,
    onAddMissingReason, onDeleteMissingReason,
    onAddBreakSchedule, onDeleteBreakSchedule
  };
};
