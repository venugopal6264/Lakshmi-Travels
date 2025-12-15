import { useEffect, useMemo, useRef, useState } from "react";
import { MonthRow } from "../common/utils";

// NEW: dependency-free stacked monthly bar chart with tooltips
export function MonthlyFuelServiceBarChart({ rows, color }: { rows: MonthRow[]; color?: string }) {
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

    // Custom palette: Fuel=Theme color, Service=Orange, Repair=Gray
    const theme = color || '#1a80bb'; // Blue fallback
    const fuelColor = theme;
    const fuelStroke = theme;
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
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-600">
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