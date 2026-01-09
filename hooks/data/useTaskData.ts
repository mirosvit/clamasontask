import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  limit,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { Task, PriorityLevel, Notification } from '../../types/appTypes';
import { PRIORITY_ORDER } from '../../constants/uiConstants';

const getISOWeekId = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `SANON_${date.getFullYear()}_${weekNumber.toString().padStart(2, '0')}`;
};

export const useTaskData = (
    isAuthenticated: boolean, 
    checkPermission: (perm: string) => boolean,
    onAddNotification: (n: Partial<Notification>) => void
) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draftTasks, setDraftTasks] = useState<Task[]>([]);
  const isFirstLoad = useRef(true);

  // --- LISTENER PRE ŽIVÉ ÚLOHY ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const threshold = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 dni dozadu
    const q = query(collection(db, 'tasks'), where('createdAt', '>=', threshold), limit(300)); 
    
    return onSnapshot(q, (snapshot) => {
      const newTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      
      // Zvuková notifikácia pre nové úlohy
      if (!isFirstLoad.current) {
          snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                  const task = change.doc.data() as Task;
                  if (task.createdAt && (Date.now() - task.createdAt < 10000)) {
                      if (checkPermission('perm_play_sound')) {
                          try {
                              const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
                              audio.play().catch(e => console.log('Sound blocked', e));
                          } catch (e) {}
                      }
                  }
              }
          });
      }
      isFirstLoad.current = false;

      // Triedenie úloh
      const sortedTasks = newTasks.sort((a, b) => {
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        if (a.isDone) {
            const timeA = a.completedAt || a.createdAt || 0;
            const timeB = b.completedAt || b.createdAt || 0;
            return timeB - timeA; 
        }
        const aManBlocked = a.isManualBlocked ? 1 : 0;
        const bManBlocked = b.isManualBlocked ? 1 : 0;
        if (aManBlocked !== bManBlocked) return aManBlocked - bManBlocked;
        const pA = PRIORITY_ORDER[a.priority || 'NORMAL'];
        const pB = PRIORITY_ORDER[b.priority || 'NORMAL'];
        if (pA !== pB) return pA - pB;
        return (a.createdAt || 0) - (b.createdAt || 0); 
      });
      setTasks(sortedTasks);
    });
  }, [isAuthenticated, checkPermission]);

  // --- LISTENER PRE DRAFT (Denný archív) ---
  useEffect(() => {
    const unsubDraft = onSnapshot(doc(db, 'settings', 'draft'), (s) => {
      if (s.exists()) {
        const d = s.data();
        setDraftTasks(Array.isArray(d.data) ? d.data : []);
      } else {
        setDraftTasks([]);
      }
    }, (err) => {
      console.error("Draft snapshot error:", err);
      setDraftTasks([]);
    });
    return () => unsubDraft();
  }, []);

  // --- ACTIONS ---

  // Inteligentné pridanie úlohy
  const onAddTask = async (
      partNumber: string, 
      workplace: string | null, 
      quantity: string | null, 
      quantityUnit: string | null, 
      priority: PriorityLevel, 
      isLogistics: boolean = false, 
      noteOrPlate: string = '', 
      isProduction: boolean = false,
      sourceSectorId?: string, 
      targetSectorId?: string
  ) => {
    const createdBy = localStorage.getItem('app_user') || 'Unknown';
    
    // 1. Špeciálny prípad: Inventúra
    if (partNumber === "Počítanie zásob") {
        try {
            await addDoc(collection(db, 'tasks'), {
                partNumber, 
                workplace: workplace || '', 
                quantity: quantity || '0', 
                quantityUnit: quantityUnit || 'pcs', 
                priority, 
                isLogistics, 
                note: noteOrPlate, 
                text: partNumber, 
                status: 'unpacked', 
                isInProgress: true, 
                inProgressBy: createdBy, 
                isDone: false, 
                isMissing: false, 
                createdAt: Date.now(), 
                createdBy: createdBy, 
                isProduction: !!isProduction
            });
        } catch (e) { console.error("Failed to create inventory task", e); }
        return;
    }

    // 2. Bežná úloha
    const newTask = {
        text: partNumber, 
        partNumber, 
        workplace: workplace || '', 
        quantity: quantity || '0', 
        quantityUnit: quantityUnit || 'pcs', 
        priority, 
        isLogistics, 
        isProduction, 
        note: isLogistics ? '' : noteOrPlate, // Ak logistika, note ide do plate
        plate: isLogistics ? noteOrPlate : '',
        isDone: false, 
        isMissing: false, 
        createdAt: Date.now(), 
        createdBy, 
        status: 'open',
        sourceSectorId: sourceSectorId || null,
        targetSectorId: targetSectorId || null
    };
    try { await addDoc(collection(db, 'tasks'), newTask); } catch (e) { console.error("Error adding task", e); }
  };

  const onUpdateTask = async (id: string, updates: Partial<Task>) => {
    try { await updateDoc(doc(db, 'tasks', id), updates); } catch(e) { console.error("Error updating task", e); }
  };

  const onDeleteTask = async (id: string) => {
    try { await deleteDoc(doc(db, 'tasks', id)); } catch(e) { console.error(e); }
  };

  const onToggleTask = async (id: string, sectorId?: string) => {
      const task = tasks.find(t => t.id === id);
      if(!task) return;
      const currentUser = localStorage.getItem('app_user') || 'Unknown';
      const updates: any = { isDone: !task.isDone };
      
      if (!task.isDone) { 
          updates.completedAt = Date.now(); 
          updates.completedBy = currentUser; 
          updates.status = 'completed'; 
          if (sectorId) {
              updates.pickedFromSectorId = sectorId;
          }
      } else { 
          updates.completedAt = null; 
          updates.completedBy = null; 
          updates.status = 'open'; 
          updates.isInProgress = false; 
          updates.inProgressBy = null; 
          updates.pickedFromSectorId = null;
      }
      await onUpdateTask(id, updates);
  };

  const onEditTask = async (id: string, newText: string, newPriority?: PriorityLevel) => {
    const updates: any = { text: newText, partNumber: newText };
    if (newPriority) updates.priority = newPriority;
    await onUpdateTask(id, updates);
  };

  const onToggleMissing = async (id: string, reason?: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const user = localStorage.getItem('app_user') || 'Unknown';
    const updates: any = { isMissing: !task.isMissing };
    
    if (!task.isMissing) { 
        updates.missingReason = reason || 'Unknown'; 
        updates.missingReportedBy = user;
        // Ak sa nahlási missing, automaticky sa zastaví riešenie
        updates.isInProgress = false;
        updates.inProgressBy = null;
        
        // Notifikácia
        if (task.createdBy) {
            onAddNotification({ 
                partNumber: task.partNumber || 'Unknown', 
                reason: `CHÝBA: ${reason || 'Neuvedený dôvod'}`, 
                reportedBy: user, 
                targetUser: task.createdBy, 
                timestamp: Date.now() 
            });
        }
    } else { 
        updates.missingReason = null; 
        updates.missingReportedBy = null; 
    }
    await onUpdateTask(id, updates);
  };

  const onSetInProgress = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const user = localStorage.getItem('app_user') || 'Unknown';
    if (task.isInProgress) await onUpdateTask(id, { isInProgress: false, inProgressBy: null });
    else await onUpdateTask(id, { isInProgress: true, inProgressBy: user, startedAt: Date.now() });
  };

  const onToggleBlock = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const user = localStorage.getItem('app_user') || 'Unknown';
    if (task.isBlocked) await onUpdateTask(id, { isBlocked: false, blockedBy: null });
    else await onUpdateTask(id, { isBlocked: true, blockedBy: user, searchedBy: user });
  };

  const onToggleManualBlock = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newState = !task.isManualBlocked;
    const updates: any = { isManualBlocked: newState };
    
    // Ak sa blokuje, zrušíme InProgress a znížime prioritu
    if (newState) {
        updates.isInProgress = false;
        updates.inProgressBy = null;
        updates.priority = 'LOW';
    } else {
        // Pri odblokovaní obnovíme čas (aby to vyzeralo ako nová úloha)
        updates.createdAt = Date.now();
    }
    await onUpdateTask(id, updates);
  };

  const onExhaustSearch = async (id: string) => {
    await onUpdateTask(id, { searchExhausted: true });
  };

  const onMarkAsIncorrect = async (id: string) => {
    const user = localStorage.getItem('app_user') || 'Unknown';
    await onUpdateTask(id, { status: 'incorrectly_entered', isDone: true, completedBy: user, completedAt: Date.now(), isInProgress: false, inProgressBy: null });
  };

  const onAddNote = async (id: string, note: string) => {
    await onUpdateTask(id, { note });
  };

  const onReleaseTask = async (id: string) => {
    await onUpdateTask(id, { isBlocked: false, isManualBlocked: false, isInProgress: false, inProgressBy: null, blockedBy: null });
  };

  // --- AUDIT LOGIC ---

  const onStartAudit = async (id: string) => {
      const user = localStorage.getItem('app_user') || 'Unknown';
      await onUpdateTask(id, { 
          isAuditInProgress: true, 
          auditBy: user, 
          isInProgress: false, 
          inProgressBy: null 
      });
  };

  const onFinishAudit = async (id: string, result: 'found' | 'missing', note: string) => {
      const user = localStorage.getItem('app_user') || 'Unknown';
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const badgeText = result === 'found' ? `AUDIT (OK) - ${note}` : `AUDIT (NOK) - ${note}`;
      const updates: any = { 
          isAuditInProgress: false, 
          auditFinalBadge: badgeText, 
          auditBy: null, 
          auditResult: result === 'found' ? 'OK' : 'NOK', 
          auditNote: note, 
          auditedBy: user, 
          auditedAt: Date.now() 
      };

      if (result === 'found') { 
          updates.isMissing = false; 
      } else { 
          updates.isDone = true; 
          updates.status = 'audit_error'; 
          updates.completedBy = user; 
          updates.completedAt = Date.now(); 
          updates.isInProgress = false; 
      }
      
      await onUpdateTask(id, updates);

      // Notifikácia pre zadávateľa
      if (task.createdBy) {
          onAddNotification({ 
              partNumber: task.partNumber || 'Unknown', 
              reason: `AUDIT: ${result.toUpperCase()} - ${note}`, 
              reportedBy: user, 
              targetUser: task.createdBy, 
              timestamp: Date.now() 
          });
      }
  };

  // --- CLOSING & MAINTENANCE ---

  const onDailyClosing = async () => {
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('isDone', '==', true));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return { success: true, count: 0 };
      const completedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const draftRef = doc(db, 'settings', 'draft');
      const draftSnap = await getDoc(draftRef);
      let existingData = [];
      if (draftSnap.exists()) existingData = draftSnap.data().data || [];
      const mergedData = [...existingData, ...completedTasks];
      const batch = writeBatch(db);
      batch.set(draftRef, { data: mergedData }, { merge: true });
      snapshot.docs.forEach((doc) => { batch.delete(doc.ref); });
      await batch.commit();
      return { success: true, count: completedTasks.length };
    } catch (e) { console.error("Daily closing failed:", e); return { success: false, count: 0 }; }
  };

  const onWeeklyClosing = async () => {
    try {
        const sanonId = getISOWeekId();
        const draftRef = doc(db, 'settings', 'draft');
        const draftSnap = await getDoc(draftRef);
        let draftTasksFromDb = [];
        if (draftSnap.exists()) draftTasksFromDb = draftSnap.data().data || [];
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, where('isDone', '==', true));
        const activeSnap = await getDocs(q);
        const activeTasks = activeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allTasksToArchive = [...draftTasksFromDb, ...activeTasks];
        if (allTasksToArchive.length === 0) return { success: true, count: 0, sanon: sanonId };
        let batch = writeBatch(db);
        let opCount = 0;
        const sanonRef = doc(db, 'sanony', sanonId);
        batch.set(sanonRef, { tasks: allTasksToArchive, createdAt: Date.now(), id: sanonId });
        opCount++;
        batch.set(draftRef, { data: [] });
        opCount++;
        const docsToDelete = activeSnap.docs;
        for (let i = 0; i < docsToDelete.length; i++) {
            batch.delete(docsToDelete[i].ref);
            opCount++;
            if (opCount >= 498) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
        }
        if (opCount > 0) await batch.commit();
        return { success: true, count: allTasksToArchive.length, sanon: sanonId };
    } catch (e) { console.error("Weekly closing failed:", e); return { success: false, count: 0, sanon: '' }; }
  };

  const fetchSanons = async () => {
      try {
          const snap = await getDocs(collection(db, 'sanony'));
          return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      } catch (e) { console.error("Error fetching sanons", e); return []; }
  };

  return {
    tasks, draftTasks,
    onAddTask, onUpdateTask, onDeleteTask, onToggleTask, onEditTask, onToggleMissing,
    onSetInProgress, onToggleBlock, onToggleManualBlock, onExhaustSearch, 
    onMarkAsIncorrect, onAddNote, onReleaseTask,
    onStartAudit, onFinishAudit,
    onDailyClosing, onWeeklyClosing, fetchSanons
  };
};