
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc, query, where } from 'firebase/firestore';
import { Task, PriorityLevel, Notification } from '../types/appTypes';

/**
 * Získanie ID aktuálneho týždňa pre šanón.
 */
export const getISOWeekId = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `SANON_${date.getFullYear()}_${weekNumber.toString().padStart(2, '0')}`;
};

export const taskService = {
  async addTask(data: Partial<Task>) {
    return await addDoc(collection(db, 'tasks'), {
      ...data,
      createdAt: Date.now(),
      status: data.partNumber === "Počítanie zásob" ? 'unpacked' : 'open',
      isDone: false,
      isMissing: false
    });
  },

  async updateTask(id: string, updates: Partial<Task>) {
    return await updateDoc(doc(db, 'tasks', id), updates);
  },

  async deleteTask(id: string) {
    return await deleteDoc(doc(db, 'tasks', id));
  },

  async toggleManualBlock(task: Task) {
    const newState = !task.isManualBlocked;
    const updates: any = { isManualBlocked: newState };
    if (newState) {
        updates.isInProgress = false;
        updates.inProgressBy = null;
        updates.priority = 'LOW';
    } else {
        updates.createdAt = Date.now();
    }
    return await this.updateTask(task.id, updates);
  },

  async finishAudit(task: Task, result: 'found' | 'missing', note: string, auditor: string, onNotif: (n: Partial<Notification>) => void) {
    const badgeText = result === 'found' ? `AUDIT (OK) - ${note}` : `AUDIT (NOK) - ${note}`;
    const updates: any = { 
        isAuditInProgress: false, 
        auditFinalBadge: badgeText, 
        auditBy: null, 
        auditResult: result === 'found' ? 'OK' : 'NOK', 
        auditNote: note, 
        auditedBy: auditor, 
        auditedAt: Date.now() 
    };

    if (result === 'found') { 
        updates.isMissing = false; 
    } else { 
        updates.isDone = true; 
        updates.status = 'audit_error'; 
        updates.completedBy = auditor; 
        updates.completedAt = Date.now(); 
        updates.isInProgress = false; 
    }
    
    await this.updateTask(task.id, updates);

    if (task.createdBy) {
        onNotif({ 
            partNumber: task.partNumber || 'Unknown', 
            reason: `AUDIT: ${result.toUpperCase()} - ${note}`, 
            reportedBy: auditor, 
            targetUser: task.createdBy 
        });
    }
  },

  async dailyClosing() {
    const q = query(collection(db, 'tasks'), where('isDone', '==', true));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { success: true, count: 0 };

    const completedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const draftRef = doc(db, 'settings', 'draft');
    const draftSnap = await getDoc(draftRef);
    const existingData = draftSnap.exists() ? (draftSnap.data().data || []) : [];
    
    const batch = writeBatch(db);
    batch.set(draftRef, { data: [...existingData, ...completedTasks] }, { merge: true });
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    
    return { success: true, count: completedTasks.length };
  },

  async weeklyClosing() {
    const sanonId = getISOWeekId();
    const draftRef = doc(db, 'settings', 'draft');
    const draftSnap = await getDoc(draftRef);
    const draftTasks = draftSnap.exists() ? (draftSnap.data().data || []) : [];
    
    const q = query(collection(db, 'tasks'), where('isDone', '==', true));
    const activeSnap = await getDocs(q);
    const activeTasks = activeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const allToArchive = [...draftTasks, ...activeTasks];
    if (allToArchive.length === 0) return { success: true, count: 0, sanon: sanonId };

    const batch = writeBatch(db);
    batch.set(doc(db, 'sanony', sanonId), { tasks: allToArchive, createdAt: Date.now(), id: sanonId });
    batch.set(draftRef, { data: [] });
    activeSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    return { success: true, count: allToArchive.length, sanon: sanonId };
  }
};
