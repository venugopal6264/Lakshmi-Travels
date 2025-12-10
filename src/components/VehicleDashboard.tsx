import React, { useEffect, useState } from 'react';
import { Car, Bike, Fuel as FuelIcon } from 'lucide-react';
import { ApiFuel, apiService } from '../services/api';
import { useFuel } from '../hooks/useApi';
import { VehicleDash } from '../utils/Vehicles/FuelUtils';
import { VehicleType, withAlpha } from '../utils/common/utils';
import { AddVehicleModal, VehicleDoc, VehicleManagerModal } from '../utils/Vehicles/VehicleUtils';
import { FuelEntryModal } from '../utils/Vehicles/FuelEntry';
import { VehicleCostWidgets } from './VehicleCostWidgets';

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
                // Default to ALL vehicles view
                setSelectedVehicleId(null);
                setSelectedVehicleName('All Vehicles');
                setSelectedVehicleColor('#3b82f6');
                setActiveVehicle('car');
                setActiveVehicleId(null);
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
            // When no specific vehicle selected show all vehicles
            if (!activeVehicleId) return true;
            return i.vehicleId === activeVehicleId;
        }).sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
    }, [periodFilteredFuel, activeVehicleId]);

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
                {/* Vehicle Cost Widgets - Total cost breakdown for each vehicle */}
                {vehicles.length > 0 && (
                    <VehicleCostWidgets
                        vehicles={vehicles}
                        fuel={fuel}
                        selectedVehicleId={selectedVehicleId}
                        onVehicleClick={(v) => {
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
                            className="w-full px-2 py-2 rounded-md border-0 focus:outline-none focus:ring-2"
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
                                if (!id) {
                                    setSelectedVehicleId(null);
                                    setSelectedVehicleName('All Vehicles');
                                    setSelectedVehicleColor('#3b82f6');
                                    return;
                                }
                                const found = vehicles.find(x => x._id === id);
                                if (found) {
                                    setActiveVehicle(found.type);
                                    setSelectedVehicleColor(found.color || selectedVehicleColor);
                                    setSelectedVehicleId(found._id);
                                    setSelectedVehicleName(found.name);
                                }
                            }}
                        >
                            <option value="">All Vehicles</option>
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
                            className="w-full px-2 py-2 rounded-md border-0 focus:outline-none focus:ring-2"
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
            {/* Floating vehicle selector buttons */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
                {/* Add Fuel */}
                <button
                    type="button"
                    title="Add Fuel"
                    aria-label="Add Fuel"
                    onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}
                    className="w-14 h-14 rounded-full shadow-xl ring-2 ring-emerald-400/50 flex items-center justify-center transition transform hover:scale-110 hover:shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}
                >
                    <FuelIcon className="w-7 h-7" />
                </button>
                {/* All Vehicles */}
                <button
                    type="button"
                    title="All Vehicles"
                    aria-label="All Vehicles"
                    onClick={() => {
                        setActiveVehicleId(null);
                        setSelectedVehicleId(null);
                        setSelectedVehicleName('All Vehicles');
                        setSelectedVehicleColor('#3b82f6');
                    }}
                    className={`w-12 h-12 rounded-full shadow-lg ring-1 ring-black/10 flex items-center justify-center transition transform hover:scale-105 ${!activeVehicleId ? 'ring-2 ring-indigo-500' : ''}`}
                    style={{ background: withAlpha('#3b82f6', 0.85), color: '#fff' }}
                >Reset</button>
                {vehicles.map(v => {
                    const Icon = v.type === 'car' ? Car : Bike;
                    const isActive = activeVehicleId === v._id;
                    return (
                        <button
                            key={v._id}
                            type="button"
                            title={v.name}
                            aria-label={v.name}
                            onClick={() => {
                                setActiveVehicle(v.type);
                                setActiveVehicleId(v._id);
                                setSelectedVehicleId(v._id);
                                setSelectedVehicleName(v.name);
                                setSelectedVehicleColor(v.color || '#3b82f6');
                            }}
                            className={`w-12 h-12 rounded-full shadow-lg ring-1 ring-black/10 flex items-center justify-center transition transform hover:scale-105 ${isActive ? 'ring-2 ring-indigo-500' : ''}`}
                            style={{ background: v.color || '#64748b', color: '#fff' }}
                        >
                            <Icon className="w-6 h-6" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default VehicleDashboard;
