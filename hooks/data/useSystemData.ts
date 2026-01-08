
import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { UserData, Role, Notification, AdminNote } from '../../types/appTypes';

export const useSystemData = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({id:d.id, ...d.data()} as UserData))));
    const unsubRoles = onSnapshot(collection(db, 'roles'), s => setRoles(s.docs.map(d => ({id:d.id, ...d.data()} as Role))));
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), s => setNotifications(s.docs.map(d => ({id:d.id, ...d.data()} as Notification))));
    
    const unsubAdminNotes = onSnapshot(doc(db, 'settings', 'notes'), (s) => {
      if (s.exists()) {
        const d = s.data();
        setAdminNotes(Array.isArray(d.items) ? d.items : []);
      } else {
        setAdminNotes([]);
      }
    });

    return () => { 
        unsubUsers(); unsubRoles(); unsubNotifications(); unsubAdminNotes();
    };
  }, []);

  const onAddUser = async (user: UserData) => { await addDoc(collection(db, 'users'), user); };
  
  const onUpdatePassword = async (username: string, newPass: string) => {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      snap.forEach(d => updateDoc(d.ref, { password: newPass }));
  };
  
  const onUpdateNickname = async (username: string, newNick: string) => {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      snap.forEach(d => updateDoc(d.ref, { nickname: newNick }));
  };
  
  const onUpdateUserRole = async (username: string, newRole: string) => {
    if (username.toUpperCase() === 'ADMIN') return;
    try {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => batch.update(d.ref, { role: newRole }));
        await batch.commit();
    } catch (e) { console.error("Error updating user role", e); }
  };
  
  const onUpdateExportPermission = async (username: string, canExport: boolean) => {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      snap.forEach(d => updateDoc(d.ref, { canExportAnalytics: canExport }));
  };
  
  const onDeleteUser = async (username: string) => {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
  };

  const onAddRole = async (name: string, parentId?: string, rank: number = 5) => {
    try { 
      await addDoc(collection(db, 'roles'), { 
        name: name.toUpperCase(), 
        parentId: parentId || null, 
        rank: rank, 
        isSystem: false,
        permissions: [] 
      }); 
    } catch (e) { console.error(e); }
  };

  const onDeleteRole = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'roles', id));
    } catch (e) { console.error(e); }
  };

  const onUpdatePermission = async (permissionName: string, roleName: string, hasPermission: boolean) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return;
    const roleRef = doc(db, 'roles', role.id);
    
    try {
        if (hasPermission) {
            await updateDoc(roleRef, { permissions: arrayUnion(permissionName) });
        } else {
            await updateDoc(roleRef, { permissions: arrayRemove(permissionName) });
        }
    } catch (e) { console.error("Error updating permission", e); }
  };

  const onAddNotification = async (notification: Partial<Notification>) => {
    try { await addDoc(collection(db, 'notifications'), { ...notification, timestamp: Date.now() }); }
    catch (e) { console.error("Error adding notification", e); }
  };

  const onClearNotification = async (id: string) => {
    try { await deleteDoc(doc(db, 'notifications', id)); } catch (e) { console.error("Error clearing notification", e); }
  };

  const onBroadcastNotification = async (message: string, author: string, targetUsernames?: string[]) => {
    try {
      const batch = writeBatch(db);
      // Ak targetUsernames nie sú definované, odošleme všetkým
      const recipients = targetUsernames && targetUsernames.length > 0 
        ? users.filter(u => targetUsernames.includes(u.username))
        : users;

      recipients.forEach(user => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          partNumber: 'SYSTÉMOVÁ SPRÁVA',
          reason: message,
          reportedBy: author,
          targetUser: user.username,
          timestamp: Date.now()
        });
      });
      await batch.commit();
    } catch (e) {
      console.error("Broadcast failed", e);
    }
  };

  const onAddAdminNote = async (text: string, author: string) => {
      try {
          const newItem: AdminNote = { 
              id: crypto.randomUUID(), 
              text, 
              author, 
              createdAt: Date.now() 
          };
          await setDoc(doc(db, 'settings', 'notes'), { items: arrayUnion(newItem) }, { merge: true });
      } catch (e) { console.error("Error adding admin note", e); }
  };

  const onDeleteAdminNote = async (id: string) => {
      try {
          const ref = doc(db, 'settings', 'notes');
          const snap = await getDoc(ref);
          if (snap.exists()) {
              const currentItems = (snap.data().items || []) as AdminNote[];
              const newItems = currentItems.filter(i => i.id !== id);
              await updateDoc(ref, { items: newItems });
          }
      } catch (e) { console.error("Error deleting admin note", e); }
  };

  const onClearAdminNotes = async () => {
      try {
          await updateDoc(doc(db, 'settings', 'notes'), { items: [] });
      } catch (e) { console.error("Error clearing admin notes", e); }
  };

  return {
    users, roles, notifications, adminNotes,
    onAddUser, onUpdatePassword, onUpdateNickname, onUpdateUserRole, onUpdateExportPermission, onDeleteUser,
    onAddRole, onDeleteRole, onUpdatePermission,
    onAddNotification, onClearNotification, onBroadcastNotification,
    onAddAdminNote, onDeleteAdminNote, onClearAdminNotes
  };
};
