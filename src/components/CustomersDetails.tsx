import { X, Pencil, Trash2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ApiName, CreateNamePayload, apiService } from '../services/api';

interface CustomersModalProps {
    open: boolean;
    existingAccounts: string[];
}

export default function CustomersModal({ open, existingAccounts }: CustomersModalProps) {
    // renamed state
    const [customersName, setCustomersName] = useState('');
    const [customersAge, setCustomersAge] = useState('');
    const [customersAccount, setCustomersAccount] = useState('');
    const [customersDob, setCustomersDob] = useState('2020-01-01');
    const [customersGender, setCustomersGender] = useState<'male' | 'female'>('female');
    const [customersAadhar, setCustomersAadhar] = useState(''); // NEW
    const [customersList, setCustomersList] = useState<ApiName[]>([]);
    const [showCustomersForm, setShowCustomersForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [sortColumn, setSortColumn] = useState<'name' | 'account' | 'aadhar' | 'age' | 'dob' | 'gender'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // duplicate name detector
    const isDuplicateName = useMemo(() => {
        const t = customersName.trim().toLowerCase();
        if (!t) return false;
        return customersList.some(n => (n.name || '').toLowerCase() === t && n._id !== editingId);
    }, [customersName, customersList, editingId]);

    // Handle column sorting
    const handleSort = (column: 'name' | 'account' | 'aadhar' | 'age' | 'dob' | 'gender') => {
        if (sortColumn === column) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDir('asc');
        }
    };

    // filtered + sorted list
    const displayed = useMemo(() => {
        const q = search.trim().toLowerCase();
        let arr = customersList;
        if (q) {
            arr = arr.filter(n => (n.name || '').toLowerCase().includes(q) || (n.account || '').toLowerCase().includes(q) || (n.aadharNumber || '').toLowerCase().includes(q));
        }
        return [...arr].sort((a, b) => {
            let av: string | number = '';
            let bv: string | number = '';

            switch (sortColumn) {
                case 'name':
                    av = (a.name || '').toLowerCase();
                    bv = (b.name || '').toLowerCase();
                    break;
                case 'account':
                    av = (a.account || '').toLowerCase();
                    bv = (b.account || '').toLowerCase();
                    break;
                case 'aadhar':
                    av = (a.aadharNumber || '').toLowerCase();
                    bv = (b.aadharNumber || '').toLowerCase();
                    break;
                case 'age':
                    av = a.age ?? -1;
                    bv = b.age ?? -1;
                    break;
                case 'dob':
                    av = a.dob ? new Date(String(a.dob)).getTime() : 0;
                    bv = b.dob ? new Date(String(b.dob)).getTime() : 0;
                    break;
                case 'gender':
                    av = (a.gender || '').toLowerCase();
                    bv = (b.gender || '').toLowerCase();
                    break;
            }

            if (typeof av === 'string' && typeof bv === 'string') {
                return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            } else {
                return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
            }
        });
    }, [customersList, search, sortColumn, sortDir]);

    // Load Customer names when component active
    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const data = await apiService.getCustomers();
                setCustomersList(data);
            } catch (e) {
                console.error('Failed to load Customer names', e);
            }
        })();
    }, [open]);

    // Reset on open
    useEffect(() => {
        if (open) {
            setShowCustomersForm(false);
            setCustomersName('');
            setCustomersAccount('');
            setCustomersDob('2020-01-01');
            setCustomersAge('');
            setCustomersGender('female');
            setCustomersAadhar('');
            setEditingId(null);
        }
    }, [open]);

    const handleCancel = () => {
        // hide form only
        setShowCustomersForm(false);
        setCustomersName('');
        setCustomersAccount('');
        setCustomersDob('2020-01-01');
        setCustomersAge('');
        setCustomersGender('female');
        setCustomersAadhar('');
        setEditingId(null);
    };

    const startEdit = (n: ApiName) => {
        setShowCustomersForm(true);
        setEditingId(n._id ?? null);
        setCustomersName(n.name || '');
        setCustomersAccount(n.account || '');
        setCustomersDob(n.dob ? String(n.dob).slice(0, 10) : '2020-01-01');
        setCustomersAge(n.age != null ? String(n.age) : '');
        setCustomersGender((n.gender as 'male' | 'female') || 'female');
        setCustomersAadhar(n.aadharNumber || '');
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('Delete this record?')) return;
        try {
            await apiService.deleteCustomer(id);
            const data = await apiService.getCustomers();
            setCustomersList(data);
            if (editingId === id) handleCancel();
        } catch {
            alert('Failed to delete');
        }
    };

    const handleSave = async () => {
        try {
            const payload: Partial<CreateNamePayload> & { name: string } = {
                name: customersName.trim(),
                age: customersAge ? Number(customersAge) : null,
                dob: customersDob || null,
                account: customersAccount ? customersAccount.trim() : '',
                gender: customersGender,
                aadharNumber: customersAadhar || undefined,
            };
            if (!payload.name) {
                alert('Please enter a name');
                return;
            }
            if (editingId) {
                await apiService.updateCustomer(editingId, payload);
            } else {
                await apiService.createCustomer(payload);
            }
            const data = await apiService.getCustomers();
            setCustomersList(data);
            setCustomersName('');
            setCustomersAccount('');
            setCustomersDob('2020-01-01');
            setCustomersAge('');
            setCustomersGender('female');
            setCustomersAadhar('');
            setEditingId(null);
            setShowCustomersForm(false);
        } catch {
            alert('Failed to save');
        }
    };

    const outerWrapperClass = 'relative w-full';
    const containerClass = 'w-full m-0';
    const panelClass = 'bg-white rounded-2xl flex flex-col';

    if (!open) return null;

    return (
        <div className={outerWrapperClass}>
            <div className={containerClass}>
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-emerald-600 via-cyan-500 to-indigo-600 shadow-2xl">
                    <div className={panelClass}>
                        {/* Header */}
                        <div className="flex rounded-2xl items-center justify-between px-6 py-4 sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-sm">
                            <h3 className="text-base sm:text-lg font-semibold tracking-wide">Customer Details</h3>
                            <div className="flex items-center gap-2">
                                {/* Header search */}
                                <div className="hidden sm:block">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search name, account, or aadhar..."
                                            className="w-64 px-3 py-1.5 text-sm rounded-md bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        />
                                        {search && (
                                            <button
                                                type="button"
                                                onClick={() => setSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 text-xs"
                                                aria-label="Clear search"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setEditingId(null); setCustomersName(''); setCustomersAccount(''); setCustomersDob('2020-01-01'); setCustomersAge(''); setCustomersGender('female'); setShowCustomersForm(true); }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 bg-white hover:bg-white/90 rounded-md shadow"
                                >
                                    <Plus className="w-4 h-4" /> Create Customer
                                </button>
                            </div>
                        </div>

                        {/* Mobile search (visible on small screens) */}
                        <div className="px-6 pt-3 sm:hidden">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name, account, or aadhar..."
                                    className="w-full px-2 py-2 text-sm border rounded-md border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-700 hover:text-emerald-900 text-xs"
                                        aria-label="Clear search"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-6">
                            {/* Customer names list card */}
                            <div className="pt-1">
                                {/* search moved to header */}
                                {displayed.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 text-white">
                                                    <tr>
                                                        <th className="px-2 py-2 text-left w-16">S.No</th>
                                                        <th
                                                            className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10"
                                                            onClick={() => handleSort('name')}
                                                            title="Sort by Name"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                Name
                                                                {sortColumn === 'name' && (
                                                                    <span className="text-[10px] opacity-90">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                                                )}
                                                            </span>
                                                        </th>
                                                        <th
                                                            className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10"
                                                            onClick={() => handleSort('age')}
                                                            title="Sort by Age"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                Age
                                                                {sortColumn === 'age' && (
                                                                    <span className="text-[10px] opacity-90">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                                                )}
                                                            </span>
                                                        </th>
                                                        <th
                                                            className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10"
                                                            onClick={() => handleSort('account')}
                                                            title="Sort by Account"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                Account
                                                                {sortColumn === 'account' && (
                                                                    <span className="text-[10px] opacity-90">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                                                )}
                                                            </span>
                                                        </th>
                                                        <th
                                                            className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10"
                                                            onClick={() => handleSort('aadhar')}
                                                            title="Sort by Aadhar"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                Aadhar
                                                                {sortColumn === 'aadhar' && (
                                                                    <span className="text-[10px] opacity-90">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                                                )}
                                                            </span>
                                                        </th>
                                                        <th
                                                            className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10"
                                                            onClick={() => handleSort('dob')}
                                                            title="Sort by DOB"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                DOB
                                                                {sortColumn === 'dob' && (
                                                                    <span className="text-[10px] opacity-90">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                                                )}
                                                            </span>
                                                        </th>
                                                        <th
                                                            className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10"
                                                            onClick={() => handleSort('gender')}
                                                            title="Sort by Gender"
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                Gender
                                                                {sortColumn === 'gender' && (
                                                                    <span className="text-[10px] opacity-90">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                                                )}
                                                            </span>
                                                        </th>
                                                        <th className="px-2 py-2 text-left">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {displayed.map((n, i) => {
                                                        const age = typeof n.age === 'number' ? n.age : (n.dob ? (() => {
                                                            const dobStr = String(n.dob);
                                                            const d = new Date(dobStr);
                                                            if (isNaN(d.getTime())) return undefined;
                                                            const today = new Date();
                                                            let a = today.getFullYear() - d.getFullYear();
                                                            const m = today.getMonth() - d.getMonth();
                                                            if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
                                                            return a;
                                                        })() : undefined);
                                                        const g = (n.gender || '').toLowerCase();
                                                        const flag = age != null && ((g === 'female' && age >= 45) || (g !== 'female' && age >= 60));
                                                        const zebra = i % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                                                        const rowClass = flag ? 'bg-rose-50' : zebra;
                                                        return (
                                                            <tr key={n._id || n.name} className={`${rowClass} hover:bg-amber-50`}>
                                                                <td>{i + 1}</td>
                                                                <td className="font-medium text-gray-800">{n.name}</td>
                                                                <td>{age ?? '-'}</td>
                                                                <td>{n.account || '-'}</td>
                                                                <td className="font-mono">{n.aadharNumber || '-'}</td>
                                                                <td>{n.dob ? String(n.dob).slice(0, 10) : '-'}</td>
                                                                <td className="capitalize">{n.gender || '-'}</td>
                                                                <td>
                                                                    <div className="flex items-center gap-2">
                                                                        <button type="button" title="Edit" aria-label="Edit" onClick={() => startEdit(n)} className="p-2 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100">
                                                                            <Pencil className="w-4 h-4" />
                                                                        </button>
                                                                        <button type="button" title="Delete" aria-label="Delete" onClick={() => handleDelete(n._id)} className="p-2 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-gray-500">No records yet.</div>
                                )}
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="px-6 py-3 border-t bg-gray-50" />
                    </div>
                </div>
            </div>

            {/* Create/Edit popup modal */}
            {showCustomersForm && (
                <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-2xl m-4 my-10">
                        <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-emerald-600 via-cyan-500 to-indigo-600 shadow-2xl">
                            <div className="bg-white rounded-2xl flex flex-col">
                                <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-sm">
                                    <h3 className="text-base sm:text-lg font-semibold tracking-wide">{editingId ? 'Edit customer details' : 'Create a new customer'}</h3>
                                    <button onClick={handleCancel} aria-label="Close" className="p-2 rounded-full bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="px-6 py-5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                            <input type="text" value={customersName} onChange={(e) => setCustomersName(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter full name" />
                                            {isDuplicateName && (<p className="text-[10px] text-amber-600 mt-1">Duplicate name found. You can still save.</p>)}
                                        </div>
                                        {/* Account */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Account</label>
                                            <input type="text" value={customersAccount} onChange={(e) => setCustomersAccount(e.target.value)} list="customers-account-suggestions" className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Search or add new account" />
                                            <datalist id="customers-account-suggestions">
                                                {existingAccounts.map((acc) => (<option key={acc} value={acc} />))}
                                            </datalist>
                                        </div>
                                        {/* DOB */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                                            <input type="date" value={customersDob} onChange={(e) => {
                                                const v = e.target.value;
                                                setCustomersDob(v);
                                                if (v) {
                                                    const d = new Date(v);
                                                    if (!isNaN(d.getTime())) {
                                                        const today = new Date();
                                                        let age = today.getFullYear() - d.getFullYear();
                                                        const m = today.getMonth() - d.getMonth();
                                                        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
                                                        setCustomersAge(age >= 0 ? String(age) : '');
                                                    } else {
                                                        setCustomersAge('');
                                                    }
                                                } else {
                                                    setCustomersAge('');
                                                }
                                            }} className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                            <p className="text-[10px] text-gray-500 mt-1">We auto-calculate age from DOB.</p>
                                        </div>
                                        {/* Age */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                                            <input type="text" value={customersAge} readOnly className="w-full px-2 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none" placeholder="Auto-calculated" />
                                        </div>
                                        {/* Gender */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                                            <div className="inline-flex rounded-md border bg-white p-1 shadow-sm">
                                                <button type="button" onClick={() => setCustomersGender('female')} className={`px-3 py-1.5 text-xs rounded-md transition ${customersGender === 'female' ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} aria-pressed={customersGender === 'female'}>Female</button>
                                                <button type="button" onClick={() => setCustomersGender('male')} className={`px-3 py-1.5 text-xs rounded-md transition ${customersGender === 'male' ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} aria-pressed={customersGender === 'male'}>Male</button>
                                            </div>
                                        </div>
                                        {/* Aadhar */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Aadhar Number</label>
                                            <input type="text" value={customersAadhar} onChange={(e) => setCustomersAadhar(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter Aadhar number" />
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-between items-center gap-2">
                                        <button type="button" onClick={handleCancel} className="border px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md">Cancel</button>
                                        <button type="button" onClick={handleSave} className="border px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow">{editingId ? 'Update' : 'Save'}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
