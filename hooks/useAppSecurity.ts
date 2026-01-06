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
      
      // STRIKTNÝ READ-ONLY LISTENER
      return onSnapshot(configRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data() as SystemConfig;
              setSystemConfig(data);
          } else {
              // Ak dokument v DB neexistuje, logujeme chybu, ale NIKDY nezapisujeme default heslo z klienta.
              // Dokument musí vytvoriť admin manuálne alebo cez handleUpdateSystemConfig.
              console.error("KRITICKÁ CHYBA: Konfiguračný dokument v DB chýba!");
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
    
    if (!snap.exists()) {
        // Ak dokument neexistuje, vytvoríme ho prvýkrát s novým kľúčom
        await setDoc(configRef, { 
            adminKey: newKey,
            maintenanceMode: false,
            allowedIPs: [],
            ipCheckEnabled: false,
            adminLockEnabled: true,
            mapOriginX: 0,
            mapOriginY: 0,
            vzvSpeed: 8
        });
        alert('Systém inicializovaný s novým kľúčom.');
        return;
    }

    if (snap.data().adminKey === oldKey) {
        await updateDoc(configRef, { adminKey: newKey });
        alert('Bezpečnostný kľúč bol úspešne zmenený.');
    } else {
        alert('Pôvodný kľúč je nesprávny.');
        throw new Error('Incorrect old key');
    }
  };

  const handleUpdateSystemConfig = async (newConfig: Partial<SystemConfig>) => {
    const configRef = doc(db, 'system_data', 'config');
    // Používame merge, aby sme neprepísali adminKey ak tam už je
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