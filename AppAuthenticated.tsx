import React, { useMemo } from 'react';
import PartSearchScreen from './components/PartSearchScreen';
import NotificationModal from './components/modals/NotificationModal';
import { useData } from './context/DataContext';
import { SystemConfig } from './types/appTypes';

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

  // Bezpečné funkcie (fallbacky) ak by náhodou context zlyhal
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

  // Admin Notes functions
  const safeAdminNotes = (data as any).adminNotes || [];
  const safeAddAdminNote = (data as any).onAddAdminNote || (() => {});
  const safeDeleteAdminNote = (data as any).onDeleteAdminNote || (() => {});
  const safeClearAdminNotes = (data as any).onClearAdminNotes || (() => {});

  const partsList = data.partsMap 
    ? Object.entries(data.partsMap).map(([p, d]) => ({ id: p, value: p, description: d }))
    : [];

  return (
    <div className="w-full h-full">
        <PartSearchScreen
          {...(data as any)}
          // Action Hooks (priame prepojenie na useTaskData cez Context)
          onAddTask={data.onAddTask}
          onUpdateTask={data.onUpdateTask}
          onDeleteTask={data.onDeleteTask}
          onToggleTask={data.onToggleTask}
          onToggleBlock={data.onToggleBlock}
          onToggleManualBlock={data.onToggleManualBlock}
          onExhaustSearch={data.onExhaustSearch}
          onAddNote={data.onAddNote}
          onMarkAsIncorrect={data.onMarkAsIncorrect}
          onStartAudit={data.onStartAudit}
          onFinishAudit={data.onFinishAudit}
          onToggleMissing={data.onToggleMissing}
          onDeleteMissingItem={(id) => data.onToggleMissing(id)}
          
          // Scrap Weighing Lifecycle
          onFinalizeScrapArchive={data.onFinalizeScrapArchive}
          onBulkAddScrapRecords={data.onBulkAddScrapRecords}
          onUpdateScrapRecord={data.onUpdateScrapRecord}
          onUpdateArchivedScrapItem={data.onUpdateArchivedScrapItem}
          onExpediteScrap={data.onExpediteScrap}

          // Maintenance & System
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
          
          // Data
          draftTasks={data.draftTasks || []}
          settings={{ draft: { data: data.draftTasks || [] } }}
          parts={partsList}
          
          // Props from Parent
          currentUser={props.currentUser}
          currentUserRole={props.currentUserRole}
          onLogout={props.onLogout}
          systemConfig={props.systemConfig}
          onUpdateSystemConfig={props.onUpdateSystemConfig}
          onUpdateAdminKey={props.onUpdateAdminKey}
          onToggleAdminLock={props.onToggleAdminLock}
          installPrompt={props.installPrompt}
          onInstallApp={props.onInstallApp}
          
          // Admin Notes
          dbLoadWarning={false}
          adminNotes={safeAdminNotes}
          onAddAdminNote={safeAddAdminNote}
          onDeleteAdminNote={safeDeleteAdminNote}
          onClearAdminNotes={safeClearAdminNotes}
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