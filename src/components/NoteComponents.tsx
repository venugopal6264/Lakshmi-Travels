import { useState } from 'react';
import { X, Pin, PinOff, Tag, Trash2, Edit3, StickyNote } from 'lucide-react';
import { ApiNote } from '../services/api';
import { softenColor, noteColors, NoteInput } from '../utils/notesUtils';

interface NoteCardProps {
    note: ApiNote;
    onEdit: (n: ApiNote) => void;
    onDelete: (id: string) => void;
    onTogglePin: (id: string, pinned: boolean) => void;
}

export function NoteCard({ note, onEdit, onDelete, onTogglePin }: NoteCardProps) {
    const c = softenColor(note.color || '#fffbea', 0.35);
    const isTable = note.format === 'table';
    const cardClass = isTable
        ? "rounded-lg border shadow-sm p-3 relative h-64 flex flex-col overflow-hidden sm:col-span-2"
        : "rounded-lg border shadow-sm p-3 relative h-64 flex flex-col overflow-hidden";

    return (
        <div className={cardClass} style={{ background: c, borderColor: '#e5e7eb' }}>
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
            {note.title && <div className="text-sm font-semibold mb-1 pr-14 break-words">{note.title}</div>}

            <div className={`text-sm flex-1 overflow-y-auto overflow-x-hidden`}>
                {isTable && note.tableData ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-black/20">
                                    {note.tableData.headers.map((header, i) => (
                                        <th key={i} className="px-2 py-1 text-left font-semibold bg-black/5">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {note.tableData.rows.map((row, i) => (
                                    <tr key={i} className="border-b border-black/10">
                                        {row.map((cell, j) => (
                                            <td key={j} className="px-2 py-1 break-words">{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap break-words">{note.content}</div>
                )}
            </div>

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

interface NoteEditorProps {
    initial?: ApiNote | null;
    onClose: () => void;
    onSave: (data: NoteInput, id?: string) => void;
}

export function NoteEditor({ initial, onClose, onSave }: NoteEditorProps) {
    const [title, setTitle] = useState(initial?.title || '');
    const [content, setContent] = useState(initial?.content || '');
    const [format, setFormat] = useState<'text' | 'table'>(initial?.format || 'text');
    const [headers, setHeaders] = useState<string[]>(initial?.tableData?.headers || ['']);
    const [rows, setRows] = useState<string[][]>(initial?.tableData?.rows || [['']]);
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

    const addColumn = () => {
        setHeaders(prev => [...prev, '']);
        setRows(prev => prev.map(row => [...row, '']));
    };

    const addRow = () => {
        setRows(prev => [...prev, Array(headers.length).fill('')]);
    };

    const removeColumn = (index: number) => {
        if (headers.length <= 1) return;
        setHeaders(prev => prev.filter((_, i) => i !== index));
        setRows(prev => prev.map(row => row.filter((_, i) => i !== index)));
    };

    const removeRow = (index: number) => {
        if (rows.length <= 1) return;
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const updateHeader = (index: number, value: string) => {
        setHeaders(prev => {
            const newHeaders = [...prev];
            newHeaders[index] = value;
            return newHeaders;
        });
    };

    const updateCell = (rowIndex: number, colIndex: number, value: string) => {
        setRows(prev => {
            const newRows = [...prev];
            newRows[rowIndex] = [...newRows[rowIndex]];
            newRows[rowIndex][colIndex] = value;
            return newRows;
        });
    };

    const handleSave = () => {
        if (format === 'table') {
            onSave({
                title,
                format: 'table',
                tableData: { headers, rows },
                color,
                labels,
                pinned
            }, initial?._id);
        } else {
            onSave({ title, content, format: 'text', color, labels, pinned }, initial?._id);
        }
    };

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-lg shadow-lg overflow-hidden" style={{ background: softenColor(color, 0.3) }}>
                <div className="px-4 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold"><StickyNote className="h-4 w-4" /> {initial ? 'Edit Note' : 'New Note'}</div>
                    <button className="p-1 rounded hover:bg-gray-100" onClick={onClose}><X className="h-4 w-4" /></button>
                </div>
                <div className="p-2 space-y-3 max-h-[80vh] overflow-y-auto">
                    <input className="w-full border rounded px-2 py-2 text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

                    {/* Format Toggle */}
                    <div className="flex items-center gap-2 border rounded p-2">
                        <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                            <input type="radio" name="format" checked={format === 'text'} onChange={() => setFormat('text')} />
                            Text
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                            <input type="radio" name="format" checked={format === 'table'} onChange={() => setFormat('table')} />
                            Table
                        </label>
                    </div>

                    {/* Content Area */}
                    {format === 'text' ? (
                        <textarea className="w-full border rounded px-2 py-2 text-sm min-h-[120px]" placeholder="Write a note..." value={content} onChange={(e) => setContent(e.target.value)} />
                    ) : (
                        <div className="border rounded p-3 space-y-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold">Table Data</span>
                                <div className="flex gap-2">
                                    <button className="px-2 py-1 text-xs bg-blue-500 text-white rounded" onClick={addColumn}>+ Column</button>
                                    <button className="px-2 py-1 text-xs bg-green-500 text-white rounded" onClick={addRow}>+ Row</button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr>
                                            {headers.map((header, i) => (
                                                <th key={i} className="border p-1 bg-gray-100">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            className="flex-1 px-1 py-0.5 text-xs"
                                                            placeholder={`Header ${i + 1}`}
                                                            value={header}
                                                            onChange={(e) => updateHeader(i, e.target.value)}
                                                        />
                                                        {headers.length > 1 && (
                                                            <button className="text-red-500 hover:text-red-700" onClick={() => removeColumn(i)}>×</button>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                {row.map((cell, colIndex) => (
                                                    <td key={colIndex} className="border p-1">
                                                        <input
                                                            className="w-full px-1 py-0.5 text-xs"
                                                            placeholder="..."
                                                            value={cell}
                                                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                                        />
                                                    </td>
                                                ))}
                                                {rows.length > 1 && (
                                                    <td className="border p-1">
                                                        <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => removeRow(rowIndex)}>Delete</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                        {noteColors.map(cVal => (
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
                        <button className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white" onClick={handleSave}>Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
