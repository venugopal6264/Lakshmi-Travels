import { Pencil, Trash2, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ApiName, CreateNamePayload, apiService } from '../services/api';
import { CustomerFormModal } from '../utils/Customers/CustomerFormModal';

// ── Pure helpers (no hooks, defined outside component) ───────────────────────

/** Calculate age in whole years from a DOB string. Returns undefined if invalid. */
function calcAgeFromDob(dob: string | undefined | null): number | undefined {
    if (!dob) return undefined;
    const d = new Date(String(dob));
    if (isNaN(d.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
}

/** Resolve effective age: use stored age if available, otherwise compute from DOB. */
function resolveAge(n: ApiName): number | undefined {
    return typeof n.age === 'number' ? n.age : calcAgeFromDob(String(n.dob ?? ''));
}

/** Returns the row background class and the senior-citizen flag for a customer row. */
function getRowMeta(n: ApiName, index: number): { age: number | undefined; isSenior: boolean; rowClass: string } {
    const age = resolveAge(n);
    const g = (n.gender || '').toLowerCase();
    const isSenior = age != null && ((g === 'female' && age >= 45) || (g !== 'female' && age >= 60));
    const zebra = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
    const rowClass = isSenior ? 'bg-green-50' : zebra;
    return { age, isSenior, rowClass };
}

/** Formats a raw DOB value for display (YYYY-MM-DD slice). */
function formatDob(dob: unknown): string {
    return dob ? String(dob).slice(0, 10) : '-';
}

/** Sort direction arrow indicator component. */
function SortIndicator({ column, sortColumn, sortDir }: {
    column: string;
    sortColumn: string;
    sortDir: 'asc' | 'desc';
}) {
    if (column !== sortColumn) return null;
    return <span className="text-[10px] opacity-90">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────

interface CustomersModalProps {
    open: boolean;
    existingAccounts: string[];
}

export default function CustomersModal({ open, existingAccounts }: CustomersModalProps) {
    // renamed state
    const [customersName, setCustomersName] = useState('');
    const [customersAge, setCustomersAge] = useState('');
    const [customersAccount, setCustomersAccount] = useState('');
    const [customersDob, setCustomersDob] = useState('');
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
            setCustomersDob('');
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
        setCustomersDob('');
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
        setCustomersDob(n.dob ? String(n.dob).slice(0, 10) : '');
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
            setCustomersDob('');
            setCustomersAge('');
            setCustomersGender('female');
            setCustomersAadhar('');
            setEditingId(null);
            setShowCustomersForm(false);
        } catch {
            alert('Failed to save');
        }
    };

    /** Opens the form in create mode (resets all fields). */
    const handleCreateNew = () => {
        setEditingId(null);
        setCustomersName('');
        setCustomersAccount('');
        setCustomersDob('');
        setCustomersAge('');
        setCustomersGender('female');
        setCustomersAadhar('');
        setShowCustomersForm(true);
    };

    /** Updates DOB and auto-calculates age whenever the DOB input changes. */
    const handleDobChange = (value: string) => {
        setCustomersDob(value);
        if (!value) return;                          // DOB cleared — keep age as-is
        const computed = calcAgeFromDob(value);
        if (computed != null && computed >= 0) setCustomersAge(String(computed));
    };

    // ── Simple field change handlers ────────────────────────────────────────
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);
    const handleSearchClear = () => setSearch('');
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setCustomersName(e.target.value);
    const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => setCustomersAccount(e.target.value);
    const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => setCustomersAge(e.target.value);
    const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => setCustomersAadhar(e.target.value);
    const handleGenderChange = (g: 'male' | 'female') => setCustomersGender(g);
    // ────────────────────────────────────────────────────────────────────────

    /** Modal title derived from editing context. */
    const formTitle = editingId ? 'Edit customer details' : 'Create a new customer';
    /** Save/Update button label. */
    const saveLabel = editingId ? 'Update' : 'Save';

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
                                            onChange={handleSearchChange}
                                            placeholder="Search name, account, or aadhar..."
                                            className="w-64 px-3 py-1.5 text-sm rounded-md bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        />
                                        {search && (
                                            <button
                                                type="button"
                                                onClick={handleSearchClear}
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
                                    onClick={handleCreateNew}
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
                                    onChange={handleSearchChange}
                                    placeholder="Search name, account, or aadhar..."
                                    className="w-full px-2 py-2 text-sm border rounded-md border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={handleSearchClear}
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
                                                        <th className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10" onClick={() => handleSort('name')} title="Sort by Name">
                                                            <span className="inline-flex items-center gap-1">Name <SortIndicator column="name" sortColumn={sortColumn} sortDir={sortDir} /></span>
                                                        </th>
                                                        <th className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10" onClick={() => handleSort('age')} title="Sort by Age">
                                                            <span className="inline-flex items-center gap-1">Age <SortIndicator column="age" sortColumn={sortColumn} sortDir={sortDir} /></span>
                                                        </th>
                                                        <th className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10" onClick={() => handleSort('account')} title="Sort by Account">
                                                            <span className="inline-flex items-center gap-1">Account <SortIndicator column="account" sortColumn={sortColumn} sortDir={sortDir} /></span>
                                                        </th>
                                                        <th className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10" onClick={() => handleSort('aadhar')} title="Sort by Aadhar">
                                                            <span className="inline-flex items-center gap-1">Aadhar <SortIndicator column="aadhar" sortColumn={sortColumn} sortDir={sortDir} /></span>
                                                        </th>
                                                        <th className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10" onClick={() => handleSort('dob')} title="Sort by DOB">
                                                            <span className="inline-flex items-center gap-1">DOB <SortIndicator column="dob" sortColumn={sortColumn} sortDir={sortDir} /></span>
                                                        </th>
                                                        <th className="px-2 py-2 text-left cursor-pointer select-none hover:bg-white/10" onClick={() => handleSort('gender')} title="Sort by Gender">
                                                            <span className="inline-flex items-center gap-1">Gender <SortIndicator column="gender" sortColumn={sortColumn} sortDir={sortDir} /></span>
                                                        </th>
                                                        <th className="px-2 py-2 text-left">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {displayed.map((n, i) => {
                                                        const { age, rowClass } = getRowMeta(n, i);
                                                        return (
                                                            <tr key={n._id || n.name} className={`${rowClass} hover:bg-amber-50`}>
                                                                <td>{i + 1}</td>
                                                                <td className="font-medium text-gray-800">{n.name}</td>
                                                                <td>{age ?? '-'}</td>
                                                                <td>{n.account || '-'}</td>
                                                                <td className="font-mono">{n.aadharNumber || '-'}</td>
                                                                <td>{formatDob(n.dob)}</td>
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
                <CustomerFormModal
                    formTitle={formTitle}
                    saveLabel={saveLabel}
                    customersName={customersName}
                    customersAccount={customersAccount}
                    customersDob={customersDob}
                    customersAge={customersAge}
                    customersGender={customersGender}
                    customersAadhar={customersAadhar}
                    isDuplicateName={isDuplicateName}
                    existingAccounts={existingAccounts}
                    onNameChange={handleNameChange}
                    onAccountChange={handleAccountChange}
                    onDobChange={handleDobChange}
                    onAgeChange={handleAgeChange}
                    onGenderChange={handleGenderChange}
                    onAadharChange={handleAadharChange}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
}
