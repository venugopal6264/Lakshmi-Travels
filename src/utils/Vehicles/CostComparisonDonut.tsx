import { useRef, useState, useEffect, useMemo } from "react";
import { ApiFuel } from "../../services/api";
import { fmtINR } from "../common/utils";

/** Donut chart: compares Refueling vs Service totals */
const CostComparisonDonut = ({ items, color }: { items: ApiFuel[]; color?: string }) => {
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
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700">
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
};

export default CostComparisonDonut;