import React, { useEffect, useMemo, useState } from 'react';
import { Car, Fuel as FuelIcon, Bike, Info } from 'lucide-react';
import { ApiFuel, apiService } from '../services/api';
import { useFuel } from '../hooks/useApi';
import { VehicleDash } from '../utils/FuelUtils';
import { VehicleType, withAlpha } from '../utils/common/utils';
import { FuelSummarySection } from '../utils/charts/FuelSummarySection';
import { AddVehicleModal, VehicleDoc, VehicleManagerModal } from '../utils/VehicleUtils';
import { FuelEntryModal, hasMissedPrevRefuel } from '../utils/FuelEntry';

const LastServiceOverview = ({ vehicles, fuel, onSelect }: { vehicles: VehicleDoc[]; fuel: ApiFuel[]; onSelect?: (v: VehicleDoc) => void }) => {
    // Removed accordion; only last service summary is shown
    const [openId, setOpenId] = useState<string | null>(null);
    const cards = useMemo(() => {
        const sorted = [...vehicles].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        return sorted.map(v => {
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
                // If a refueling entry is flagged as missedPreviousRefuel, treat it as new baseline
                let baselineTime: number | null = null;
                let baselineOdo: number | null = null;
                for (const e of fuel) {
                    if (e.vehicle !== v.type || e.vehicleId !== v._id) continue;
                    if (e.entryType !== 'refueling') continue;
                    if (!e.date) continue;
                    const t = new Date(e.date).getTime();
                    if (t < serviceTime) continue; // only after (or same day) as service
                    if (typeof e.odometer !== 'number') continue;
                    const missedFlag = hasMissedPrevRefuel(e) && e.missedPreviousRefuel === true;
                    if (missedFlag) {
                        baselineTime = t;
                        baselineOdo = e.odometer;
                        latestFuelTime = t;
                        latestFuelOdo = e.odometer;
                        continue;
                    }
                    // If baseline set, ignore refuels before baselineTime
                    if (baselineTime != null && t < baselineTime) continue;
                    if (t > latestFuelTime) { latestFuelTime = t; latestFuelOdo = e.odometer; }
                }
                if (latestFuelOdo != null) {
                    // Distance since last service or since flagged baseline if present
                    const startOdo = baselineOdo != null ? baselineOdo : serviceOdo;
                    sinceKm = latestFuelOdo - (startOdo || 0);
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
            <div className="grid gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cards.map(c => {
                    const dStr = c.last?.date ? new Date(c.last.date).toISOString().slice(0, 10) : '';
                    const daysAgo = c.last?.date ? Math.floor((today - new Date(c.last.date).getTime()) / (1000 * 60 * 60 * 24)) : null;
                    const accentColor = c.vehicle.color || (c.vehicle.type === 'car' ? '#3b82f6' : '#16a34a');
                    const isOpen = openId === c.vehicle._id;
                    return (
                        <div
                            key={c.vehicle._id}
                            className={`relative rounded-lg border bg-white p-4 shadow-sm transition border-l-4 cursor-pointer hover:shadow-md`}
                            style={{ borderLeftColor: accentColor, borderColor: withAlpha(accentColor, 0.25), backgroundColor: withAlpha(accentColor, 0.06) }}
                            onClick={() => onSelect?.(c.vehicle)}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                    {c.vehicle.type === 'car' ? (
                                        <Car className="h-4 w-4" style={{ color: accentColor }} />
                                    ) : (
                                        <Bike className="h-4 w-4" style={{ color: accentColor }} />
                                    )}
                                    <span>{c.vehicle.name}</span>
                                    <span
                                        className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1"
                                        style={{
                                            backgroundColor: withAlpha(accentColor, 0.1),
                                            color: accentColor,
                                            borderColor: withAlpha(accentColor, 0.25)
                                        }}
                                    >
                                        {c.vehicle.type}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setOpenId(isOpen ? null : c.vehicle._id); }}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium hover:bg-gray-50 border"
                                    style={{ color: accentColor, borderColor: withAlpha(accentColor, 0.3), backgroundColor: isOpen ? withAlpha(accentColor, 0.08) : 'transparent' }}
                                    title="Toggle vehicle info"
                                    aria-pressed={isOpen}
                                >
                                    <Info className="h-3.5 w-3.5" />
                                    <span>Info</span>
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
                                    {isOpen && (
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 border-t border-dashed border-gray-200 pt-2 text-[11px] leading-tight">
                                            {c.vehicle.model && <div><span className="text-gray-500">Model: </span><span className="text-gray-800">{c.vehicle.model}</span></div>}
                                            {c.vehicle.manufacturerDate && <div><span className="text-gray-500">Mfg: </span><span className="text-gray-800">{new Date(c.vehicle.manufacturerDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span></div>}
                                            {c.vehicle.buyDate && <div><span className="text-gray-500">Buy: </span><span className="text-gray-800">{String(c.vehicle.buyDate).slice(0, 10)}</span></div>}
                                            {c.vehicle.fuelType && <div><span className="text-gray-500">Fuel: </span><span className="text-gray-800">{c.vehicle.fuelType}</span></div>}
                                            {c.vehicle.fuelCapacity != null && <div><span className="text-gray-500">Capacity: </span><span className="text-gray-800">{c.vehicle.fuelCapacity} L</span></div>}
                                            {c.vehicle.licensePlate && <div><span className="text-gray-500">Plate: </span><span className="text-gray-800">{c.vehicle.licensePlate}</span></div>}
                                            {c.vehicle.chassisNumber && <div><span className="text-gray-500">Chassis: </span><span className="text-gray-800">{c.vehicle.chassisNumber}</span></div>}
                                            {c.vehicle.notes && <div className="sm:col-span-2"><span className="text-gray-500">Notes: </span><span className="text-gray-800 line-clamp-2">{c.vehicle.notes}</span></div>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-2">
                                    <div className="mt-1 text-sm text-gray-500 italic">No service record</div>
                                    {isOpen && (
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 border-t border-dashed border-gray-200 pt-2 text-[11px] leading-tight">
                                            {c.vehicle.model && <div><span className="text-gray-500">Model: </span><span className="text-gray-800">{c.vehicle.model}</span></div>}
                                            {c.vehicle.manufacturerDate && <div><span className="text-gray-500">Mfg: </span><span className="text-gray-800">{new Date(c.vehicle.manufacturerDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span></div>}
                                            {c.vehicle.buyDate && <div><span className="text-gray-500">Buy: </span><span className="text-gray-800">{String(c.vehicle.buyDate).slice(0, 10)}</span></div>}
                                            {c.vehicle.fuelType && <div><span className="text-gray-500">Fuel: </span><span className="text-gray-800">{c.vehicle.fuelType}</span></div>}
                                            {c.vehicle.fuelCapacity != null && <div><span className="text-gray-500">Capacity: </span><span className="text-gray-800">{c.vehicle.fuelCapacity} L</span></div>}
                                            {c.vehicle.licensePlate && <div><span className="text-gray-500">Plate: </span><span className="text-gray-800">{c.vehicle.licensePlate}</span></div>}
                                            {c.vehicle.chassisNumber && <div><span className="text-gray-500">Chassis: </span><span className="text-gray-800">{c.vehicle.chassisNumber}</span></div>}
                                            {c.vehicle.notes && <div className="sm:col-span-2"><span className="text-gray-500">Notes: </span><span className="text-gray-800 line-clamp-2">{c.vehicle.notes}</span></div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const VehicleDashboard = () => {
    const vehicleDisplay: Record<VehicleType, string> = {
        car: 'Breeza',
        bike: 'FZs',
    };
    const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
    const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
    const [vehicleManagerOpen, setVehicleManagerOpen] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [selectedVehicleName, setSelectedVehicleName] = useState<string>(vehicleDisplay['car']);
    const [selectedVehicleColor, setSelectedVehicleColor] = useState<string>('#3b82f6');
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
                    setSelectedVehicleColor(preferred.color || '#3b82f6');
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

    const theme = selectedVehicleColor || '#3b82f6';
    return (
        <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden">
            {/* Colorful header (tinted with selected color) */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Car className="w-5 h-5" />
                        Vehicles
                        <span
                            className="ml-2 inline-flex items-center rounded-full text-xs px-2 py-0.5 capitalize ring-1"
                            style={{ background: withAlpha(theme, 0.15), color: '#ffffff', borderColor: withAlpha('#ffffff', 0.35) }}
                        >
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
                    <LastServiceOverview
                        vehicles={vehicles}
                        fuel={fuel}
                        onSelect={(v) => {
                            setActiveVehicle(v.type);
                            setActiveVehicleId(v._id);
                            setSelectedVehicleId(v._id);
                            setSelectedVehicleName(v.name);
                            setSelectedVehicleColor(v.color || selectedVehicleColor);
                        }}
                    />
                )}
                {/* Toolbar: Vehicle and Period selectors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                        <select
                            className="w-full px-3 py-2 rounded-md border-0 focus:outline-none focus:ring-2"
                            style={{
                                background: `linear-gradient(90deg, ${withAlpha(theme, 0.08)}, ${withAlpha(theme, 0.14)})`,
                                color: theme,
                                boxShadow: `inset 0 0 0 1px ${withAlpha(theme, 0.35)}`,
                                borderColor: withAlpha(theme, 0.4)
                            }}
                            value={activeVehicleId ?? ''}
                            onChange={(e) => {
                                const id = e.target.value || null;
                                setActiveVehicleId(id);
                                const found = vehicles.find(x => x._id === id);
                                if (found) {
                                    setActiveVehicle(found.type);
                                    setSelectedVehicleColor(found.color || selectedVehicleColor);
                                    setSelectedVehicleId(found._id);
                                    setSelectedVehicleName(found.name);
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
                            className="w-full px-3 py-2 rounded-md border-0 focus:outline-none focus:ring-2"
                            style={{
                                background: `linear-gradient(90deg, ${withAlpha(theme, 0.08)}, ${withAlpha(theme, 0.14)})`,
                                color: theme,
                                boxShadow: `inset 0 0 0 1px ${withAlpha(theme, 0.35)}`,
                                borderColor: withAlpha(theme, 0.4)
                            }}
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
                            <span
                                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1"
                                style={{
                                    background: withAlpha(theme, 0.08),
                                    color: theme,
                                    borderColor: withAlpha(theme, 0.25)
                                }}
                            >
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
                            color={selectedVehicleColor}
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

                <FuelSummarySection items={periodFilteredFuel} color={selectedVehicleColor} />
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
                        setSelectedVehicleColor(v.color || '#3b82f6');
                        setActiveVehicle(v.type);
                        setVehicleModalOpen(false);
                    }}
                    color={selectedVehicleColor}
                />
            )}
            {vehicleManagerOpen && (
                <VehicleManagerModal
                    vehicles={vehicles}
                    color={selectedVehicleColor}
                    onClose={() => setVehicleManagerOpen(false)}
                    onUpdated={(v) => {
                        setVehicles(prev => prev.map(x => x._id === v._id ? v : x));
                        if (v._id === selectedVehicleId) setSelectedVehicleColor(v.color || selectedVehicleColor);
                    }}
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
                    color={selectedVehicleColor}
                />
            )}
        </div>
    );
};

export default VehicleDashboard;
