
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
  setDoc,
  getDoc,
  arrayUnion,
  writeBatch,
  getDocs
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
        const cleanMap: Record<string, any[]> = {};
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

    const unsubBreaks = onSnapshot(doc(db, 'settings', 'breaks'), (s) => {
      if (s.exists()) setBreakSchedules(s.data().data || []);
    });
    return () => { unsubParts(); unsubBOM(); unsubBreaks(); };
  }, []);

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

  const onUpdatePermission = async (permissionName: string, roleName: string, hasPermission: boolean) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return;

    try {
        if (hasPermission) {
            await addDoc(collection(db, 'permissions'), {
                roleId: role.id,
                permissionName: permissionName
            });
        } else {
            const q = query(
                collection(db, 'permissions'), 
                where('roleId', '==', role.id), 
                where('permissionName', '==', permissionName)
            );
            const snap = await getDocs(q);
            const batch = writeBatch(db);
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    } catch (e) {
        console.error("Error updating permission", e);
    }
  };

  const onAddRole = async (name: string, parentId?: string, rank: number = 5) => {
    try {
        await addDoc(collection(db, 'roles'), { 
            name: name.toUpperCase(),
            parentId: parentId || null,
            rank: rank,
            isSystem: false
        });
    } catch (e) { console.error(e); }
  };

  const onDeleteRole = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'roles', id));
        const q = query(collection(db, 'permissions'), where('roleId', '==', id));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
    } catch (e) { console.error(e); }
  };

  const onAddPart = async (value: string, description: string = '') => {
      try {
          const newItem = {
              id: `part_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
              value: value.toUpperCase(),
              description,
              createdAt: Date.now()
          };
          await setDoc(doc(db, 'settings', 'parts'), {
              items: arrayUnion(newItem)
          }, { merge: true });
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
                id: `part_${Date.now()}_${Math.random().toString(36).substr(2,9)}_${itemsToAdd.length}`,
                value: p.trim().toUpperCase(),
                description: d ? d.trim() : '',
                createdAt: Date.now()
            });
        }
      });
      
      if (itemsToAdd.length > 0) {
          await setDoc(doc(db, 'settings', 'parts'), {
              items: arrayUnion(...itemsToAdd)
          }, { merge: true });
      }
    } catch (error) {
      console.error("Error batch adding parts:", error);
      throw error;
    }
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

  const onDeleteAllParts = async () => {
      try {
          await setDoc(doc(db, 'settings', 'parts'), { items: [] });
      } catch (e) { console.error("Error clearing parts:", e); }
  };

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

  const onAddMissingReason = async (val: string) => {
      await addDoc(collection(db, 'missing_reasons'), { value: val });
  };
  const onDeleteMissingReason = async (id: string) => {
      await deleteDoc(doc(db, 'missing_reasons', id));
  };

  const onAddLogisticsOperation = async (val: string, time: number = 0, dist: number = 0) => {
      await addDoc(collection(db, 'logistics_operations'), { value: val, standardTime: time, distancePx: dist });
  };
  const onUpdateLogisticsOperation = async (id: string, updates: Partial<DBItem>) => {
      await updateDoc(doc(db, 'logistics_operations', id), updates);
  };
  const onDeleteLogisticsOperation = async (id: string) => {
      await deleteDoc(doc(db, 'logistics_operations', id));
  };

  const onAddUser = async (user: UserData) => {
      await addDoc(collection(db, 'users'), user);
  };
  const onUpdatePassword = async (username: string, newPass: string) => {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      snap.forEach(d => updateDoc(d.ref, { password: newPass }));
  };
  const onUpdateNickname = async (username: string, newNick: string) => {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      snap.forEach(d => updateDoc(d.ref, { nickname: newNick }));
  };
  const onUpdateUserRole = async (username: string, newRole: string) => {
    if (username.toUpperCase() === 'ADMIN') return;
    try {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => batch.update(d.ref, { role: newRole }));
        await batch.commit();
    } catch (e) {
        console.error("Error updating user role", e);
    }
  };
  const onUpdateExportPermission = async (username: string, canExport: boolean) => {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      snap.forEach(d => updateDoc(d.ref, { canExportAnalytics: canExport }));
  };
  const onDeleteUser = async (username: string) => {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
  };

  const onAddMapSector = async (name: string, x: number, y: number, color?: string) => {
      await addDoc(collection(db, 'map_sectors'), { name, coordX: x, coordY: y, color });
  };
  const onUpdateMapSector = async (id: string, updates: Partial<MapSector>) => {
      await updateDoc(doc(db, 'map_sectors', id), updates);
  };
  const onDeleteMapSector = async (id: string) => {
      await deleteDoc(doc(db, 'map_sectors', id));
  };

  const onAddBOMItem = async (parent: string, child: string, qty: number) => {
      try {
          const newItem = {
              id: `bom_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
              parent: parent.toUpperCase(),
              child: child.toUpperCase(),
              consumption: qty,
              createdAt: Date.now()
          };
          await setDoc(doc(db, 'settings', 'bom'), {
              items: arrayUnion(newItem)
          }, { merge: true });
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
                      id: `bom_${Date.now()}_${Math.random().toString(36).substr(2,9)}_${itemsToAdd.length}`,
                      parent: p.trim().toUpperCase(),
                      child: c.trim().toUpperCase(),
                      consumption: parseFloat(q?.replace(',', '.') || '0'),
                      createdAt: Date.now()
                  });
              }
          });
          
          if (itemsToAdd.length > 0) {
              await setDoc(doc(db, 'settings', 'bom'), {
                  items: arrayUnion(...itemsToAdd)
              }, { merge: true });
          }
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

  const onDeleteAllBOMItems = async () => {
      try {
          await setDoc(doc(db, 'settings', 'bom'), { items: [] });
      } catch (e) { console.error(e); }
  };

  return {
    tasks, users, partsMap, bomMap, workplaces, missingReasons, logisticsOperations,
    mapSectors, partRequests, bomRequests, breakSchedules, systemBreaks, isBreakActive,
    roles, permissions, notifications, onClearNotification,
    onAddTask, onUpdateTask, onDeleteTask, onToggleTask, onEditTask, onToggleMissing,
    onSetInProgress, onToggleBlock, onToggleManualBlock, onExhaustSearch, 
    onMarkAsIncorrect, onAddNote, onReleaseTask, onRequestPart, onRequestBOM,
    onAddNotification,
    onAddPart, onBatchAddParts, onDeletePart, onDeleteAllParts,
    onAddWorkplace, onUpdateWorkplace, onDeleteWorkplace, onDeleteAllWorkplaces, onBatchAddWorkplaces,
    onAddMissingReason, onDeleteMissingReason,
    onAddLogisticsOperation, onUpdateLogisticsOperation, onDeleteLogisticsOperation,
    onAddMapSector, onUpdateMapSector, onDeleteMapSector,
    onAddUser, onUpdatePassword, onUpdateNickname, onUpdateUserRole, onUpdateExportPermission, onDeleteUser,
    onAddBOMItem, onBatchAddBOMItems, onDeleteBOMItem, onDeleteAllBOMItems,
    onUpdatePermission, onAddRole, onDeleteRole
  };
};
