import React, { useEffect, useMemo, useState } from 'react';
import { Car, Fuel as FuelIcon, Bike, Info } from 'lucide-react';
import { ApiFuel, apiService } from '../services/api';
import { useFuel } from '../hooks/useApi';
import { VehicleDash } from '../utils/FuelUtils';
import { VehicleType } from '../utils/common/utils';
import { FuelSummarySection } from '../utils/charts/FuelSummarySection';

// Shared type for vehicles returned by API
type VehicleDoc = {
    _id: string;
    name: string;
    type: VehicleType;
    active: boolean;
    model?: string;
    manufacturerDate?: string | null;
    buyDate?: string | null;
    fuelType?: string;
    fuelCapacity?: number | null;
    licensePlate?: string;
    chassisNumber?: string;
    notes?: string;
};

function LastServiceOverview({ vehicles, fuel }: { vehicles: VehicleDoc[]; fuel: ApiFuel[] }) {
    // Single-open accordion behavior
    const [openId, setOpenId] = useState<string | null>(null);
    const toggle = (id: string) => setOpenId(curr => (curr === id ? null : id));
    const cards = useMemo(() => {
        return vehicles.map(v => {
            // Only consider 'service' entries (exclude 'repair' per requirement)
            const serviceEntries = fuel.filter(f => f.vehicle === v.type && f.vehicleId === v._id && f.entryType === 'service');
            if (!serviceEntries.length) return { vehicle: v, last: null as ApiFuel | null, sinceKm: null as number | null };
            // Find latest service by date
            let latest = serviceEntries[0];
            let latestTime = new Date(latest.date || 0).getTime();
            for (const e of serviceEntries) {
                const t = new Date(e.date || 0).getTime();
                if (t > latestTime) { latest = e; latestTime = t; }
            }
            // Compute km since last service: latest refueling odometer AFTER the service - service odometer
            let sinceKm: number | null = null;
            const serviceOdo = typeof latest.odometer === 'number' ? latest.odometer : null;
            if (serviceOdo != null && latest.date) {
                const serviceTime = new Date(latest.date).getTime();
                let latestFuelOdo: number | null = null;
                let latestFuelTime = -1;
                for (const e of fuel) {
                    if (e.vehicle !== v.type || e.vehicleId !== v._id) continue;
                    if (e.entryType !== 'refueling') continue;
                    if (!e.date) continue;
                    const t = new Date(e.date).getTime();
                    if (t < serviceTime) continue; // only after (or same day) as service
                    if (typeof e.odometer !== 'number') continue;
                    if (t > latestFuelTime) { latestFuelTime = t; latestFuelOdo = e.odometer; }
                }
                if (latestFuelOdo != null) {
                    sinceKm = latestFuelOdo - serviceOdo;
                    if (sinceKm < 0) sinceKm = 0; // guard for resets
                } else {
                    sinceKm = 0; // no refueling after service yet
                }
            }
            return { vehicle: v, last: latest, sinceKm };
        });
    }, [vehicles, fuel]);
    const today = Date.now();
    return (
        <div className="mb-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Last Service Overview</h3>
            <div className="grid gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cards.map(c => {
                    const dStr = c.last?.date ? new Date(c.last.date).toISOString().slice(0, 10) : null;
                    const daysAgo = c.last?.date ? Math.floor((today - new Date(c.last.date).getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const accent = c.vehicle.type === 'car' ? 'border-l-blue-500' : 'border-l-green-500';
                    return (
                        <div
                            key={c.vehicle._id}
                            className={`relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition ${accent} border-l-4`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                    {c.vehicle.type === 'car' ? (
                                        <Car className="h-4 w-4 text-blue-600" />
                                    ) : (
                                        <Bike className="h-4 w-4 text-green-600" />
                                    )}
                                    <span>{c.vehicle.name}</span>
                                    <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 capitalize ring-1 ring-gray-200">
                                        {c.vehicle.type}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggle(c.vehicle._id)}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"
                                    title={openId === c.vehicle._id ? 'Hide info' : 'Show info'}
                                >
                                    <Info className="h-3.5 w-3.5" /> {openId === c.vehicle._id ? 'Hide' : 'Info'}
                                </button>
                            </div>
                            {c.last ? (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="text-2xl font-semibold text-gray-900 tracking-tight">{dStr}</div>
                                        {daysAgo != null && (
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                                {daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-600">
                                        {typeof c.last.odometer === 'number' && (
                                            <div>Odometer: <span className="font-medium text-gray-800">{Math.round(c.last.odometer).toLocaleString()} km</span></div>
                                        )}
                                        {c.sinceKm != null && (
                                            <div>Since service: <span className="font-medium text-gray-800">{Math.round(c.sinceKm).toLocaleString()} km</span></div>
                                        )}
                                    </div>
                                    <div
                                        className={`overflow-hidden transition-all duration-300 ease-in-out ${openId === c.vehicle._id ? 'max-h-64 opacity-100 mt-3' : 'max-h-0 opacity-0'} `}
                                        aria-hidden={openId === c.vehicle._id ? 'false' : 'true'}
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 border-t border-dashed border-gray-200 pt-2 text-[12px] leading-tight">
                                            {c.vehicle.model && <div><span className="text-gray-500">Model: </span><span className="text-gray-800">{c.vehicle.model}</span></div>}
                                            {c.vehicle.manufacturerDate && (
                                                <div><span className="text-gray-500">Mfg: </span><span className="text-gray-800">{new Date(c.vehicle.manufacturerDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span></div>
                                            )}
                                            {c.vehicle.buyDate && <div><span className="text-gray-500">Buy: </span><span className="text-gray-800">{String(c.vehicle.buyDate).slice(0, 10)}</span></div>}
                                            {c.vehicle.fuelType && <div><span className="text-gray-500">Fuel: </span><span className="text-gray-800">{c.vehicle.fuelType}</span></div>}
                                            {c.vehicle.fuelCapacity != null && <div><span className="text-gray-500">Capacity: </span><span className="text-gray-800">{c.vehicle.fuelCapacity} L</span></div>}
                                            {c.vehicle.licensePlate && <div><span className="text-gray-500">Plate: </span><span className="text-gray-800">{c.vehicle.licensePlate}</span></div>}
                                            {c.vehicle.chassisNumber && <div><span className="text-gray-500">Chassis: </span><span className="text-gray-800">{c.vehicle.chassisNumber}</span></div>}
                                            {c.vehicle.notes && <div className="sm:col-span-2"><span className="text-gray-500">Notes: </span><span className="text-gray-800 line-clamp-2">{c.vehicle.notes}</span></div>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-1 text-sm text-gray-500 italic">No record</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


export default function VehicleDashboard() {
    const vehicleDisplay: Record<VehicleType, string> = {
        car: 'Breeza',
        bike: 'FZs',
    };
    const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
    const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
    const [vehicleManagerOpen, setVehicleManagerOpen] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [selectedVehicleName, setSelectedVehicleName] = useState<string>(vehicleDisplay['car']);
    useEffect(() => {
        (async () => {
            try {
                const list = await apiService.getVehicles();
                const arr = list as VehicleDoc[];
                setVehicles(arr);
                // Prefer Car by default; fallback to first available
                const preferred = arr.find(v => v.type === 'car') || arr[0] || null;
                if (preferred) {
                    setSelectedVehicleId(preferred._id);
                    setSelectedVehicleName(preferred.name);
                    setActiveVehicle(preferred.type);
                    setActiveVehicleId(preferred._id);
                }
            } catch {
                // ignore
            }
        })();
    }, []);
    const { fuel, addFuel, updateFuel, deleteFuel } = useFuel();

    // entry modal state (create/edit)
    const [entryModalOpen, setEntryModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ApiFuel | null>(null);


    // NEW: Vehicle tab state: type + optional selected named vehicle id
    const [activeVehicle, setActiveVehicle] = useState<VehicleType>('car');
    const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);

    // Period filter state
    type PeriodKey = 'all' | '1m' | '3m' | '6m' | '1y';
    const [period, setPeriod] = useState<PeriodKey>('all');

    function subMonths(base: Date, m: number) {
        const d = new Date(base);
        const year = d.getFullYear();
        const month = d.getMonth();
        const day = d.getDate();
        return new Date(year, month - m, day);
    }

    const periodFilteredFuel = React.useMemo(() => {
        if (period === 'all') return fuel;
        const now = new Date();
        const start = period === '1m' ? subMonths(now, 1)
            : period === '3m' ? subMonths(now, 3)
                : period === '6m' ? subMonths(now, 6)
                    : subMonths(now, 12);
        start.setHours(0, 0, 0, 0);
        return fuel.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d >= start;
        });
    }, [fuel, period]);

    // Visible list for current vehicle selection (for top date range display)
    const visibleList = React.useMemo(() => {
        return periodFilteredFuel.filter(i => {
            if (i.vehicle !== activeVehicle) return false;
            if (activeVehicleId) return i.vehicleId === activeVehicleId;
            return true;
        }).sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
    }, [periodFilteredFuel, activeVehicle, activeVehicleId]);

    const rangeInfo = React.useMemo(() => {
        const entriesCount = visibleList.length;
        if (!entriesCount) return null;
        const firstDate = visibleList[0]?.date ? new Date(visibleList[0].date!) : null;
        const lastDate = visibleList[entriesCount - 1]?.date ? new Date(visibleList[entriesCount - 1].date!) : null;
        const rangeDays = firstDate && lastDate ? Math.max(1, Math.ceil((+lastDate - +firstDate) / (1000 * 60 * 60 * 24)) + 1) : 0;
        return { entriesCount, firstDate, lastDate, rangeDays } as const;
    }, [visibleList]);

    function fmtDate(d?: Date | null) {
        if (!d) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden">
            {/* Colorful header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Car className="w-5 h-5" />
                        Vehicles
                        <span className="ml-2 inline-flex items-center rounded-full text-xs px-2 py-0.5 bg-white/20 text-white capitalize">
                            {selectedVehicleName}
                        </span>
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-emerald-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2"
                            title="Add new entry"
                        >
                            <FuelIcon className="w-4 h-4" />
                            Add New
                        </button>
                        <button
                            onClick={() => setVehicleManagerOpen(true)}
                            className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-indigo-600 hover:to-blue-700 ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2"
                            title="Manage vehicles"
                        >
                            <Car className="w-4 h-4" />
                            Manage
                        </button>
                        <button
                            onClick={() => setVehicleModalOpen(true)}
                            className="bg-gradient-to-r from-lime-500 to-green-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-lime-600 hover:to-green-700 ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2"
                            title="Add vehicle"
                        >
                            <Car className="w-4 h-4" />
                            Add Vehicle
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-6">
                {/* All Vehicles - Last Service / Repair Overview (per-card expandable info) */}
                {vehicles.length > 0 && (
                    <LastServiceOverview vehicles={vehicles} fuel={fuel} />
                )}
                {/* Toolbar: Vehicle and Period selectors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                        <select
                            className="w-full px-3 py-2 rounded-md border-0 ring-1 ring-inset ring-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900"
                            value={activeVehicleId ?? ''}
                            onChange={(e) => {
                                const id = e.target.value || null;
                                setActiveVehicleId(id);
                                if (id) {
                                    const v = vehicles.find(x => x._id === id);
                                    if (v) {
                                        setActiveVehicle(v.type);
                                        setSelectedVehicleId(v._id);
                                        setSelectedVehicleName(v.name);
                                    }
                                }
                            }}
                        >
                            <option value="">Select…</option>
                            <optgroup label="Cars">
                                {vehicles.filter(v => v.type === 'car').map(v => (
                                    <option key={v._id} value={v._id}>{v.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Bikes">
                                {vehicles.filter(v => v.type === 'bike').map(v => (
                                    <option key={v._id} value={v._id}>{v.name}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                        <select
                            className="w-full px-3 py-2 rounded-md border-0 ring-1 ring-inset ring-green-300 bg-gradient-to-r from-green-50 to-green-100 text-green-900"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                        >
                            <option value="all">All Time</option>
                            <option value="1m">Last Month</option>
                            <option value="3m">Last 3 Months</option>
                            <option value="6m">Last 6 Months</option>
                            <option value="1y">Last 1 Year</option>
                        </select>
                    </div>
                    <div className='md:col-span-1'>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Period</label>
                        {rangeInfo && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-1 text-sm text-indigo-900 ring-1 ring-indigo-200">
                                {rangeInfo.entriesCount} entries {rangeInfo.firstDate && rangeInfo.lastDate ? `(${fmtDate(rangeInfo.firstDate)} - ${fmtDate(rangeInfo.lastDate)})` : ''} • Last {rangeInfo.rangeDays} days
                            </span>
                        )}
                    </div>
                </div>

                {/* VEHICLE TABS (Car | Bike) */}
                {periodFilteredFuel.length > 0 && (
                    <div className="mt-4">
                        <VehicleDash
                            vehicle={activeVehicle}
                            items={periodFilteredFuel}
                            vehicleId={activeVehicleId}
                            vehicleName={undefined}
                            onEdit={(e) => {
                                setEditingEntry(e);
                                setEntryModalOpen(true);
                            }}
                            onDelete={(e) => {
                                if (e._id) deleteFuel(e._id);
                            }}
                        />
                    </div>
                )}

                <FuelSummarySection items={periodFilteredFuel} />
            </div>
            {vehicleModalOpen && (
                <AddVehicleModal
                    onClose={() => setVehicleModalOpen(false)}
                    onAdded={(v: VehicleDoc) => {
                        setVehicles(prev => {
                            // prefer one active selection per type - keep newest at front
                            const others = prev.filter(x => x._id !== v._id);
                            const next: VehicleDoc[] = [v, ...others];
                            return next;
                        });
                        setSelectedVehicleId(v._id);
                        setSelectedVehicleName(v.name);
                        setActiveVehicle(v.type);
                        setVehicleModalOpen(false);
                    }}
                />
            )}
            {vehicleManagerOpen && (
                <VehicleManagerModal
                    vehicles={vehicles}
                    onClose={() => setVehicleManagerOpen(false)}
                    onUpdated={(v) => setVehicles(prev => prev.map(x => x._id === v._id ? v : x))}
                    onDeleted={(id) => setVehicles(prev => prev.filter(x => x._id !== id))}
                />
            )}
            {entryModalOpen && (
                <FuelEntryModal
                    initial={editingEntry}
                    defaultVehicle={{ id: editingEntry?.vehicleId ?? selectedVehicleId, name: editingEntry?.vehicleName ?? selectedVehicleName, type: editingEntry?.vehicle ?? activeVehicle }}
                    vehicles={vehicles}
                    onClose={() => { setEntryModalOpen(false); setEditingEntry(null); }}
                    onSave={async (payload, id) => {
                        if (id) {
                            await updateFuel(id, payload);
                        } else {
                            await addFuel(payload);
                        }
                        setEntryModalOpen(false);
                        setEditingEntry(null);
                    }}
                />
            )}
        </div>
    );
}

function AddVehicleModal({ onClose, onAdded }: { onClose: () => void; onAdded: (v: { _id: string; name: string; type: VehicleType; active: boolean }) => void }) {
    const [form, setForm] = useState({
        name: '',
        type: 'car' as VehicleType,
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

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Add vehicle</h3>
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select name="type" className="w-full px-3 py-2 border rounded-md" value={form.type} onChange={update}>
                            <option value="car">Car</option>
                            <option value="bike">Bike</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                        <input name="name" className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={update} placeholder="e.g., Breeza, FZs" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                        <input name="model" className="w-full px-3 py-2 border rounded-md" value={form.model} onChange={update} placeholder="e.g., ZDi, FZ-S V3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Date (MM-YYYY)</label>
                        <input name="manufacturerDate" placeholder="MM-YYYY" className="w-full px-3 py-2 border rounded-md" value={form.manufacturerDate} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buy Date</label>
                        <input name="buyDate" type="date" className="w-full px-3 py-2 border rounded-md" value={form.buyDate} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fuel type</label>
                        <select name="fuelType" className="w-full px-3 py-2 border rounded-md" value={form.fuelType} onChange={update}>
                            {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Capacity (L)</label>
                        <input name="fuelCapacity" type="number" className="w-full px-3 py-2 border rounded-md" value={form.fuelCapacity} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                        <input name="licensePlate" className="w-full px-3 py-2 border rounded-md" value={form.licensePlate} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
                        <input name="chassisNumber" className="w-full px-3 py-2 border rounded-md" value={form.chassisNumber} onChange={update} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea name="notes" rows={2} className="w-full px-3 py-2 border rounded-md" value={form.notes} onChange={update} />
                    </div>
                    {error && <p className="text-red-600 text-sm md:col-span-2">{error}</p>}
                    <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="px-3 py-2 text-gray-700 border rounded-md">Cancel</button>
                        <button type="submit" disabled={saving} className="px-3 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function VehicleManagerModal({ vehicles, onClose, onUpdated, onDeleted }: { vehicles: VehicleDoc[]; onClose: () => void; onUpdated: (v: VehicleDoc) => void; onDeleted: (id: string) => void }) {
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
    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Manage vehicles</h3>
                    <button onClick={onClose} className="px-2 py-1 text-gray-600">Close</button>
                </div>
                <div className="divide-y">
                    {vehicles.map(v => (
                        <div key={v._id} className="py-3">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        <span>{v.name}</span>
                                        <span className="text-xs capitalize inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-200">{v.type}</span>
                                    </div>
                                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                                        {v.model && <div><span className="text-gray-500">Model: </span>{v.model}</div>}
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
                        onClose={() => setEditing(null)}
                        onSaved={(v) => { onUpdated(v); setEditing(null); }}
                    />
                )}
            </div>
        </div>
    );
}

function EditVehicleModal({ vehicle, onClose, onSaved }: { vehicle: VehicleDoc; onClose: () => void; onSaved: (v: VehicleDoc) => void }) {
    const [form, setForm] = useState({
        name: vehicle.name || '',
        type: vehicle.type as VehicleType,
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
        const payload: Partial<{ name: string; type: VehicleType; model: string; manufacturerDate: string | null; buyDate: string | null; fuelType: string; fuelCapacity: number | null; licensePlate: string; chassisNumber: string; notes: string }> = {
            name: form.name,
            type: form.type,
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
    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Edit vehicle</h3>
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select name="type" className="w-full px-3 py-2 border rounded-md" value={form.type} onChange={update}>
                            <option value="car">Car</option>
                            <option value="bike">Bike</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                        <input name="name" className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                        <input name="model" className="w-full px-3 py-2 border rounded-md" value={form.model} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Date (MM-YYYY)</label>
                        <input name="manufacturerDate" placeholder="MM-YYYY" className="w-full px-3 py-2 border rounded-md" value={form.manufacturerDate} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buy Date</label>
                        <input name="buyDate" type="date" className="w-full px-3 py-2 border rounded-md" value={form.buyDate} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fuel type</label>
                        <select name="fuelType" className="w-full px-3 py-2 border rounded-md" value={form.fuelType} onChange={update}>
                            {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Capacity (L)</label>
                        <input name="fuelCapacity" type="number" className="w-full px-3 py-2 border rounded-md" value={form.fuelCapacity} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                        <input name="licensePlate" className="w-full px-3 py-2 border rounded-md" value={form.licensePlate} onChange={update} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
                        <input name="chassisNumber" className="w-full px-3 py-2 border rounded-md" value={form.chassisNumber} onChange={update} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea name="notes" rows={2} className="w-full px-3 py-2 border rounded-md" value={form.notes} onChange={update} />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="px-3 py-2 text-gray-700 border rounded-md">Cancel</button>
                        <button type="submit" disabled={saving} className="px-3 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FuelEntryModal({ initial, defaultVehicle, vehicles, onClose, onSave }: { initial: ApiFuel | null; defaultVehicle: { id: string | null; name: string; type: VehicleType }; vehicles: VehicleDoc[]; onClose: () => void; onSave: (payload: Omit<ApiFuel, '_id' | 'createdAt' | 'updatedAt'>, id?: string) => void }) {
    const getToday = () => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    const [vehicleType, setVehicleType] = useState<VehicleType>(initial?.vehicle || defaultVehicle.type);
    const [vehicleId, setVehicleId] = useState<string | null>(initial?.vehicleId ?? defaultVehicle.id);
    const [entryType, setEntryType] = useState<ApiFuel['entryType']>(initial?.entryType || 'refueling');
    const [date, setDate] = useState<string>(initial?.date?.slice(0, 10) || getToday());
    const [odometer, setOdometer] = useState<string>(initial?.odometer != null ? String(initial.odometer) : '');
    const [liters, setLiters] = useState<string>(initial?.liters != null ? String(initial.liters) : '');
    const [pricePerLiter, setPricePerLiter] = useState<string>(initial?.pricePerLiter != null ? String(initial.pricePerLiter) : '');
    const [total, setTotal] = useState<string>(initial?.total != null ? String(initial.total) : '');
    const [notes, setNotes] = useState<string>(initial?.notes || '');
    const computedTotal = useMemo(() => {
        const l = parseFloat(liters);
        const p = parseFloat(pricePerLiter);
        if (!Number.isFinite(l) || !Number.isFinite(p)) return '';
        // keep calculation precision in modal, UI tables will show integers
        return (Math.round(l * p * 100) / 100).toString();
    }, [liters, pricePerLiter]);
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const chosen = vehicles.find(v => v._id === vehicleId) || null;
        const payload: Omit<ApiFuel, '_id' | 'createdAt' | 'updatedAt'> = {
            date,
            vehicle: chosen?.type || vehicleType,
            vehicleId: chosen?._id || null,
            vehicleName: chosen?.name || defaultVehicle.name,
            entryType,
            odometer: odometer ? Number(odometer) : null,
            liters: entryType === 'refueling' && liters ? Number(liters) : null,
            pricePerLiter: entryType === 'refueling' && pricePerLiter ? Number(pricePerLiter) : null,
            total: (computedTotal || total) ? Number(computedTotal || total) : null,
            notes,
        };
        onSave(payload, initial?._id);
    };
    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
                <h3 className="text-lg font-semibold mb-3">{initial ? 'Edit entry' : 'Add entry'}</h3>
                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" className="w-full px-3 py-2 border rounded-md" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                        <select className="w-full px-3 py-2 border rounded-md" value={vehicleId ?? ''} onChange={e => {
                            const id = e.target.value || null;
                            setVehicleId(id);
                            const v = vehicles.find(x => x._id === id);
                            if (v) setVehicleType(v.type);
                        }}>
                            <option value="">Select…</option>
                            <optgroup label="Cars">
                                {vehicles.filter(v => v.type === 'car').map(v => (
                                    <option key={v._id} value={v._id}>{v.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Bikes">
                                {vehicles.filter(v => v.type === 'bike').map(v => (
                                    <option key={v._id} value={v._id}>{v.name}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select className="w-full px-3 py-2 border rounded-md" value={entryType} onChange={e => setEntryType(e.target.value as ApiFuel['entryType'])}>
                            <option value="refueling">Refueling</option>
                            <option value="service">Service</option>
                            <option value="repair">Repair</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (km)</label>
                        <input type="number" className="w-full px-3 py-2 border rounded-md" value={odometer} onChange={e => setOdometer(e.target.value)} />
                    </div>
                    {entryType === 'refueling' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Liters</label>
                                <input type="number" className="w-full px-3 py-2 border rounded-md" value={liters} onChange={e => setLiters(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price / Liter (₹)</label>
                                <input type="number" className="w-full px-3 py-2 border rounded-md" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total (₹)</label>
                                <input type="number" className="w-full px-3 py-2 border rounded-md" value={computedTotal || total} onChange={e => setTotal(e.target.value)} />
                            </div>
                        </>
                    )}
                    {(entryType === 'service' || entryType === 'repair') && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">{entryType === 'service' ? 'Service' : 'Repair'} Amount (₹)</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-md" value={total} onChange={e => setTotal(e.target.value)} />
                        </div>
                    )}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea className="w-full px-3 py-2 border rounded-md" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="px-3 py-2 text-gray-700 border rounded-md">Cancel</button>
                        <button type="submit" className="px-3 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
