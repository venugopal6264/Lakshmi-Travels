import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiName, apiNames } from '../services/api';

interface NamesModalProps {
    open: boolean;
    onClose: () => void;
    existingAccounts: string[];
}

export default function NamesModal({ open, onClose, existingAccounts }: NamesModalProps) {
    const [namesName, setNamesName] = useState('');
    const [namesAge, setNamesAge] = useState('');
    const [namesAccount, setNamesAccount] = useState('');
    const [namesDob, setNamesDob] = useState('2020-01-01');
    const [namesList, setNamesList] = useState<ApiName[]>([]);
    const [showNamesForm, setShowNamesForm] = useState(false);

    // Load saved names when modal opens
    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const data = await apiNames.list();
                setNamesList(data);
            } catch {
                // silent
            }
        })();
    }, [open]);

    // Reset form visibility and fields on open
    useEffect(() => {
        if (open) {
            setShowNamesForm(false);
            setNamesName('');
            setNamesAccount('');
            setNamesDob('2020-01-01');
            setNamesAge('');
        }
    }, [open]);

    const handleCancel = () => {
        onClose();
        setShowNamesForm(false);
        setNamesName('');
        setNamesAccount('');
        setNamesDob('2020-01-01');
        setNamesAge('');
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: namesName.trim(),
                age: namesAge ? Number(namesAge) : null,
                dob: namesDob || null,
                account: namesAccount ? namesAccount.trim() : null,
            };
            if (!payload.name) {
                alert('Please enter a name');
                return;
            }
            await apiNames.create(payload);
            const data = await apiNames.list();
            setNamesList(data);
            setNamesName('');
            setNamesAccount('');
            setNamesDob('2020-01-01');
            setNamesAge('');
            setShowNamesForm(false);
        } catch {
            alert('Failed to save');
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-md m-4 my-10">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-emerald-600 via-cyan-500 to-indigo-600 shadow-2xl">
                    <div className="bg-white rounded-2xl max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-sm">
                            <h3 className="text-base sm:text-lg font-semibold tracking-wide">Saved Names</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-4 sm:px-5 py-4 flex-1 overflow-y-auto space-y-4">
                            {!showNamesForm ? (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowNamesForm(true)}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow"
                                    >
                                        Create
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={namesName}
                                            onChange={(e) => setNamesName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="Enter name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Account</label>
                                        <input
                                            type="text"
                                            value={namesAccount}
                                            onChange={(e) => setNamesAccount(e.target.value)}
                                            list="names-account-suggestions"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="Start typing to search or add new account"
                                        />
                                        <datalist id="names-account-suggestions">
                                            {existingAccounts.map((acc) => (
                                                <option key={acc} value={acc} />
                                            ))}
                                        </datalist>
                                        {namesAccount && !existingAccounts.includes(namesAccount) && (
                                            <p className="text-[10px] text-gray-500 mt-1">New account will be created: {namesAccount}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={namesDob}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setNamesDob(v);
                                                if (v) {
                                                    const d = new Date(v);
                                                    if (!isNaN(d.getTime())) {
                                                        const today = new Date();
                                                        let age = today.getFullYear() - d.getFullYear();
                                                        const m = today.getMonth() - d.getMonth();
                                                        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
                                                        setNamesAge(age >= 0 ? String(age) : '');
                                                    } else {
                                                        setNamesAge('');
                                                    }
                                                } else {
                                                    setNamesAge('');
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">Default year is 2020.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                                        <input
                                            type="text"
                                            value={namesAge}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none"
                                            placeholder="Auto-calculated"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-2">
                                <div className="text-xs font-semibold text-gray-700 mb-1">Saved Names</div>
                                {namesList.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-2 py-1 text-left">Name</th>
                                                    <th className="px-2 py-1 text-left">Account</th>
                                                    <th className="px-2 py-1 text-left">Age</th>
                                                    <th className="px-2 py-1 text-left">Date of Birth</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {namesList.map((n) => (
                                                    <tr key={n._id} className="border-t">
                                                        <td className="px-2 py-1 font-medium text-gray-800">{n.name}</td>
                                                        <td className="px-2 py-1">{n.account || '-'}</td>
                                                        <td className="px-2 py-1">{n.age ?? '-'}</td>
                                                        <td className="px-2 py-1">{n.dob ? String(n.dob).slice(0, 10) : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-gray-500">No records yet.</div>
                                )}
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="px-4 sm:px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                            >
                                Cancel
                            </button>
                            {showNamesForm && (
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow"
                                >
                                    Save
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
