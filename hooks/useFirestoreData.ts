import { useRef, useCallback, useEffect } from 'react';
import { useSystemData } from './data/useSystemData';
import { useMasterData } from './data/useMasterData';
import { useOperationsData } from './data/useOperationsData';
import { useTaskData } from './data/useTaskData';
import { useScrapData } from './data/useScrapData';
import { useScrapWeighing } from './data/useScrapWeighing';
import { Role } from '../types/appTypes';

export const useFirestoreData = (isAuthenticated: boolean, currentUserRole: string) => {
  
  // 1. SYSTEM DATA (Users, Roles, Notifications)
  const systemData = useSystemData();
  const { roles, onAddNotification } = systemData;

  // 2. MASTER DATA (Parts, BOM, Workplaces, Sectors, Logistics)
  const masterData = useMasterData();

  // 3. OPERATIONS DATA (Breaks, Reasons)
  const operationsData = useOperationsData();

  // 4. SCRAP DATA & WEIGHING
  const scrapData = useScrapData();
  const scrapWeighing = useScrapWeighing();

  // 5. PERMISSION HELPER (Needed for Task Data Sound Logic)
  const rolesRef = useRef<Role[]>([]);
  const currentUserRoleRef = useRef(currentUserRole);

  useEffect(() => { rolesRef.current = roles; }, [roles]);
  useEffect(() => { currentUserRoleRef.current = currentUserRole; }, [currentUserRole]);

  // Optimalizovaný check priamo z objektu Role (žiadne extra čítania)
  const checkPermissionRef = useCallback((permName: string) => {
      const currentRole = currentUserRoleRef.current;
      if (currentRole === 'ADMIN') return true;
      
      const r = rolesRef.current.find(ro => ro.name === currentRole);
      if (!r) return false;
      
      // Kontrola v poli permissions (ak existuje)
      return r.permissions ? r.permissions.includes(permName) : false;
  }, []);

  // 6. TASK DATA (Depends on Auth & Permissions)
  const taskData = useTaskData(isAuthenticated, checkPermissionRef, onAddNotification);

  // 7. COMPOSE & RETURN
  return {
    ...systemData,
    ...masterData,
    ...operationsData,
    ...scrapData,
    ...scrapWeighing,
    ...taskData,
  };
};