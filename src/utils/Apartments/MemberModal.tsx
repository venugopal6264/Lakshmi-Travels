import { useEffect, useState } from 'react';
import { apiService, ApiFlat, ApiRentRecord, ApiTenant } from '../../services/api';
import { Edit3, X } from 'lucide-react';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function paidBarClass(paid: boolean): string {
    return `w-1.5 h-8 rounded-full ${paid ? 'bg-emerald-500' : 'bg-amber-500'}`;
}

function paidLabelClass(paid: boolean): string {
    return `text-xs font-medium ${paid ? 'text-emerald-600' : 'text-amber-600'}`;
}

// ─── AddTenantModal ───────────────────────────────────────────────────────────

export interface AddTenantInput {
    name: string;
    phone?: string;
    aadharNumber?: string;
    startDate: string;
    rentAmount: number;
    deposit?: number;
}

interface AddTenantModalProps {
    flat: ApiFlat;
    onClose: () => void;
    onCreate: (input: AddTenantInput) => void;
}

export function AddTenantModal({ flat, onClose, onCreate }: AddTenantModalProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [rentAmount, setRentAmount] = useState<number>(0);
    const [deposit, setDeposit] = useState<number>(0);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value);
    const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => setAadhar(e.target.value);
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value);
    const handleRentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setRentAmount(Number(e.target.value));
    const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => setDeposit(Number(e.target.value));
    const handleSave = () => onCreate({ name, phone, aadharNumber: aadhar, startDate, rentAmount, deposit });

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-md m-4 mt-16 mx-auto">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-emerald-600 via-indigo-600 to-fuchsia-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Add/Change Tenant for Flat {flat.number}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tenant Name</label>
                                <input value={name} onChange={handleNameChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input value={phone} onChange={handlePhoneChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" placeholder="9876543210" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                                <input value={aadhar} onChange={handleAadharChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" placeholder="XXXX-XXXX-XXXX" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input type="date" value={startDate} onChange={handleStartDateChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Rent Amount</label>
                                    <input type="number" value={rentAmount} onChange={handleRentAmountChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Deposit</label>
                                <input type="number" value={deposit} onChange={handleDepositChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={onClose} className="px-2 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── ViewMemberModal ──────────────────────────────────────────────────────────

interface ViewMemberModalProps {
    tenant: ApiTenant;
    onClose: () => void;
    onEdit: (t: ApiTenant) => void;
}

export function ViewMemberModal({ tenant, onClose, onEdit }: ViewMemberModalProps) {
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

    const handleEditAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditAmount(e.target.value);

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
            const tenantId = tenant._id!;
            await apiService.upsertRent({ flatId, tenantId, month: r.month, amount: amountNum, paid: r.paid, paidDate: r.paidDate ?? null, notes: r.notes });
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
                flatId, tenantId, month: r.month, amount: nextAmount,
                paid: makePaid,
                paidDate: makePaid ? new Date().toISOString().split('T')[0] : null,
                notes: r.notes,
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

    const handleEditTenant = () => onEdit(tenant);
    const sortedRows = rows.slice().sort((a, b) => a.month.localeCompare(b.month) * -1);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-md m-4 mt-16 mx-auto">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Member Details</h3>
                            <div className="flex items-center gap-1">
                                <button onClick={handleEditTenant} title="Edit member" className="p-2 hover:bg-white/10 rounded-full">
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-5 space-y-3 text-sm overflow-y-auto max-h-[70vh]">
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
                                        {sortedRows.map(r => (
                                            <div key={r._id} className="py-2 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={paidBarClass(r.paid)} />
                                                    <div className="leading-tight">
                                                        {editingId === r._id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
                                                                    value={editAmount}
                                                                    onChange={handleEditAmountChange}
                                                                    disabled={saving}
                                                                />
                                                                <button type="button" className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" onClick={() => saveEdit(r)} disabled={saving}>Save</button>
                                                                <button type="button" className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300" onClick={cancelEdit} disabled={saving}>Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-gray-900 font-medium">₹{r.amount}</div>
                                                                <button type="button" title="Edit amount" className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs hover:bg-gray-50" onClick={() => startEdit(r)}>
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
                                                    <span className={paidLabelClass(r.paid)}>{r.paid ? 'Paid' : 'Unpaid'}</span>
                                                    {r.paid ? (
                                                        <button type="button" className="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50" onClick={() => togglePaidInModal(r, false)} disabled={saving}>Set Unpaid</button>
                                                    ) : (
                                                        <button type="button" className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" onClick={() => togglePaidInModal(r, true)} disabled={saving}>Mark Paid</button>
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
