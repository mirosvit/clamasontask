
import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import PartSearchScreen from './components/PartSearchScreen';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  writeBatch,
  getDocs,
  where,
  limit,
  setDoc,
  deleteField,
  increment,
  getCountFromServer
} from 'firebase/firestore';

export interface UserData {
  id?: string;
  username: string;
  password: string;
  role: 'ADMIN' | 'USER' | 'LEADER';
  nickname?: string;
  canExportAnalytics?: boolean;
}

export interface DBItem {
  id: string;
  value: string;
  standardTime?: number;
  description?: string;
}

export type PriorityLevel = 'LOW' | 'NORMAL' | 'URGENT';

export interface InventorySession {
    start: number;
    end?: number;
}

export interface Task {
  id: string; 
  text: string;
  partNumber?: string;
  workplace?: string;
  quantity?: string;
  quantityUnit?: string;
  standardTime?: number;
  isDone: boolean;
  priority?: PriorityLevel; 
  completionTime?: string;
  completedBy?: string | null;
  status?: 'completed' | 'incorrectly_entered';
  isMissing?: boolean;
  missingReportedBy?: string | null;
  missingReason?: string;
  isInProgress?: boolean;
  inProgressBy?: string | null;
  createdAt?: number; 
  createdBy?: string;
  startedAt?: number; 
  completedAt?: number; 
  note?: string;
  isBlocked?: boolean; 
  blockedBy?: string | null; 
  isManualBlocked?: boolean; 
  inventoryHistory?: InventorySession[];
  isLogistics?: boolean; 
  isAuditInProgress?: boolean;
  auditBy?: string | null;
  auditFinalBadge?: string | null;
  auditedBy?: string | null;
  auditedAt?: number | null;
  auditResult?: 'OK' | 'NOK' | null;
  auditNote?: string | null;
  expireAt?: number;
  searchExhausted?: boolean;
  searchedBy?: string | null;
}

export interface Notification {
    id: string;
    partNumber: string;
    reason: string;
    reportedBy: string;
    targetUser: string; 
    timestamp: number;
}

export interface PartRequest {
    id: string;
    partNumber: string;
    requestedBy: string;
    requestedAt: number;
}

export interface BreakSchedule {
    id: string;
    start: string;
    end: string;
}

export interface SystemBreak {
    id: string;
    start: number;
    end?: number;
    isActive: boolean;
}

export interface BOMComponent {
    child: string;
    consumption: number;
}

export interface BOMItem {
    id: string;
    parentPart: string;
    childPart: string;
    quantity: number;
}

export interface BOMRequest {
    id: string;
    parentPart: string;
    requestedBy: string;
    requestedAt: number;
}

export interface Role {
    id: string;
    name: string;
    isSystem?: boolean;
}

export interface Permission {
    id: string;
    roleId: string;
    permissionName: string;
}

export interface SystemConfig {
    maintenanceMode: boolean;
    maintenanceStart?: string;
    maintenanceEnd?: string;
    allowedIPs: string[];
    ipCheckEnabled: boolean;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<'ADMIN' | 'USER' | 'LEADER'>('USER');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  
  // Lokálne mapy pre rýchly prístup v UI
  const [partsMap, setPartsMap] = useState<Record<string, string>>({});
  const [bomMap, setBomMap] = useState<Record<string, BOMComponent[]>>({});
  
