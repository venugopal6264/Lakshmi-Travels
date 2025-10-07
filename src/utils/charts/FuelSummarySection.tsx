import { useEffect, useMemo, useState } from "react";
import { ApiFuel, apiService, FuelSummaryResponse } from "../../services/api";
import { MonthRow } from "../common/utils";
import { MonthlyFuelServiceBarChart } from "./MonthlyFuelServiceBarChart";

export function FuelSummarySection(
    { items, color }: { items?: ApiFuel[]; color?: string } = {}
) {
    const [summary, setSummary] = useState<FuelSummaryResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Source for monthly charts (prefer props, else best-effort fetch)
    const [allItems, setAllItems] = useState<ApiFuel[] | null>(items ?? null);
    useEffect(() => { setAllItems(items ?? null); }, [items]);
    useEffect(() => {
        if (!items && allItems === null) {
            (async () => {
                try {
                    const res = await apiService.getFuel();
                    setAllItems(res as ApiFuel[]);
                } catch {
                    // ignore; monthly charts will be hidden if data unavailable
                }
            })();
        }
    }, [items, allItems]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await apiService.getFuelSummary();
                if (!cancelled) setSummary(res);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load summary');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const monthLabel = (y: number, mZero: number) =>
        new Date(y, mZero, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });

    const monthlyRows: MonthRow[] = useMemo(() => {
        const src = allItems ?? [];
        if (!src.length) return [];
        const map = new Map<string, MonthRow>();
        for (const e of src) {
            if (!e.date) continue;
            const d = new Date(e.date);
            if (isNaN(+d)) continue;
            const y = d.getFullYear();
            const m = d.getMonth();
            const key = `${y}-${String(m + 1).padStart(2, '0')}`;
            if (!map.has(key)) {
                map.set(key, {
                    year: y,
                    month: m,
                    label: monthLabel(y, m),
                    car: { liters: 0, fuelSpend: 0, serviceSpend: 0, repairSpend: 0 },
                    bike: { liters: 0, fuelSpend: 0, serviceSpend: 0, repairSpend: 0 }
                });
            }
            const row = map.get(key)!;
            const target = e.vehicle === 'car' ? row.car : row.bike;
            const total = typeof e.total === 'number' ? e.total : 0;
            if (e.entryType === 'refueling') {
                target.fuelSpend += total;
                if (typeof e.liters === 'number') target.liters += e.liters;
            } else if (e.entryType === 'service') {
                target.serviceSpend += total;
            } else if (e.entryType === 'repair') {
                target.repairSpend += total;
            }
        }
        return Array.from(map.values()).sort((a, b) =>
            a.year !== b.year ? a.year - b.year : a.month - b.month
        );
    }, [allItems]);

    if (loading) return null;
    if (error) return <p className="text-red-500 text-sm mt-6">{error}</p>;
    if (!summary) return null;

    const theme = color || '#6366f1';
    return (
        <div className="mt-10">
            {monthlyRows.length > 0 && (
                <div className="rounded-xl border p-4 border-t-4" style={{ borderTopColor: theme, borderColor: `${theme}40`, background: `linear-gradient(135deg, ${theme}0D, #10b9810D)` }}>
                    <h3 className="text-lg font-semibold" style={{ color: theme }}>Monthly Summary (All Time)</h3>
                    <div className="mt-3">
                        <MonthlyFuelServiceBarChart rows={monthlyRows} color={theme} />
                    </div>
                </div>
            )}
        </div>
    );
}

