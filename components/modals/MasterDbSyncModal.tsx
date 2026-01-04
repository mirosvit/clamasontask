
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
            // Simulácia oneskorenia siete pre lepší UX
            await new Promise(r => setTimeout(r, 800));

            // Pripojenie k externému zdroju (chránený master dokument)
            const masterRef = doc(db, 'settings', 'master_catalog');
            const snap = await getDoc(masterRef);
            
            if (!snap.exists()) {
                // Fallback pre demo účely, ak dokument neexistuje
                console.warn("Master DB document not found. Using demo data if password matches '1234'.");
                if (password === '1234') {
                    setNewParts([
                        { p: 'DEMO-123', d: 'Demo Part 1' },
                        { p: 'DEMO-456', d: 'Demo Part 2' },
                        { p: 'DEMO-789', d: 'Demo Part 3' }
                    ]);
                    setStatus('preview');
                    return;
                }
                alert(t('db_sync_error_fetch'));
                setStatus('idle');
                return;
            }

            const data = snap.data();
            if (data.accessKey !== password) {
                alert(t('db_sync_error_pass'));
                setStatus('idle');
                return;
            }

            // Očakávame štruktúru { parts: [{p: 'číslo', d: 'popis'}, ...] }
            setNewParts(data.parts || []);
            setStatus('preview');
        } catch (e) {
            console.error(e);
            alert(t('db_sync_error_fetch'));
            setStatus('idle');
        }
    };

    const handleImport = async () => {
        setStatus('importing');
        try {
            // Použitie writeBatch podľa pravidla Quota Guard
            const localPartsRef = doc(db, 'settings', 'parts');
            const currentLocal = await getDoc(localPartsRef);
            
            // Čítame z 'items', nie 'data' (konzistencia s useFirestoreData)
            const currentData = currentLocal.exists() ? (currentLocal.data().items || []) : [];
            
            // Príprava dát pre lokálny formát - LEN value a description
            const formattedNewParts = newParts.map((np) => ({
                value: np.p.toUpperCase(),
                description: np.d
            }));

            // Merge unikátnych dielov (podľa hodnoty value/p)
            const existingKeys = new Set(currentData.map((x: any) => x.value));
            const uniqueNewParts = formattedNewParts.filter(p => !existingKeys.has(p.value));
            
            if (uniqueNewParts.length === 0) {
                alert(language === 'sk' ? 'Všetky diely už v databáze existujú.' : 'All parts already exist in database.');
                onClose();
                return;
            }

            const batch = writeBatch(db);
            batch.set(localPartsRef, {
                items: [...currentData, ...uniqueNewParts]
            }, { merge: true });
            
            await batch.commit();
            
            // Krátke oneskorenie pre vizuálny efekt dokončenia
            await new Promise(r => setTimeout(r, 500));
            
            onSyncSuccess(uniqueNewParts.length);
            onClose();
        } catch (e) {
            console.error(e);
            alert("Import failed");
            setStatus('preview');
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-[#97bc1e]/50 rounded-3xl shadow-[0_0_50px_rgba(151,188,30,0.2)] w-full max-w-lg p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#97bc1e]/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                
                <div className="text-center mb-6 relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 bg-[#97bc1e]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#97bc1e]/30">
                        <svg className="w-8 h-8 text-[#97bc1e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.105 3.582 2 8 2s8-.895 8-2V7M4 7c0 1.105 3.582 2 8 2s8-.895 8-2M4 7c0-1.105 3.582-2 8-2s8 .895 8 2m-8 4v10" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t('db_sync_title')}</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
                        {status === 'idle' && (language === 'sk' ? 'Zadajte prístupové heslo' : 'Enter access password')}
                        {status === 'connecting' && (language === 'sk' ? 'Pripájam sa k databáze...' : 'Connecting to database...')}
                        {status === 'preview' && (language === 'sk' ? 'Nájdené diely' : 'Found parts')}
                        {status === 'importing' && (language === 'sk' ? 'Ukladám do systému...' : 'Saving to system...')}
                    </p>
                </div>

                <div className="space-y-6 relative z-10 flex-grow flex flex-col min-h-0">
                    {status === 'idle' && (
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('db_sync_pass_label')}</label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 text-white text-center font-mono text-xl tracking-widest focus:border-[#97bc1e] transition-all outline-none"
                                    autoFocus
                                />
                            </div>
                            <button 
                                onClick={handleConnect}
                                className="w-full py-4 bg-[#97bc1e] hover:bg-[#86a81b] text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95"
                            >
                                {t('db_sync_btn_connect')}
                            </button>
                        </div>
                    )}

                    {status === 'connecting' && (
                        <div className="py-10 text-center space-y-4 flex-grow flex flex-col justify-center">
                            <div className="w-12 h-12 border-4 border-[#97bc1e] border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-400 font-bold animate-pulse">{t('db_sync_connecting')}</p>
                        </div>
                    )}

                    {status === 'preview' && (
                        <div className="flex flex-col h-full gap-4">
                            <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex-grow overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-400 uppercase">Zoznam dielov</span>
                                    <span className="text-xs font-mono font-bold text-[#97bc1e]">{newParts.length} items</span>
                                </div>
                                <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
                                    {newParts.map((part, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                                            <span className="text-sm font-mono font-bold text-white">{part.p}</span>
                                            <span className="text-xs text-slate-500 truncate max-w-[150px]">{part.d}</span>
                                        </div>
                                    ))}
                                    {newParts.length === 0 && (
                                        <p className="text-center text-slate-500 py-4 italic text-sm">Žiadne diely na import</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-shrink-0 pt-2">
                                <p className="text-white text-center text-sm font-bold mb-4">{t('db_sync_preview', { count: newParts.length })}</p>
                                <button 
                                    onClick={handleImport}
                                    className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    {t('db_sync_import_btn')}
                                </button>
                            </div>
                        </div>
                    )}

                    {status === 'importing' && (
                        <div className="py-10 text-center space-y-4 flex-grow flex flex-col justify-center">
                            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-400 font-bold">Synchronizujem lokálnu databázu...</p>
                        </div>
                    )}

                    <button 
                        onClick={onClose}
                        className="w-full py-3 text-slate-500 hover:text-slate-300 font-bold uppercase text-[10px] tracking-widest transition-colors flex-shrink-0"
                    >
                        {t('btn_cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MasterDbSyncModal;
