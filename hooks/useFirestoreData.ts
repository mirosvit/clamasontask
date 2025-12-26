import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  limit,
  doc
} from 'firebase/firestore';
import { Task, UserData, DBItem, MapSector, PartRequest, BOMRequest, BreakSchedule, SystemBreak, Role, Permission, Notification } from '../types/appTypes';
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
      
      return () => { 
        unsubUsers(); unsubRoles(); unsubPerms(); unsubWp(); unsubReasons(); 
        unsubSectors(); unsubLogOps(); unsubPartReq(); unsubBomReq(); unsubSysBreaks();
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

  return {
    tasks, users, partsMap, bomMap, workplaces, missingReasons, logisticsOperations,
    mapSectors, partRequests, bomRequests, breakSchedules, systemBreaks, isBreakActive,
    roles, permissions, notifications, setNotifications
  };
};