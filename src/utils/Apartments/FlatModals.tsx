import { useState } from 'react';
import { ApiFlat, ApiTenant } from '../../services/api';
import { X } from 'lucide-react';

// ─── AddFlatModal ─────────────────────────────────────────────────────────────

interface AddFlatModalProps {
    onClose: () => void;
    onCreate: (number: string, notes: string) => void;
}

export function AddFlatModal({ onClose, onCreate }: AddFlatModalProps) {
    const [number, setNumber] = useState('');
    const [notes, setNotes] = useState('');

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => setNumber(e.target.value);
    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value);
    const handleCreate = () => onCreate(number, notes);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-md m-4 mt-16 mx-auto">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-emerald-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Add Flat</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Flat Number</label>
                                <input value={number} onChange={handleNumberChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" placeholder="A-101" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea value={notes} onChange={handleNotesChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" rows={3} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={onClose} className="px-2 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                                <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── EditTenantModal ──────────────────────────────────────────────────────────

interface EditTenantModalProps {
    tenant: ApiTenant;
    onClose: () => void;
    onSave: (patch: Partial<ApiTenant>) => void | Promise<void>;
}

export function EditTenantModal({ tenant, onClose, onSave }: EditTenantModalProps) {
    const [name, setName] = useState(tenant.name || '');
    const [phone, setPhone] = useState(tenant.phone || '');
    const [aadharNumber, setAadharNumber] = useState(tenant.aadharNumber || '');
    const [startDate, setStartDate] = useState(tenant.startDate || new Date().toISOString().split('T')[0]);
    const [rentAmount, setRentAmount] = useState<number>(Number(tenant.rentAmount) || 0);
    const [deposit, setDeposit] = useState<number>(Number(tenant.deposit) || 0);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value);
    const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => setAadharNumber(e.target.value);
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value);
    const handleRentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setRentAmount(Number(e.target.value));
    const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => setDeposit(Number(e.target.value));
    const handleSave = async () => onSave({ name, phone, aadharNumber, startDate, rentAmount, deposit });

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-md m-4 mt-16 mx-auto">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Edit Tenant</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tenant Name</label>
                                <input value={name} onChange={handleNameChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input value={phone} onChange={handlePhoneChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                                <input value={aadharNumber} onChange={handleAadharChange} className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2" />
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

// ─── HistoryModal ─────────────────────────────────────────────────────────────

interface HistoryModalProps {
    flat: ApiFlat;
    history: ApiTenant[] | null;
    onClose: () => void;
}

export function HistoryModal({ flat, history, onClose }: HistoryModalProps) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-lg m-4 mt-16 mx-auto">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 shadow-xl">
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <h3 className="font-semibold">Tenant History - Flat {flat.number}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 overflow-y-auto max-h-[70vh]">
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
