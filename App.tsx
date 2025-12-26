
import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import PartSearchScreen from './components/PartSearchScreen';
import { db } from './firebase';
import { useAppSecurity } from './hooks/useAppSecurity';
import { useFirestoreData } from './hooks/useFirestoreData';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  writeBatch,
  getDocs,
  where,
  limit,
  setDoc,
  getCountFromServer,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { 
  UserData, Task, DBItem, MapSector, PriorityLevel, PartRequest, 
  BOMRequest, BreakSchedule, SystemBreak, Role, Permission
} from './types/appTypes';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<'ADMIN' | 'USER' | 'LEADER'>('USER');
  const [unlockKey, setUnlockKey] = useState("");
  
  const { 
    isUnlocked, 
    setIsUnlocked, 
    systemConfig, 
    handleUnlockAttempt,
    handleUpdateAdminKey, 
    handleUpdateSystemConfig 
  } = useAppSecurity(currentUserRole, isAuthenticated);

  const {
    tasks, users, partsMap, bomMap, workplaces, missingReasons, logisticsOperations,
    mapSectors, partRequests, bomRequests, breakSchedules, systemBreaks, isBreakActive,
    roles, permissions, notifications
  } = useFirestoreData(isAuthenticated, currentUserRole);

  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    const storedRole = localStorage.getItem('app_role');
    if (storedUser && storedRole) {
      setCurrentUser(storedUser);
      setCurrentUserRole(storedRole as any);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => { 
    setIsAuthenticated(false); 
    setIsUnlocked(false);
    setCurrentUser(''); 
    setCurrentUserRole('USER'); 
    localStorage.removeItem('app_user'); 
    localStorage.removeItem('app_role'); 
    sessionStorage.removeItem('app_unlocked');
    setUnlockKey("");
  };

  const handleLogin = (u: string, r: any) => { 
    setIsAuthenticated(true); setCurrentUser(u); setCurrentUserRole(r); 
    localStorage.setItem('app_user', u); localStorage.setItem('app_role', r); 
    if (r !== 'ADMIN' || !systemConfig.adminLockEnabled) { setIsUnlocked(true); sessionStorage.setItem('app_unlocked', 'true'); }
  };
  
  const handleAddUser = async (u: UserData) => { await addDoc(collection(db, 'users'), { ...u, canExportAnalytics: false }); };
  const handleUpdatePassword = async (u: string, p: string) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {password: p}); } };
  const handleUpdateNickname = async (u: string, n: string) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {nickname: n}); } };
  const handleUpdateUserRole = async (u: string, r: any) => { const user = users.find(us => us.username === u); if(user) { await updateDoc(doc(db,'users', user.id!), {role: r}); } };
  const handleDeleteUser = async (u: string) => { const user = users.find(us => us.username === u); if(user) { await deleteDoc(doc(db,'users', user.id!)); } };
  const handleUpdateExportPermission = async (username: string, canExport: boolean) => {
    const user = users.find(u => u.username === username);
    if (user && user.id) await updateDoc(doc(db, 'users', user.id), { canExportAnalytics: canExport });
  };

  const handleAddTask = async (pn: string, wp: string | null, qty: string | null, unit: string | null, prio: PriorityLevel, isLogistics: boolean = false, note?: string) => {
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
    let text = `${formattedDate} / ${pn} / ${wp} / Počet: ${fQty}`;
    if (note) text += ` / Pozn: ${note}`;
    const now = Date.now();
    await addDoc(collection(db, 'tasks'), { text, partNumber: pn, workplace: wp, quantity: qty, quantityUnit: finalUnit, standardTime: 0, isDone:false, priority:prio, createdAt:now, createdBy:currentUser, isLogistics, isProduction: !isLogistics, isInProgress: false, note: note || null, expireAt: now + (90 * 24 * 60 * 60 * 1000) });
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => { await updateDoc(doc(db, 'tasks', id), updates); };
  const handleToggleTask = async (id: string) => {
    const t = tasks.find(x => x.id === id);
    if(t) {
        const newState = !t.isDone;
        await updateDoc(doc(db,'tasks',id), { isDone:newState, status:newState?'completed':null, completionTime:newState?new Date().toLocaleTimeString('sk-SK'):null, completedBy:newState?currentUser:null, completedAt:newState?Date.now():null, isInProgress:false });
    }
  };

  const onArchiveTasks = async () => {
      const q = query(collection(db, 'tasks'), where('isDone', '==', true));
      const s = await getDocs(q);
      if (s.empty) return { success: true, count: 0 };
      const batch = writeBatch(db);
      s.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return { success: true, count: s.size };
  };

  const onDailyClosing = async () => {
    const q = query(collection(db, 'tasks'), where('isDone', '==', true));
    const s = await getDocs(q);
    const draftRef = doc(db, 'settings', 'draft');
    const existing = await getDoc(draftRef);
    const existingData = existing.exists() ? existing.data().data || [] : [];
    const newTasks = s.docs.map(d => ({ ...d.data(), id: d.id }));
    await setDoc(draftRef, { data: [...existingData, ...newTasks] });
    const batch = writeBatch(db);
    s.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return { success: true, count: s.size };
  };

  const onGetDocCount = async () => {
    const snap = await getCountFromServer(collection(db, 'tasks'));
    return snap.data().count;
  };

  const onPurgeOldTasks = async () => {
    const threshold = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const q = query(collection(db, 'tasks'), where('createdAt', '<', threshold), limit(500));
    const s = await getDocs(q);
    const batch = writeBatch(db);
    s.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return s.size;
  };

  return (
    <div className={`min-h-screen bg-gray-900 flex flex-col ${!isAuthenticated ? 'items-center justify-center' : ''}`}>
      {!isAuthenticated ? (
        <LoginScreen onLoginSuccess={handleLogin} users={users} systemConfig={systemConfig} />
      ) : (currentUserRole === 'ADMIN' && systemConfig.adminLockEnabled && !isUnlocked) ? (
        <div className="flex flex-col items-center justify-center p-10 bg-gray-900 rounded-2xl border-2 border-amber-600 shadow-2xl">
            <div className="text-amber-500 mb-6 animate-pulse">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h2 className="text-white text-2xl font-black mb-6 tracking-widest uppercase">Zabezpečený prístup</h2>
            <input 
                type="password" 
                value={unlockKey} 
                onChange={(e) => setUnlockKey(e.target.value)}
                placeholder="ZADAJTE ADMIN KĽÚČ"
                className="bg-gray-800 border-2 border-gray-700 text-white text-center px-4 py-3 rounded-xl mb-4 focus:border-amber-500 outline-none font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleUnlockAttempt(unlockKey)}
            />
            <button 
                onClick={() => handleUnlockAttempt(unlockKey)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black transition-all"
            >
                ODOMKNÚŤ SYSTÉM
            </button>
            <button onClick={handleLogout} className="mt-4 text-gray-500 hover:text-white text-xs uppercase font-bold transition-colors">Odhlásiť sa</button>
        </div>
      ) : (
        <PartSearchScreen 
          currentUser={currentUser} currentUserRole={currentUserRole} onLogout={handleLogout}
          tasks={tasks} onAddTask={handleAddTask} onToggleTask={handleToggleTask} onUpdateTask={handleUpdateTask}
          onMarkAsIncorrect={(id) => updateDoc(doc(db,'tasks',id), {isDone:true, status:'incorrectly_entered'})}
          onEditTask={(id, txt, prio) => updateDoc(doc(db,'tasks',id), {text:txt, priority:prio})}
          onDeleteTask={(id) => deleteDoc(doc(db,'tasks',id))}
          onToggleMissing={(id, r) => {
              const t = tasks.find(x => x.id === id);
              if (t) updateDoc(doc(db,'tasks',id), { isMissing: !t.isMissing, missingReason: !t.isMissing ? (r || 'Iné') : null, missingReportedBy: !t.isMissing ? currentUser : null });
          }}
          onSetInProgress={(id) => {
              const t = tasks.find(x => x.id === id);
              if (t) updateDoc(doc(db,'tasks',id), { isInProgress: !t.isInProgress, inProgressBy: !t.isInProgress ? currentUser : null, startedAt: (!t.isInProgress && !t.startedAt) ? Date.now() : t.startedAt });
          }}
          onToggleBlock={(id) => {
              const t = tasks.find(x => x.id === id);
              if (t) updateDoc(doc(db,'tasks',id), { isBlocked: !t.isBlocked, blockedBy: !t.isBlocked ? currentUser : null });
          }}
          onToggleManualBlock={(id) => {
              const t = tasks.find(x => x.id === id);
              if (t) updateDoc(doc(db,'tasks',id), { isManualBlocked: !t.isManualBlocked });
          }}
          onExhaustSearch={(id) => updateDoc(doc(db,'tasks',id), { searchExhausted: true, isBlocked: false })}
          onAddNote={(id, n) => updateDoc(doc(db,'tasks',id), { note: n })}
          onReleaseTask={(id) => updateDoc(doc(db,'tasks',id), { isInProgress: false, inProgressBy: null })}
          onArchiveTasks={onArchiveTasks} onDailyClosing={onDailyClosing}
          onWeeklyClosing={async () => ({ success: true, count: 0, sanon: 'S1' })}
          onFetchArchivedTasks={async () => {
              const s = await getDoc(doc(db, 'settings', 'draft'));
              return s.exists() ? s.data().data || [] : [];
          }}
          onStartAudit={(id) => updateDoc(doc(db,'tasks',id), { isAuditInProgress: true, auditBy: currentUser })}
          onFinishAudit={(id, res, note) => updateDoc(doc(db,'tasks',id), { auditResult: res, auditNote: note, isAuditInProgress: false, auditedBy: currentUser, auditedAt: Date.now() })}
          onVerifyAdminPassword={(p) => users.some(u => u.role === 'ADMIN' && u.password === p)}
          onGetDocCount={onGetDocCount} onPurgeOldTasks={onPurgeOldTasks}
          onExportTasksJSON={async () => {}}
          onDeleteMissingItem={(id) => deleteDoc(doc(db,'tasks',id))}
          users={users} onAddUser={handleAddUser} onUpdatePassword={handleUpdatePassword} onUpdateNickname={handleUpdateNickname} 
          onUpdateUserRole={handleUpdateUserRole} onDeleteUser={handleDeleteUser} onUpdateExportPermission={handleUpdateExportPermission}
          parts={Object.entries(partsMap).map(([p, d]) => ({ id: p, value: p, description: d }))} 
          workplaces={workplaces} missingReasons={missingReasons} logisticsOperations={logisticsOperations}
          mapSectors={mapSectors} onAddMapSector={(n,x,y,c) => addDoc(collection(db,'map_sectors'), {name:n, coordX:x, coordY:y, color:c, order:mapSectors.length})}
          onDeleteMapSector={(id) => deleteDoc(doc(db,'map_sectors',id))}
          onDeleteMissingReason={(id) => deleteDoc(doc(db,'missing_reasons',id))}
          onUpdateMapSector={(id, u) => updateDoc(doc(db,'map_sectors',id), u)}
          onAddPart={(v,d) => setDoc(doc(db,'settings','parts'), {data: arrayUnion({p:v, d:d})}, {merge:true})}
          onBatchAddParts={(vs) => setDoc(doc(db,'settings','parts'), {data: arrayUnion(...vs.map(l => ({p: l.split(';')[0], d: l.split(';')[1]})))}, {merge:true})}
          onDeletePart={(v) => {}} onDeleteAllParts={() => setDoc(doc(db,'settings','parts'), {data:[]})}
          onAddWorkplace={(v,t,x,y) => addDoc(collection(db,'workplaces'), {value:v, standardTime:t, coordX:x, coordY:y})}
          onUpdateWorkplace={(id, u) => updateDoc(doc(db,'workplaces',id), u)}
          onBatchAddWorkplaces={(vs) => {}} onDeleteWorkplace={(id) => deleteDoc(doc(db,'workplaces',id))}
          onDeleteAllWorkplaces={() => {}} 
          onAddMissingReason={(v) => addDoc(collection(db,'missing_reasons'), {value:v})}
          onAddLogisticsOperation={(v,t,d) => addDoc(collection(db,'logistics_operations'), {value:v, standardTime:t, distancePx:d})}
          onUpdateLogisticsOperation={(id,u) => updateDoc(doc(db,'logistics_operations',id), u)}
          onDeleteLogisticsOperation={(id) => deleteDoc(doc(db,'logistics_operations',id))}
          partRequests={partRequests} onRequestPart={async (p) => { await addDoc(collection(db,'part_requests'), {partNumber:p, requestedBy:currentUser, requestedAt:Date.now()}); return true; }}
          onApprovePartRequest={(r) => deleteDoc(doc(db,'part_requests',r.id))}
          onRejectPartRequest={(id) => deleteDoc(doc(db,'part_requests',id))}
          breakSchedules={breakSchedules} systemBreaks={systemBreaks} isBreakActive={isBreakActive}
          onAddBreakSchedule={(s,e) => setDoc(doc(db,'settings','breaks'), {data: arrayUnion({id:crypto.randomUUID(), startTime:s, endTime:e})}, {merge:true})}
          onDeleteBreakSchedule={(id) => {}}
          bomMap={bomMap} bomRequests={bomRequests} onAddBOMItem={(p,c,q) => {}}
          onBatchAddBOMItems={(vs) => {}} onDeleteBOMItem={(p,c) => {}} onDeleteAllBOMItems={() => {}}
          onRequestBOM={async (p) => { await addDoc(collection(db,'bom_requests'), {parentPart:p, requestedBy:currentUser, requestedAt:Date.now()}); return true; }}
          onApproveBOMRequest={(r) => deleteDoc(doc(db,'bom_requests',r.id))}
          onRejectBOMRequest={(id) => deleteDoc(doc(db,'bom_requests',id))}
          roles={roles} permissions={permissions} onAddRole={(n) => addDoc(collection(db,'roles'), {name:n})}
          onDeleteRole={(id) => deleteDoc(doc(db,'roles',id))}
          onUpdatePermission={(pid, rn, has) => {}}
          notifications={notifications} onClearNotification={(id) => deleteDoc(doc(db,'notifications',id))}
          installPrompt={null} onInstallApp={() => {}}
          systemConfig={systemConfig} onUpdateSystemConfig={handleUpdateSystemConfig}
          dbLoadWarning={false} onUpdateAdminKey={handleUpdateAdminKey}
          onToggleAdminLock={(v) => handleUpdateSystemConfig({adminLockEnabled: v})}
        />
      )}
    </div>
  );
};

export default App;

// Exporting types from App.tsx for backward compatibility with components
export type { 
  UserData, Task, DBItem, MapSector, PriorityLevel, InventorySession,
  Notification, PartRequest, BOMRequest, BreakSchedule, SystemBreak,
  BOMComponent, Role, Permission, SystemConfig 
} from './types/appTypes';
