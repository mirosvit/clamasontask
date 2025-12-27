import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  limit,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Task, UserData, DBItem, MapSector, PartRequest, BOMRequest, BreakSchedule, SystemBreak, Role, Permission, Notification, PriorityLevel } from '../types/appTypes';
import { PRIORITY_ORDER } from '../constants/uiConstants';

export const useFirestoreData = (isAuthenticated: boolean, currentUserRole: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [partsMap, setPartsMap] = useState<Record<string, string>>({});
  const [bomMap, setBomMap] = useState<Record<string, any>>({});
  const [workplaces, setWorkplaces] = useState<DBItem[]>([]);
  const [missingReasons, setMissingReasons] = useState<DBItem[]>([]);
  const [logisticsOperations, setLogisticsOperations] = useState<DBItem[]>([]); 
  const [mapSectors, setMapSectors] = useState<MapSector[]>([]);
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [bomRequests, setBomRequests] = useState<BOMRequest[]>([]);
  const [breakSchedules, setBreakSchedules] = useState<BreakSchedule[]>([]);
  const [systemBreaks, setSystemBreaks] = useState<SystemBreak[]>([]);
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const isFirstLoad = useRef(true);
  const rolesRef = useRef<Role[]>([]);
  const permissionsRef = useRef<Permission[]>([]);
  const currentUserRoleRef = useRef(currentUserRole);

  useEffect(() => { rolesRef.current = roles; }, [roles]);
  useEffect(() => { permissionsRef.current = permissions; }, [permissions]);
  useEffect(() => { currentUserRoleRef.current = currentUserRole; }, [currentUserRole]);

  const checkPermissionRef = useCallback((permName: string) => {
      const currentRole = currentUserRoleRef.current;
      if (currentRole === 'ADMIN') return true;
      const r = rolesRef.current.find(ro => ro.name === currentRole);
      if (!r) return false;
      return permissionsRef.current.some(p => p.roleId === r.id && p.permissionName === permName);
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

  useEffect(() => {
    if (!isAuthenticated) return;
    const threshold = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const q = query(collection(db, 'tasks'), where('createdAt', '>=', threshold), limit(300)); 
    
    return onSnapshot(q, (snapshot) => {
      const newTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      if (!isFirstLoad.current) {
          snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                  const task = change.doc.data() as Task;
                  if (task.createdAt && (Date.now() - task.createdAt < 10000)) {
                      if (checkPermissionRef('perm_play_sound')) {
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
  }, [isAuthenticated, checkPermissionRef]);

  useEffect(() => { 
      const unsubUsers = onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({id:d.id, ...d.data()} as UserData))));
      const unsubRoles = onSnapshot(collection(db, 'roles'), s => setRoles(s.docs.map(d => ({id:d.id, ...d.data()} as Role))));
      const unsubPerms = onSnapshot(collection(db, 'permissions'), s => setPermissions(s.docs.map(d => ({id:d.id, ...d.data()} as Permission))));
      const unsubWp = onSnapshot(query(collection(db, 'workplaces'), orderBy('value')), s => setWorkplaces(s.docs.map(d => ({id:d.id, ...d.data()} as DBItem))));
      const unsubReasons = onSnapshot(query(collection(db, 'missing_reasons'), orderBy('value')), s => setMissingReasons(s.docs.map(d => ({id:d.id, value:d.data().value} as DBItem))));
      const unsubSectors = onSnapshot(collection(db, 'map_sectors'), (snapshot) => {
          const sectors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapSector));
          setMapSectors(sectors.sort((a, b) => (a.order || 0) - (b.order || 0)));
      });
      const unsubLogOps = onSnapshot(query(collection(db, 'logistics_operations'), orderBy('value')), s => setLogisticsOperations(s.docs.map(d => ({id:d.id, ...d.data()} as DBItem))));
      const unsubPartReq = onSnapshot(collection(db, 'part_requests'), s => setPartRequests(s.docs.map(d => ({id:d.id, ...d.data()} as PartRequest))));
      const unsubBomReq = onSnapshot(collection(db, 'bom_requests'), s => setBomRequests(s.docs.map(d => ({id:d.id, ...d.data()} as BOMRequest))));
      const unsubSysBreaks = onSnapshot(collection(db, 'system_breaks'), s => setSystemBreaks(s.docs.map(d => ({id:d.id, ...d.data()} as SystemBreak))));
      
      const unsubNotifications = onSnapshot(collection(db, 'notifications'), s => setNotifications(s.docs.map(d => ({id:d.id, ...d.data()} as Notification))));

      return () => { 
        unsubUsers(); unsubRoles(); unsubPerms(); unsubWp(); unsubReasons(); 
        unsubSectors(); unsubLogOps(); unsubPartReq(); unsubBomReq(); unsubSysBreaks();
        unsubNotifications();
      };
  }, []);

  useEffect(() => {
    const unsubParts = onSnapshot(doc(db, 'settings', 'parts'), (s) => {
      if (s.exists()) {
          const raw = s.data().data || [];
          const cleanMap: Record<string, string> = {};
          raw.forEach((item: any) => { if (item.p) cleanMap[item.p] = item.d || ''; });
          setPartsMap(cleanMap);
      }
    });
    const unsubBOM = onSnapshot(doc(db, 'settings', 'bom'), (s) => {
      if (s.exists()) {
          const raw = s.data().data || [];
          const cleanMap: Record<string, any[]> = {};
          raw.forEach((item: any) => {
              if (item.parent && item.child) {
                  if (!cleanMap[item.parent]) cleanMap[item.parent] = [];
                  cleanMap[item.parent].push({ child: item.child, consumption: item.q || 0 });
              }
          });
          setBomMap(cleanMap);
      }
    });
    const unsubBreaks = onSnapshot(doc(db, 'settings', 'breaks'), (s) => {
      if (s.exists()) setBreakSchedules(s.data().data || []);
    });
    return () => { unsubParts(); unsubBOM(); unsubBreaks(); };
  }, []);

  // --- WRITE OPERATIONS ---

  const onAddTask = async (
    partNumber: string,
    workplace: string | null,
    quantity: string | null,
    quantityUnit: string | null,
    priority: PriorityLevel,
    isLogistics: boolean = false,
    note: string = '',
    isProduction: boolean = false
  ) => {
    const createdBy = localStorage.getItem('app_user') || 'Unknown';
    const newTask = {
        text: partNumber, 
        partNumber,
        workplace: workplace || '',
        quantity: quantity || '0',
        quantityUnit: quantityUnit || 'pcs',
        priority,
        isLogistics,
        isProduction,
        note,
        isDone: false,
        isMissing: false,
        createdAt: Date.now(),
        createdBy,
        status: 'open'
    };

    try {
        await addDoc(collection(db, 'tasks'), newTask);
    } catch (e) {
        console.error("Error adding task", e);
    }
  };

  const onUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
        const docRef = doc(db, 'tasks', id);
        await updateDoc(docRef, updates);
    } catch(e) {
        console.error("Error updating task", e);
    }
  };

  const onDeleteTask = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'tasks', id));
    } catch(e) { console.error(e); }
  };

  const onToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if(!task) return;
    const currentUser = localStorage.getItem('app_user') || 'Unknown';
    
    const updates: any = {
        isDone: !task.isDone
    };
    
    if (!task.isDone) {
        updates.completedAt = Date.now();
        updates.completedBy = currentUser;
        updates.status = 'completed';
    } else {
        updates.completedAt = null;
        updates.completedBy = null;
        updates.status = 'open';
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

    if (task.isInProgress) {
        await onUpdateTask(id, { isInProgress: false, inProgressBy: null });
    } else {
        await onUpdateTask(id, { isInProgress: true, inProgressBy: user, startedAt: Date.now() });
    }
  };

  const onToggleBlock = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const user = localStorage.getItem('app_user') || 'Unknown';
    
    if (task.isBlocked) {
        await onUpdateTask(id, { isBlocked: false, blockedBy: null });
    } else {
        await onUpdateTask(id, { isBlocked: true, blockedBy: user });
    }
  };

  const onToggleManualBlock = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await onUpdateTask(id, { isManualBlocked: !task.isManualBlocked });
  };

  const onExhaustSearch = async (id: string) => {
    await onUpdateTask(id, { searchExhausted: true });
  };

  const onMarkAsIncorrect = async (id: string) => {
    const user = localStorage.getItem('app_user') || 'Unknown';
    await onUpdateTask(id, { 
        status: 'incorrectly_entered', 
        isDone: true, 
        completedBy: user, 
        completedAt: Date.now() 
    });
  };

  const onAddNote = async (id: string, note: string) => {
    await onUpdateTask(id, { note });
  };

  const onReleaseTask = async (id: string) => {
    await onUpdateTask(id, { 
        isBlocked: false, 
        isManualBlocked: false, 
        isInProgress: false, 
        inProgressBy: null,
        blockedBy: null
    });
  };

  const onRequestPart = async (part: string) => {
    try {
        const user = localStorage.getItem('app_user') || 'Unknown';
        await addDoc(collection(db, 'part_requests'), {
            partNumber: part,
            requestedBy: user,
            requestedAt: Date.now()
        });
        return true;
    } catch (e) {
        return false;
    }
  };

  const onRequestBOM = async (parent: string) => {
    try {
        const user = localStorage.getItem('app_user') || 'Unknown';
        await addDoc(collection(db, 'bom_requests'), {
            parentPart: parent,
            requestedBy: user,
            requestedAt: Date.now()
        });
        return true;
    } catch (e) {
        return false;
    }
  };

  const onAddNotification = async (notification: Partial<Notification>) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            ...notification,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error("Error adding notification", e);
    }
  };

  const onClearNotification = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
        console.error("Error clearing notification", e);
    }
  };

  return {
    tasks, users, partsMap, bomMap, workplaces, missingReasons, logisticsOperations,
    mapSectors, partRequests, bomRequests, breakSchedules, systemBreaks, isBreakActive,
    roles, permissions, notifications, onClearNotification,
    // Export CRUD
    onAddTask, onUpdateTask, onDeleteTask, onToggleTask, onEditTask, onToggleMissing,
    onSetInProgress, onToggleBlock, onToggleManualBlock, onExhaustSearch, 
    onMarkAsIncorrect, onAddNote, onReleaseTask, onRequestPart, onRequestBOM,
    onAddNotification
  };
};