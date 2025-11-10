import { useState, useMemo } from "react";
import { ApiFuel } from "../services/api";
import { VehicleType, withAlpha } from "./common/utils";
import { VehicleDoc } from "./VehicleUtils";

// eslint-disable-next-line react-refresh/only-export-components
export const hasMissedPrevRefuel = (entry: ApiFuel | null | undefined): entry is ApiFuel & { missedPreviousRefuel?: boolean } => {
    return !!entry && typeof entry === 'object' && 'missedPreviousRefuel' in entry;
};

export const FuelEntryModal = ({ initial, defaultVehicle, vehicles, onClose, onSave, color }: { initial: ApiFuel | null; defaultVehicle: { id: string | null; name: string; type: VehicleType }; vehicles: VehicleDoc[]; onClose: () => void; onSave: (payload: Omit<ApiFuel, '_id' | 'createdAt' | 'updatedAt'>, id?: string) => void; color?: string }) => {
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
    const [missedPreviousRefuel, setMissedPreviousRefuel] = useState<boolean>(initial ? (hasMissedPrevRefuel(initial) ? Boolean(initial.missedPreviousRefuel) : false) : false);
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
            ...(entryType === 'refueling' ? { missedPreviousRefuel } : {}),
        };
        onSave(payload, initial?._id);
    };
    const accent = color || '#3b82f6';
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="w-full max-w-xl m-0">
                <div className="relative rounded-2xl p-[2px] shadow-2xl" style={{ background: `linear-gradient(135deg, ${withAlpha(accent, 0.9)}, ${withAlpha(accent, 0.4)} 40%, rgba(255,255,255,0.6))` }}>
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3 sticky top-0 z-10 text-white" style={{ background: `linear-gradient(90deg, ${withAlpha(accent, 0.95)}, ${withAlpha(accent, 0.75)})` }}>
                            <h3 className="text-base sm:text-lg font-semibold">{initial ? 'Edit entry' : 'Add entry'}</h3>
                            <button type="button" onClick={onClose} className="px-2 py-1 rounded-md bg-white/15 hover:bg-white/25">Close</button>
                        </div>
                        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${withAlpha(accent, 0.5)}, ${withAlpha(accent, 0.2)})` }} />
                        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 overflow-y-auto flex-1">
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
                                    <div className="md:col-span-2 flex items-center justify-between mt-1">
                                        <span className="text-xs font-medium text-gray-700">Missed previous refueling?</span>
                                        <button
                                            type="button"
                                            onClick={() => setMissedPreviousRefuel(v => !v)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${missedPreviousRefuel ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                            aria-pressed={missedPreviousRefuel}
                                            aria-label="Toggle missed previous refueling"
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${missedPreviousRefuel ? 'translate-x-4' : 'translate-x-1'}`}></span>
                                        </button>
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
                                <button type="submit" className="px-3 py-2 rounded-md text-white" style={{ backgroundColor: accent }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};