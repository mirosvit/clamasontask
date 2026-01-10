
import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';

interface MasterDbSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSyncSuccess: (count: number) => void;
}

const MasterDbSyncModal: React.FC<MasterDbSyncModalProps> = ({ isOpen, onClose, onSyncSuccess }) => {
    const { t, language } = useLanguage();
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'connecting' | 'preview' | 'importing'>('idle');
    const [newParts, setNewParts] = useState<{p: string, d: string}[]>([]);

    if (!isOpen) return null;

    const handleConnect = async () => {
        if (!password) return;
        setStatus('connecting');
        try {
            await new Promise(r => setTimeout(r, 800));
            const masterRef = doc(db, 'settings', 'master_catalog');
            const snap = await getDoc(masterRef);
            if (!snap.exists()) {
                if (password === '1234') {
                    setNewParts([{ p: 'DEMO-123', d: 'Demo Part 1' }, { p: 'DEMO-456', d: 'Demo Part 2' }]);
                    setStatus('preview'); return;
                }
                alert(t('db_sync_error_fetch')); setStatus('idle'); return;
            }
            const data = snap.data();
            if (data.accessKey !== password) { alert(t('db_sync_error_pass')); setStatus('idle'); return; }
            setNewParts(data.parts || []);
            setStatus('preview');
        } catch (e) { alert(t('db_sync_error_fetch')); setStatus('idle'); }
    };

    const handleImport = async () => {
        setStatus('importing');
        try {
            const localPartsRef = doc(db, 'settings', 'parts');
            const currentLocal = await getDoc(localPartsRef);
            const currentData = currentLocal.exists() ? (currentLocal.data().items || []) : [];
            const formattedNewParts = newParts.map((np) => ({ value: np.p.toUpperCase(), description: np.d }));
            const existingKeys = new Set(currentData.map((x: any) => x.value));
            const uniqueNewParts = formattedNewParts.filter(p => !existingKeys.has(p.value));
            if (uniqueNewParts.length === 0) { alert(language === 'sk' ? 'Všetky diely už existujú.' : 'All parts already exist.'); onClose(); return; }
            const batch = writeBatch(db);
            batch.set(localPartsRef, { items: [...currentData, ...uniqueNewParts] }, { merge: true });
            await batch.commit();
            onSyncSuccess(uniqueNewParts.length);
            onClose();
        } catch (e) { setStatus('preview'); }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-[#97bc1e]/50 rounded-3xl shadow-[0_0_50px_rgba(151,188,30,0.2)] w-full max-w-lg p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="text-center mb-6 relative z-10">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t('db_sync_title')}</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
                        {status === 'idle' && (language === 'sk' ? 'Zadajte heslo' : 'Enter password')}
                        {status === 'connecting' && t('db_sync_connecting')}
                        {status === 'preview' && (language === 'sk' ? 'Nájdené diely' : 'Found parts')}
                    </p>
                </div>
                <div className="space-y-6 relative z-10 flex-grow flex flex-col min-h-0">
                    {status === 'idle' && (
                        <>
                            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleConnect()} placeholder="••••" className="w-full h-14 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 text-white text-center font-mono text-xl outline-none" autoFocus />
                            <button onClick={handleConnect} className="w-full py-4 bg-[#97bc1e] hover:bg-[#86a81b] text-white rounded-xl font-black uppercase text-xs">{t('db_sync_btn_connect')}</button>
                        </>
                    )}
                    {status === 'preview' && (
                        <div className="flex flex-col h-full gap-4">
                            <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex-grow overflow-y-auto custom-scrollbar p-2">
                                {newParts.map((part, idx) => <div key={idx} className="flex justify-between p-2 hover:bg-slate-700/50 rounded-lg"><span className="text-sm font-mono font-bold text-white">{part.p}</span></div>)}
                            </div>
                            <button onClick={handleImport} className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black uppercase text-xs">{t('db_sync_import_btn')}</button>
                        </div>
                    )}
                    <button onClick={onClose} className="w-full py-3 text-slate-500 hover:text-slate-300 font-bold uppercase text-[10px]">{t('btn_cancel')}</button>
                </div>
            </div>
        </div>
    );
};

export default MasterDbSyncModal;
