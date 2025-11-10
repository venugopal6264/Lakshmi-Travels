import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ApiFuel } from '../services/api';
import { Edit3, Trash2 } from 'lucide-react';
import { fmtINR, fmtMonthYY, fmtShort } from './common/utils';

// Helper: hex to rgb with fallback to blue if invalid
function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 59, g: 130, b: 246 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
// Date format helper: returns 'DD Mon' (e.g., 05 Nov)
function fmtDayMon(d?: string | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  const day = String(dt.getDate()).padStart(2, '0');
  const mon = dt.toLocaleString('en-US', { month: 'short' });
  return `${day} ${mon}`;
}

/** Donut chart: compares Refueling vs Service totals */
export function CostComparisonDonut({ items, color }: { items: ApiFuel[]; color?: string }) {
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
        {data.parts.map((p: { key: string; value: number; color: string }) => {
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
export function OdometerLine({ items, color }: { items: ApiFuel[]; color?: string }) {
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
export function VehicleDash(props: { vehicle: import('../utils/common/utils').VehicleType; items: import('../services/api').ApiFuel[]; vehicleId?: string | null; vehicleName?: string; color?: string; onEdit?: (e: import('../services/api').ApiFuel) => void; onDelete?: (e: import('../services/api').ApiFuel) => void; }) {
  const { items, vehicleId, color, onEdit, onDelete } = props;
  const theme = color || '#3b82f6';

  const rows = useMemo(() => {
    return [...items]
      .filter(r => !vehicleId || r.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
  }, [items, vehicleId]);

  // Type guard for optional missedPreviousRefuel flag
  function hasMissedPrevRefuel(entry: ApiFuel): entry is ApiFuel & { missedPreviousRefuel?: boolean } {
    return entry != null && typeof entry === 'object' && 'missedPreviousRefuel' in entry;
  }

  // Helper to compute distance between this refuel and the next older refuel
  const computeDistance = useCallback((i: number): number | null => {
    const e = rows[i];
    if (!e || e.entryType !== 'refueling' || typeof e.odometer !== 'number') return null;
    if (hasMissedPrevRefuel(e) && e.missedPreviousRefuel) return null;
    // find next older refuel because rows are in desc order
    let prevOdo: number | null = null;
    for (let j = i + 1; j < rows.length; j++) {
      const prev = rows[j] as import('../services/api').ApiFuel;
      if (prev.entryType !== 'refueling') continue;
      if (vehicleId && prev.vehicleId !== vehicleId) continue;
      if (typeof prev.odometer !== 'number') continue;
      prevOdo = prev.odometer;
      break;
    }
    if (prevOdo == null) return null;
    return Math.max(0, (e.odometer as number) - prevOdo);
  }, [rows, vehicleId]);

  const typeStyles: Record<string, { border: string; bg: string }> = {
    refueling: { border: withAlpha(theme, 0.8), bg: withAlpha(theme, 0.04) },
    service: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    repair: { border: '#ef4444', bg: 'rgba(239,68,68,0.08)' }
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm" style={{ borderColor: withAlpha(theme, 0.25) }}>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full divide-y" style={{ borderColor: withAlpha(theme, 0.2) }}>
          <thead className="bg-gray-50" style={{ background: withAlpha(theme, 0.06) }}>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Type</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Distance (km)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Mileage (km/L)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Odometer (km)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Liters (L)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Price/L (₹)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Amount (₹)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Missed</th>
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: theme }}>Notes</th>
              <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: theme }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((e: import('../services/api').ApiFuel, i: number) => {
              const isRefuel = e.entryType === 'refueling';
              const missed = hasMissedPrevRefuel(e) && !!e.missedPreviousRefuel;
              const dateStr = fmtDayMon(e.date);
              const distance = isRefuel ? computeDistance(i) : null;
              const mileage = isRefuel && distance != null && e.liters != null && e.liters > 0 ? distance / e.liters : null;
              const styleInfo = typeStyles[e.entryType] || typeStyles.refueling;
              return (
                <tr key={e._id || i} className="hover:bg-gray-50 border-l-4" style={{ borderLeftColor: styleInfo.border, backgroundColor: styleInfo.bg }}>
                  <td className="px-3 py-2 text-xs capitalize text-gray-900">{e.entryType}</td>
                  <td className="px-3 py-2 text-xs text-gray-900">{dateStr}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 font-medium">{isRefuel && distance != null ? Math.round(distance).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 font-medium">{isRefuel && mileage != null ? mileage.toFixed(1) : '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-900">{typeof e.odometer === 'number' ? Math.round(e.odometer).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-900">{isRefuel && e.liters != null ? Number(e.liters).toFixed(2) : '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-900">{isRefuel && e.pricePerLiter != null ? Number(e.pricePerLiter).toFixed(2) : '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-900">{typeof e.total === 'number' ? fmtINR(e.total) : '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{isRefuel ? (missed ? 'Yes' : 'No') : '-'}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-600">{e.notes ? e.notes : '-'}</td>
                  <td className="px-3 py-2 text-xs text-right">
                    <div className="inline-flex items-center gap-2">
                      <button title="Edit" aria-label="Edit entry" className="text-indigo-600 hover:text-indigo-700" onClick={() => onEdit?.(e)}><Edit3 className="h-4 w-4" /></button>
                      <button title="Delete" aria-label="Delete entry" className="text-red-600 hover:text-red-700" onClick={() => onDelete?.(e)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

