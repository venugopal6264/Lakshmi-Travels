import { useRef, useState, useEffect, useMemo } from "react";
import { ApiFuel } from "../../services/api";
import { fmtINR } from "../common/utils";

/** Horizontal bar chart: compares Refueling vs Service totals */
const CostComparisonHorizontalBar = ({ items, color }: { items: ApiFuel[]; color?: string }) => {
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
                { key: 'Refueling', value: refuel, color: theme, stroke: theme },
                { key: 'Service', value: service, color: alt, stroke: alt },
            ],
            total,
            maxValue: Math.max(refuel, service)
        } as const;
    }, [items, color]);

    const barH = 48;
    const gap = 16;
    const padY = 24;
    const padX = 8;
    const labelW = 100;
    const chartW = Math.max(300, containerW - labelW - padX * 2 - 100);

    const svgH = padY * 2 + data.parts.length * barH + Math.max(0, data.parts.length - 1) * gap + 40;
    const svgW = padX * 2 + labelW + chartW + 120;

    return (
        <div ref={wrapRef} className="relative">
            {/* Total Summary */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-600">Total Cost</div>
                <div className="text-2xl font-bold text-gray-900">{fmtINR(data.total)}</div>
            </div>

            <div className="overflow-x-auto">
                <svg width={svgW} height={svgH}>
                    <g transform={`translate(${padX}, ${padY})`}>
                        {/* baseline */}
                        <line x1={labelW} y1={-8} x2={labelW} y2={svgH - padY * 2 + 8} stroke="#e5e7eb" strokeWidth={1} />

                        {data.parts.map((p, i) => {
                            const y = i * (barH + gap);
                            const barW = data.maxValue > 0 ? (p.value / data.maxValue) * chartW : 0;
                            const percentage = data.total > 0 ? ((p.value / data.total) * 100).toFixed(1) : '0.0';

                            return (
                                <g key={p.key} transform={`translate(0, ${y})`}>
                                    {/* label */}
                                    <text
                                        x={labelW - 8}
                                        y={barH / 2}
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                        fontSize="13"
                                        fill="#374151"
                                        fontWeight="600"
                                    >
                                        {p.key}
                                    </text>

                                    {/* bar */}
                                    {barW > 0 && (
                                        <rect
                                            x={labelW}
                                            y={4}
                                            width={barW}
                                            height={barH - 8}
                                            fill={p.color}
                                            stroke={p.stroke}
                                            strokeWidth={1}
                                            rx={4}
                                            onMouseMove={(e) => showTip(e, p.key, p.value)}
                                            onMouseLeave={hideTip}
                                            className="transition-all hover:opacity-90"
                                        />
                                    )}

                                    {/* value label inside bar */}
                                    {barW > 80 && (
                                        <text
                                            x={labelW + barW - 8}
                                            y={barH / 2}
                                            textAnchor="end"
                                            dominantBaseline="middle"
                                            fontSize="12"
                                            fontWeight="600"
                                            fill="#ffffff"
                                        >
                                            {fmtINR(p.value)}
                                        </text>
                                    )}

                                    {/* value label outside bar if too small */}
                                    {barW <= 80 && barW > 0 && (
                                        <text
                                            x={labelW + barW + 8}
                                            y={barH / 2}
                                            textAnchor="start"
                                            dominantBaseline="middle"
                                            fontSize="12"
                                            fontWeight="600"
                                            fill="#374151"
                                        >
                                            {fmtINR(p.value)}
                                        </text>
                                    )}

                                    {/* percentage label */}
                                    <text
                                        x={labelW + chartW + 8}
                                        y={barH / 2}
                                        textAnchor="start"
                                        dominantBaseline="middle"
                                        fontSize="11"
                                        fill="#6b7280"
                                        fontWeight="500"
                                    >
                                        ({percentage}%)
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700">
                {data.parts.map(p => (
                    <span key={p.key} className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.color }} />
                        {p.key}
                    </span>
                ))}
            </div>

            {tip && (
                <div
                    className="pointer-events-none absolute z-10 rounded border bg-white px-3 py-2 text-xs shadow-lg"
                    style={{ left: tip.x, top: tip.y }}
                >
                    <div className="font-semibold text-gray-800">{tip.label}</div>
                    <div className="text-gray-700">{tip.value}</div>
                </div>
            )}
        </div>
    );
};

export default CostComparisonHorizontalBar;
