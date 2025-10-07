import { useEffect, useMemo, useRef, useState } from "react";
import { ApiFuel } from "../services/api";
import { Fuel, Gauge, Wrench } from "lucide-react";
import { fmtINR, fmtMonthYY, fmtShort, VehicleType } from "./common/utils";
import { FuelTableBody, FuelTableFooter } from "./Fueltable";

/** Donut chart: compares Refueling vs Service totals */
function CostComparisonDonut({ items, color }: { items: ApiFuel[]; color?: string }) {
  // Measure container for responsive sizing
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tooltip state
  const [tip, setTip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);
  const showTip = (e: React.MouseEvent, label: string, value: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0) + 8;
    const y = e.clientY - (rect?.top ?? 0) - 28;
    setTip({ x, y, label, value: fmtINR(value) });
  };
  const hideTip = () => setTip(null);

  const data = useMemo(() => {
    let refuel = 0, service = 0;
    for (const e of items) {
      const t = typeof e.total === 'number' ? e.total : 0;
      if (e.entryType === 'refueling') refuel += t;
      else if (e.entryType === 'service' || e.entryType === 'repair') service += t;
    }
    const total = refuel + service;
    const theme = color || '#10b981';
    const alt = '#1a80bb';
    return {
      parts: [
        { key: 'Refueling', value: refuel, color: theme },
        { key: 'Service', value: service, color: alt },
      ], total
    } as const;
  }, [items, color]);

  // Responsive size (min 180, max 360)
  const size = Math.max(180, Math.min(containerW || 220, 360));
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36; // ring radius ~36% of size
  const strokeW = Math.max(16, Math.min(size * 0.13, 36)); // thickness scales with size
  const C = 2 * Math.PI * r;
  let offset = 0;

  // Avoid NaNs in stroke-dasharray when total is 0
  const safeTotal = data.total > 0 ? data.total : 1;

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center w-full">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* base track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeW} />
        {data.parts.map((p) => {
          const seg = (p.value / safeTotal) * C;
          const dash = `${seg} ${C - seg}`;
          const rotation = (offset / C) * 360 - 90; // start at top
          offset += seg;
          return (
            <g key={p.key} transform={`rotate(${rotation}, ${cx}, ${cy})`}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={p.color}
                strokeWidth={strokeW}
                strokeDasharray={dash}
                strokeLinecap="butt"
                onMouseMove={(e) => { if (p.value > 0) showTip(e, p.key, p.value); }}
                onMouseLeave={hideTip}
              />
            </g>
          );
        })}
        {/* center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="#374151">Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="16" fontWeight={600} fill="#111827">{fmtINR(data.total)}</text>
      </svg>
      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-700">
        {data.parts.map(p => (
          <span key={p.key} className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.key} - {fmtINR(p.value)}
          </span>
        ))}
      </div>
      {tip && (
        <div className="pointer-events-none absolute z-10 rounded border bg-white px-2 py-1 text-[10px] shadow-sm" style={{ left: tip.x, top: tip.y }}>
          <div className="font-medium text-gray-800">{tip.label}</div>
          <div className="text-gray-700">{tip.value}</div>
        </div>
      )}
    </div>
  );
}

/** Odometer line chart: plots odometer vs date with simple grid */
function OdometerLine({ items, color }: { items: ApiFuel[]; color?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; value: string } | null>(null);
  const [cross, setCross] = useState<{ x: number; y: number } | null>(null);
  const show = (e: React.MouseEvent, title: string, value: string) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0) + 8;
    const y = e.clientY - (rect?.top ?? 0) - 28;
    setTip({ x, y, title, value });
  };
  const hide = () => setTip(null);

  const points = useMemo(() => {
    const withOdo = items.filter(e => typeof e.odometer === 'number' && !!e.date).map(e => ({
      x: new Date(e.date!).getTime(),
      y: Number(e.odometer)
    }));
    const sorted = withOdo.sort((a, b) => a.x - b.x);
    return sorted;
  }, [items]);

  const width = Math.max(300, Math.min(containerW || 420, 1000));
  const height = 200;
  const pad = { l: 40, r: 12, t: 12, b: 4 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  if (points.length === 0) return <div className="text-sm text-gray-500">No odometer data</div>;

  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  // add small padding so the path doesn't hug the edges
  const xPad = spanX * 0.03;
  const yPad = Math.max(1, spanY * 0.07);
  const minXp = minX - xPad;
  const maxXp = maxX + xPad;
  const minYp = Math.max(0, minY - yPad);
  const maxYp = maxY + yPad;
  const spanXp = Math.max(1, maxXp - minXp);
  const spanYp = Math.max(1, maxYp - minYp);
  const x = (vx: number) => pad.l + ((vx - minXp) / spanXp) * innerW;
  const y = (vy: number) => pad.t + innerH - ((vy - minYp) / spanYp) * innerH;

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.x)} ${y(p.y)}`).join(' ');

  // horizontal gridlines (5)
  const ticks = 5;
  const yTicks = new Array(ticks).fill(0).map((_, i) => minYp + (i * spanYp) / (ticks - 1));

  // Helpers
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const onMove = (e: React.MouseEvent) => {
    if (points.length === 0) return;
    const rect = (e.currentTarget as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
    const mx = e.clientX - (rect?.left ?? 0);
    const cx = clamp(mx, pad.l, width - pad.r);
    // find nearest point by x distance in screen coords
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const sx = x(points[i].x);
      const d = Math.abs(sx - cx);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const px = x(points[bestIdx].x);
    const py = y(points[bestIdx].y);
    setCross({ x: px, y: py });
    show(e, new Date(points[bestIdx].x).toISOString().slice(0, 10), `${Math.round(points[bestIdx].y).toLocaleString()} km`);
  };
  const onLeave = () => { setCross(null); hide(); };

  const stroke = color || '#06b6d4';
  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-600"><span className="h-0.5 w-6" style={{ backgroundColor: stroke }} />Odometer (km)</div>
      <svg width={width} height={height}>
        {/* grid */}
        {yTicks.map((ty, i) => (
          <g key={i}>
            <line x1={pad.l} y1={y(ty)} x2={width - pad.r} y2={y(ty)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={pad.l - 6} y={y(ty)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#6b7280">{fmtShort(ty)}</text>
          </g>
        ))}
        {/* line */}
        <path d={d} fill="none" stroke={stroke} strokeWidth={2.5} />
        {/* points */}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.x)} cy={y(p.y)} r={2.5} fill={stroke} />
        ))}
        {/* crosshair */}
        {cross && (
          <g>
            <line x1={cross.x} y1={pad.t} x2={cross.x} y2={pad.t + innerH} stroke="#94a3b8" strokeDasharray="3,3" />
            <circle cx={cross.x} cy={cross.y} r={3} fill={stroke} />
          </g>
        )}
        {/* x-axis ticks (min/mid/max) */}
        {([minX, minX + spanX / 2, maxX] as number[]).map((tx, i) => (
          <text key={i} x={x(tx)} y={height - 1} textAnchor="middle" fontSize="10" fill="#6b7280">{fmtMonthYY(tx)}</text>
        ))}
        {/* hover overlay */}
        <rect x={pad.l} y={pad.t} width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={onLeave} />
      </svg>
      {tip && (
        <div className="pointer-events-none absolute z-10 rounded border bg-white px-2 py-1 text-[10px] shadow-sm" style={{ left: tip.x, top: tip.y }}>
          <div className="font-medium text-gray-800">{tip.title}</div>
          <div className="text-gray-700">{tip.value}</div>
        </div>
      )}
    </div>
  );
}

/** Per-vehicle dashboard: tabs General | Refueling | Service */
export function VehicleDash({ vehicle, vehicleId, vehicleName, items, onEdit, onDelete, color }: {
  vehicle: VehicleType;
  vehicleId?: string | null;
  vehicleName?: string | null;
  items: ApiFuel[];
  onEdit?: (e: ApiFuel) => void;
  onDelete?: (e: ApiFuel) => void;
  color?: string;
}) {
  const list = useMemo(() => items.filter(i => {
    if (i.vehicle !== vehicle) return false;
    if (vehicleId) return i.vehicleId === vehicleId;
    if (vehicleName) return (i.vehicleName || '').toLowerCase() === vehicleName.toLowerCase();
    return true;
  }), [items, vehicle, vehicleId, vehicleName]);
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
      if (e.entryType === 'service' || e.entryType === 'repair') service += amt;

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
      servicePct: pct(service, total)
    };
  }, [sorted]);

  // Latest service or repair entry for this vehicle
  const lastService = useMemo(() => {
    const svc = sorted.filter(e => e.entryType === 'service' || e.entryType === 'repair');
    if (!svc.length) return null;
    // sorted is ascending by date, so last element with service/repair may not be at end if last entries are refueling; find max date
    let latest = svc[0];
    let latestTime = new Date(latest.date || 0).getTime();
    for (const e of svc) {
      const t = new Date(e.date || 0).getTime();
      if (t > latestTime) { latest = e; latestTime = t; }
    }
    return latest;
  }, [sorted]);
  const lastServiceDaysAgo = useMemo(() => {
    if (!lastService || !lastService.date) return null;
    const ms = Date.now() - new Date(lastService.date).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }, [lastService]);

  const inr3 = (n = 0) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;


  const themeColor = color || (vehicle === 'car' ? '#ef4444' : '#16a34a');
  return (
    <section className="mt-4">
      <div>
        {/* Single colorful row: Cost, Refueling, Services, Distance */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">

          {/* Cost */}
          <div className="rounded-lg border p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 border-t-4 border-t-indigo-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-700">Cost</span>
            </div>
            <div className="mt-1 text-3xl font-semibold text-indigo-700">{inr3(totals.total)}</div>
            <div className="text-xs text-indigo-600 mt-1">All time</div>
          </div>

          {/* Refueling */}
          <div className="rounded-lg border p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 border-t-4 border-t-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-700 inline-flex items-center gap-2">
                <Fuel className="h-4 w-4 text-amber-600" /> Refueling
              </span>
            </div>
            <div className="mt-1 text-3xl font-semibold text-amber-700">{inr3(totals.refuel)}</div>
            <div className="text-xs text-amber-600 mt-1">{Math.round(totals.refuelPct)}% of total</div>
          </div>

          {/* Services */}
          <div className="rounded-lg border p-4 bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 border-fuchsia-200 border-t-4 border-t-fuchsia-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-fuchsia-700 inline-flex items-center gap-2">
                <Wrench className="h-4 w-4 text-fuchsia-600" /> Services
              </span>
            </div>
            <div className="mt-1 text-3xl font-semibold text-fuchsia-700">{inr3(totals.service)}</div>
            <div className="text-xs text-fuchsia-600 mt-1">{Math.round(totals.servicePct)}% of total</div>
          </div>

          {/* Distance */}
          <div className="rounded-lg border p-4 bg-gradient-to-br from-sky-50 to-blue-50 border-blue-200 border-t-4 border-t-sky-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-sky-700 inline-flex items-center gap-2">
                <Gauge className="h-4 w-4 text-sky-600" /> Distance
              </span>
            </div>
            <div className="mt-1 text-3xl font-semibold text-sky-700">{Math.round(totals.distance).toLocaleString()} km</div>
            <div className="text-xs text-sky-600 mt-1">{Math.round(totals.distance / Math.max(1, totals.rangeDays))} km by day</div>
          </div>

          {/* Last Service / Repair */}
          <div className="rounded-lg border p-4 bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200 col-span-1 border-t-4 border-t-rose-500">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-rose-700 inline-flex items-center gap-2">
                <Wrench className="h-4 w-4 text-rose-600" /> Last Service
              </span>
            </div>
            {lastService ? (
              <div className="mt-1 space-y-1">
                <div className="text-lg font-semibold text-rose-700">{new Date(lastService.date!).toISOString().slice(0, 10)}</div>
                <div className="text-sm text-rose-700">₹{Math.round(Number(lastService.total) || 0).toLocaleString('en-IN')} • <span className="capitalize">{lastService.entryType}</span></div>
                {lastServiceDaysAgo != null && <div className="text-[11px] text-rose-600">{lastServiceDaysAgo === 0 ? 'Today' : `${lastServiceDaysAgo} day${lastServiceDaysAgo === 1 ? '' : 's'} ago`}</div>}
                {lastService.notes && <div className="text-[11px] text-rose-500 line-clamp-2">{lastService.notes}</div>}
              </div>
            ) : (
              <div className="mt-1 text-sm text-rose-600">No service/repair yet</div>
            )}
          </div>
        </div>

        <div className={`bg-white mt-6 rounded-lg shadow-md p-0 overflow-hidden border-t-4`} style={{ borderTopColor: themeColor }}>
          <div className={`px-6 py-3 text-white flex items-center justify-between`} style={{ background: themeColor }}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Fuel className="w-5 h-5" />
              Refueling History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y`} style={{ borderColor: themeColor }}>
              <thead style={{ background: `${themeColor}1A`, borderBottom: `1px solid ${themeColor}` }}>
                <tr>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Date</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Mileage (km/L)</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Odometer</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Liters</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Price</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Total</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Notes</th>
                  {(onEdit || onDelete) && <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Actions</th>}
                </tr>
              </thead>
              <FuelTableBody items={items} vehicle={vehicle} onlyType="refueling" onEdit={onEdit} onDelete={onDelete} />
              <FuelTableFooter items={items} vehicle={vehicle} onlyType="refueling" hasActions={Boolean(onEdit || onDelete)} />
            </table>
          </div>
        </div>

        {/* Charts: Cost comparison (donut) and Odometer line */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <div className="bg-white rounded-lg shadow-md p-4 border-t-4" style={{ borderTopColor: themeColor }}>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Cost comparison chart</h3>
            <CostComparisonDonut items={sorted} color={themeColor} />
          </div>
          <div className="bg-white rounded-lg shadow-md px-4 pt-4 pb-0 border-t-4" style={{ borderTopColor: themeColor }}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">Odometer chart</h3>
            <OdometerLine items={sorted} color={themeColor} />
          </div>
        </div>
      </div>
      <div className={`bg-white mt-6 rounded-lg shadow-md p-0 overflow-hidden border-t-4`} style={{ borderTopColor: themeColor }}>
        <div className={`px-6 py-3 text-white flex items-center justify-between`} style={{ background: themeColor }}>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Service History
          </h3>
        </div>
        <>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y`} style={{ borderColor: themeColor }}>
              <thead style={{ background: `${themeColor}1A`, borderBottom: `1px solid ${themeColor}` }}>
                <tr>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Date</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Type</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Odometer</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Total</th>
                  <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Notes</th>
                  {(onEdit || onDelete) && <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider`} style={{ color: themeColor }}>Actions</th>}
                </tr>
              </thead>
              <FuelTableBody items={items} vehicle={vehicle} onlyType="service" onEdit={onEdit} onDelete={onDelete} />
              <FuelTableFooter items={items} vehicle={vehicle} onlyType="service" hasActions={Boolean(onEdit || onDelete)} />
            </table>
          </div>
        </>
      </div>
    </section>
  );
}

