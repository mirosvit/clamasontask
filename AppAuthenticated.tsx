import React from 'react';
import PartSearchScreen from './components/PartSearchScreen';
import { useData } from './context/DataContext';
import { SystemConfig, PriorityLevel } from './types/appTypes';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

interface AppAuthenticatedProps {
  currentUser: string;
  currentUserRole: 'ADMIN' | 'USER' | 'LEADER';
  onLogout: () => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: Partial<SystemConfig>) => void;
  onUpdateAdminKey: (oldK: string, newK: string) => Promise<void>;
  onToggleAdminLock: (val: boolean) => void;
  installPrompt: any;
  onInstallApp: () => void;
}

const AppAuthenticated: React.FC<AppAuthenticatedProps> = (props) => {
  // 1. Vytiahneme data a funkcie z Contextu
  const data = useData();

  // 2. Loading Guard (Bezpečnostná poistka)
  if (!data || !data.tasks || !data.users) {
      return (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <p className="text-white text-xl font-bold animate-pulse">Načítavam systém...</p>
          </div>
      );
  }

  // 3. Transformácia dát
  const partsList = data.partsMap 
    ? Object.entries(data.partsMap).map(([p, d]) => ({ id: p, value: p, description: d }))
    : [];

  // 4. Fallback funkcie pre chýbajúce metódy (Safe Guards)
  const safeGetDocCount = (data as any).onGetDocCount || (async () => 0);
  const safePurgeOldTasks = (data as any).onPurgeOldTasks || (async () => 0);
  const safeExportTasksJSON = (data as any).onExportTasksJSON || (async () => {});
  const safeFetchArchivedTasks = (data as any).onFetchArchivedTasks || (async () => []);
  const safeVerifyAdminPassword = (data as any).onVerifyAdminPassword || ((p: string) => false);
  const safeRequestPart = (data as any).onRequestPart || (async () => false);
  const safeRequestBOM = (data as any).onRequestBOM || (async () => false);

  // 5. CRUD Adapters
  // A. Create Task Adapter (Handles specific logic for Inventory)
  const handleCreateInventoryTask = async (
    partNumber: string, 
    workplace: string | null, 
    quantity: string | null, 
    quantityUnit: string | null, 
    priority: PriorityLevel, 
    isLogistics: boolean = false, 
    noteOrPlate: string = '', 
    isProduction: boolean = false
  ) => {
      // Special logic for starting Inventory Session
      if (partNumber === "Počítanie zásob") {
          try {
              await addDoc(collection(db, 'tasks'), {
                  partNumber,
                  workplace: workplace || '',
                  quantity: quantity || '0',
                  quantityUnit: quantityUnit || 'pcs',
                  priority,
                  isLogistics,
                  note: noteOrPlate,
                  text: partNumber,
                  
                  // Critical Inventory Status Flags
                  status: 'unpacked',
                  isInProgress: true,
                  inProgressBy: props.currentUser,
                  
                  // Meta flags
                  isDone: false,
                  isMissing: false,
                  createdAt: Date.now(), // Using timestamp for consistent sorting
                  createdBy: props.currentUser,
                  isProduction: !!isProduction
              });
          } catch (e) {
              console.error("Failed to create inventory task", e);
          }
      } else {
          // Standard Task Creation with Data Integrity Fix
          // Fix 1: Separate Note and Plate based on isLogistics flag
          try {
              const newTask: any = {
                  text: partNumber, 
                  partNumber,
                  workplace: workplace || '',
                  quantity: quantity || '0',
                  quantityUnit: quantityUnit || 'pcs',
                  priority,
                  isLogistics,
                  isProduction,
                  // Logic Change: If logistics, 7th arg is 'plate', else it is 'note'.
                  note: isLogistics ? '' : noteOrPlate,
                  plate: isLogistics ? noteOrPlate : '', // Changed undefined to '' to prevent Firestore crash
                  isDone: false,
                  isMissing: false,
                  createdAt: Date.now(),
                  createdBy: props.currentUser,
                  status: 'open'
              };
              await addDoc(collection(db, 'tasks'), newTask);
          } catch (e) {
              console.error("Error adding task", e);
          }
      }
  };

  // B. Update Adapter
  const handleUpdateTask = (id: string, updates: any) => {
      if (data.onUpdateTask) {
          data.onUpdateTask(id, updates);
      }
  };

  // C. Delete Adapter
  const handleDeleteTask = (id: string) => {
      if (data.onDeleteTask) {
          data.onDeleteTask(id);
      }
  };

  // D. Custom Logic Handlers
  
  // 1. TOGGLE TASK LOGIC (Fixes Timer Leak on Return)
  const handleToggleTask = async (id: string) => {
      const task = data.tasks.find(t => t.id === id);
      if (!task) return;

      const updates: any = {
          isDone: !task.isDone
      };

      if (task.isDone) {
          // RE-OPENING: Reset to neutral state
          updates.completedAt = null;
          updates.completedBy = null;
          updates.status = 'open';
          // Fix: Stop timer and clear user assignment
          updates.isInProgress = false;
          updates.inProgressBy = null;
      } else {
          // COMPLETING
          updates.completedAt = Date.now();
          updates.completedBy = props.currentUser;
          updates.status = 'completed';
      }

      await data.onUpdateTask(id, updates);
  };
  
  // 2. BLOCKING LOGIC
  const handleToggleManualBlock = async (id: string) => {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;
    const newBlockedState = !task.isManualBlocked;
    
    const updates: any = { isManualBlocked: newBlockedState };
    
    if (newBlockedState) {
        // Blocking: Stop timer, Drop priority
        updates.isInProgress = false;
        updates.inProgressBy = null;
        updates.priority = 'LOW';
    } else {
        // Unblocking: Reset timer (createdAt) to bump it up in list
        updates.createdAt = Date.now();
    }
    await data.onUpdateTask(id, updates);
  };

  // 3. INCORRECT LOGIC
  const handleMarkAsIncorrect = async (id: string) => {
    await data.onUpdateTask(id, {
      isDone: true,
      status: 'incorrectly_entered',
      completedBy: props.currentUser,
      completedAt: Date.now(),
      isInProgress: false,
      inProgressBy: null
    });
  };

  // 4. AUDIT LOGIC
  const handleStartAudit = async (id: string) => {
     // Fix 3: Stop timer when audit starts
     await data.onUpdateTask(id, { 
         isAuditInProgress: true, 
         auditBy: props.currentUser,
         isInProgress: false,
         inProgressBy: null
     });
  };

  const handleFinishAudit = async (id: string, result: 'found' | 'missing', note: string) => {
     const task = data.tasks.find(t => t.id === id);
     if (!task) return;

     // Fix 4: Include note in badge text
     const badgeText = result === 'found' ? `AUDIT (OK) - ${note}` : `AUDIT (NOK) - ${note}`;
     
     const updates: any = {
         isAuditInProgress: false,
         auditFinalBadge: badgeText,
         auditBy: null, // Clear progress flag
         auditResult: result === 'found' ? 'OK' : 'NOK',
         auditNote: note,
         auditedBy: props.currentUser,
         auditedAt: Date.now()
     };

     if (result === 'found') {
         updates.isMissing = false;
         // Note: We keep the task open (not done) if found, so it can be processed.
     } else {
         // Confirm Error -> Finish Task
         updates.isDone = true;
         updates.status = 'audit_error'; // Or keep 'open' but Done? usually audit error closes it.
         updates.completedBy = props.currentUser;
         updates.completedAt = Date.now();
         updates.isInProgress = false;
     }
     
     await data.onUpdateTask(id, updates);

     // Notify Creator
     if (data.onAddNotification && task.createdBy) {
         await data.onAddNotification({
             partNumber: task.partNumber || 'Unknown',
             reason: `AUDIT: ${result.toUpperCase()} - ${note}`,
             reportedBy: props.currentUser,
             targetUser: task.createdBy,
             timestamp: Date.now()
         });
     }
  };

  // 5. MISSING LOGIC (Notification Wrapper)
  const handleToggleMissing = async (id: string, reason?: string) => {
      // Call original logic to toggle state
      await data.onToggleMissing(id, reason);

      // Fix 2: If we are setting it to missing (reason is provided), stop the timer
      if (reason) {
          await data.onUpdateTask(id, {
              isInProgress: false,
              inProgressBy: null
          });

          if (data.onAddNotification) {
              const task = data.tasks.find(t => t.id === id);
              if (task) {
                  await data.onAddNotification({
                      partNumber: task.partNumber || 'Unknown',
                      reason: `CHÝBA: ${reason}`,
                      reportedBy: props.currentUser,
                      targetUser: task.createdBy || '',
                      timestamp: Date.now()
                  });
              }
          }
      }
  };

  // 6. Render aplikácie
  return (
    <div className="w-full h-full">
        <PartSearchScreen
          {...data}
          
          // Override CRUD handlers with our adapters
          onAddTask={handleCreateInventoryTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          
          // Override Logic Handlers
          onToggleTask={handleToggleTask}
          onToggleManualBlock={handleToggleManualBlock}
          onMarkAsIncorrect={handleMarkAsIncorrect}
          onStartAudit={handleStartAudit}
          onFinishAudit={handleFinishAudit}
          onToggleMissing={handleToggleMissing}

          // Inject fallback functions
          onGetDocCount={safeGetDocCount}
          onPurgeOldTasks={safePurgeOldTasks}
          onExportTasksJSON={safeExportTasksJSON}
          onFetchArchivedTasks={safeFetchArchivedTasks}
          onVerifyAdminPassword={safeVerifyAdminPassword}
          onRequestPart={safeRequestPart}
          onRequestBOM={safeRequestBOM}
          
          // Props from App.tsx
          parts={partsList}
          currentUser={props.currentUser}
          currentUserRole={props.currentUserRole}
          onLogout={props.onLogout}
          systemConfig={props.systemConfig}
          onUpdateSystemConfig={props.onUpdateSystemConfig}
          onUpdateAdminKey={props.onUpdateAdminKey}
          onToggleAdminLock={props.onToggleAdminLock}
          installPrompt={props.installPrompt}
          onInstallApp={props.onInstallApp}
          
          // Default booleans
          dbLoadWarning={false}
        />
    </div>
  );
};

export default AppAuthenticated;