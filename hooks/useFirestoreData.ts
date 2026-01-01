
import { useRef, useCallback, useEffect } from 'react';
import { useSystemData } from './data/useSystemData';
import { useMasterData } from './data/useMasterData';
import { useOperationsData } from './data/useOperationsData';
import { useTaskData } from './data/useTaskData';
import { Role, Permission } from '../types/appTypes';

export const useFirestoreData = (isAuthenticated: boolean, currentUserRole: string) => {
  
  // 1. SYSTEM DATA (Users, Roles, Permissions, Notifications)
  const systemData = useSystemData();
  const { roles, permissions, onAddNotification } = systemData;

  // 2. MASTER DATA (Parts, BOM, Workplaces, Sectors, Logistics)
  const masterData = useMasterData();

  // 3. OPERATIONS DATA (Breaks, Reasons)
  const operationsData = useOperationsData();

  // 4. PERMISSION HELPER (Needed for Task Data Sound Logic)
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

  // 5. TASK DATA (Depends on Auth & Permissions)
  const taskData = useTaskData(isAuthenticated, checkPermissionRef, onAddNotification);

  // 6. COMPOSE & RETURN
  return {
    ...systemData,
    ...masterData,
    ...operationsData,
    ...taskData,
    // Pridáme staré názvy funkcií ak by niečo chýbalo, ale hooky by mali pokrývať všetko
  };
};
