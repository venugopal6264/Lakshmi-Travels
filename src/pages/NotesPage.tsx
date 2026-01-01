import { useEffect, useMemo, useState } from 'react';
import { StickyNote, Plus, Search } from 'lucide-react';
import { ApiNote, apiService } from '../services/api';
import { NoteCard, NoteEditor } from '../components/NoteComponents';
import { NoteInput } from '../utils/notesUtils';

export default function NotesPage() {
    const [notes, setNotes] = useState<ApiNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<ApiNote | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        (async () => {
            try { setLoading(true); setNotes(await apiService.getNotes()); }
            catch { setError('Failed to load notes'); }
            finally { setLoading(false); }
        })();
    }, []);

    // Filter notes based on search query
    const filteredNotes = useMemo(() => {
        if (!searchQuery.trim()) return notes;
        const query = searchQuery.toLowerCase();
        return notes.filter(n => {
            // Search in title
            if (n.title?.toLowerCase().includes(query)) return true;
            // Search in content
            if (n.content?.toLowerCase().includes(query)) return true;
            // Search in labels
            if (n.labels?.some(label => label.toLowerCase().includes(query))) return true;
            // Search in table data
            if (n.format === 'table' && n.tableData) {
                // Search in headers
                if (n.tableData.headers.some(h => h.toLowerCase().includes(query))) return true;
                // Search in rows
                if (n.tableData.rows.some(row => row.some(cell => cell.toLowerCase().includes(query)))) return true;
            }
            return false;
        });
    }, [notes, searchQuery]);

    const pinned = useMemo(() => filteredNotes.filter(n => n.pinned), [filteredNotes]);
    const others = useMemo(() => filteredNotes.filter(n => !n.pinned), [filteredNotes]);

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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <h1 className="text-lg font-semibold text-white flex items-center gap-2"><StickyNote className="h-5 w-5" /> Notes</h1>

                    {/* Search Bar */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-white/30 rounded-lg bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400"
                            />
                        </div>
                        <button
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-2 hover:from-emerald-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm whitespace-nowrap"
                            onClick={openNew}
                        >
                            <Plus className="h-4 w-4" /> New
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-4">
                {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
                {loading ? (
                    <div className="text-sm text-gray-600">Loading...</div>
                ) : filteredNotes.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-sm">
                            {searchQuery.trim() ? `No notes found matching "${searchQuery}"` : 'No notes yet. Click "New" to create one.'}
                        </div>
                    </div>
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
