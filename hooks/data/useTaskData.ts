import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, limit, doc, getDocs } from 'firebase/firestore';
import { Task, PriorityLevel, Notification, ScrapConfig, DBItem } from '../../types/appTypes';
import { PRIORITY_ORDER } from '../../constants/uiConstants';
import { taskService } from '../../services/taskService';

export const useTaskData = (
    isAuthenticated: boolean, 
    checkPermission: (perm: string) => boolean,
    onAddNotification: (n: Partial<Notification>) => void,
    scrapConfig?: ScrapConfig,
    logisticsOperations?: DBItem[]
) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draftTasks, setDraftTasks] = useState<Task[]>([]);
  const isFirstLoad = useRef(true);
  const checkPermissionRef = useRef(checkPermission);

  useEffect(() => { checkPermissionRef.current = checkPermission; }, [checkPermission]);

  // 1. LISTENER PRE ŽIVÉ ÚLOHY
  useEffect(() => {
    if (!isAuthenticated) return;
    const threshold = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const q = query(collection(db, 'tasks'), where('createdAt', '>=', threshold), limit(300)); 
    
    return onSnapshot(q, (snapshot) => {
      const newTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      
      if (!isFirstLoad.current) {
          snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' && checkPermissionRef.current('perm_play_sound')) {
                  const task = change.doc.data() as Task;
                  if (task.createdAt && (Date.now() - task.createdAt < 10000)) {
                      new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3').play().catch(() => {});
                  }
              }
          });
      }
      isFirstLoad.current = false;

      setTasks(newTasks.sort((a, b) => {
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        if (a.isDone) return (b.completedAt || 0) - (a.completedAt || 0);
        if (a.isManualBlocked !== b.isManualBlocked) return (a.isManualBlocked ? 1 : 0) - (b.isManualBlocked ? 1 : 0);
        const pA = PRIORITY_ORDER[a.priority || 'NORMAL'], pB = PRIORITY_ORDER[b.priority || 'NORMAL'];
        return pA !== pB ? pA - pB : (a.createdAt || 0) - (b.createdAt || 0);
      }));
    });
  }, [isAuthenticated]);

  // 2. LISTENER PRE DRAFT
  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'draft'), (s) => {
      setDraftTasks(s.exists() ? (s.data().data || []) : []);
    });
  }, []);

  // 3. WRAPPERS PRE SERVICE
  const onAddTask = useCallback(async (pn: string, wp: string | null, qty: string, unit: string, prio: PriorityLevel, isLog?: boolean, note?: string, isProd?: boolean, src?: string | null, tgt?: string | null) => {
    const user = localStorage.getItem('app_user') || 'Unknown';
    
    // Dynamické priradenie logistickej operácie pre šrot ak je nastavená
    let finalWorkplace = wp || '';
    let finalSource = src || null;
    let finalTarget = tgt || null;

    if (pn === "Váženie šrotu" && scrapConfig?.scrapLogisticsOpId && logisticsOperations) {
        const foundOp = logisticsOperations.find(o => o.id === scrapConfig.scrapLogisticsOpId);
        if (foundOp) {
            finalWorkplace = foundOp.value;
            // Automatické priradenie sektorov z konfigurácie operácie šrotu
            finalSource = foundOp.defaultSourceSectorId || null;
            finalTarget = foundOp.defaultTargetSectorId || null;
        }
    }

    const taskData: any = {
        partNumber: pn || '',
        text: pn || '',
        workplace: finalWorkplace,
        quantity: qty || '0',
        quantityUnit: unit || 'pcs',
        priority: prio || 'NORMAL',
        isLogistics: !!isLog,
        isProduction: !!isProd,
        createdBy: user,
        note: note || '',
        plate: isLog ? (note || '') : '',
        sourceSectorId: finalSource,
        targetSectorId: finalTarget
    };

    // FIX: Ak ide o inventúru alebo šrot, automaticky nastaviť riešiteľa pre odomknutie UI
    if (pn === "Počítanie zásob" || pn === "Váženie šrotu") {
        taskData.isInProgress = true;
        taskData.inProgressBy = user;
        taskData.startedAt = Date.now();
    }
    
    return taskService.addTask(taskData);
  }, [scrapConfig, logisticsOperations]);

  const onUpdateTask = useCallback((id: string, up: Partial<Task>) => taskService.updateTask(id, up), []);
  const onDeleteTask = useCallback((id: string) => taskService.deleteTask(id), []);
  
  const onToggleTask = useCallback(async (id: string, sectorId?: string) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const user = localStorage.getItem('app_user') || 'Unknown';
      const updates: any = { isDone: !task.isDone, completedAt: !task.isDone ? Date.now() : null, completedBy: !task.isDone ? user : null, status: !task.isDone ? 'completed' : 'open' };
      if (!task.isDone && sectorId) updates.pickedFromSectorId = sectorId;
      return taskService.updateTask(id, updates);
  }, [tasks]);

  const onToggleMissing = useCallback(async (id: string, reason?: string) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const user = localStorage.getItem('app_user') || 'Unknown';
      const isMarking = !task.isMissing;
      const updates: any = { isMissing: isMarking, missingReason: isMarking ? (reason || 'Unknown') : null, missingReportedBy: isMarking ? user : null, isInProgress: false, inProgressBy: null };
      if (isMarking && task.createdBy) {
          onAddNotification({ partNumber: task.partNumber, reason: `CHÝBA: ${reason}`, reportedBy: user, targetUser: task.createdBy });
      }
      return taskService.updateTask(id, updates);
  }, [tasks, onAddNotification]);

  const onSetInProgress = useCallback(async (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const user = localStorage.getItem('app_user') || 'Unknown';
      return taskService.updateTask(id, task.isInProgress ? { isInProgress: false, inProgressBy: null } : { isInProgress: true, inProgressBy: user, startedAt: Date.now() });
  }, [tasks]);

  const onToggleBlock = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const user = localStorage.getItem('app_user') || 'Unknown';
    const isCurrentlyBlocked = !!task.isBlocked;
    return taskService.updateTask(id, {
        isBlocked: !isCurrentlyBlocked,
        blockedBy: !isCurrentlyBlocked ? user : null
    });
  }, [tasks]);

  const onExhaustSearch = useCallback(async (id: string) => {
    const user = localStorage.getItem('app_user') || 'Unknown';
    return taskService.updateTask(id, {
        searchExhausted: true,
        searchedBy: user
    });
  }, []);

  const onAddNote = useCallback(async (id: string, note: string) => {
    return taskService.updateTask(id, { note });
  }, []);

  const onMarkAsIncorrect = useCallback(async (id: string) => {
    const user = localStorage.getItem('app_user') || 'Unknown';
    return taskService.updateTask(id, {
        isDone: true,
        status: 'incorrectly_entered',
        completedAt: Date.now(),
        completedBy: user,
        isInProgress: false,
        inProgressBy: null
    });
  }, []);

  const onStartAudit = useCallback((id: string) => taskService.updateTask(id, { isAuditInProgress: true, auditBy: localStorage.getItem('app_user'), isInProgress: false, inProgressBy: null }), []);
  const onFinishAudit = useCallback((id: string, res: 'found' | 'missing', note: string) => {
      const task = tasks.find(t => t.id === id);
      if (task) taskService.finishAudit(task, res, note, localStorage.getItem('app_user') || 'Unknown', onAddNotification);
  }, [tasks, onAddNotification]);

  return {
    tasks, draftTasks, onAddTask, onUpdateTask, onDeleteTask, onToggleTask, onToggleMissing, onSetInProgress, onStartAudit, onFinishAudit, onToggleBlock, onExhaustSearch, onAddNote, onMarkAsIncorrect,
    onToggleManualBlock: (id: string) => { const t = tasks.find(x => x.id === id); if(t) taskService.toggleManualBlock(t); },
    onDailyClosing: taskService.dailyClosing, onWeeklyClosing: taskService.weeklyClosing,
    fetchSanons: async () => (await getDocs(collection(db, 'sanony'))).docs.map(d => d.data())
  };
};