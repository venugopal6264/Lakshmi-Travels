import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, ApiFlat, ApiRentRecord, ApiTenant } from '../services/api';
import { Calendar, Home, Plus, X, Search, Edit3, Eye, History } from 'lucide-react';

type MonthKey = string; // YYYY-MM

function ym(d = new Date()): MonthKey {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ApartmentsPage() {
    const [flats, setFlats] = useState<ApiFlat[]>([]);
    const [, setTenants] = useState<ApiTenant[]>([]);
    const [rents, setRents] = useState<ApiRentRecord[]>([]);
    const [month, setMonth] = useState<MonthKey>(ym());
    const [loading, setLoading] = useState(false);
    const [showAddFlat, setShowAddFlat] = useState(false);
    const [showAddTenantFor, setShowAddTenantFor] = useState<ApiFlat | null>(null);
    const [historyFor, setHistoryFor] = useState<ApiFlat | null>(null);
    const [history, setHistory] = useState<ApiTenant[] | null>(null);
    const [filter, setFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
    const [query, setQuery] = useState('');
    const [editTenant, setEditTenant] = useState<ApiTenant | null>(null);
    const [viewTenant, setViewTenant] = useState<ApiTenant | null>(null);

    const loadAll = useCallback(async (m: MonthKey = month) => {
        setLoading(true);
        try {
            const [f, t, r] = await Promise.all([
                apiService.getFlats(),
                apiService.getTenants(),
                apiService.getRents(m),
            ]);
            setFlats(f);
            setTenants(t);
            setRents(r);
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const rentByFlat = useMemo(() => {
        const map: Record<string, ApiRentRecord | undefined> = {};
        for (const r of rents) {
            const key = typeof r.flat === 'string' ? r.flat : (r.flat as ApiFlat)._id!;
            map[key] = r;
        }
        return map;
    }, [rents]);

    const handleCreateFlat = async (number: string, notes: string) => {
        await apiService.createFlat(number, notes);
        await loadAll();
        setShowAddFlat(false);
    };

    const handleAddTenant = async (flat: ApiFlat, input: { name: string; phone?: string; aadharNumber?: string; startDate: string; rentAmount: number; deposit?: number }) => {
        await apiService.createTenant({ ...input, flatId: flat._id! });
        await loadAll();
        setShowAddTenantFor(null);
    };

    const handleTogglePaid = async (flat: ApiFlat) => {
        // Mark Paid: set paid=true, amount=tenant's rentAmount, set paidDate to today
        const tenant = flat.currentTenant as ApiTenant | null;
        if (!tenant) return;
        const tenantId = typeof tenant === 'string' ? (tenant as unknown as string) : (tenant as ApiTenant)._id!;
        await apiService.upsertRent({
            flatId: flat._id!,
            tenantId,
            month,
            amount: (tenant as ApiTenant).rentAmount ?? 0,
            paid: true,
            paidDate: new Date().toISOString().split('T')[0]
        });
        await loadAll();
    };

    const filteredFlats = useMemo(() => {
        let list = flats;
        if (filter === 'occupied') list = list.filter(f => !!f.currentTenant);
        if (filter === 'vacant') list = list.filter(f => !f.currentTenant);
        if (query.trim()) {
            const q = query.toLowerCase();
            list = list.filter(f => {
                const tn = (f.currentTenant as ApiTenant | null)?.name?.toLowerCase() || '';
                const num = (f.number || '').toLowerCase();
                const adh = (f.currentTenant as ApiTenant | null)?.aadharNumber?.toLowerCase() || '';
                return tn.includes(q) || num.includes(q) || adh.includes(q);
            });
        }
        return list;
    }, [flats, filter, query]);

    const openHistory = async (flat: ApiFlat) => {
        setHistoryFor(flat);
        setHistory(null);
        const data = await apiService.getFlatTenants(flat._id!);
        setHistory(data);
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Home className="w-5 h-5" /> Apartments</h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/15 text-white rounded-full px-3 py-2 ring-1 ring-white/30">
                        <Calendar className="w-4 h-4" />
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="bg-transparent focus:outline-none" />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white/15 text-white rounded-full px-3 py-2 ring-1 ring-white/30">
                        <Search className="w-4 h-4" />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tenant or flat" className="bg-transparent placeholder:text-white/80 focus:outline-none" />
                    </div>
                    <select value={filter} onChange={e => setFilter(e.target.value as 'all' | 'occupied' | 'vacant')} className="bg-white/90 text-indigo-700 rounded-full px-3 py-2 text-sm">
                        <option value="all">All</option>
                        <option value="occupied">Occupied</option>
                        <option value="vacant">Vacant</option>
                    </select>
                    <button onClick={() => setShowAddFlat(true)} className="inline-flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-full font-medium hover:bg-indigo-50">
                        <Plus className="w-4 h-4" /> Add Flat
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-gray-500">Loading…</div>
            ) : (
                <div className="-mx-6 overflow-x-auto">
                    <table className="min-w-full table-fixed">
                        <thead>
                            <tr className="text-left text-sm text-gray-600">
                                <th className="px-4 py-2">S No</th>
                                <th className="px-4 py-2">Flat Number</th>
                                <th className="px-4 py-2">Member Name</th>
                                <th className="px-4 py-2">Rent Status</th>
                                <th className="px-4 py-2">Amount</th>
                                <th className="px-4 py-2">Rent Paid</th>
                                <th className="px-4 py-2">Manage Tenant</th>
                                <th className="px-4 py-2">Occupied History</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredFlats.map((f, idx) => {
                                const rr = rentByFlat[f._id!];
                                const tenant = f.currentTenant as ApiTenant | null;
                                return (
                                    <tr key={f._id} className="text-sm">
                                        <td className="px-4 py-3 text-gray-700">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{f.number}</td>
                                        <td className="px-4 py-3 text-gray-800">
                                            {tenant ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="text-indigo-600 hover:underline hover:text-indigo-700"
                                                        onClick={() => setViewTenant(tenant)}
                                                    >
                                                        {tenant.name}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="View member"
                                                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-50 text-indigo-700 px-1.5 py-1 text-xs hover:bg-indigo-100"
                                                        onClick={() => setViewTenant(tenant)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {tenant ? (
                                                rr?.paid ? (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">Paid</span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">Unpaid</span>
                                                )
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {tenant ? (
                                                <span className="text-gray-900 font-medium">₹{rr?.paid ? (rr?.amount ?? 0) : 0}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {tenant ? (
                                                rr?.paid ? (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">Paid</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-white text-sm hover:bg-emerald-700"
                                                        onClick={() => handleTogglePaid(f)}
                                                    >
                                                        Mark Paid
                                                    </button>
                                                )
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {tenant ? (
                                                <button
                                                    type="button"
                                                    title="Change tenant"
                                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50"
                                                    onClick={() => setShowAddTenantFor(f)}
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    title="Add tenant"
                                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50"
                                                    onClick={() => setShowAddTenantFor(f)}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                title="View occupied history"
                                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-purple-50 text-purple-700 px-2 py-1 text-sm hover:bg-purple-100"
                                                onClick={() => openHistory(f)}
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Flat Modal */}
            {showAddFlat && (
                <AddFlatModal onClose={() => setShowAddFlat(false)} onCreate={handleCreateFlat} />
            )}

            {/* Add/Change Tenant Modal */}
            {showAddTenantFor && (
                <AddTenantModal flat={showAddTenantFor} onClose={() => setShowAddTenantFor(null)} onCreate={(input) => handleAddTenant(showAddTenantFor, input)} />
            )}

            {/* Tenant History Modal */}
            {historyFor && (
                <HistoryModal flat={historyFor} history={history} onClose={() => { setHistoryFor(null); setHistory(null); }} />)
            }

            {/* Edit Tenant Modal */}
            {editTenant && (
                <EditTenantModal tenant={editTenant} onClose={() => setEditTenant(null)} onSave={async (patch) => {
                    await apiService.updateTenant(editTenant._id!, patch);
                    setEditTenant(null);
                    await loadAll();
                }} />
            )}

            {/* View Member Modal */}
            {viewTenant && (
                <ViewMemberModal
                    tenant={viewTenant}
                    onClose={() => setViewTenant(null)}
                    onEdit={(t) => { setViewTenant(null); setEditTenant(t); }}
                />
            )}
        </div>
    );
}

function AddFlatModal({ onClose, onCreate }: { onClose: () => void; onCreate: (number: string, notes: string) => void }) {
    const [number, setNumber] = useState('');
    const [notes, setNotes] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md m-4 mt-16">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-emerald-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Add Flat</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Flat Number</label>
                                <input value={number} onChange={e => setNumber(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" placeholder="A-101" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" rows={3} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={onClose} className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button onClick={() => onCreate(number, notes)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EditTenantModal({ tenant, onClose, onSave }: { tenant: ApiTenant; onClose: () => void; onSave: (patch: Partial<ApiTenant>) => void | Promise<void> }) {
    const [name, setName] = useState(tenant.name || '');
    const [phone, setPhone] = useState(tenant.phone || '');
    const [aadharNumber, setAadharNumber] = useState(tenant.aadharNumber || '');
    const [startDate, setStartDate] = useState(tenant.startDate || new Date().toISOString().split('T')[0]);
    const [rentAmount, setRentAmount] = useState<number>(Number(tenant.rentAmount) || 0);
    const [deposit, setDeposit] = useState<number>(Number(tenant.deposit) || 0);
    const save = async () => {
        await onSave({ name, phone, aadharNumber, startDate, rentAmount, deposit });
    };
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md m-4 mt-16">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Edit Tenant</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tenant Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                                <input value={aadharNumber} onChange={e => setAadharNumber(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Rent Amount</label>
                                    <input type="number" value={rentAmount} onChange={e => setRentAmount(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Deposit</label>
                                <input type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={onClose} className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HistoryModal({ flat, history, onClose }: { flat: ApiFlat; history: ApiTenant[] | null; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg m-4 mt-16">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Tenant History - Flat {flat.number}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5">
                            {!history ? (
                                <div className="text-center text-gray-500">Loading…</div>
                            ) : history.length === 0 ? (
                                <div className="text-center text-gray-500">No tenants recorded.</div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {history.map(t => (
                                        <div key={t._id} className="py-3 text-sm">
                                            <div className="flex justify-between"><span className="font-medium">{t.name}</span><span>₹{t.rentAmount}</span></div>
                                            {typeof t.deposit === 'number' && <div className="text-gray-600">Deposit: ₹{t.deposit}</div>}
                                            <div className="text-gray-600">{t.startDate} → {t.endDate || 'Present'}</div>
                                            {t.phone && <div className="text-gray-500">{t.phone}</div>}
                                            {t.aadharNumber && <div className="text-gray-500">Aadhar: {t.aadharNumber}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AddTenantModal({ flat, onClose, onCreate }: { flat: ApiFlat; onClose: () => void; onCreate: (input: { name: string; phone?: string; aadharNumber?: string; startDate: string; rentAmount: number; deposit?: number }) => void }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [rentAmount, setRentAmount] = useState<number>(0);
    const [deposit, setDeposit] = useState<number>(0);
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md m-4 mt-16">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-emerald-600 via-indigo-600 to-fuchsia-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Add/Change Tenant for Flat {flat.number}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tenant Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" placeholder="9876543210" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                                <input value={aadhar} onChange={e => setAadhar(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" placeholder="XXXX-XXXX-XXXX" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Rent Amount</label>
                                    <input type="number" value={rentAmount} onChange={e => setRentAmount(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Deposit</label>
                                <input type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={onClose} className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button onClick={() => onCreate({ name, phone, aadharNumber: aadhar, startDate, rentAmount, deposit })} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ViewMemberModal({ tenant, onClose, onEdit }: { tenant: ApiTenant; onClose: () => void; onEdit: (t: ApiTenant) => void }) {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<ApiRentRecord[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Fetch rents (all) and filter by tenant id client-side
                const all = await apiService.getRents();
                if (!mounted) return;
                setRows(all.filter(r => (typeof r.tenant === 'string' ? r.tenant : (r.tenant as ApiTenant)._id) === tenant._id));
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [tenant._id]);

    const startEdit = (r: ApiRentRecord) => {
        if (!r._id) return;
        setEditingId(r._id);
        setEditAmount(String(r.amount ?? 0));
        setSaveError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditAmount('');
        setSaveError(null);
    };

    const saveEdit = async (r: ApiRentRecord) => {
        if (!r._id) return;
        const amountNum = Number(editAmount);
        if (Number.isNaN(amountNum) || amountNum < 0) {
            setSaveError('Enter a valid amount');
            return;
        }
        try {
            setSaving(true);
            setSaveError(null);
            const flatId = typeof r.flat === 'string' ? r.flat : (r.flat as ApiFlat)._id!;
            const tenantId = tenant._id!; // modal is scoped to this tenant
            await apiService.upsertRent({ flatId, tenantId, month: r.month, amount: amountNum, paid: r.paid, paidDate: r.paidDate ?? null, notes: r.notes });
            // Refresh list
            const all = await apiService.getRents();
            setRows(all.filter(x => (typeof x.tenant === 'string' ? x.tenant : (x.tenant as ApiTenant)._id) === tenant._id));
            setEditingId(null);
            setEditAmount('');
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Failed to save';
            setSaveError(msg);
        } finally {
            setSaving(false);
        }
    };

    const togglePaidInModal = async (r: ApiRentRecord, makePaid: boolean) => {
        const flatId = typeof r.flat === 'string' ? r.flat : (r.flat as ApiFlat)._id!;
        const tenantId = tenant._id!;
        const nextAmount = makePaid ? (tenant.rentAmount ?? 0) : 0;
        try {
            setSaving(true);
            setSaveError(null);
            await apiService.upsertRent({
                flatId,
                tenantId,
                month: r.month,
                amount: nextAmount,
                paid: makePaid,
                paidDate: makePaid ? new Date().toISOString().split('T')[0] : null,
                notes: r.notes
            });
            const all = await apiService.getRents();
            setRows(all.filter(x => (typeof x.tenant === 'string' ? x.tenant : (x.tenant as ApiTenant)._id) === tenant._id));
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Failed to save';
            setSaveError(msg);
        } finally {
            setSaving(false);
        }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md m-4 mt-16">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Member Details</h3>
                            <div className="flex items-center gap-1">
                                <button onClick={() => onEdit(tenant)} title="Edit member" className="p-2 hover:bg-white/10 rounded-full">
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-5 space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Name</span><span className="font-medium">{tenant.name}</span></div>
                            {tenant.phone && <div className="flex justify-between"><span className="text-gray-600">Phone</span><span>{tenant.phone}</span></div>}
                            {tenant.aadharNumber && <div className="flex justify-between"><span className="text-gray-600">Aadhar</span><span>{tenant.aadharNumber}</span></div>}
                            <div className="flex justify-between"><span className="text-gray-600">Rent</span><span>₹{tenant.rentAmount}</span></div>
                            {typeof tenant.deposit === 'number' && <div className="flex justify-between"><span className="text-gray-600">Deposit</span><span>₹{tenant.deposit}</span></div>}
                            <div className="flex justify-between"><span className="text-gray-600">Start Date</span><span>{tenant.startDate}</span></div>
                            {tenant.endDate && <div className="flex justify-between"><span className="text-gray-600">End Date</span><span>{tenant.endDate}</span></div>}
                            <div className="pt-3">
                                <div className="text-gray-700 font-medium mb-2">Rent History</div>
                                {loading ? (
                                    <div className="text-gray-500">Loading…</div>
                                ) : rows.length === 0 ? (
                                    <div className="text-gray-500">No rent records.</div>
                                ) : (
                                    <div className="max-h-56 overflow-auto divide-y divide-gray-100">
                                        {rows
                                            .slice()
                                            .sort((a, b) => a.month.localeCompare(b.month) * -1)
                                            .map(r => (
                                                <div key={r._id} className="py-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-1.5 h-8 rounded-full ${r.paid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        <div className="leading-tight">
                                                            {editingId === r._id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
                                                                        value={editAmount}
                                                                        onChange={e => setEditAmount(e.target.value)}
                                                                        disabled={saving}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                                                        onClick={() => saveEdit(r)}
                                                                        disabled={saving}
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
                                                                        onClick={cancelEdit}
                                                                        disabled={saving}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-gray-900 font-medium">₹{r.amount}</div>
                                                                    <button
                                                                        type="button"
                                                                        title="Edit amount"
                                                                        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs hover:bg-gray-50"
                                                                        onClick={() => startEdit(r)}
                                                                    >
                                                                        <Edit3 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-gray-500">{r.month}</div>
                                                            {saveError && editingId === r._id && (
                                                                <div className="text-xs text-rose-600 mt-1">{saveError}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-medium ${r.paid ? 'text-emerald-600' : 'text-amber-600'}`}>{r.paid ? 'Paid' : 'Unpaid'}</span>
                                                        {r.paid ? (
                                                            <button
                                                                type="button"
                                                                className="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                                                                onClick={() => togglePaidInModal(r, false)}
                                                                disabled={saving}
                                                            >
                                                                Set Unpaid
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                                                onClick={() => togglePaidInModal(r, true)}
                                                                disabled={saving}
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
