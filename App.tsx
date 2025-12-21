
import React, { useState, useEffect, useRef } from 'react';
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
  getDoc,
  where,
  limit,
  setDoc,
  increment // Added increment
} from 'firebase/firestore';
import { partNumbers as initialParts, workplaces as initialWorkplaces, initialMissingReasons as seedMissingReasons } from './data/mockParts';

export interface UserData {
  id?: string;
  username: string;
  password: string;
  role: 'ADMIN' | 'USER' | 'LEADER';
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
  isBlocked?: boolean; // For Inventory
  isManualBlocked?: boolean; // For new manual block feature
  inventoryHistory?: InventorySession[];
  type?: 'production' | 'logistics'; 
}

export interface Notification {
    id: string;
    partNumber: string;
    reason: string;
    reportedBy: string;
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
  
  // Data
  const [users, setUsers] = useState<UserData[]>([]);
  const [parts, setParts] = useState<DBItem[]>([]);
  const [workplaces, setWorkplaces] = useState<DBItem[]>([]);
  const [missingReasons, setMissingReasons] = useState<DBItem[]>([]);
  const [logisticsOperations, setLogisticsOperations] = useState<DBItem[]>([]); // New state
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [breakSchedules, setBreakSchedules] = useState<BreakSchedule[]>([]);
  const [systemBreaks, setSystemBreaks] = useState<SystemBreak[]>([]);
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [bomRequests, setBomRequests] = useState<BOMRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // System Config (Maintenance & IP)
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
      maintenanceMode: false,
      allowedIPs: [],
      ipCheckEnabled: false
  });
  
  // Performance Monitoring
  const [dbLoadWarning, setDbLoadWarning] = useState<boolean>(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Sound logic refs to avoid re-subscribing listeners
  const isFirstLoad = useRef(true);
  const rolesRef = useRef<Role[]>([]);
  const permissionsRef = useRef<Permission[]>([]);
  const currentUserRoleRef = useRef(currentUserRole);

  // Sync refs
  useEffect(() => { rolesRef.current = roles; }, [roles]);
  useEffect(() => { permissionsRef.current = permissions; }, [permissions]);
  useEffect(() => { currentUserRoleRef.current = currentUserRole; }, [currentUserRole]);

  // Helper function using refs for use inside listeners
  const checkPermissionRef = (permName: string) => {
      const currentRole = currentUserRoleRef.current;
      if (currentRole === 'ADMIN' && (permName === 'perm_tab_permissions' || permName === 'perm_manage_roles' || permName === 'perm_tab_settings')) {
          return true;
      }
      const r = rolesRef.current.find(r => r.name === currentRole);
      if (!r) return false;
      return permissionsRef.current.some(p => p.roleId === r.id && p.permissionName === permName);
  };

  // --- INITIALIZATION ---

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

  const hasPermission = (permName: string) => {
      if (currentUserRole === 'ADMIN' && (permName === 'perm_tab_permissions' || permName === 'perm_manage_roles' || permName === 'perm_tab_settings')) {
          return true;
      }
      const r = roles.find(r => r.name === currentUserRole);
      if (!r) return false;
      return permissions.some(p => p.roleId === r.id && p.permissionName === permName);
  };

  const handleLogout = () => { setIsAuthenticated(false); setCurrentUser(''); setCurrentUserRole('USER'); localStorage.removeItem('app_user'); localStorage.removeItem('app_role'); };

  // --- DATA FETCHING ---
  
  // System Config Listener
  useEffect(() => {
      const configRef = doc(db, 'system_data', 'config');
      return onSnapshot(configRef, (docSnap) => {
          if (docSnap.exists()) {
              setSystemConfig(docSnap.data() as SystemConfig);
          } else {
              // Set defaults if document doesn't exist
              setDoc(configRef, { maintenanceMode: false, allowedIPs: [], ipCheckEnabled: false });
          }
      });
  }, []);

  // Enforce Maintenance Mode & IP Checks
  useEffect(() => {
      if (isAuthenticated && currentUserRole !== 'ADMIN') {
          const now = new Date();
          const currentISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

          const isScheduledMaintenance = systemConfig.maintenanceStart && systemConfig.maintenanceEnd && 
                                         currentISO >= systemConfig.maintenanceStart && 
                                         currentISO <= systemConfig.maintenanceEnd;

          if (systemConfig.maintenanceMode || isScheduledMaintenance) {
              console.log('Force logging out due to maintenance mode.');
              handleLogout();
              alert('Systém prešiel do servisného módu. Boli ste odhlásení.');
          }
      }
  }, [systemConfig, isAuthenticated, currentUserRole]);

  // Tasks - Realtime
  useEffect(() => {
    const q = query(collection(db, 'tasks')); 
    
    return onSnapshot(q, (snapshot) => {
      const newTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      
      if (newTasks.length > 500) {
          setDbLoadWarning(true);
      } else {
          setDbLoadWarning(false);
      }

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

      // Sort Logic
      const priorityOrder: Record<string, number> = { 'URGENT': 0, 'NORMAL': 1, 'LOW': 2 };
      const sortedTasks = newTasks.sort((a, b) => {
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        if (a.isDone) {
            const timeA = a.completedAt || a.createdAt || 0;
            const timeB = b.completedAt || b.createdAt || 0;
            return timeB - timeA; 
        }

        // --- ACTIVE TASKS SORTING ---
        
        // Manual Blocked tasks should be at the absolute bottom of the active list
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
  }, []);

  // --- REALTIME DATA (Dynamic - always live) ---
  
  useEffect(() => { return onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({id:d.id, ...d.data()} as UserData)))); }, []);
  useEffect(() => { return onSnapshot(collection(db, 'roles'), s => setRoles(s.docs.map(d => ({id:d.id, ...d.data()} as Role)))); }, []);
  useEffect(() => { return onSnapshot(collection(db, 'permissions'), s => setPermissions(s.docs.map(d => ({id:d.id, ...d.data()} as Permission)))); }, []);
  useEffect(() => { return onSnapshot(query(collection(db, 'workplaces'), orderBy('value')), s => setWorkplaces(s.docs.map(d => ({id:d.id, value:d.data().value, standardTime:d.data().standardTime} as DBItem)))); }, []);
  useEffect(() => { return onSnapshot(query(collection(db, 'missing_reasons'), orderBy('value')), s => setMissingReasons(s.docs.map(d => ({id:d.id, value:d.data().value} as DBItem)))); }, []);
  useEffect(() => { return onSnapshot(query(collection(db, 'break_schedules')), s => setBreakSchedules(s.docs.map(d => ({id:d.id, ...d.data()} as BreakSchedule)))); }, []);
  
  useEffect(() => { 
      return onSnapshot(query(collection(db, 'logistics_operations'), orderBy('value')), async (s) => {
          const ops = s.docs.map(d => ({id:d.id, value:d.data().value, standardTime: d.data().standardTime} as DBItem));
          if (ops.length === 0 && !s.metadata.fromCache) {
               const defaults = ['VYKLÁDKA', 'NAKLÁDKA', 'ZASKLADNENIE', 'INTERNÝ PRESUN'];
               const batch = writeBatch(db);
               defaults.forEach(op => batch.set(doc(collection(db, 'logistics_operations')), { value: op, standardTime: 0 }));
               await batch.commit();
          } else {
              setLogisticsOperations(ops);
          }
      }); 
  }, []);


  // --- SMART CACHING LOGIC (Heavy Data Only: Parts & BOM) ---
  const incrementDataVersion = async () => {
      const metaRef = doc(db, 'metadata', 'system');
      try {
          await setDoc(metaRef, { dataVersion: increment(1) }, { merge: true });
      } catch (e) {
          console.error("Version increment failed", e);
      }
  };

  const refreshSmartData = async (inputServerVersion?: number) => {
      try {
          let serverVersion: number;
          if (inputServerVersion !== undefined) {
              serverVersion = inputServerVersion;
          } else {
              const metaRef = doc(db, 'metadata', 'system');
              const metaSnap = await getDoc(metaRef);
              serverVersion = metaSnap.exists() ? (metaSnap.data()?.dataVersion ?? 0) : 0;
          }
          
          const localVersion = parseInt(localStorage.getItem('cached_data_version') || '-1');
          let loadedFromCache = false;

          if (serverVersion === localVersion && localVersion !== -1) {
              try {
                  const cParts = localStorage.getItem('cached_parts');
                  const cBom = localStorage.getItem('cached_bom');

                  if (cParts && cBom) {
                      setParts(JSON.parse(cParts));
                      setBomItems(JSON.parse(cBom));
                      loadedFromCache = true;
                  }
              } catch (err) {
                  console.warn("Cache parsing failed, falling back to cloud.", err);
              }
          }

          if (!loadedFromCache) {
              const pSnap = await getDocs(query(collection(db, 'parts'), orderBy('value')));
              const bSnap = await getDocs(query(collection(db, 'bom_items'), orderBy('parentPart')));
              
              const newParts = pSnap.docs.map(d => ({id:d.id, ...d.data()} as DBItem));
              const newBOM = bSnap.docs.map(d => ({id:d.id, ...d.data()} as BOMItem));
              
              setParts(newParts);
              setBomItems(newBOM);

              localStorage.setItem('cached_parts', JSON.stringify(newParts));
              localStorage.setItem('cached_bom', JSON.stringify(newBOM));
              localStorage.setItem('cached_data_version', serverVersion.toString());
          }
      } catch (e) {
          console.error("Smart Data Load Failed:", e);
      }
  };

  useEffect(() => {
      const metaRef = doc(db, 'metadata', 'system');
      const unsubscribe = onSnapshot(metaRef, (snap) => {
          if (snap.exists()) {
              const data = snap.data();
              const jitter = Math.floor(Math.random() * 10000); 
              setTimeout(() => {
                  refreshSmartData(data.dataVersion);
              }, jitter);
          } else {
              refreshSmartData(0);
          }
      });
      return () => unsubscribe();
  }, []);
  
  useEffect(() => { const q = query(collection(db, 'part_requests')); return onSnapshot(q, s => setPartRequests(s.docs.map(d => ({id:d.id, ...d.data()} as PartRequest)))); }, []);
  useEffect(() => { const q = query(collection(db, 'bom_requests')); return onSnapshot(q, s => setBomRequests(s.docs.map(d => ({id:d.id, ...d.data()} as BOMRequest)))); }, []);
  // Fix: use the correct 'Notification' interface instead of 'AppNotification'
  useEffect(() => { return onSnapshot(collection(db, 'notifications'), s => setNotifications(s.docs.map(d => ({id:d.id, ...d.data()} as Notification)))); }, []);
  
  useEffect(() => { 
      const q = query(collection(db, 'system_breaks')); 
      return onSnapshot(q, s => {
          const breaks = s.docs.map(d => ({id:d.id, ...d.data()} as SystemBreak));
          setSystemBreaks(breaks);
          setIsBreakActive(breaks.some(b => b.isActive));
      }); 
  }, []);

  useEffect(() => {
      if (!breakSchedules.length) return;
      const checkTime = () => {
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const currentHM = `${hours}:${minutes}`;
          
          const matchingSchedule = breakSchedules.find(s => currentHM >= s.start && currentHM < s.end);
          if (matchingSchedule && !isBreakActive) {
              const recentlyCreated = systemBreaks.some(sb => sb.isActive && Math.abs(sb.start - Date.now()) < 60000);
              if (!recentlyCreated) addDoc(collection(db, 'system_breaks'), { start: Date.now(), isActive: true });
          }

          const matchingEnd = breakSchedules.find(s => s.end === currentHM);
          const isInsideAnySchedule = breakSchedules.some(s => currentHM >= s.start && currentHM < s.end);
          if ((matchingEnd || !isInsideAnySchedule) && isBreakActive) {
              const activeBreak = systemBreaks.find(b => b.isActive);
              if (activeBreak) updateDoc(doc(db, 'system_breaks', activeBreak.id), { end: Date.now(), isActive: false });
          }
      };
      const interval = setInterval(checkTime, 10000); 
      return () => clearInterval(interval);
  }, [breakSchedules, isBreakActive, systemBreaks]);


  // --- ACTIONS ---

  const handleLogin = (u: string, r: any) => { setIsAuthenticated(true); setCurrentUser(u); setCurrentUserRole(r); localStorage.setItem('app_user', u); localStorage.setItem('app_role', r); };
  
  const handleAddUser = async (u: UserData) => { await addDoc(collection(db, 'users'), u); };
  const handleUpdatePassword = async (u: string, p: string) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {password: p}); } };
  const handleUpdateUserRole = async (u: string, r: any) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {role: r}); } };
  const handleDeleteUser = async (u: string) => { const user = users.find(us => us.username === u); if(user) { await deleteDoc(doc(db,'users', user.id!)); } };

  const handleAddPart = async (v: string, desc?: string) => { 
      await addDoc(collection(db,'parts'), {value:v, description: desc || ''}); 
      await incrementDataVersion();
  };
  const handleBatchAddParts = async (vs: string[]) => { 
      const b=writeBatch(db); 
      vs.forEach(v => {
          const [val, desc] = v.split(';');
          if(val) b.set(doc(collection(db,'parts')), {value:val.trim(), description: desc ? desc.trim() : ''});
      }); 
      await b.commit(); 
      await incrementDataVersion();
  };
  const handleDeletePart = async (id: string) => { 
      await deleteDoc(doc(db,'parts',id)); 
      await incrementDataVersion();
  };
  const handleDeleteAllParts = async () => { 
      const s=await getDocs(collection(db,'parts')); 
      const b=writeBatch(db); 
      s.forEach(d=>b.delete(d.ref)); 
      await b.commit(); 
      await incrementDataVersion();
  };

  const handleAddWorkplace = async (v: string, t?: number) => { 
      await addDoc(collection(db,'workplaces'), {value:v, standardTime:t||0}); 
  };
  const handleBatchAddWorkplaces = async (vs: string[]) => { 
      const b=writeBatch(db); 
      vs.forEach(l=>{const [v,t]=l.split(';'); if(v) b.set(doc(collection(db,'workplaces')), {value:v.trim(), standardTime: parseInt(t)||0})}); 
      await b.commit(); 
  };
  const handleDeleteWorkplace = async (id: string) => { 
      await deleteDoc(doc(db,'workplaces',id)); 
  };
  const handleDeleteAllWorkplaces = async () => { 
      const s=await getDocs(collection(db,'workplaces')); 
      const b=writeBatch(db); 
      s.forEach(d=>b.delete(d.ref)); 
      await b.commit(); 
  };

  const handleAddMissingReason = async (v: string) => { 
      await addDoc(collection(db,'missing_reasons'), {value:v}); 
  };
  const handleDeleteMissingReason = async (id: string) => { 
      await deleteDoc(doc(db,'missing_reasons',id)); 
  };
  
  const handleAddLogisticsOperation = async (v: string, t?: number) => { 
      await addDoc(collection(db,'logistics_operations'), {value:v, standardTime: t || 0}); 
  };
  const handleDeleteLogisticsOperation = async (id: string) => { 
      await deleteDoc(doc(db,'logistics_operations',id)); 
  };

  const handleDeleteMissingItem = (id: string) => deleteDoc(doc(db,'tasks',id));

  const handleAddBreakSchedule = async (s:string, e:string) => { await addDoc(collection(db,'break_schedules'), {start:s, end:e}); };
  const handleDeleteBreakSchedule = async (id: string) => { await deleteDoc(doc(db,'break_schedules',id)); };

  const handleAddBOMItem = async (p:string, c:string, q:number) => { 
      await addDoc(collection(db,'bom_items'), {parentPart:p, childPart:c, quantity:q}); 
      await incrementDataVersion();
  };
  const handleBatchAddBOMItems = async (vs: string[]) => { 
      const b=writeBatch(db); 
      vs.forEach(l=>{const p=l.split(';'); if(p.length>=3) b.set(doc(collection(db,'bom_items')), {parentPart:p[0].trim(), childPart:p[1].trim(), quantity:parseFloat(p[2].trim().replace(',','.'))})}); 
      await b.commit(); 
      await incrementDataVersion();
  };
  const handleDeleteBOMItem = async (id: string) => { 
      await deleteDoc(doc(db,'bom_items',id)); 
      await incrementDataVersion();
  };
  const handleDeleteAllBOMItems = async () => { 
      const s=await getDocs(collection(db,'bom_items')); 
      const b=writeBatch(db); 
      s.forEach(d=>b.delete(d.ref)); 
      await b.commit(); 
      await incrementDataVersion();
  };
  
  const handleRequestBOM = async (p: string) => { await addDoc(collection(db,'bom_requests'), {parentPart:p, requestedBy:currentUser, requestedAt:Date.now()}); return true; };
  const handleApproveBOMRequest = (r: BOMRequest) => deleteDoc(doc(db,'bom_requests',r.id));
  const handleRejectBOMRequest = (id: string) => deleteDoc(doc(db,'bom_requests',id));
  
  const handleAddRole = async (n:string) => {
      const nameUpper = n.toUpperCase();
      if (roles.some(r => r.name === nameUpper)) {
          alert("Rola s týmto názvom už existuje!");
          return;
      }
      await addDoc(collection(db,'roles'), {name:nameUpper, isSystem:false});
  };
  const handleDeleteRole = async (id:string) => { 
      await deleteDoc(doc(db,'roles',id)); 
      const s=await getDocs(query(collection(db,'permissions'), where('roleId','==',id))); 
      const b=writeBatch(db); 
      s.forEach(d=>b.delete(d.ref)); 
      await b.commit(); 
  };
  const handleUpdatePermission = async (pid:string, rname:string, has:boolean) => { 
      const r=roles.find(ro=>ro.name===rname); 
      if(!r)return; 
      if(has) await addDoc(collection(db,'permissions'), {roleId:r.id, permissionName:pid}); 
      else { const p=permissions.find(perm=>perm.roleId===r.id && perm.permissionName===pid); if(p) await deleteDoc(doc(db,'permissions',p.id)); } 
  };

  const handleVerifyAdminPassword = (password: string) => {
      return users.some(u => u.role === 'ADMIN' && u.password === password);
  };

  const handleRequestNewPart = async (p: string) => { await addDoc(collection(db,'part_requests'), {partNumber:p, requestedBy:currentUser, requestedAt:Date.now()}); return true; };
  const handleApprovePartRequest = (req: PartRequest) => { handleAddPart(req.partNumber); deleteDoc(doc(db,'part_requests',req.id)); };
  const handleRejectPartRequest = (id: string) => deleteDoc(doc(db,'part_requests',id));

  const handleAddTask = async (pn: string, wp: string | null, qty: string | null, unit: string | null, prio: PriorityLevel, type: 'production' | 'logistics' = 'production') => {
    const formattedDate = new Date().toLocaleString('sk-SK');
    let fQty = qty || ''; 
    if(unit==='boxes') fQty=`${qty} box`; 
    if(unit==='pallet') fQty=`${qty} pal`;
    
    let text = `${formattedDate} / ${pn}`;
    if (wp) text += ` / ${wp}`;
    if (fQty) text += ` / Počet: ${fQty}`;

    let finalStandardTime = 0;
    
    if (type === 'production') {
        const wpObj = workplaces.find(w => w.value === wp);
        finalStandardTime = wpObj?.standardTime || 0;
        
        if (unit === 'pallet' && qty) {
            const numericQty = parseFloat(qty.replace(',', '.'));
            if (!isNaN(numericQty) && numericQty > 0) {
                finalStandardTime = Math.round(finalStandardTime * numericQty);
            }
        }
    } else if (type === 'logistics') {
        const opObj = logisticsOperations.find(op => op.value === wp); 
        finalStandardTime = opObj?.standardTime || 0;
        
        if (qty) {
            const numericQty = parseFloat(qty.replace(',', '.'));
            if (!isNaN(numericQty) && numericQty > 0) {
                 finalStandardTime = Math.round(finalStandardTime * numericQty);
            }
        }
    }

    // --- AUTOMATICKÉ 'RIEŠIM' PRE INVENTÚRU ---
    const isInventoryTask = pn === "Počítanie zásob";

    await addDoc(collection(db, 'tasks'), { 
        text: text, 
        partNumber: pn, 
        workplace: wp, 
        quantity: qty, 
        quantityUnit: unit, 
        standardTime: finalStandardTime, 
        isDone:false, 
        priority:prio, 
        createdAt:Date.now(), 
        createdBy:currentUser,
        type: type,
        isInProgress: isInventoryTask,
        inProgressBy: isInventoryTask ? currentUser : null,
        startedAt: isInventoryTask ? Date.now() : null
    });
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    await updateDoc(doc(db, 'tasks', id), updates);
  };

  const handleToggleTask = async (id: string) => {
    const t = tasks.find(x => x.id === id);
    if(t) {
        const newState = !t.isDone;
        await updateDoc(doc(db,'tasks',id), { isDone:newState, status:newState?'completed':null, completionTime:newState?new Date().toLocaleTimeString('sk-SK'):null, completedBy:newState?currentUser:null, completedAt:newState?Date.now():null, isInProgress:false, inProgressBy:null, isBlocked:false, isManualBlocked: false });
    }
  };

  const handleMarkAsIncorrect = async (id: string) => updateDoc(doc(db,'tasks',id), { isDone:true, status:'incorrectly_entered', completionTime:new Date().toLocaleTimeString('sk-SK'), completedBy:currentUser, completedAt:Date.now(), isInProgress:false, inProgressBy:null, isBlocked:false, isManualBlocked: false });
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
              isManualBlocked: false
          });
          if (isMissing) {
              await addDoc(collection(db, 'notifications'), {
                  partNumber: t.partNumber || 'Unknown',
                  reason: reason || 'Iné',
                  reportedBy: currentUser,
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
          updateDoc(doc(db,'tasks',id), { isBlocked, inventoryHistory:hist });
      }
  };

  const handleToggleManualBlock = async (id: string) => {
      const t = tasks.find(x => x.id === id);
      if (t) {
          const newState = !t.isManualBlocked;
          await updateDoc(doc(db, 'tasks', id), { 
              isManualBlocked: newState,
              // When unblocking, reset createdAt so it jumps to top of its priority group
              createdAt: !newState ? Date.now() : t.createdAt,
              isInProgress: false,
              inProgressBy: null
          });
      }
  };

  const handleArchiveTasks = async () => {
      const q = query(collection(db,'tasks'), where('isDone','==',true), limit(1000));
      const s = await getDocs(q);
      const toArchive = s.docs.filter(d => !d.data().completedAt || d.data().completedAt < (Date.now() - 86400000));
      if(toArchive.length===0) return {success:true, count:0, message:"Žiadne staré úlohy."};
      const b=writeBatch(db);
      toArchive.forEach(d => { b.set(doc(collection(db,'archived_tasks')), {...d.data(), archivedAt:Date.now()}); b.delete(d.ref); });
      await b.commit();
      return {success:true, count:toArchive.length};
  };
  const fetchArchivedTasks = async () => (await getDocs(collection(db,'archived_tasks'))).docs.map(d=>({id:d.id, ...d.data()} as Task));

  const handleUpdateSystemConfig = async (newConfig: Partial<SystemConfig>) => {
      const configRef = doc(db, 'system_data', 'config');
      await setDoc(configRef, newConfig, { merge: true });
  };

  return (
    <div className={`min-h-screen bg-gray-900 flex flex-col ${!isAuthenticated ? 'items-center justify-center' : ''}`}>
      {!isAuthenticated ? (
        <LoginScreen onLoginSuccess={handleLogin} users={users} systemConfig={systemConfig} />
      ) : (
        <PartSearchScreen 
          currentUser={currentUser} currentUserRole={currentUserRole} onLogout={handleLogout}
          tasks={tasks} onAddTask={handleAddTask} onToggleTask={handleToggleTask} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          onToggleMissing={handleToggleMissing} onSetInProgress={handleSetInProgress} onToggleBlock={handleToggleBlock} onToggleManualBlock={handleToggleManualBlock} onMarkAsIncorrect={handleMarkAsIncorrect} onAddNote={handleAddNote} onReleaseTask={handleReleaseTask}
          users={users} onAddUser={handleAddUser} onUpdatePassword={handleUpdatePassword} onUpdateUserRole={handleUpdateUserRole} onDeleteUser={handleDeleteUser}
          parts={parts} workplaces={workplaces} missingReasons={missingReasons} logisticsOperations={logisticsOperations}
          onAddPart={handleAddPart} onBatchAddParts={handleBatchAddParts} onDeletePart={handleDeletePart} onDeleteAllParts={handleDeleteAllParts}
          onAddWorkplace={handleAddWorkplace} onBatchAddWorkplaces={handleBatchAddWorkplaces} onDeleteWorkplace={handleDeleteWorkplace} onDeleteAllWorkplaces={handleDeleteAllWorkplaces}
          onAddMissingReason={handleAddMissingReason} onDeleteMissingReason={handleDeleteMissingReason}
          onAddLogisticsOperation={handleAddLogisticsOperation} onDeleteLogisticsOperation={handleDeleteLogisticsOperation}
          partRequests={partRequests} onRequestPart={handleRequestNewPart} onApprovePartRequest={handleApprovePartRequest} onRejectPartRequest={handleRejectPartRequest}
          onArchiveTasks={handleArchiveTasks} 
          onFetchArchivedTasks={fetchArchivedTasks}
          onDeleteMissingItem={handleDeleteMissingItem}
          breakSchedules={breakSchedules} systemBreaks={systemBreaks} isBreakActive={isBreakActive} onAddBreakSchedule={handleAddBreakSchedule} onDeleteBreakSchedule={handleDeleteBreakSchedule}
          bomItems={bomItems} bomRequests={bomRequests} onAddBOMItem={handleAddBOMItem} onBatchAddBOMItems={handleBatchAddBOMItems} onDeleteBOMItem={handleDeleteBOMItem} onDeleteAllBOMItems={handleDeleteAllBOMItems} onRequestBOM={handleRequestBOM} onApproveBOMRequest={handleApproveBOMRequest} onRejectBOMRequest={handleRejectBOMRequest}
          roles={roles} permissions={permissions} onAddRole={handleAddRole} onDeleteRole={handleDeleteRole} onUpdatePermission={handleUpdatePermission}
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
