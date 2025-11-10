import { useEffect, useMemo, useState } from 'react';
import { StickyNote, Plus, X, Pin, PinOff, Tag, Trash2, Edit3 } from 'lucide-react';
import { ApiNote, apiService } from '../services/api';
type NoteInput = Partial<Pick<ApiNote, 'title' | 'content' | 'color' | 'labels' | 'pinned'>>;

const colors = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#e9d5ff', '#fecdd3', '#d1fae5', '#e5e7eb'];

// Helper: soften a hex color by mixing with white for lighter display
const softenColor = (hex: string, factor = 0.25) => {
    if (!hex) return '#ffffff';
    const h = hex.replace('#', '');
    const parse = (p: string) => parseInt(p, 16);
    let r: number, g: number, b: number;
    if (h.length === 3) {
        r = parse(h[0] + h[0]); g = parse(h[1] + h[1]); b = parse(h[2] + h[2]);
    } else if (h.length === 6) {
        r = parse(h.slice(0, 2)); g = parse(h.slice(2, 4)); b = parse(h.slice(4, 6));
    } else {
        return hex;
    }
    const mix = (c: number) => Math.round(c + (255 - c) * factor);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

function NoteCard({ note, onEdit, onDelete, onTogglePin }: { note: ApiNote; onEdit: (n: ApiNote) => void; onDelete: (id: string) => void; onTogglePin: (id: string, pinned: boolean) => void }) {
    const c = softenColor(note.color || '#fffbea', 0.35);
    return (
        <div className="rounded-lg border shadow-sm p-3 relative" style={{ background: c, borderColor: '#e5e7eb' }}>
            <div className="absolute right-2 top-2 flex items-center gap-2">
                <button className="p-1 rounded hover:bg-black/5" title={note.pinned ? 'Unpin' : 'Pin'} onClick={() => note._id && onTogglePin(note._id, !note.pinned)}>
                    {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </button>
                <button className="p-1 rounded hover:bg-black/5" title="Edit" onClick={() => onEdit(note)}>
                    <Edit3 className="h-4 w-4" />
                </button>
                <button className="p-1 rounded hover:bg-black/5 text-red-600" title="Delete" onClick={() => note._id && onDelete(note._id)}>
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
            {note.title && <div className="text-sm font-semibold mb-1 pr-14">{note.title}</div>}
            <div className="text-sm whitespace-pre-wrap pr-10">{note.content}</div>
            {note.labels && note.labels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {note.labels.map((l, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 border border-black/10">
                            <Tag className="h-3 w-3" /> {l}
                        </span>
                    ))}
                </div>
            )}
            <div className="mt-2 text-[10px] text-gray-600">{new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleString()}</div>
        </div>
    );
}

function NoteEditor({ initial, onClose, onSave }: { initial?: ApiNote | null; onClose: () => void; onSave: (data: NoteInput, id?: string) => void }) {
    const [title, setTitle] = useState(initial?.title || '');
    const [content, setContent] = useState(initial?.content || '');
    const [color, setColor] = useState(initial?.color || '#fffbea');
    const [labels, setLabels] = useState<string[]>(initial?.labels || []);
    const [pinned, setPinned] = useState<boolean>(!!initial?.pinned);
    const [labelInput, setLabelInput] = useState('');

    const addLabel = () => {
        const l = labelInput.trim();
        if (!l) return;
        setLabels(prev => Array.from(new Set([...prev, l])));
        setLabelInput('');
    };

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-lg shadow-lg overflow-hidden" style={{ background: softenColor(color, 0.3) }}>
                <div className="px-4 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold"><StickyNote className="h-4 w-4" /> {initial ? 'Edit Note' : 'New Note'}</div>
                    <button className="p-1 rounded hover:bg-gray-100" onClick={onClose}><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 space-y-3">
                    <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <textarea className="w-full border rounded px-3 py-2 text-sm min-h-[120px]" placeholder="Write a note..." value={content} onChange={(e) => setContent(e.target.value)} />
                    <div className="flex items-center gap-2 flex-wrap">
                        {colors.map(cVal => (
                            <button
                                key={cVal}
                                className={`w-6 h-6 rounded border relative transition ${color === cVal ? 'ring-2 ring-indigo-500' : ''}`}
                                style={{ background: softenColor(cVal, 0.2), borderColor: '#d1d5db' }}
                                aria-label={`Color ${cVal}`}
                                onClick={() => setColor(cVal)}
                            >
                                {color === cVal && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-700">✓</span>}
                            </button>
                        ))}
                        <label className="ml-2 inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />Pinned</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Add label" value={labelInput} onChange={(e) => setLabelInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }} />
                        <button className="px-2 py-1 text-xs rounded border" onClick={addLabel}>Add</button>
                    </div>
                    {labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {labels.map((l, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 border"><Tag className="h-3 w-3" />{l}<button className="ml-1 text-gray-500 hover:text-gray-700" onClick={() => setLabels(prev => prev.filter(x => x !== l))}>×</button></span>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <button className="px-3 py-1.5 text-sm rounded border" onClick={onClose}>Cancel</button>
                        <button className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white" onClick={() => onSave({ title, content, color, labels, pinned }, initial?._id)}>Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
            const saved = id ? await apiService.updateNote(id, data) : await apiService.createNote(data as { title?: string; content: string; color?: string; labels?: string[]; pinned?: boolean });
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
            <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-6 py-4">
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
        </div>
    );
}
