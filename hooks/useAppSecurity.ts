import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { SystemConfig } from '../types/appTypes';

export const useAppSecurity = (currentUserRole: string, isAuthenticated: boolean) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => sessionStorage.getItem('app_unlocked') === 'true');
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
      maintenanceMode: false,
      allowedIPs: [],
      ipCheckEnabled: false,
      adminKey: '1234',
      adminLockEnabled: true,
      mapOriginX: 0,
      mapOriginY: 0,
      vzvSpeed: 8
  });

  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetActivityTimer = useCallback(() => {
    if (!isAuthenticated || !isUnlocked || currentUserRole !== 'ADMIN' || !systemConfig.adminLockEnabled) return;
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    activityTimerRef.current = setTimeout(() => {
      setIsUnlocked(false);
      sessionStorage.removeItem('app_unlocked');
    }, 5 * 60 * 1000); 
  }, [isAuthenticated, isUnlocked, currentUserRole, systemConfig.adminLockEnabled]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    if (isAuthenticated && isUnlocked && currentUserRole === 'ADMIN' && systemConfig.adminLockEnabled) {
      events.forEach(e => window.addEventListener(e, resetActivityTimer));
      resetActivityTimer();
    }
    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivityTimer));
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    };
  }, [isAuthenticated, isUnlocked, currentUserRole, resetActivityTimer, systemConfig.adminLockEnabled]);

  useEffect(() => {
      const configRef = doc(db, 'system_data', 'config');
      return onSnapshot(configRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data() as SystemConfig;
              const updates: Partial<SystemConfig> = {};
              let needed = false;
              if (!data.adminKey) { updates.adminKey = '1234'; needed = true; }
              if (data.adminLockEnabled === undefined) { updates.adminLockEnabled = true; needed = true; }
              if (data.mapOriginX === undefined) { updates.mapOriginX = 0; needed = true; }
              if (data.mapOriginY === undefined) { updates.mapOriginY = 0; needed = true; }
              if (data.vzvSpeed === undefined) { updates.vzvSpeed = 8; needed = true; }
              
              if (needed) {
                  updateDoc(configRef, updates);
              }
              setSystemConfig(data);
          } else {
              setDoc(configRef, { maintenanceMode: false, allowedIPs: [], ipCheckEnabled: false, adminKey: '1234', adminLockEnabled: true, mapOriginX: 0, mapOriginY: 0, vzvSpeed: 8 });
          }
      });
  }, []);

  const handleUnlockAttempt = (key: string) => {
    if (key === (systemConfig.adminKey || '1234')) {
      setIsUnlocked(true);
      sessionStorage.setItem('app_unlocked', 'true');
    } else {
      alert('Nesprávny kľúč.');
    }
  };

  const handleUpdateAdminKey = async (oldKey: string, newKey: string) => {
    const configRef = doc(db, 'system_data', 'config');
    const snap = await getDoc(configRef);
    if (snap.exists() && snap.data().adminKey === oldKey) {
        await updateDoc(configRef, { adminKey: newKey });
        alert('Bezpečnostný kľúč bol úspešne zmenený.');
    } else {
        alert('Pôvodný kľúč je nesprávny.');
        throw new Error('Incorrect old key');
    }
  };

  const handleUpdateSystemConfig = async (newConfig: Partial<SystemConfig>) => {
    const configRef = doc(db, 'system_data', 'config');
    await setDoc(configRef, newConfig, { merge: true });
  };

  return { 
    isUnlocked, 
    setIsUnlocked, 
    systemConfig, 
    handleUnlockAttempt, 
    handleUpdateAdminKey,
    handleUpdateSystemConfig
  };
};