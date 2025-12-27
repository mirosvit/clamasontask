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
        setStatus('connecting');
        try {
            // Simulácia pripojenia k externému zdroju (chránený master dokument)
            const masterRef = doc(db, 'settings', 'master_catalog');
            const snap = await getDoc(masterRef);
            
            if (!snap.exists()) {
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

            setNewParts(data.parts || []);
            setStatus('preview');
        } catch (e) {
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
            const currentData = currentLocal.exists() ? currentLocal.data().data || [] : [];
            
            // Merge unikátnych dielov
            const existingKeys = new Set(currentData.map((x: any) => x.p));
            const filteredNew = newParts.filter(p => !existingKeys.has(p.p));
            
            const batch = writeBatch(db);
            batch.update(localPartsRef, {
                data: [...currentData, ...filteredNew]
            });
            
            await batch.commit();
            onSyncSuccess(filteredNew.length);
            onClose();
        } catch (e) {
            alert("Import failed");
            setStatus('preview');
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-[#97bc1e]/50 rounded-3xl shadow-[0_0_50px_rgba(151,188,30,0.2)] w-full max-w-md p-8 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#97bc1e]/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                
                <div className="text-center mb-8 relative z-10">
                    <div className="w-16 h-16 bg-[#97bc1e]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#97bc1e]/30">
                        <svg className="w-8 h-8 text-[#97bc1e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.105 3.582 2 8 2s8-.895 8-2V7M4 7c0 1.105 3.582 2 8 2s8-.895 8-2M4 7c0-1.105 3.582-2 8-2s8 .895 8 2m-8 4v10" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t('db_sync_title')}</h3>
                </div>

                <div className="space-y-6 relative z-10">
                    {status === 'idle' && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('db_sync_pass_label')}</label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
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
                        </>
                    )}

                    {status === 'connecting' && (
                        <div className="py-10 text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-[#97bc1e] border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-400 font-bold animate-pulse">{t('db_sync_connecting')}</p>
                        </div>
                    )}

                    {status === 'preview' && (
                        <div className="text-center space-y-6">
                            <p className="text-white text-lg font-bold">{t('db_sync_preview', { count: newParts.length })}</p>
                            <button 
                                onClick={handleImport}
                                className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl"
                            >
                                {t('db_sync_import_btn')}
                            </button>
                        </div>
                    )}

                    {status === 'importing' && (
                        <div className="py-10 text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-400 font-bold">Synchronizujem lokálnu databázu...</p>
                        </div>
                    )}

                    <button 
                        onClick={onClose}
                        className="w-full py-3 text-slate-500 hover:text-slate-300 font-bold uppercase text-[10px] tracking-widest transition-colors"
                    >
                        {t('btn_cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MasterDbSyncModal;