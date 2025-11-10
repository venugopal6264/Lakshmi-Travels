import { createPortal } from "react-dom";
import { ApiFuel } from "../../services/api";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

/** UPDATED: Body now supports optional onlyType filter (refueling | service) */
export function FuelTableBody({
    items,
    vehicle,
    onlyType,
    onEdit,
    onDelete,
    vehicleId,
    vehicleName,
}: { items: ApiFuel[]; vehicle: 'car' | 'bike'; onlyType?: ApiFuel['entryType']; onEdit?: (e: ApiFuel) => void; onDelete?: (e: ApiFuel) => void; vehicleId?: string | null; vehicleName?: string | null }) {
    const [toDelete, setToDelete] = useState<ApiFuel | null>(null);
    // Filter once and compute mileage in O(n)
    const list = useMemo(() => {
        const filtered = items.filter(i => {
            if (i.vehicle !== vehicle) return false;
            if (onlyType) {
                if (onlyType === 'service') {
                    // service tab should show both service and repair records
                    if (!(i.entryType === 'service' || i.entryType === 'repair')) return false;
                } else if (i.entryType !== onlyType) return false;
            }
            if (vehicleId) return i.vehicleId === vehicleId;
            if (vehicleName) return (i.vehicleName || '').toLowerCase() === vehicleName.toLowerCase();
            return true;
        });
        // Sort by date desc then createdAt desc for stability
        return filtered.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
    }, [items, vehicle, onlyType, vehicleId, vehicleName]);
    const mileageArr = useMemo(() => {
        const n = list.length;
        const olderOdo: Array<number | null> = new Array(n).fill(null);
        let lastSeenOdo: number | null = null; // walking from end (oldest) to start (newest)
        for (let i = n - 1; i >= 0; i--) {
            olderOdo[i] = lastSeenOdo;
            if (typeof list[i].odometer === 'number') lastSeenOdo = list[i].odometer as number;
        }
        type Row = { mileage: number | null; prev: number | null; curr: number | null };
        const out: Row[] = new Array(n).fill(null).map(() => ({ mileage: null, prev: null, curr: null }));
        for (let i = 0; i < n; i++) {
            const e = list[i];
            const prev = olderOdo[i];
            const curr = typeof e.odometer === 'number' ? e.odometer as number : null;
            out[i].prev = prev;
            out[i].curr = curr;
            if (e.entryType === 'refueling' && e.missedPreviousRefuel !== true && typeof e.liters === 'number' && e.liters > 0 && typeof curr === 'number' && typeof prev === 'number') {
                const dist = curr - prev;
                if (dist > 0) out[i].mileage = dist / (e.liters as number);
            }
        }
        return out;
    }, [list]);

    const tbodyClass = vehicle === 'car'
        ? 'divide-y divide-blue-100 text-xs'
        : 'divide-y divide-green-100 text-xs';
    const rowClass = vehicle === 'car'
        ? 'odd:bg-blue-50 even:bg-blue-100 hover:bg-blue-200'
        : 'odd:bg-green-50 even:bg-green-100 hover:bg-green-200';
    const typeBadge = (t: ApiFuel['entryType']) =>
        t === 'refueling'
            ? 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800'
            : (t === 'service'
                ? 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800'
                : 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800');

    const formatDDMon = (iso?: string | null) => {
        if (!iso) return '';
        const ymd = String(iso).slice(0, 10);
        const parts = ymd.split('-').map(Number);
        if (parts.length < 3) return ymd;
        const [y, m, d] = parts as [number, number, number];
        if (!y || !m || !d) return ymd;
        const dt = new Date(y, m - 1, d);
        const mon = dt.toLocaleString('en-US', { month: 'short' });
        return `${String(d).padStart(2, '0')}-${mon}`;
    };

    return (
        <>
            <tbody className={tbodyClass}>
                {list.map((e, idx) => {
                    const distanceCell = (
                        <td className="px-4 py-2 whitespace-nowrap">
                            {(() => {
                                const row = mileageArr[idx];
                                if (!row || row.prev == null || row.curr == null) return '';
                                const dist = row.curr - row.prev;
                                return dist > 0 ? Math.round(dist).toLocaleString() + ' km' : '';
                            })()}
                        </td>
                    );
                    const mileageCell = (
                        <td className="px-4 py-2 whitespace-nowrap">
                            {(() => {
                                const row = mileageArr[idx];
                                if (!row || row.mileage == null) return '';
                                return Number(row.mileage).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km/l';
                            })()}
                        </td>
                    );
                    return (
                        <tr key={e._id} className={rowClass}>
                            <td className="px-4 py-2 whitespace-nowrap">{onlyType === 'refueling' ? formatDDMon(e.date) : e.date?.slice(0, 10)}</td>
                            {onlyType ? (
                                <>
                                    {onlyType === 'service' ? (
                                        <>
                                            <td className="px-4 py-2 whitespace-nowrap capitalize">
                                                <span className={typeBadge(e.entryType)}>{e.entryType}</span>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">{e.odometer != null ? Math.round(Number(e.odometer)).toLocaleString() : ''}</td>
                                        </>
                                    ) : (
                                        <>
                                            {distanceCell}
                                            {mileageCell}
                                            <td className="px-4 py-2 whitespace-nowrap">{e.odometer != null ? Math.round(Number(e.odometer)).toLocaleString() : ''}</td>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <td className="px-4 py-2 whitespace-nowrap capitalize"><span className={typeBadge(e.entryType)}>{e.entryType}</span></td>
                                    <td className="px-4 py-2 whitespace-nowrap">{e.odometer != null ? Math.round(Number(e.odometer)).toLocaleString() : ''}</td>
                                </>
                            )}
                            {onlyType !== 'service' && (
                                <>
                                    <td className="px-4 py-2 whitespace-nowrap">{e.liters != null ? Number(e.liters).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{e.pricePerLiter != null ? Number(e.pricePerLiter).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                                </>
                            )}
                            <td className="px-4 py-2 whitespace-nowrap">{e.total != null ? Math.round(Number(e.total)).toLocaleString() : ''}</td>
                            {onlyType === 'refueling' && (
                                <td className="px-4 py-2 whitespace-nowrap">{e.missedPreviousRefuel ? 'Yes' : 'No'}</td>
                            )}
                            {!onlyType && (
                                <>
                                    {distanceCell}
                                    {mileageCell}
                                </>
                            )}
                            <td className="px-4 py-2">{e.notes ?? ''}</td>
                            {(onEdit || onDelete) && (
                                <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                        {onEdit && (
                                            <button
                                                type="button"
                                                className="inline-flex items-center justify-center rounded p-1.5 text-indigo-600 hover:bg-indigo-50"
                                                title="Edit"
                                                aria-label="Edit"
                                                onClick={() => onEdit(e)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                type="button"
                                                className="inline-flex items-center justify-center rounded p-1.5 text-red-600 hover:bg-red-50"
                                                title="Delete"
                                                aria-label="Delete"
                                                onClick={() => setToDelete(e)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    );
                })}
            </tbody>
            {toDelete && createPortal(
                <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setToDelete(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-lg border bg-white shadow-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-800">Delete this entry?</h3>
                            <p className="text-sm text-gray-600">This action cannot be undone.</p>
                        </div>
                        <div className="p-4 text-sm text-gray-700 space-y-1">
                            <div className="grid grid-cols-3 gap-2"><div className="text-gray-500">Date</div><div className="col-span-2">{toDelete.date?.slice(0, 10) || '-'}</div></div>
                            <div className="grid grid-cols-3 gap-2"><div className="text-gray-500">Type</div><div className="col-span-2 capitalize">{toDelete.entryType}</div></div>
                            <div className="grid grid-cols-3 gap-2"><div className="text-gray-500">Vehicle</div><div className="col-span-2">{toDelete.vehicleName || toDelete.vehicle}</div></div>
                            <div className="grid grid-cols-3 gap-2"><div className="text-gray-500">Odometer</div><div className="col-span-2">{(toDelete.odometer as unknown as number) ?? '-'}</div></div>
                            <div className="grid grid-cols-3 gap-2"><div className="text-gray-500">Liters</div><div className="col-span-2">{(toDelete.liters as unknown as number) ?? '-'}</div></div>
                            <div className="grid grid-cols-3 gap-2"><div className="text-gray-500">Price/L</div><div className="col-span-2">{(toDelete.pricePerLiter as unknown as number) ?? '-'}</div></div>
                            <div className="grid grid-cols-3 gap-2"><div className="text-gray-500">Total</div><div className="col-span-2">{(toDelete.total as unknown as number) ?? '-'}</div></div>
                            {toDelete.notes && (
                                <div className="grid grid-cols-3 gap-2"><div className="text-gray-500">Notes</div><div className="col-span-2">{toDelete.notes}</div></div>
                            )}
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3">
                            <button
                                type="button"
                                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                onClick={() => setToDelete(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                onClick={() => { if (onDelete && toDelete) { onDelete(toDelete); } setToDelete(null); }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

/** UPDATED: Footer shows per-column totals for Refueling; consolidated for others */
export function FuelTableFooter({
    items,
    vehicle,
    onlyType,
    hasActions,
}: { items: ApiFuel[]; vehicle: 'car' | 'bike'; onlyType?: ApiFuel['entryType']; hasActions?: boolean }) {
    const totals = useMemo(() => {
        let fuelTotal = 0;
        let serviceTotal = 0;
        let totalLiters = 0;
        let sumDistance = 0;
        let sumLitersUsed = 0;
        let odoDistance = 0;

        // Collect refueling entries for this vehicle for mileage calc
        const refuel = items
            .filter(e => e.vehicle === vehicle && e.entryType === 'refueling')
            .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()); // newest first

        // Walk from oldest to newest to find previous odometer reading among refuels
        const n = refuel.length;
        const olderOdo: Array<number | null> = new Array(n).fill(null);
        let lastSeenOdo: number | null = null;
        for (let i = n - 1; i >= 0; i--) {
            olderOdo[i] = lastSeenOdo;
            if (typeof refuel[i].odometer === 'number') lastSeenOdo = refuel[i].odometer as number;
        }

        for (let i = 0; i < n; i++) {
            const e = refuel[i];
            const prev = olderOdo[i];
            const curr = typeof e.odometer === 'number' ? (e.odometer as number) : null;
            const liters = typeof e.liters === 'number' ? (e.liters as number) : null;
            if (e.missedPreviousRefuel !== true && prev != null && curr != null && liters != null && liters > 0) {
                const dist = curr - prev;
                if (dist > 0) {
                    sumDistance += dist;
                    sumLitersUsed += liters;
                }
            }
        }

        // Odometer distance = newest odometer - oldest odometer among refuels with numbers
        if (n > 0) {
            let newest: number | null = null;
            let oldest: number | null = null;
            for (let i = 0; i < n; i++) {
                if (typeof refuel[i].odometer === 'number') { newest = refuel[i].odometer as number; break; }
            }
            for (let i = n - 1; i >= 0; i--) {
                if (typeof refuel[i].odometer === 'number') { oldest = refuel[i].odometer as number; break; }
            }
            if (newest != null && oldest != null && newest > oldest) {
                odoDistance = newest - oldest;
            }
        }

        for (const e of items) {
            if (e.vehicle !== vehicle) continue;
            if (typeof e.total === 'number') {
                if (e.entryType === 'refueling') fuelTotal += e.total;
                else if (e.entryType === 'service' || e.entryType === 'repair') serviceTotal += e.total;
            }
            if (e.entryType === 'refueling' && typeof e.liters === 'number') {
                totalLiters += e.liters as number;
            }
        }
        const avgMileage = sumLitersUsed > 0 ? (sumDistance / sumLitersUsed) : 0;
        return { fuelTotal, serviceTotal, totalLiters, avgMileage, odoDistance };
    }, [items, vehicle]);

    const fmt = (n: number) => Math.round(n).toLocaleString();
    const fmt2 = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tClass = vehicle === 'car' ? 'bg-blue-50 text-blue-900 text-xs' : 'bg-green-50 text-green-900 text-xs';
    const badge = vehicle === 'car' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

    if (onlyType === 'refueling') {
        // Per-column totals now: Date | Distance | Mileage | Odometer | Liters | Price | Total | Missed Prev Fuel | Notes | Actions
        const sumLiters = fmt2(totals.totalLiters);
        const avgPrice = totals.totalLiters > 0 ? fmt2((totals.fuelTotal as number) / totals.totalLiters) : fmt2(0);
        const sumTotal = fmt(totals.fuelTotal);
        const avgMileage = fmt2(totals.avgMileage);
        const odoKm = fmt(totals.odoDistance || 0);
        return (
            <tfoot>
                <tr className={tClass}>
                    <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>Totals</span>
                    </td>
                    <td className="px-4 py-2 text-sm">{odoKm} km</td>
                    <td className="px-4 py-2 text-sm">{avgMileage} km/L</td>
                    <td className="px-4 py-2 text-sm">{sumLiters}</td>
                    <td className="px-4 py-2 text-sm">{avgPrice}</td>
                    <td className="px-4 py-2 text-sm">₹{sumTotal}</td>
                    <td className="px-4 py-2 text-sm"></td>
                    <td className="px-4 py-2 text-sm"></td>
                    {hasActions && <td className="px-4 py-2 text-sm"></td>}
                </tr>
            </tfoot>
        );
    }

    return (
        <tfoot>
            <tr className={tClass}>
                <td className="px-4 py-2" colSpan={onlyType ? (onlyType === 'service' ? 3 : 6) : 5}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>Totals</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap align-top">
                    <div className="text-xs space-y-1">
                        {!onlyType && (
                            <>
                                <div>Fuel: ₹{fmt(totals.fuelTotal)}</div>
                                <div>Service: ₹{fmt(totals.serviceTotal)}</div>
                            </>
                        )}
                        {onlyType === 'service' && <div>Service/Repair: ₹{fmt(totals.serviceTotal)}</div>}
                    </div>
                </td>
                <td className="px-4 py-2" colSpan={2}></td>
            </tr>
        </tfoot>
    );
}