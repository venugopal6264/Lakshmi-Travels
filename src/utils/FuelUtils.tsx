import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ApiFuel, apiService, FuelSummaryResponse } from "../services/api";
import { Fuel, Gauge, Wrench, Pencil, Trash2 } from "lucide-react";

export type VehicleType = 'car' | 'bike';

export type FuelEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  vehicle: VehicleType;
  entryType: 'refueling' | 'service' | 'repair';
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
  car: { liters: number; fuelSpend: number; serviceSpend: number; repairSpend: number };
  bike: { liters: number; fuelSpend: number; serviceSpend: number; repairSpend: number };
};

// Simple INR formatter used across charts
const fmtINR = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

// Short number formatter for axis ticks (e.g., 24.8k, 1.2M)
const fmtShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${Math.round(n / 1e6)}M`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return Math.round(n).toLocaleString();
};

// Compact month label e.g., Jan ’25
const fmtMonthYY = (ts: number) => {
  const d = new Date(ts);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const yy = String(d.getFullYear()).slice(-2);
  return `${month} ’${yy}`;
};

/** Donut chart: compares Refueling vs Service totals */
function CostComparisonDonut({ items }: { items: ApiFuel[] }) {
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
    return {
      parts: [
        { key: 'Refueling', value: refuel, color: '#10b981' }, // emerald-500
        { key: 'Service', value: service, color: '#1a80bb' },  // user-specified blue
      ], total
    } as const;
  }, [items]);

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
function OdometerLine({ items }: { items: ApiFuel[] }) {
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

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-600"><span className="h-0.5 w-6 bg-cyan-500" />Odometer (km)</div>
      <svg width={width} height={height}>
        {/* grid */}
        {yTicks.map((ty, i) => (
          <g key={i}>
            <line x1={pad.l} y1={y(ty)} x2={width - pad.r} y2={y(ty)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={pad.l - 6} y={y(ty)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#6b7280">{fmtShort(ty)}</text>
          </g>
        ))}
        {/* line */}
        <path d={d} fill="none" stroke="#06b6d4" strokeWidth={2.5} />
        {/* points */}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.x)} cy={y(p.y)} r={2.5} fill="#06b6d4" />
        ))}
        {/* crosshair */}
        {cross && (
          <g>
            <line x1={cross.x} y1={pad.t} x2={cross.x} y2={pad.t + innerH} stroke="#94a3b8" strokeDasharray="3,3" />
            <circle cx={cross.x} cy={cross.y} r={3} fill="#06b6d4" />
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
    const repair = (r.car.repairSpend || 0) + (r.bike.repairSpend || 0);
    const monthShort = new Date(r.year, r.month, 1).toLocaleString('en-US', { month: 'short' });
    return {
      key: `${r.year}-${r.month}`,
      label: r.label,
      monthShort,
      year: r.year,
      fuel,
      service,
      repair,
      total: fuel + service + repair
    };
  }), [rows]);

  const maxTotal = useMemo(() => Math.max(1, ...data.map(d => d.total)), [data]);

  // Custom palette: Fuel=Blue, Service=Orange, Repair=Gray
  const fuelColor = '#1a80bb';      // Blue
  const fuelStroke = '#166a99';     // Darker Blue for border
  const serviceColor = '#ea801c';   // Orange
  const serviceStroke = '#b06014';  // Darker Orange for border
  const repairColor = '#b8b8b8';    // Gray
  const repairStroke = '#8a8a8a';   // Darker Gray for border

  const barW = 28;
  const gap = 16;
  const padX = 24;
  const padY = 8;
  const chartH = 240;
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
  const fmt = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

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

  const isCompact = containerW > 0 && containerW < 480; // treat small widths as mobile

  return (
    <div ref={wrapperRef} className="relative">
      {/* Legend */}
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: fuelColor, border: `1px solid ${fuelStroke}` }} />
          Fuel
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: serviceColor, border: `1px solid ${serviceStroke}` }} />
          Service
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: repairColor, border: `1px solid ${repairStroke}` }} />
          Repair
        </span>
      </div>
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
              const repairH = d.total ? (d.repair / maxTotal) * chartH : 0;
              const fuelY = chartH - fuelH;
              const serviceY = fuelY - serviceH;
              const repairY = serviceY - repairH;
              return (
                <g key={d.key} transform={`translate(${x},0)`}>
                  {/* fuel segment (bottom) */}
                  <rect
                    x={0}
                    y={fuelY}
                    width={w}
                    height={fuelH}
                    fill={fuelColor}
                    stroke={fuelStroke}
                    strokeWidth={0.75}
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
                    stroke={serviceStroke}
                    strokeWidth={0.75}
                    rx={2}
                    onMouseMove={(e) => onMove(e, `${d.label} • Service`, d.service)}
                    onMouseLeave={onLeave}
                  />
                  {/* repair segment (top) */}
                  {repairH > 0 && (
                    <rect
                      x={0}
                      y={repairY}
                      width={w}
                      height={repairH}
                      fill={repairColor}
                      stroke={repairStroke}
                      strokeWidth={0.75}
                      rx={2}
                      onMouseMove={(e) => onMove(e, `${d.label} • Repair`, d.repair)}
                      onMouseLeave={onLeave}
                    />
                  )}
                  {/* Total label inside bar (vertical) */}
                  {d.total > 0 && (fuelH + serviceH + repairH) >= 44 && (
                    <g transform={`translate(${w / 2}, ${chartH - (fuelH + serviceH + repairH) / 2}) rotate(-90)`}>
                      <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="10"
                        fill="#ffffff"
                      >
                        {fmt(d.total)}
                      </text>
                    </g>
                  )}
                  {/* month label */}
                  <text
                    x={w / 2}
                    y={chartH + 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {isCompact ? d.monthShort : d.label}
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
export function VehicleDash({ vehicle, vehicleId, vehicleName, items, onEdit, onDelete }: { vehicle: VehicleType; vehicleId?: string | null; vehicleName?: string | null; items: ApiFuel[]; onEdit?: (e: ApiFuel) => void; onDelete?: (e: ApiFuel) => void }) {
  const [tab, setTab] = useState<'general' | 'refueling' | 'service'>('general');

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


  return (
    <section className="mt-4">
      {/* Inner tabs - pill style with icons, cohesive colors */}
      {(() => {
        const isCar = vehicle === 'car';
        const tabBase = 'flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition';
        const activeBg = isCar ? 'bg-blue-600 text-white shadow-sm' : 'bg-green-600 text-white shadow-sm';
        const idleBg = isCar ? 'text-blue-700 hover:bg-blue-50' : 'text-green-700 hover:bg-green-50';
        const tabCls = (t: 'general' | 'refueling' | 'service') => (tab === t ? `${tabBase} ${activeBg}` : `${tabBase} ${idleBg}`);
        const iconCls = (t: 'general' | 'refueling' | 'service') => (tab === t ? 'h-4 w-4 text-white' : (isCar ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-green-600'));

        return (
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-1 ring-1 ring-gray-200">
              {(['general', 'refueling', 'service'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={tabCls(t)}>
                  {t === 'general' && <Gauge className={iconCls(t)} />}
                  {t === 'refueling' && <Fuel className={iconCls(t)} />}
                  {t === 'service' && <Wrench className={iconCls(t)} />}
                  <span>{t === 'general' ? 'General' : t === 'refueling' ? 'Refueling' : 'Service'}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {tab === 'general' && (
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

          {/* Charts: Cost comparison (donut) and Odometer line */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="bg-white rounded-lg shadow-md p-4 border-t-4 border-t-amber-500">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Cost comparison chart</h3>
              <CostComparisonDonut items={sorted} />
            </div>
            <div className="bg-white rounded-lg shadow-md px-4 pt-4 pb-0 border-t-4 border-t-sky-500">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Odometer chart</h3>
              <OdometerLine items={sorted} />
            </div>
          </div>
        </div>
      )}

      {tab === 'refueling' && (
        <div className={`bg-white rounded-lg shadow-md p-0 overflow-hidden border-t-4 ${vehicle === 'car' ? 'border-blue-500' : 'border-green-500'}`}>
          <div className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 text-white flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Fuel className="w-5 h-5" />
              Refueling History
            </h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${vehicle === 'car' ? 'divide-blue-200' : 'divide-green-200'}`}>
                <thead className={vehicle === 'car' ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200' : 'bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200'}>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Mileage (km/L)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Odometer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Liters</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notes</th>
                    {(onEdit || onDelete) && <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <FuelTableBody items={items} vehicle={vehicle} onlyType="refueling" onEdit={onEdit} onDelete={onDelete} />
                <FuelTableFooter items={items} vehicle={vehicle} onlyType="refueling" />
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'service' && (
        <div className={`bg-white rounded-lg shadow-md p-0 overflow-hidden border-t-4 ${vehicle === 'car' ? 'border-blue-500' : 'border-green-500'}`}>
          <div className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 text-white flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Service History
            </h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${vehicle === 'car' ? 'divide-blue-200' : 'divide-green-200'}`}>
                <thead className={vehicle === 'car' ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200' : 'bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200'}>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Mileage (km/L)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Odometer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Liters</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notes</th>
                    {(onEdit || onDelete) && <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <FuelTableBody items={items} vehicle={vehicle} onlyType="service" onEdit={onEdit} onDelete={onDelete} />
                <FuelTableFooter items={items} vehicle={vehicle} onlyType="service" />
              </table>
            </div>
          </div>
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

  return (
    <div className="mt-10">
      {monthlyRows.length > 0 && (
        <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-green-50 p-4 border-t-4 border-t-indigo-500">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Monthly Summary (All Time)</h3>
          <div className="mt-3">
            <MonthlyFuelServiceBarChart rows={monthlyRows} />
          </div>
        </div>
      )}
    </div>
  );
}

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
      if (e.entryType === 'refueling' && typeof e.liters === 'number' && e.liters > 0 && typeof curr === 'number' && typeof prev === 'number') {
        const dist = curr - prev;
        if (dist > 0) out[i].mileage = dist / (e.liters as number);
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
      : (t === 'service'
        ? 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800'
        : 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800');

  return (
    <>
      <tbody className={tbodyClass}>
        {list.map((e, idx) => {
          const mileageCell = (
            <td className="px-4 py-2 whitespace-nowrap">
              {(() => {
                const row = mileageArr[idx];
                if (!row || row.mileage == null || row.prev == null || row.curr == null) return '';
                const distance = row.curr - row.prev;
                if (distance <= 0) return '';
                return `${Math.round(distance).toLocaleString()} km - ${Math.round(row.mileage).toLocaleString()}`;
              })()}
            </td>
          );
          return (
            <tr key={e._id} className={rowClass}>
              <td className="px-4 py-2 whitespace-nowrap">{e.date?.slice(0, 10)}</td>
              {onlyType ? (
                <>
                  {onlyType === 'service' && (
                    <td className="px-4 py-2 whitespace-nowrap capitalize">
                      <span className={typeBadge(e.entryType)}>{e.entryType}</span>
                    </td>
                  )}
                  {mileageCell}
                  <td className="px-4 py-2 whitespace-nowrap">{e.odometer != null ? Math.round(Number(e.odometer)).toLocaleString() : ''}</td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 whitespace-nowrap capitalize"><span className={typeBadge(e.entryType)}>{e.entryType}</span></td>
                  <td className="px-4 py-2 whitespace-nowrap">{e.odometer != null ? Math.round(Number(e.odometer)).toLocaleString() : ''}</td>
                </>
              )}
              <td className="px-4 py-2 whitespace-nowrap">{e.liters != null ? Math.round(Number(e.liters)).toLocaleString() : ''}</td>
              <td className="px-4 py-2 whitespace-nowrap">{e.pricePerLiter != null ? Math.round(Number(e.pricePerLiter)).toLocaleString() : ''}</td>
              <td className="px-4 py-2 whitespace-nowrap">{e.total != null ? Math.round(Number(e.total)).toLocaleString() : ''}</td>
              {!onlyType && mileageCell}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setToDelete(null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border bg-white shadow-lg">
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
        else if (e.entryType === 'service' || e.entryType === 'repair') serviceTotal += e.total;
      }
    }
    return { fuelTotal, serviceTotal };
  }, [items, vehicle]);

  const fmt = (n: number) => Math.round(n).toLocaleString();
  const tClass = vehicle === 'car' ? 'bg-blue-50 text-blue-900' : 'bg-green-50 text-green-900';
  const badge = vehicle === 'car' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

  return (
    <tfoot>
      <tr className={tClass}>
        <td className="px-4 py-2" colSpan={onlyType ? 6 : 5}>
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
            {onlyType === 'service' && <div>Service/Repair: ₹{fmt(totals.serviceTotal)}</div>}
          </div>
        </td>
        <td className="px-4 py-2" colSpan={2}></td>
      </tr>
    </tfoot>
  );
}

// removed unused fmtDate

