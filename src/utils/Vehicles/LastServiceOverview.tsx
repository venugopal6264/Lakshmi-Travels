import { Car, Bike, Info } from "lucide-react";
import { useState, useMemo } from "react";
import { ApiFuel } from "../../services/api";
import { withAlpha } from "../common/utils";
import { hasMissedPrevRefuel } from "./FuelEntry";
import { VehicleDoc } from "./VehicleUtils";

export const LastServiceOverview = ({ vehicles, fuel, onSelect }: { vehicles: VehicleDoc[]; fuel: ApiFuel[]; onSelect?: (v: VehicleDoc) => void }) => {
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