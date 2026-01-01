
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { DBItem, BreakSchedule, SystemBreak } from '../../types/appTypes';

export const useOperationsData = () => {
  const [missingReasons, setMissingReasons] = useState<DBItem[]>([]);
  const [breakSchedules, setBreakSchedules] = useState<BreakSchedule[]>([]);
  const [systemBreaks, setSystemBreaks] = useState<SystemBreak[]>([]);
  const [isBreakActive, setIsBreakActive] = useState(false);

  useEffect(() => {
    const unsubReasons = onSnapshot(query(collection(db, 'missing_reasons'), orderBy('value')), s => setMissingReasons(s.docs.map(d => ({id:d.id, value:d.data().value} as DBItem))));
    const unsubSysBreaks = onSnapshot(collection(db, 'system_breaks'), s => setSystemBreaks(s.docs.map(d => ({id:d.id, ...d.data()} as SystemBreak))));
    
    const unsubBreaks = onSnapshot(doc(db, 'settings', 'breaks'), (s) => {
      if (s.exists()) setBreakSchedules(s.data().data || []);
    });

    return () => { unsubReasons(); unsubSysBreaks(); unsubBreaks(); };
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

  return {
    missingReasons, breakSchedules, systemBreaks, isBreakActive,
    onAddMissingReason, onDeleteMissingReason
  };
};
