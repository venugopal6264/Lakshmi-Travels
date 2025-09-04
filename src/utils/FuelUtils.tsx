import { useEffect, useMemo, useRef, useState } from "react";
import { ApiFuel, apiService, FuelSummaryResponse } from "../services/api";
import { Fuel, Gauge, Wrench } from "lucide-react";

export type VehicleType = 'car' | 'bike';

export type FuelEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  vehicle: VehicleType;
  entryType: 'refueling' | 'service';
  odometer?: string;
  liters: string; // keep as string for inputs
  pricePerLiter: string;
  total: string; // auto-calculated
  notes?: string;
};

// NEW: promote MonthRow type for reuse across components
export type MonthRow = {
  year: number;
  month: number; // 0-based
  label: string;
  car: { liters: number; fuelSpend: number; serviceSpend: number };
  bike: { liters: number; fuelSpend: number; serviceSpend: number };
};

// NEW: dependency-free stacked monthly bar chart with tooltips
export function MonthlyFuelServiceBarChart({ rows }: { rows: MonthRow[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // NEW: track container width for responsive layout
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => rows.slice().reverse().map(r => {
    const fuel = (r.car.fuelSpend || 0) + (r.bike.fuelSpend || 0);
    const service = (r.car.serviceSpend || 0) + (r.bike.serviceSpend || 0);
    return {
      key: `${r.year}-${r.month}`,
      label: r.label,
      fuel,
      service,
      total: fuel + service
    };
  }), [rows]);

  const maxTotal = useMemo(() => Math.max(1, ...data.map(d => d.total)), [data]);

  const fuelColor = '#f59e0b';
  // UPDATED: service color as requested
  const serviceColor = 'rgb(121, 85, 72)';

  const barW = 28;
  const gap = 16;
  const padX = 24;
  const padY = 8;
  const chartH = 180;
  const labelH = 24;

  // Base width needed for bars at default sizes
  const innerW = data.length > 0
    ? data.length * barW + Math.max(0, data.length - 1) * gap
    : 0;

  // NEW: responsive target width (grow to fill, keep scroll on smaller screens)
  const containerInnerW = Math.max(0, containerW - padX * 2);
  const innerTargetW = Math.max(innerW, containerInnerW);
  const sx = innerW > 0 ? innerTargetW / innerW : 1;

  const svgW = padX * 2 + innerTargetW;
  const svgH = padY * 2 + chartH + labelH;

  const [tip, setTip] = useState<{ x: number; y: number; title: string; value: string } | null>(null);
  const fmt = (n: number) =>
    `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

  const onMove = (
    e: React.MouseEvent<SVGRectElement>,
    title: string,
    value: number
  ) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0) + 8;
    const y = e.clientY - (rect?.top ?? 0) - 28;
    setTip({ x, y, title, value: fmt(value) });
  };

  const onLeave = () => setTip(null);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH}>
          <g transform={`translate(${padX}, ${padY})`}>
            {/* baseline */}
            <line x1={-8} y1={chartH + 0.5} x2={innerTargetW + 8} y2={chartH + 0.5} stroke="#e5e7eb" strokeWidth={1} />
            {data.map((d, i) => {
              // UPDATED: scale x positions and widths responsively
              const x = i * (barW + gap) * sx;
              const w = barW * sx;
              const fuelH = d.total ? (d.fuel / maxTotal) * chartH : 0;
              const serviceH = d.total ? (d.service / maxTotal) * chartH : 0;
              const fuelY = chartH - fuelH;
              const serviceY = chartH - fuelH - serviceH;
              return (
                <g key={d.key} transform={`translate(${x},0)`}>
                  {/* fuel segment (bottom) */}
                  <rect
                    x={0}
                    y={fuelY}
                    width={w}
                    height={fuelH}
                    fill={fuelColor}
                    rx={2}
                    onMouseMove={(e) => onMove(e, `${d.label} • Fuel`, d.fuel)}
                    onMouseLeave={onLeave}
                  />
                  {/* service segment (top) */}
                  <rect
                    x={0}
                    y={serviceY}
                    width={w}
                    height={serviceH}
                    fill={serviceColor}
                    rx={2}
                    onMouseMove={(e) => onMove(e, `${d.label} • Service`, d.service)}
                    onMouseLeave={onLeave}
                  />
                  {/* NEW: total label on top of the bar */}
                  {d.total > 0 && (
                    <text
                      x={w / 2}
                      y={Math.max(10, serviceY - 4)}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#374151"
                    >
                      {fmt(d.total)}
                    </text>
                  )}
                  {/* month label */}
                  <text
                    x={w / 2}
                    y={chartH + 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded border bg-white px-2 py-1 text-[10px] shadow-sm"
          style={{ left: tip.x, top: tip.y }}
        >
          <div className="font-medium text-gray-800">{tip.title}</div>
          <div className="text-gray-700">{tip.value}</div>
        </div>
      )}
    </div>
  );
}

/** Per-vehicle dashboard: tabs General | Refueling | Service */
export function VehicleDash({ vehicle, items }: { vehicle: VehicleType; items: ApiFuel[] }) {
  const [tab, setTab] = useState<'general' | 'refueling' | 'service'>('general');

  const list = useMemo(() => items.filter(i => i.vehicle === vehicle), [items, vehicle]);
  const sorted = useMemo(
    () => [...list].sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime()),
    [list]
  );

  // Totals and metrics
  const totals = useMemo(() => {
    let total = 0, refuel = 0, service = 0;
    let distance = 0;
    let prevOdo: number | null = null;

    for (const e of sorted) {
      const amt = typeof e.total === 'number' ? e.total : 0;
      total += amt;
      if (e.entryType === 'refueling') refuel += amt;
      if (e.entryType === 'service') service += amt;

      if (typeof e.odometer === 'number') {
        if (prevOdo != null && e.odometer > prevOdo) distance += e.odometer - prevOdo;
        prevOdo = e.odometer;
      }
    }
    const income = 0;
    const balance = total - income;
    const firstDate = sorted[0]?.date ? new Date(sorted[0].date!) : null;
    const lastDate = sorted[sorted.length - 1]?.date ? new Date(sorted[sorted.length - 1].date!) : null;
    const rangeDays =
      firstDate && lastDate ? Math.max(1, Math.ceil((+lastDate - +firstDate) / (1000 * 60 * 60 * 24)) + 1) : 0;
    const byDay = rangeDays ? total / rangeDays : 0;
    const byKm = distance ? total / distance : 0;
    const pct = (p: number, t: number) => (t ? (p / t) * 100 : 0);

    return {
      total, refuel, service, income, balance, distance, byDay, byKm,
      entriesCount: sorted.length,
      firstDate, lastDate, rangeDays,
      refuelPct: pct(refuel, total),
      servicePct: pct(service, total),
      expense: 0,
      expensePct: 0
    };
  }, [sorted]);

  const inr3 = (n = 0) =>
    `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

  const colorBar = vehicle === 'car' ? 'bg-blue-600' : 'bg-green-600';
  const splitIconRefuel = 'text-amber-500';
  const splitIconService = 'text-stone-500';
  const distanceColor = 'text-sky-700';

  return (
    <section className="mt-4">
      {/* Inner tabs */}
      <div className="flex items-center gap-2 border-b mb-6">
        {(['general', 'refueling', 'service'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3 py-2 text-sm font-medium ${tab === t ? 'text-gray-800' : 'text-gray-500'}`}
          >
            {t === 'general' ? 'General' : t === 'refueling' ? 'Refueling' : 'Service'}
            {tab === t && <span className={`absolute left-0 -bottom-px h-0.5 w-full ${colorBar}`} />}
          </button>
        ))}
      </div>

      {/* Header line: N entries (from - to) - Last X days */}
      <div className="text-center text-sm text-gray-600 mb-6">
        {totals.entriesCount} entries{' '}
        {totals.firstDate && totals.lastDate
          ? `(${fmtDate(totals.firstDate)} - ${fmtDate(totals.lastDate)}) - Last ${totals.rangeDays} days`
          : ''}
      </div>

      {tab === 'general' && (
        <div className="space-y-8">
          {/* Balance / Cost / Income */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Balance"
              valueClass="text-red-600"
              value={inr3(totals.balance)}
              byDay={inr3(totals.byDay)}
              byKm={inr3(totals.byKm)}
            />
            <MetricCard
              title="Cost"
              valueClass="text-red-600"
              value={inr3(totals.total)}
              byDay={inr3(totals.byDay)}
              byKm={inr3(totals.byKm)}
            />
          </div>

          {/* Cost split */}
          <div>
            <h4 className="text-gray-800 font-semibold mb-4">Cost split</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SplitItem
                icon={<Fuel className={`h-6 w-6 ${splitIconRefuel}`} />}
                label="Refueling"
                amount={inr3(totals.refuel)}
                percent={`${totals.refuelPct.toFixed(2)}%`}
              />
              <SplitItem
                icon={<Wrench className={`h-6 w-6 ${splitIconService}`} />}
                label="Services"
                amount={inr3(totals.service)}
                percent={`${totals.servicePct.toFixed(2)}%`}
              />
            </div>
          </div>

          {/* Distance */}
          <div>
            <h4 className="text-gray-800 font-semibold mb-3">Distance</h4>
            <div className="rounded-lg border p-4 bg-white">
              <div className="text-sm text-gray-600">Total</div>
              <div className={`text-3xl font-semibold ${distanceColor} flex items-center gap-2`}>
                <Gauge className="h-5 w-5 text-sky-500" />
                {totals.distance.toLocaleString()} km
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {Math.round((totals.distance / Math.max(1, totals.rangeDays)) * 100) / 100} km by day
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'refueling' && (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${vehicle === 'car' ? 'divide-blue-200' : 'divide-green-200'}`}>
            <thead className={vehicle === 'car' ? 'bg-blue-600' : 'bg-green-600'}>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Odometer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Liters</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Total</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Mileage (km/L)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <FuelTableBody items={items} vehicle={vehicle} onlyType="refueling" />
            <FuelTableFooter items={items} vehicle={vehicle} onlyType="refueling" />
          </table>
        </div>
      )}

      {tab === 'service' && (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${vehicle === 'car' ? 'divide-blue-200' : 'divide-green-200'}`}>
            <thead className={vehicle === 'car' ? 'bg-blue-600' : 'bg-green-600'}>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Odometer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Liters</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Total</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Mileage (km/L)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <FuelTableBody items={items} vehicle={vehicle} onlyType="service" />
            <FuelTableFooter items={items} vehicle={vehicle} onlyType="service" />
          </table>
        </div>
      )}
    </section>
  );
}

export function MetricCard({
  title,
  value,
  valueClass,
  byDay,
  byKm
}: { title: string; value: string; valueClass?: string; byDay: string; byKm: string }) {
  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="text-sm text-gray-600">{title}</div>
      <div className={`text-3xl font-semibold ${valueClass ?? 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{byDay} By day</div>
      <div className="text-xs text-gray-500">{byKm} By km</div>
    </div>
  );
}

export function SplitItem({ icon, label, amount, percent }: { icon: React.ReactNode; label: string; amount: string; percent: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
        {icon}
      </div>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-lg font-semibold text-gray-900">{amount}</div>
        <div className="text-xs text-amber-600">{percent}</div>
      </div>
    </div>
  );
}

export function FuelSummarySection(
  { items }: { items?: ApiFuel[] } = {}
) {
  const [summary, setSummary] = useState<FuelSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // NEW: source for monthly charts (prefer props, else best-effort fetch)
  const [allItems, setAllItems] = useState<ApiFuel[] | null>(items ?? null);
  useEffect(() => { setAllItems(items ?? null); }, [items]);
  useEffect(() => {
    if (!items && allItems === null) {
      (async () => {
        try {
          const res = await apiService.getFuel();
          setAllItems(res as ApiFuel[]);
        } catch (ex) {
          console.log('Failed to load all fuel entries', ex);
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

  // NEW (moved up): build monthly rows from the start of records
  const monthLabel = (y: number, mZero: number) =>
    new Date(y, mZero, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });

  const monthlyRows: MonthRow[] = useMemo(() => {
    const src = (allItems ?? []);
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
          car: { liters: 0, fuelSpend: 0, serviceSpend: 0 },
          bike: { liters: 0, fuelSpend: 0, serviceSpend: 0 }
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
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
  }, [allItems]);

  // Early returns now happen after all hooks above
  if (loading) return null;
  if (error) return <p className="text-red-500 text-sm mt-6">{error}</p>;
  if (!summary) return null;

  // Remove old TimelineChart and render the new stacked bar chart
  return (
    <div className="mt-10 space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Summary</h3>

      {monthlyRows.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-gray-800">Monthly (since start)</h3>
          <MonthlyFuelServiceBarChart rows={monthlyRows} />
        </>
      )}
    </div>
  );
}

/** UPDATED: Body now supports optional onlyType filter (refueling | service) */
export function FuelTableBody({
  items,
  vehicle,
  onlyType
}: { items: ApiFuel[]; vehicle: 'car' | 'bike'; onlyType?: ApiFuel['entryType'] }) {
  // Filter once and compute mileage in O(n)
  const list = useMemo(
    () => items.filter(i => i.vehicle === vehicle && (!onlyType || i.entryType === onlyType)),
    [items, vehicle, onlyType]
  );
  const mileageArr = useMemo(() => {
    const n = list.length;
    const olderOdo: Array<number | null> = new Array(n).fill(null);
    let lastSeenOdo: number | null = null; // walking from end (oldest) to start (newest)
    for (let i = n - 1; i >= 0; i--) {
      olderOdo[i] = lastSeenOdo;
      if (typeof list[i].odometer === 'number') lastSeenOdo = list[i].odometer as number;
    }
    const out: string[] = new Array(n).fill('');
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (e.entryType === 'refueling' && typeof e.liters === 'number' && e.liters > 0 && typeof e.odometer === 'number' && typeof olderOdo[i] === 'number') {
        const dist = (e.odometer as number) - (olderOdo[i] as number);
        if (dist > 0) out[i] = (Math.round((dist / (e.liters as number)) * 100) / 100).toString();
      }
    }
    return out;
  }, [list]);

  const tbodyClass = vehicle === 'car'
    ? 'divide-y divide-blue-100'
    : 'divide-y divide-green-100';
  const rowClass = vehicle === 'car'
    ? 'odd:bg-blue-50 even:bg-blue-100 hover:bg-blue-200'
    : 'odd:bg-green-50 even:bg-green-100 hover:bg-green-200';
  const typeBadge = (t: ApiFuel['entryType']) =>
    t === 'refueling'
      ? 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800'
      : 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800';

  return (
    <tbody className={tbodyClass}>
      {list.map((e, idx) => (
        <tr key={e._id} className={rowClass}>
          <td className="px-4 py-2 whitespace-nowrap">{e.date?.slice(0, 10)}</td>
          <td className="px-4 py-2 whitespace-nowrap capitalize"><span className={typeBadge(e.entryType)}>{e.entryType}</span></td>
          <td className="px-4 py-2 whitespace-nowrap">{e.odometer ?? ''}</td>
          <td className="px-4 py-2 whitespace-nowrap">{e.liters ?? ''}</td>
          <td className="px-4 py-2 whitespace-nowrap">{e.pricePerLiter ?? ''}</td>
          <td className="px-4 py-2 whitespace-nowrap">{e.total ?? ''}</td>
          <td className="px-4 py-2 whitespace-nowrap">{mileageArr[idx]}</td>
          <td className="px-4 py-2">{e.notes ?? ''}</td>
        </tr>
      ))}
    </tbody>
  );
}

/** UPDATED: Footer respects onlyType to show matching totals */
export function FuelTableFooter({
  items,
  vehicle,
  onlyType
}: { items: ApiFuel[]; vehicle: 'car' | 'bike'; onlyType?: ApiFuel['entryType'] }) {
  const totals = useMemo(() => {
    let fuelTotal = 0;
    let serviceTotal = 0;
    for (const e of items) {
      if (e.vehicle !== vehicle) continue;
      if (typeof e.total === 'number') {
        if (e.entryType === 'refueling') fuelTotal += e.total;
        else if (e.entryType === 'service') serviceTotal += e.total;
      }
    }
    return { fuelTotal, serviceTotal };
  }, [items, vehicle]);

  const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString();
  const tClass = vehicle === 'car' ? 'bg-blue-50 text-blue-900' : 'bg-green-50 text-green-900';
  const badge = vehicle === 'car' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

  return (
    <tfoot>
      <tr className={tClass}>
        <td className="px-4 py-2" colSpan={5}>
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
            {onlyType === 'refueling' && <div>Fuel: ₹{fmt(totals.fuelTotal)}</div>}
            {onlyType === 'service' && <div>Service: ₹{fmt(totals.serviceTotal)}</div>}
          </div>
        </td>
        <td className="px-4 py-2" colSpan={2}></td>
      </tr>
    </tfoot>
  );
}

function fmtDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

