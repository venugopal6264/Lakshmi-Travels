import { useState } from "react";
import { apiService } from "../../services/api";
import { VehicleType, withAlpha } from "../common/utils";

export type VehicleDoc = {
    _id: string;
    name: string;
    type: VehicleType;
    active: boolean;
    color?: string;
    model?: string;
    manufacturerDate?: string | null;
    buyDate?: string | null;
    fuelType?: string;
    fuelCapacity?: number | null;
    licensePlate?: string;
    chassisNumber?: string;
    notes?: string;
};

export const AddVehicleModal = ({ onClose, onAdded, color }: { onClose: () => void; onAdded: (v: VehicleDoc) => void; color?: string }) => {
    const [form, setForm] = useState({
        name: '',
        type: 'car' as VehicleType,
        color: '#3b82f6',
        model: '',
        manufacturerDate: '',
        buyDate: '',
        fuelType: 'Petrol',
        fuelCapacity: '' as number | string,
        licensePlate: '',
        chassisNumber: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.name.trim()) { setError('Vehicle name is required'); return; }
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                type: form.type,
                color: form.color,
                model: form.model.trim(),
                manufacturerDate: form.manufacturerDate || null,
                buyDate: form.buyDate || null,
                fuelType: form.fuelType,
                fuelCapacity: form.fuelCapacity ? Number(form.fuelCapacity) : null,
                licensePlate: form.licensePlate.trim(),
                chassisNumber: form.chassisNumber.trim(),
                notes: form.notes.trim(),
            };
            const v = await apiService.createVehicle(payload);
            onAdded(v as VehicleDoc);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to add vehicle');
        } finally {
            setSaving(false);
        }
    };

    // live accent uses chosen form.color if set, else fall back to provided color
    const accent = form.color || color || '#3b82f6';
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-xl m-0">
                <div className="relative rounded-2xl p-[2px] shadow-2xl" style={{ background: `linear-gradient(135deg, ${withAlpha(accent, 0.9)}, ${withAlpha(accent, 0.4)} 40%, rgba(255,255,255,0.6))` }}>
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3 sticky top-0 z-10 text-white" style={{ background: `linear-gradient(90deg, ${withAlpha(accent, 0.95)}, ${withAlpha(accent, 0.75)})` }}>
                            <h3 className="text-base sm:text-lg font-semibold">Add vehicle</h3>
                            <button type="button" onClick={onClose} className="px-2 py-1 rounded-md bg-white/15 hover:bg-white/25">Close</button>
                        </div>
                        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${withAlpha(accent, 0.5)}, ${withAlpha(accent, 0.2)})` }} />
                        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 overflow-y-auto flex-1">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                                <div className="flex items-center gap-2">
                                    <input name="color" type="color" className="h-9 w-12 p-0 border rounded" value={form.color} onChange={update} />
                                    <input name="color" className="flex-1 px-2 py-2 border rounded-md" value={form.color} onChange={update} placeholder="#3b82f6" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select name="type" className="w-full px-2 py-2 border rounded-md" value={form.type} onChange={update}>
                                    <option value="car">Car</option>
                                    <option value="bike">Bike</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                                <input name="name" className="w-full px-2 py-2 border rounded-md" value={form.name} onChange={update} placeholder="e.g., Breeza, FZs" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                <input name="model" className="w-full px-2 py-2 border rounded-md" value={form.model} onChange={update} placeholder="e.g., ZDi, FZ-S V3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Date (MM-YYYY)</label>
                                <input name="manufacturerDate" placeholder="MM-YYYY" className="w-full px-2 py-2 border rounded-md" value={form.manufacturerDate} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buy Date</label>
                                <input name="buyDate" type="date" className="w-full px-2 py-2 border rounded-md" value={form.buyDate} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel type</label>
                                <select name="fuelType" className="w-full px-2 py-2 border rounded-md" value={form.fuelType} onChange={update}>
                                    {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Capacity (L)</label>
                                <input name="fuelCapacity" type="number" className="w-full px-2 py-2 border rounded-md" value={form.fuelCapacity} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                                <input name="licensePlate" className="w-full px-2 py-2 border rounded-md" value={form.licensePlate} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
                                <input name="chassisNumber" className="w-full px-2 py-2 border rounded-md" value={form.chassisNumber} onChange={update} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea name="notes" rows={2} className="w-full px-2 py-2 border rounded-md" value={form.notes} onChange={update} />
                            </div>
                            {error && <p className="text-red-600 text-sm md:col-span-2">{error}</p>}
                            <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                                <button type="button" onClick={onClose} className="px-2 py-2 text-gray-700 border rounded-md">Cancel</button>
                                <button type="submit" disabled={saving} className="px-2 py-2 rounded-md text-white disabled:opacity-50" style={{ backgroundColor: accent }}>{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const VehicleManagerModal = ({ vehicles, onClose, onUpdated, onDeleted, color }: { vehicles: VehicleDoc[]; onClose: () => void; onUpdated: (v: VehicleDoc) => void; onDeleted: (id: string) => void; color?: string }) => {
    const [editing, setEditing] = useState<VehicleDoc | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const remove = async (id: string) => {
        setBusyId(id);
        try {
            await apiService.deleteVehicle(id);
            onDeleted(id);
        } finally {
            setBusyId(null);
        }
    };
    const accent = color || '#3b82f6';
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-3xl m-0">
                <div className="relative rounded-2xl p-[2px] shadow-2xl" style={{ background: `linear-gradient(135deg, ${withAlpha(accent, 0.9)}, ${withAlpha(accent, 0.4)} 40%, rgba(255,255,255,0.6))` }}>
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3 sticky top-0 z-10 text-white" style={{ background: `linear-gradient(90deg, ${withAlpha(accent, 0.95)}, ${withAlpha(accent, 0.75)})` }}>
                            <h3 className="text-base sm:text-lg font-semibold">Manage vehicles</h3>
                            <button onClick={onClose} className="px-2 py-1 rounded-md bg-white/15 hover:bg-white/25">Close</button>
                        </div>
                        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${withAlpha(accent, 0.5)}, ${withAlpha(accent, 0.2)})` }} />
                        <div className="divide-y overflow-y-auto p-4 flex-1">
                            {vehicles.map(v => (
                                <div key={v._id} className="py-3">
                                    <div className="flex items-start justify-between gap-4 border-l-4 pl-3" style={{ borderLeftColor: v.color || withAlpha(accent, 0.7) }}>
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                <span>{v.name}</span>
                                                <span className="text-xs capitalize inline-flex items-center px-2 py-0.5 rounded-full ring-1" style={{ background: withAlpha(v.color || accent, 0.12), color: v.color || accent, borderColor: withAlpha(v.color || accent, 0.3) }}>{v.type}</span>
                                            </div>
                                            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                                                {v.model && <div><span className="text-gray-500">Model: </span>{v.model}</div>}
                                                {v.color && (
                                                    <div className="inline-flex items-center gap-2"><span className="text-gray-500">Color: </span><span className="h-3 w-3 rounded-sm inline-block ring-1 ring-gray-300" style={{ backgroundColor: v.color }} /> <span>{v.color}</span></div>
                                                )}
                                                {v.manufacturerDate && (
                                                    <div>
                                                        <span className="text-gray-500">Mfg: </span>
                                                        {new Date(v.manufacturerDate).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', '-')}
                                                    </div>
                                                )}
                                                {v.licensePlate && <div><span className="text-gray-500">Plate: </span>{v.licensePlate}</div>}

                                                {v.fuelType && <div><span className="text-gray-500">Fuel: </span>{v.fuelType}</div>}
                                                {v.fuelCapacity != null && <div><span className="text-gray-500">Capacity: </span>{v.fuelCapacity} L</div>}
                                                {v.buyDate && <div><span className="text-gray-500">Buy: </span>{String(v.buyDate).slice(0, 10)}</div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button className="text-indigo-600" onClick={() => setEditing(v)}>Edit</button>
                                            <button className="text-red-600" disabled={busyId === v._id} onClick={() => remove(v._id)}>{busyId === v._id ? 'Deleting…' : 'Delete'}</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {editing && (
                            <EditVehicleModal
                                vehicle={editing}
                                color={editing.color || accent}
                                onClose={() => setEditing(null)}
                                onSaved={(v) => { onUpdated(v); setEditing(null); }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const EditVehicleModal = ({ vehicle, onClose, onSaved, color }: { vehicle: VehicleDoc; onClose: () => void; onSaved: (v: VehicleDoc) => void; color?: string }) => {
    const [form, setForm] = useState({
        name: vehicle.name || '',
        type: vehicle.type as VehicleType,
        color: vehicle.color || '#3b82f6',
        model: vehicle.model || '',
        manufacturerDate: vehicle.manufacturerDate ? String(vehicle.manufacturerDate).slice(0, 7) : '',
        buyDate: vehicle.buyDate ? String(vehicle.buyDate).slice(0, 10) : '',
        fuelType: vehicle.fuelType || 'Petrol',
        fuelCapacity: vehicle.fuelCapacity ?? '',
        licensePlate: vehicle.licensePlate || '',
        chassisNumber: vehicle.chassisNumber || '',
        notes: vehicle.notes || '',
    });
    const [saving, setSaving] = useState(false);
    const update = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload: Partial<{ name: string; type: VehicleType; color: string; model: string; manufacturerDate: string | null; buyDate: string | null; fuelType: string; fuelCapacity: number | null; licensePlate: string; chassisNumber: string; notes: string }> = {
            name: form.name,
            type: form.type,
            color: form.color,
            model: form.model,
            manufacturerDate: form.manufacturerDate || null,
            buyDate: form.buyDate || null,
            fuelType: form.fuelType,
            fuelCapacity: form.fuelCapacity ? Number(form.fuelCapacity) : null,
            licensePlate: form.licensePlate,
            chassisNumber: form.chassisNumber,
            notes: form.notes,
        };
        try {
            const v = await apiService.updateVehicle(vehicle._id, payload);
            onSaved(v as VehicleDoc);
        } finally { setSaving(false); }
    };
    const accent = form.color || color || '#3b82f6';
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-xl m-0">
                <div className="relative rounded-2xl p-[2px] shadow-2xl" style={{ background: `linear-gradient(135deg, ${withAlpha(accent, 0.9)}, ${withAlpha(accent, 0.4)} 40%, rgba(255,255,255,0.6))` }}>
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3 sticky top-0 z-10 text-white" style={{ background: `linear-gradient(90deg, ${withAlpha(accent, 0.95)}, ${withAlpha(accent, 0.75)})` }}>
                            <h3 className="text-base sm:text-lg font-semibold">Edit vehicle</h3>
                            <button type="button" onClick={onClose} className="px-2 py-1 rounded-md bg-white/15 hover:bg-white/25">Close</button>
                        </div>
                        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${withAlpha(accent, 0.5)}, ${withAlpha(accent, 0.2)})` }} />
                        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 overflow-y-auto flex-1">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                                <div className="flex items-center gap-2">
                                    <input name="color" type="color" className="h-9 w-12 p-0 border rounded" value={form.color} onChange={update} />
                                    <input name="color" className="flex-1 px-2 py-2 border rounded-md" value={form.color} onChange={update} placeholder="#3b82f6" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select name="type" className="w-full px-2 py-2 border rounded-md" value={form.type} onChange={update}>
                                    <option value="car">Car</option>
                                    <option value="bike">Bike</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                                <input name="name" className="w-full px-2 py-2 border rounded-md" value={form.name} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                <input name="model" className="w-full px-2 py-2 border rounded-md" value={form.model} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Date (MM-YYYY)</label>
                                <input name="manufacturerDate" placeholder="MM-YYYY" className="w-full px-2 py-2 border rounded-md" value={form.manufacturerDate} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buy Date</label>
                                <input name="buyDate" type="date" className="w-full px-2 py-2 border rounded-md" value={form.buyDate} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel type</label>
                                <select name="fuelType" className="w-full px-2 py-2 border rounded-md" value={form.fuelType} onChange={update}>
                                    {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Capacity (L)</label>
                                <input name="fuelCapacity" type="number" className="w-full px-2 py-2 border rounded-md" value={form.fuelCapacity} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                                <input name="licensePlate" className="w-full px-2 py-2 border rounded-md" value={form.licensePlate} onChange={update} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
                                <input name="chassisNumber" className="w-full px-2 py-2 border rounded-md" value={form.chassisNumber} onChange={update} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea name="notes" rows={2} className="w-full px-2 py-2 border rounded-md" value={form.notes} onChange={update} />
                            </div>
                            <div className="md:col-span-2 flex items-center justify-between gap-2 pt-1">
                                <button type="button" onClick={onClose} className="px-2 py-2 text-gray-700 border rounded-md">Cancel</button>
                                <button type="submit" disabled={saving} className="px-2 py-2 rounded-md text-white disabled:opacity-50" style={{ backgroundColor: accent }}>{saving ? 'Saving…' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};