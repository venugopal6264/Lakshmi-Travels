import { useEffect, useMemo, useState } from 'react';
import { StickyNote, Plus } from 'lucide-react';
import { ApiNote, apiService } from '../services/api';
import { NoteCard, NoteEditor } from '../components/NoteComponents';
import { NoteInput } from '../utils/notesUtils';

export default function NotesPage() {
    const [notes, setNotes] = useState<ApiNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<ApiNote | null>(null);

    useEffect(() => {
        (async () => {
            try { setLoading(true); setNotes(await apiService.getNotes()); }
            catch { setError('Failed to load notes'); }
            finally { setLoading(false); }
        })();
    }, []);

    const pinned = useMemo(() => notes.filter(n => n.pinned), [notes]);
    const others = useMemo(() => notes.filter(n => !n.pinned), [notes]);

    const openNew = () => { setEditing(null); setEditorOpen(true); };
    const onSave = async (data: NoteInput, id?: string) => {
        try {
            const saved = id ? await apiService.updateNote(id, data) : await apiService.createNote(data);
            setNotes(prev => {
                const map = new Map(prev.map(n => [n._id, n] as const));
                map.set(saved._id!, saved);
                return Array.from(map.values());
            });
            setEditorOpen(false);
            setEditing(null);
        } catch { setError('Failed to save'); }
    };
    const onDelete = async (id: string) => {
        try { await apiService.deleteNote(id); setNotes(prev => prev.filter(n => n._id !== id)); }
        catch { setError('Failed to delete'); }
    };
    const onTogglePin = async (id: string, pinned: boolean) => {
        try { const saved = await apiService.updateNote(id, { pinned }); setNotes(prev => prev.map(n => n._id === id ? saved : n)); }
        catch { setError('Failed to update'); }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-2 py-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-white flex items-center gap-2"><StickyNote className="h-5 w-5" /> Notes</h1>
                    <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 hover:from-emerald-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm" onClick={openNew}><Plus className="h-4 w-4" /> New</button>
                </div>
            </div>
            <div className="p-4">
                {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
                {loading ? (
                    <div className="text-sm text-gray-600">Loading...</div>
                ) : (
                    <>
                        {pinned.length > 0 && (
                            <div className="mb-6">
                                <div className="text-xs uppercase text-gray-500 mb-2">Pinned</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {pinned.map(n => (
                                        <NoteCard key={n._id} note={n} onEdit={(n) => { setEditing(n); setEditorOpen(true); }} onDelete={onDelete} onTogglePin={onTogglePin} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <div className="text-xs uppercase text-gray-500 mb-2">Others</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {others.map(n => (
                                    <NoteCard key={n._id} note={n} onEdit={(n) => { setEditing(n); setEditorOpen(true); }} onDelete={onDelete} onTogglePin={onTogglePin} />
                                ))}
                            </div>
                        </div>
                    </>
                )}
                {editorOpen && (
                    <NoteEditor initial={editing} onClose={() => { setEditorOpen(false); setEditing(null); }} onSave={onSave} />
                )}
            </div>
            {/* Floating Add Note button */}
            <button
                type="button"
                title="Add New Note"
                aria-label="Add New Note"
                onClick={openNew}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl ring-2 ring-emerald-400/50 flex items-center justify-center transition transform hover:scale-110 hover:shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}
            >
                <Plus className="w-7 h-7" />
            </button>
        </div>
    );
}
