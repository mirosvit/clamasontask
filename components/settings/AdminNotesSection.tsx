
import React, { useState } from 'react';
import { AdminNote } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';

interface AdminNotesSectionProps {
  notes: AdminNote[];
  onAddNote: (text: string, author: string) => void;
  onDeleteNote: (id: string) => void;
  onClearNotes: () => void;
  currentUser: string;
  resolveName: (username?: string | null) => string;
}

const Icons = {
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
};

const AdminNotesSection: React.FC<AdminNotesSectionProps> = ({ notes, onAddNote, onDeleteNote, onClearNotes, currentUser, resolveName }) => {
  const { t } = useLanguage();
  const [newNoteText, setNewNoteText] = useState('');

  const handleAdd = () => {
    if (!newNoteText.trim()) return;
    onAddNote(newNoteText, currentUser);
    setNewNoteText('');
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  return (
    <div className="bg-amber-900/10 border-2 border-amber-500/30 rounded-3xl p-6 shadow-xl ring-1 ring-amber-500/20 animate-fade-in relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-xl font-black text-amber-500 uppercase tracking-tighter flex items-center gap-2">
                <span className="text-2xl">📝</span> {t('admin_notes_title')}
            </h3>
            {notes.length > 0 && (
                <button 
                    onClick={() => { if(window.confirm('Vymazať všetky poznámky?')) onClearNotes(); }}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                    <Icons.Trash /> {t('admin_notes_clear')}
                </button>
            )}
        </div>

        <div className="mb-8 relative z-10">
            <div className="flex gap-2">
                <textarea 
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder={t('admin_notes_placeholder')}
                    className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-all font-medium placeholder-slate-600 resize-none h-20"
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
                />
                <button 
                    onClick={handleAdd}
                    className="w-20 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black shadow-lg transition-all active:scale-95 flex items-center justify-center border-2 border-amber-500"
                >
                    <Icons.Plus />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
            {notes.length > 0 ? (
                // Zoradenie od najnovšej
                [...notes].sort((a,b) => b.createdAt - a.createdAt).map(note => (
                    <div key={note.id} className="group relative bg-amber-100/10 border border-amber-500/20 p-4 rounded-xl shadow-sm hover:bg-amber-100/15 transition-all">
                        <p className="text-sm font-medium text-amber-100 whitespace-pre-wrap mb-6">{note.text}</p>
                        
                        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end border-t border-amber-500/10 pt-2">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest">{resolveName(note.author)}</span>
                                <span className="text-[8px] font-mono text-slate-500">{formatDate(note.createdAt)}</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => onDeleteNote(note.id)}
                            className="absolute top-2 right-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-900/50 rounded p-1"
                        >
                            <Icons.Trash />
                        </button>
                    </div>
                ))
            ) : (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-amber-500/20 rounded-xl bg-amber-500/5">
                    <p className="text-amber-500/50 font-black uppercase tracking-widest text-xs">{t('admin_notes_empty')}</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default AdminNotesSection;
