
import React, { useMemo } from 'react';
import PartSearchScreen from './components/PartSearchScreen';
import NotificationModal from './components/modals/NotificationModal';
import { useData } from './context/DataContext';
import { SystemConfig, PriorityLevel, Task } from './types/appTypes';
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
  const data = useData();

  // Získanie notifikácií pre aktuálneho používateľa
  const myNotifications = useMemo(() => {
      if (!data || !data.notifications) return [];
      return data.notifications
        .filter(n => n.targetUser === props.currentUser)
        .sort((a, b) => b.timestamp - a.timestamp); // Najnovšie prvé, ale zobrazujeme ich postupne
  }, [data?.notifications, props.currentUser]);

  // Vyberieme prvú notifikáciu v rade na zobrazenie
  const activeNotification = myNotifications.length > 0 ? myNotifications[0] : null;

  const handleConfirmNotification = () => {
      if (activeNotification && data.onClearNotification) {
          data.onClearNotification(activeNotification.id);
      }
  };

  const resolveName = (username?: string | null) => {
      if (!username) return '-';
      const u = data?.users.find(x => x.username === username);
      return (u?.nickname || username).toUpperCase();
  };

  if (!data || !data.tasks || !data.users) {
      return (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <p className="text-white text-xl font-bold animate-pulse">Načítavam systém...</p>
          </div>
      );
  }

  const partsList = data.partsMap 
    ? Object.entries(data.partsMap).map(([p, d]) => ({ id: p, value: p, description: d }))
    : [];

  const safeGetDocCount = (data as any).onGetDocCount || (async () => 0);
  const safePurgeOldTasks = (data as any).onPurgeOldTasks || (async () => 0);
  const safeExportTasksJSON = (data as any).onExportTasksJSON || (async () => {});
  const safeFetchArchivedTasks = (data as any).onFetchArchivedTasks || (async () => []);
  const safeVerifyAdminPassword = (data as any).onVerifyAdminPassword || ((p: string) => false);
  const safeRequestPart = (data as any).onRequestPart || (async () => false);
  const safeRequestBOM = (data as any).onRequestBOM || (async () => false);
  const safeOnDailyClosing = (data as any).onDailyClosing || (async () => ({ success: false, count: 0 }));
  const safeOnWeeklyClosing = (data as any).onWeeklyClosing || (async () => ({ success: false, count: 0, sanon: '' }));
  const safeFetchSanons = (data as any).fetchSanons || (async () => []);

  const handleCreateInventoryTask = async (
      partNumber: string, 
      workplace: string | null, 
      quantity: string | null, 
      quantityUnit: string | null, 
      priority: PriorityLevel, 
      isLogistics: boolean = false, 
      noteOrPlate: string = '', 
      isProduction: boolean = false,
      sourceSectorId?: string,
      targetSectorId?: string
  ) => {
      if (partNumber === "Počítanie zásob") {
          try {
              await addDoc(collection(db, 'tasks'), {
                  partNumber, workplace: workplace || '', quantity: quantity || '0', quantityUnit: quantityUnit || 'pcs', priority, isLogistics, note: noteOrPlate, text: partNumber, status: 'unpacked', isInProgress: true, inProgressBy: props.currentUser, isDone: false, isMissing: false, createdAt: Date.now(), createdBy: props.currentUser, isProduction: !!isProduction
              });
          } catch (e) { console.error("Failed to create inventory task", e); }
      } else {
          try {
              const newTask: any = {
                  text: partNumber, partNumber, workplace: workplace || '', quantity: quantity || '0', quantityUnit: quantityUnit || 'pcs', priority, isLogistics, isProduction, note: isLogistics ? '' : noteOrPlate, plate: isLogistics ? noteOrPlate : '', isDone: false, isMissing: false, createdAt: Date.now(), createdBy: props.currentUser, status: 'open',
                  sourceSectorId: sourceSectorId || null,
                  targetSectorId: targetSectorId || null
              };
              await addDoc(collection(db, 'tasks'), newTask);
          } catch (e) { console.error("Error adding task", e); }
      }
  };

  const handleUpdateTask = (id: string, updates: any) => { if (data.onUpdateTask) data.onUpdateTask(id, updates); };
  const handleDeleteTask = (id: string) => { if (data.onDeleteTask) data.onDeleteTask(id); };

  const handleToggleTask = async (id: string) => {
      const task = data.tasks.find(t => t.id === id);
      if (!task) return;
      const updates: any = { isDone: !task.isDone };
      if (task.isDone) { updates.completedAt = null; updates.completedBy = null; updates.status = 'open'; updates.isInProgress = false; updates.inProgressBy = null; }
      else { updates.completedAt = Date.now(); updates.completedBy = props.currentUser; updates.status = 'completed'; }
      await data.onUpdateTask(id, updates);
  };
  
  const handleToggleManualBlock = async (id: string) => {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;
    const newBlockedState = !task.isManualBlocked;
    const updates: any = { isManualBlocked: newBlockedState };
    if (newBlockedState) { updates.isInProgress = false; updates.inProgressBy = null; updates.priority = 'LOW'; }
    else { updates.createdAt = Date.now(); }
    await data.onUpdateTask(id, updates);
  };

  const handleMarkAsIncorrect = async (id: string) => {
    await data.onUpdateTask(id, { isDone: true, status: 'incorrectly_entered', completedBy: props.currentUser, completedAt: Date.now(), isInProgress: false, inProgressBy: null });
  };

  const handleStartAudit = async (id: string) => {
     await data.onUpdateTask(id, { isAuditInProgress: true, auditBy: props.currentUser, isInProgress: false, inProgressBy: null });
  };

  const handleFinishAudit = async (id: string, result: 'found' | 'missing', note: string) => {
     const task = data.tasks.find(t => t.id === id);
     if (!task) return;
     const badgeText = result === 'found' ? `AUDIT (OK) - ${note}` : `AUDIT (NOK) - ${note}`;
     const updates: any = { isAuditInProgress: false, auditFinalBadge: badgeText, auditBy: null, auditResult: result === 'found' ? 'OK' : 'NOK', auditNote: note, auditedBy: props.currentUser, auditedAt: Date.now() };
     if (result === 'found') { updates.isMissing = false; }
     else { updates.isDone = true; updates.status = 'audit_error'; updates.completedBy = props.currentUser; updates.completedAt = Date.now(); updates.isInProgress = false; }
     await data.onUpdateTask(id, updates);
     if (data.onAddNotification && task.createdBy) {
         await data.onAddNotification({ partNumber: task.partNumber || 'Unknown', reason: `AUDIT: ${result.toUpperCase()} - ${note}`, reportedBy: props.currentUser, targetUser: task.createdBy, timestamp: Date.now() });
     }
  };

  const handleToggleMissing = async (id: string, reason?: string) => {
      await data.onToggleMissing(id, reason);
      if (reason) {
          await data.onUpdateTask(id, { isInProgress: false, inProgressBy: null });
          if (data.onAddNotification) {
              const task = data.tasks.find(t => t.id === id);
              if (task) { await data.onAddNotification({ partNumber: task.partNumber || 'Unknown', reason: `CHÝBA: ${reason}`, reportedBy: props.currentUser, targetUser: task.createdBy || '', timestamp: Date.now() }); }
          }
      }
  };

  return (
    <div className="w-full h-full">
        <PartSearchScreen
          {...(data as any)}
          onAddTask={handleCreateInventoryTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onToggleTask={handleToggleTask}
          onToggleManualBlock={handleToggleManualBlock}
          onMarkAsIncorrect={handleMarkAsIncorrect}
          onStartAudit={handleStartAudit}
          onFinishAudit={handleFinishAudit}
          onToggleMissing={handleToggleMissing}
          onDeleteMissingItem={(id) => handleToggleMissing(id)}
          onGetDocCount={safeGetDocCount}
          onPurgeOldTasks={safePurgeOldTasks}
          onExportTasksJSON={safeExportTasksJSON}
          onFetchArchivedTasks={safeFetchArchivedTasks}
          onVerifyAdminPassword={safeVerifyAdminPassword}
          onRequestPart={safeRequestPart}
          onRequestBOM={safeRequestBOM}
          onDailyClosing={safeOnDailyClosing}
          onWeeklyClosing={safeOnWeeklyClosing}
          fetchSanons={safeFetchSanons}
          draftTasks={data.draftTasks || []}
          settings={{ draft: { data: data.draftTasks || [] } }}
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
          dbLoadWarning={false}
        />

        {activeNotification && (
            <NotificationModal 
                notification={activeNotification}
                onConfirm={handleConfirmNotification}
                resolveName={resolveName}
            />
        )}
    </div>
  );
};

export default AppAuthenticated;