  const [workplaces, setWorkplaces] = useState<DBItem[]>([]);
  const [missingReasons, setMissingReasons] = useState<DBItem[]>([]);
  const [logisticsOperations, setLogisticsOperations] = useState<DBItem[]>([]); 
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [breakSchedules, setBreakSchedules] = useState<BreakSchedule[]>([]);
  const [systemBreaks, setSystemBreaks] = useState<SystemBreak[]>([]);
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [bomRequests, setBomRequests] = useState<BOMRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
      maintenanceMode: false,
      allowedIPs: [],
      ipCheckEnabled: false
  });
  const [dbLoadWarning, setDbLoadWarning] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const isFirstLoad = useRef(true);
  const rolesRef = useRef<Role[]>([]);
  const permissionsRef = useRef<Permission[]>([]);
  const currentUserRoleRef = useRef(currentUserRole);

  useEffect(() => { rolesRef.current = roles; }, [roles]);
  useEffect(() => { permissionsRef.current = permissions; }, [permissions]);
  useEffect(() => { currentUserRoleRef.current = currentUserRole; }, [currentUserRole]);

  const checkPermissionRef = (permName: string) => {
      const currentRole = currentUserRoleRef.current;
      if (currentRole === 'ADMIN') return true;
      const r = rolesRef.current.find(ro => ro.name === currentRole);
      if (!r) return false;
      return permissionsRef.current.some(p => p.roleId === r.id && p.permissionName === permName);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    const storedRole = localStorage.getItem('app_role');
    if (storedUser && storedRole) {
      setCurrentUser(storedUser);
      setCurrentUserRole(storedRole as any);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleLogout = () => { setIsAuthenticated(false); setCurrentUser(''); setCurrentUserRole('USER'); localStorage.removeItem('app_user'); localStorage.removeItem('app_role'); };

  useEffect(() => {
      const configRef = doc(db, 'system_data', 'config');
      return onSnapshot(configRef, (docSnap) => {
          if (docSnap.exists()) {
              setSystemConfig(docSnap.data() as SystemConfig);
          } else {
              setDoc(configRef, { maintenanceMode: false, allowedIPs: [], ipCheckEnabled: false });
          }
      });
  }, []);

  useEffect(() => {
      if (isAuthenticated && currentUserRole !== 'ADMIN') {
          const now = new Date();
          const currentISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
          const isScheduledMaintenance = systemConfig.maintenanceStart && systemConfig.maintenanceEnd && 
                                         currentISO >= systemConfig.maintenanceStart && 
                                         currentISO <= systemConfig.maintenanceEnd;
          if (systemConfig.maintenanceMode || isScheduledMaintenance) {
              handleLogout();
              alert('Systém prešiel do servisného módu. Boli ste odhlásení.');
          }
      }
  }, [systemConfig, isAuthenticated, currentUserRole]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, 'tasks'), limit(500)); 
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
      const priorityOrder: Record<string, number> = { 'URGENT': 0, 'NORMAL': 1, 'LOW': 2 };
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
        const pA = priorityOrder[a.priority || 'NORMAL'];
        const pB = priorityOrder[b.priority || 'NORMAL'];
        if (pA !== pB) return pA - pB;
        return (a.createdAt || 0) - (b.createdAt || 0); 
      });
      setTasks(sortedTasks);
    });
  }, [isAuthenticated]);

  useEffect(() => { 
      const unsubUsers = onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({id:d.id, ...d.data()} as UserData))));
      const unsubRoles = onSnapshot(collection(db, 'roles'), s => setRoles(s.docs.map(d => ({id:d.id, ...d.data()} as Role))));
      const unsubPerms = onSnapshot(collection(db, 'permissions'), s => setPermissions(s.docs.map(d => ({id:d.id, ...d.data()} as Permission))));
      return () => { unsubUsers(); unsubRoles(); unsubPerms(); };
  }, []);

  // NAČÍTANIE KYBLÍKOV - KONVERZIA POĽA NA MAPU
  useEffect(() => {
    const unsubParts = onSnapshot(doc(db, 'settings', 'parts'), (s) => {
      if (s.exists()) {
          const raw = s.data().data || [];
          const cleanMap: Record<string, string> = {};
          raw.forEach((item: any) => {
              if (item.p) cleanMap[item.p] = item.d || '';
          });
          setPartsMap(cleanMap);
      } else {
          setDoc(doc(db, 'settings', 'parts'), { data: [] });
      }
    });

    const unsubBOM = onSnapshot(doc(db, 'settings', 'bom'), (s) => {
      if (s.exists()) {
          const raw = s.data().data || [];
          const cleanMap: Record<string, BOMComponent[]> = {};
          raw.forEach((item: any) => {
              if (item.parent && item.child) {
                  if (!cleanMap[item.parent]) cleanMap[item.parent] = [];
                  cleanMap[item.parent].push({ child: item.child, consumption: item.q || 0 });
              }
          });
          setBomMap(cleanMap);
      } else {
          setDoc(doc(db, 'settings', 'bom'), { data: [] });
      }
    });
    return () => { unsubParts(); unsubBOM(); };
  }, []);

  useEffect(() => { return onSnapshot(query(collection(db, 'workplaces'), orderBy('value')), s => setWorkplaces(s.docs.map(d => ({id:d.id, value:d.data().value, standardTime:d.data().standardTime} as DBItem)))); }, []);
  useEffect(() => { return onSnapshot(query(collection(db, 'missing_reasons'), orderBy('value')), s => setMissingReasons(s.docs.map(d => ({id:d.id, value:d.data().value} as DBItem)))); }, []);
  useEffect(() => { return onSnapshot(query(collection(db, 'break_schedules')), s => setBreakSchedules(s.docs.map(d => ({id:d.id, ...d.data()} as BreakSchedule)))); }, []);

  useEffect(() => { 
      return onSnapshot(query(collection(db, 'logistics_operations'), orderBy('value')), async (s) => {
          if (s.empty && !s.metadata.fromCache) {
               const defaults = ['VYKLÁDKA', 'NAKLÁDKA', 'ZASKLADNENIE', 'INTERNÝ PRESUN'];
               const batch = writeBatch(db);
               defaults.forEach(op => batch.set(doc(collection(db, 'logistics_operations')), { value: op, standardTime: 0 }));
               await batch.commit();
          } else {
              const ops = s.docs.map(d => ({id:d.id, value:d.data().value, standardTime: d.data().standardTime} as DBItem));
              setLogisticsOperations(ops);
          }
      }); 
  }, []);

  useEffect(() => { const q = query(collection(db, 'part_requests')); return onSnapshot(q, s => setPartRequests(s.docs.map(d => ({id:d.id, ...d.data()} as PartRequest)))); }, []);
  useEffect(() => { const q = query(collection(db, 'bom_requests')); return onSnapshot(q, s => setBomRequests(s.docs.map(d => ({id:d.id, ...d.data()} as BOMRequest)))); }, []);
  
  useEffect(() => { 
      if (!isAuthenticated || !currentUser) return;
      const q = query(collection(db, 'notifications'), where('targetUser', '==', currentUser)); 
      return onSnapshot(q, s => setNotifications(s.docs.map(d => ({id:d.id, ...d.data()} as Notification)))); 
  }, [isAuthenticated, currentUser]);
  
  useEffect(() => { 
      const q = query(collection(db, 'system_breaks')); 
      return onSnapshot(q, s => {
          const breaks = s.docs.map(d => ({id:d.id, ...d.data()} as SystemBreak));
          setSystemBreaks(breaks);
          setIsBreakActive(breaks.some(b => b.isActive));
      }); 
  }, []);

  const handleLogin = (u: string, r: any) => { setIsAuthenticated(true); setCurrentUser(u); setCurrentUserRole(r); localStorage.setItem('app_user', u); localStorage.setItem('app_role', r); };
  const handleAddUser = async (u: UserData) => { await addDoc(collection(db, 'users'), { ...u, canExportAnalytics: u.canExportAnalytics || false }); };
  const handleUpdatePassword = async (u: string, p: string) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {password: p}); } };
  const handleUpdateNickname = async (u: string, n: string) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {nickname: n}); } };
  const handleUpdateExportPermission = async (u: string, canExport: boolean) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {canExportAnalytics: canExport}); } };
  const handleUpdateUserRole = async (u: string, r: any) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {role: r}); } };
  const handleDeleteUser = async (u: string) => { const user = users.find(us => us.username === u); if(user) { await deleteDoc(doc(db,'users', user.id!)); } };
  
  // LOGIKA KYBLÍKOV - DIELY (UKLADANIE AKO POLE OBJEKTOV)
  const handleAddPart = async (v: string, desc?: string) => { 
    const updatedMap = { ...partsMap, [v.trim()]: desc || '' };
    const dataArray = Object.entries(updatedMap).map(([p, d]) => ({ p, d }));
    await setDoc(doc(db, 'settings', 'parts'), { data: dataArray });
  };
  const handleBatchAddParts = async (vs: string[]) => { 
    const updatedMap = { ...partsMap };
    vs.forEach(line => {
      const [val, desc] = line.split(';');
      if (val) updatedMap[val.trim()] = desc ? desc.trim() : '';
    });
    const dataArray = Object.entries(updatedMap).map(([p, d]) => ({ p, d }));
    await setDoc(doc(db, 'settings', 'parts'), { data: dataArray });
  };
  const handleDeletePart = async (partValue: string) => { 
    const updatedMap = { ...partsMap };
    delete updatedMap[partValue];
    const dataArray = Object.entries(updatedMap).map(([p, d]) => ({ p, d }));
    await setDoc(doc(db, 'settings', 'parts'), { data: dataArray });
  };
  const handleDeleteAllParts = async () => { 
    await setDoc(doc(db, 'settings', 'parts'), { data: [] }); 
  };

  // LOGIKA KYBLÍKOV - BOM (UKLADANIE AKO POLE OBJEKTOV)
  const handleAddBOMItem = async (p: string, c: string, q: number) => { 
    const updatedMap = { ...bomMap };
    const current = updatedMap[p] || [];
    updatedMap[p] = [...current.filter(item => item.child !== c), { child: c, consumption: Number(q.toFixed(5)) }];
    
    // Sploštenie mapy na pole pre Firestore
    const dataArray: any[] = [];
    Object.entries(updatedMap).forEach(([parent, components]) => {
        components.forEach(comp => {
            dataArray.push({ parent, child: comp.child, q: comp.consumption });
        });
    });
    await setDoc(doc(db, 'settings', 'bom'), { data: dataArray });
  };
  const handleBatchAddBOMItems = async (vs: string[]) => { 
    const updatedMap = { ...bomMap };
    vs.forEach(l => {
      const [p, c, q] = l.split(';');
      if (p && c && q) {
        const parent = p.trim();
        if (!updatedMap[parent]) updatedMap[parent] = [];
        const sanitizedQty = Number(parseFloat(q.trim().replace(',', '.')).toFixed(5));
        updatedMap[parent] = [...updatedMap[parent].filter(x => x.child !== c.trim()), { child: c.trim(), consumption: sanitizedQty }];
      }
    });
    const dataArray: any[] = [];
    Object.entries(updatedMap).forEach(([parent, components]) => {
        components.forEach(comp => {
            dataArray.push({ parent, child: comp.child, q: comp.consumption });
        });
    });
    await setDoc(doc(db, 'settings', 'bom'), { data: dataArray });
  };
  const handleDeleteBOMItem = async (parent: string, child: string) => { 
    const updatedMap = { ...bomMap };
    if (updatedMap[parent]) {
        updatedMap[parent] = updatedMap[parent].filter(item => item.child !== child);
        if (updatedMap[parent].length === 0) delete updatedMap[parent];
    }
    const dataArray: any[] = [];
    Object.entries(updatedMap).forEach(([pKey, components]) => {
        components.forEach(comp => {
            dataArray.push({ parent: pKey, child: comp.child, q: comp.consumption });
        });
    });
    await setDoc(doc(db, 'settings', 'bom'), { data: dataArray });
  };
  const handleDeleteAllBOMItems = async () => { 
    await setDoc(doc(db, 'settings', 'bom'), { data: [] }); 
  };

  const handleAddWorkplace = async (v: string, t?: number) => { await addDoc(collection(db, 'workplaces'), {value:v, standardTime:t||0}); };
  const handleBatchAddWorkplaces = async (vs: string[]) => { const b=writeBatch(db); vs.forEach(l=>{const [v,t]=l.split(';'); if(v) b.set(doc(collection(db,'workplaces')), {value:v.trim(), standardTime: parseInt(t)||0})}); await b.commit(); };
  const handleDeleteWorkplace = async (id: string) => { await deleteDoc(doc(db,'workplaces',id)); };
  const handleDeleteAllWorkplaces = async () => { const s=await getDocs(collection(db,'workplaces')); const b=writeBatch(db); s.forEach(d=>b.delete(d.ref)); await b.commit(); };
  const handleAddMissingReason = async (v: string) => { await addDoc(collection(db,'missing_reasons'), {value:v}); };
  const handleDeleteMissingReason = async (id: string) => { await deleteDoc(doc(db,'missing_reasons',id)); };
  const handleAddLogisticsOperation = async (v: string, t?: number) => { await addDoc(collection(db,'logistics_operations'), {value:v, standardTime: t || 0}); };
  const handleDeleteLogisticsOperation = async (id: string) => { await deleteDoc(doc(db,'logistics_operations',id)); };
  const handleDeleteMissingItem = (id: string) => deleteDoc(doc(db,'tasks',id));
  const handleAddBreakSchedule = async (s:string, e:string) => { await addDoc(collection(db,'break_schedules'), {start:s, end:e}); };
  const handleDeleteBreakSchedule = async (id: string) => { await deleteDoc(doc(db,'break_schedules',id)); };
  const handleRequestBOM = async (p: string) => { await addDoc(collection(db,'bom_requests'), {parentPart:p, requestedBy:currentUser, requestedAt:Date.now()}); return true; };
  const handleApproveBOMRequest = (r: BOMRequest) => deleteDoc(doc(db,'bom_requests',r.id));
  const handleRejectBOMRequest = (id: string) => deleteDoc(doc(db,'bom_requests',id));
  const handleAddRole = async (n:string) => { const nameUpper = n.toUpperCase(); if (roles.some(r => r.name === nameUpper)) { alert("Rola s týmto názvom už existuje!"); return; } await addDoc(collection(db,'roles'), {name:nameUpper, isSystem:false}); };
  const handleDeleteRole = async (id:string) => { await deleteDoc(doc(db,'roles',id)); const s=await getDocs(query(collection(db,'permissions'), where('roleId','==',id))); const b=writeBatch(db); s.forEach(d=>b.delete(d.ref)); await b.commit(); };
  const handleUpdatePermission = async (pid:string, rname:string, has:boolean) => { const r=roles.find(ro=>ro.name===rname); if(!r)return; if(has) await addDoc(collection(db,'permissions'), {roleId:r.id, permissionName:pid}); else { const p=permissions.find(perm=>perm.roleId===r.id && perm.permissionName===pid); if(p) await deleteDoc(doc(db,'permissions',p.id)); } };
  const handleVerifyAdminPassword = (password: string) => { return users.some(u => u.role === 'ADMIN' && u.password === password); };
  const handleRequestNewPart = async (p: string) => { await addDoc(collection(db,'part_requests'), {partNumber:p, requestedBy:currentUser, requestedAt:Date.now()}); return true; };
  const handleApprovePartRequest = (req: PartRequest) => { handleAddPart(req.partNumber); deleteDoc(doc(db,'part_requests',req.id)); };
  const handleRejectPartRequest = (id: string) => deleteDoc(doc(db,'part_requests',id));

  const handleAddTask = async (pn: string, wp: string | null, qty: string | null, unit: string | null, prio: PriorityLevel, isLogistics: boolean = false, note?: string) => {
    // LOGIKA ZAMYKANIA JEDNOTIEK (UNIT LOCK) PODĽA POPISU
    let finalUnit = unit;
    const description = partsMap[pn];
    if (description) {
        if (description.includes('S0001S')) finalUnit = 'pcs';
        else if (description.includes('S0002S')) finalUnit = 'boxes';
        else if (description.includes('S0003S')) finalUnit = 'pallet';
    }

    const formattedDate = new Date().toLocaleString('sk-SK');
    let fQty = qty || ''; 
    if(finalUnit === 'boxes') fQty = `${qty} box`; 
    if(finalUnit === 'pallet') fQty = `${qty} pal`;
    
    let text = `${formattedDate} / ${pn}`; 
    if (wp) text += ` / ${wp}`; 
    if (fQty) text += ` / Počet: ${fQty}`;
    if (note) text += ` / Pozn: ${note}`;

    let finalStandardTime = 0;
    if (!isLogistics) {
        const wpObj = workplaces.find(w => w.value === wp);
        finalStandardTime = wpObj?.standardTime || 0;
        if (finalUnit === 'pallet' && qty) {
            const numericQty = parseFloat(qty.replace(',', '.'));
            if (!isNaN(numericQty) && numericQty > 0) finalStandardTime = Math.round(finalStandardTime * numericQty);
        }
    } else {
        const opObj = logisticsOperations.find(op => op.value === wp); 
        finalStandardTime = opObj?.standardTime || 0;
        if (qty) {
            const numericQty = parseFloat(qty.replace(',', '.'));
            if (!isNaN(numericQty) && numericQty > 0) finalStandardTime = Math.round(finalStandardTime * numericQty);
        }
    }
    const isInventoryTask = pn === "Počítanie zásob";
    const now = Date.now();
    await addDoc(collection(db, 'tasks'), { text, partNumber: pn, workplace: wp, quantity: qty, quantityUnit: finalUnit, standardTime: finalStandardTime, isDone:false, priority:prio, createdAt:now, createdBy:currentUser, isLogistics, isInProgress: isInventoryTask, inProgressBy: isInventoryTask ? currentUser : null, startedAt: isInventoryTask ? now : null, note: note || null, expireAt: now + (90 * 24 * 60 * 60 * 1000) });
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => { await updateDoc(doc(db, 'tasks', id), updates); };
  const handleToggleTask = async (id: string) => {
    const t = tasks.find(x => x.id === id);
    if(t) {
        const newState = !t.isDone;
        await updateDoc(doc(db,'tasks',id), { isDone:newState, status:newState?'completed':null, completionTime:newState?new Date().toLocaleTimeString('sk-SK'):null, completedBy:newState?currentUser:null, completedAt:newState?Date.now():null, isInProgress:false, inProgressBy:null, isBlocked:false, isManualBlocked: false, isAuditInProgress: false, auditBy: null });
    }
  };
  const handleMarkAsIncorrect = async (id: string) => updateDoc(doc(db,'tasks',id), { isDone:true, status:'incorrectly_entered', completionTime:new Date().toLocaleTimeString('sk-SK'), completedBy:currentUser, completedAt:Date.now(), isInProgress:false, inProgressBy:null, isBlocked:false, isManualBlocked: false, isAuditInProgress: false, auditBy: null });
  const handleSetInProgress = async (id: string) => { const t = tasks.find(x=>x.id===id); if(t) updateDoc(doc(db,'tasks',id), { isInProgress:!t.isInProgress, inProgressBy:!t.isInProgress?currentUser:null, startedAt:(!t.isInProgress && !t.startedAt)?Date.now():t.startedAt }); };
  const handleAddNote = (id:string, n:string) => updateDoc(doc(db,'tasks',id), {note:n});
  const handleReleaseTask = (id:string) => updateDoc(doc(db,'tasks',id), {isInProgress:false, inProgressBy:null});
  const handleEditTask = (id:string, txt:string, prio?:PriorityLevel) => updateDoc(doc(db,'tasks',id), {text:txt, priority:prio});
  const handleDeleteTask = (id:string) => deleteDoc(doc(db,'tasks',id));
  
  const handleToggleMissing = async (id:string, reason?:string) => { 
      const t=tasks.find(x=>x.id===id); 
      if(t) {
          const isMissing = !t.isMissing;
          await updateDoc(doc(db,'tasks',id), { 
              isMissing, 
              missingReportedBy: isMissing?currentUser:null, 
              missingReason: isMissing?(reason||'Iné'):null, 
              isInProgress: false, 
              inProgressBy: null, 
              isBlocked: false, 
              blockedBy: null, 
              searchedBy: isMissing ? (t.searchedBy || null) : null,
              isManualBlocked: false, 
              isAuditInProgress: false, 
              auditBy: null 
          });
          if (isMissing && t.createdBy && t.createdBy !== currentUser) {
              await addDoc(collection(db, 'notifications'), { 
                  partNumber: t.partNumber || 'Unknown', 
                  reason: reason || 'Iné', 
                  reportedBy: currentUser, 
                  targetUser: t.createdBy, 
                  timestamp: Date.now() 
              });
          }
      } 
  };
  
  const handleClearNotification = (id: string) => deleteDoc(doc(db, 'notifications', id));
  const handleToggleBlock = async (id: string) => {
      const t=tasks.find(x=>x.id===id);
      if(t) {
          const isBlocked = !t.isBlocked;
          const hist = t.inventoryHistory ? [...t.inventoryHistory] : [];
          if(isBlocked) hist.push({start:Date.now()}); else { const last=hist[hist.length-1]; if(last && !last.end) last.end=Date.now(); }
          
          const u = users.find(x => x.username === currentUser);
          const nickname = u?.nickname || currentUser;

          updateDoc(doc(db,'tasks',id), { 
              isBlocked, 
              blockedBy: isBlocked ? currentUser : null, 
              searchedBy: isBlocked ? nickname : (t.searchedBy || null),
              inventoryHistory:hist 
          });
      }
  };
  const handleToggleManualBlock = async (id: string) => {
      const t = tasks.find(x => x.id === id);
      if (t) {
          const newState = !t.isManualBlocked;
          await updateDoc(doc(db, 'tasks', id), { isManualBlocked: newState, createdAt: !newState ? Date.now() : t.createdAt, isInProgress: false, inProgressBy: null });
      }
  };
  const handleExhaustSearch = async (id: string) => {
      await updateDoc(doc(db, 'tasks', id), { searchExhausted: true, isBlocked: false, blockedBy: null });
  };
  
  const handleStartAudit = async (id: string) => { 
      const u = users.find(x => x.username === currentUser);
      const name = (u?.nickname || currentUser);
      await updateDoc(doc(db, 'tasks', id), { isAuditInProgress: true, auditBy: name }); 
  };

  const handleFinishAudit = async (id: string, result: 'found' | 'missing', note: string) => {
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      
      const u = users.find(x => x.username === currentUser);
      const displayName = (u?.nickname || currentUser).toUpperCase();
      
      const statusLabel = result === 'found' ? 'OK' : 'CHÝBA';
      const badgeText = `AUDIT ${statusLabel}: ${note} (${displayName})`;
      
      const auditData = { 
          auditedBy: currentUser, 
          auditedAt: Date.now(), 
          auditResult: result === 'found' ? 'OK' : 'NOK', 
          auditNote: note, 
          isAuditInProgress: false, 
          auditBy: null, 
          auditFinalBadge: badgeText 
      };
      if (result === 'found') {
          await updateDoc(doc(db, 'tasks', id), { ...auditData, isMissing: false });
      } else {
          await updateDoc(doc(db, 'tasks', id), { 
              ...auditData, 
              isDone: true, 
              status: 'completed', 
              completionTime: new Date().toLocaleTimeString('sk-SK'), 
              completedBy: currentUser, 
              completedAt: Date.now() 
          });
      }
      if (t.createdBy && t.createdBy !== currentUser) {
          await addDoc(collection(db, 'notifications'), { partNumber: t.partNumber || 'N/A', reason: `AUDIT DOKONČENÝ (${statusLabel}): ${note}`, reportedBy: currentUser, targetUser: t.createdBy, timestamp: Date.now() });
      }
  };
  
  const handleDailyClosing = async () => {
      const q = query(collection(db, 'tasks'), where('isDone', '==', true));
      const s = await getDocs(q);
      if (s.empty) return { success: true, count: 0 };
      const batch = writeBatch(db);
      s.docs.forEach(d => {
          batch.set(doc(collection(db, 'archive_drafts')), { ...d.data(), archivedAt: Date.now() });
          batch.delete(d.ref);
      });
      await batch.commit();
      return { success: true, count: s.size };
  };
  const handleWeeklyClosing = async () => {
      const s = await getDocs(collection(db, 'archive_drafts'));
      if (s.empty) return { success: true, count: 0 };
      const now = new Date();
      const year = now.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const sanonName = `sanon_${year}_${weekNum}`;
      const batch = writeBatch(db);
      s.docs.forEach(d => {
          batch.set(doc(collection(db, sanonName)), d.data());
          batch.delete(d.ref);
      });
      await batch.commit();
      return { success: true, count: s.size, sanon: sanonName };
  };
  const handleArchiveTasks = async () => { return await handleDailyClosing(); };
  const fetchArchivedTasks = async () => (await getDocs(query(collection(db,'archive_drafts'), limit(500)))).docs.map(d=>({id:d.id, ...d.data()} as Task));
  const handleUpdateSystemConfig = async (newConfig: Partial<SystemConfig>) => { const configRef = doc(db, 'system_data', 'config'); await setDoc(configRef, newConfig, { merge: true }); };
  const handleGetDocCount = useCallback(async () => {
      const snap = await getCountFromServer(collection(db, 'tasks'));
      return snap.data().count;
  }, []);
  const handlePurgeOldTasks = useCallback(async () => {
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const q = query(collection(db, 'tasks'), where('createdAt', '<', ninetyDaysAgo), limit(500));
      const snap = await getDocs(q);
      if (snap.empty) return 0;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return snap.size;
  }, []);
  const handleExportTasksJSON = useCallback(async () => {
      const snap = await getDocs(query(collection(db, 'tasks'), limit(1000)));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_tasks_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
  }, []);

  const partsArray = Object.entries(partsMap).map(([value, description]) => ({ id: value, value, description }));

  return (
    <div className={`min-h-screen bg-gray-900 flex flex-col ${!isAuthenticated ? 'items-center justify-center' : ''}`}>
      {!isAuthenticated ? (
        <LoginScreen onLoginSuccess={handleLogin} users={users} systemConfig={systemConfig} />
      ) : (
        <PartSearchScreen 
          currentUser={currentUser} currentUserRole={currentUserRole} onLogout={handleLogout}
          tasks={tasks} onAddTask={handleAddTask} onToggleTask={handleToggleTask} onEditTask={handleEditTask} onMarkAsIncorrect={handleMarkAsIncorrect} onAddNote={handleAddNote} onReleaseTask={handleReleaseTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          onToggleMissing={handleToggleMissing} onSetInProgress={handleSetInProgress} onToggleBlock={handleToggleBlock} onToggleManualBlock={handleToggleManualBlock}
          onExhaustSearch={handleExhaustSearch}
          onStartAudit={handleStartAudit} onFinishAudit={handleFinishAudit}
          users={users} onAddUser={handleAddUser} onUpdatePassword={handleUpdatePassword} onUpdateNickname={handleUpdateNickname} onUpdateExportPermission={handleUpdateExportPermission} onUpdateUserRole={handleUpdateUserRole} onDeleteUser={handleDeleteUser}
          parts={partsArray} workplaces={workplaces} missingReasons={missingReasons} logisticsOperations={logisticsOperations}
          onAddPart={handleAddPart} onBatchAddParts={handleBatchAddParts} onDeletePart={handleDeletePart} onDeleteAllParts={handleDeleteAllParts}
          onAddWorkplace={handleAddWorkplace} onBatchAddWorkplaces={handleBatchAddWorkplaces} onDeleteWorkplace={handleDeleteWorkplace} onDeleteAllWorkplaces={handleDeleteAllWorkplaces}
          onAddMissingReason={handleAddMissingReason} onDeleteMissingReason={handleDeleteMissingReason}
          onAddLogisticsOperation={handleAddLogisticsOperation} onDeleteLogisticsOperation={handleDeleteLogisticsOperation}
          partRequests={partRequests} onRequestPart={handleRequestNewPart} onApprovePartRequest={handleApprovePartRequest} onRejectPartRequest={handleRejectPartRequest}
          onArchiveTasks={handleArchiveTasks} 
          onDailyClosing={handleDailyClosing}
          onWeeklyClosing={handleWeeklyClosing}
          onFetchArchivedTasks={fetchArchivedTasks}
          onDeleteMissingItem={handleDeleteMissingItem}
          onGetDocCount={handleGetDocCount}
          onPurgeOldTasks={handlePurgeOldTasks}
          onExportTasksJSON={handleExportTasksJSON}
          breakSchedules={breakSchedules} systemBreaks={systemBreaks} isBreakActive={isBreakActive} onAddBreakSchedule={handleAddBreakSchedule} onDeleteBreakSchedule={handleDeleteBreakSchedule}
          bomMap={bomMap} bomRequests={bomRequests} onAddBOMItem={handleAddBOMItem} onBatchAddBOMItems={handleBatchAddBOMItems} onDeleteBOMItem={handleDeleteBOMItem} onDeleteAllBOMItems={handleDeleteAllBOMItems} onRequestBOM={handleRequestBOM} onApproveBOMRequest={handleApproveBOMRequest} onRejectBOMRequest={handleRejectBOMRequest} roles={roles} permissions={permissions} onAddRole={handleAddRole} onDeleteRole={handleDeleteRole} onUpdatePermission={handleUpdatePermission}
          onVerifyAdminPassword={handleVerifyAdminPassword}
          notifications={notifications} onClearNotification={handleClearNotification}
          installPrompt={deferredPrompt} onInstallApp={handleInstallApp}
          systemConfig={systemConfig} onUpdateSystemConfig={handleUpdateSystemConfig}
          dbLoadWarning={dbLoadWarning} 
        />
      )}
    </div>
  );
};

export default App;
