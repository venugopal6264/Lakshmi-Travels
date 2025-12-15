import { useEffect, useMemo, useRef, useState } from "react";
import { MonthRow } from "../common/utils";

// Horizontal bar chart for monthly summary
export function MonthlyHorizontalBarChart({ rows, color }: { rows: MonthRow[]; color?: string }) {
    const wrapperRef = useRef<HTMLDivElement>(null);

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
        return {
            key: `${r.year}-${r.month}`,
            label: r.label,
            year: r.year,
            fuel,
            service,
            repair,
            total: fuel + service + repair
        };
    }), [rows]);

    const maxTotal = useMemo(() => Math.max(1, ...data.map(d => d.total)), [data]);

    // Custom palette: Fuel=Theme color, Service=Orange, Repair=Gray
    const theme = color || '#1a80bb';
    const fuelColor = theme;
    const fuelStroke = theme;
    const serviceColor = '#ea801c';
    const serviceStroke = '#b06014';
    const repairColor = '#b8b8b8';
    const repairStroke = '#8a8a8a';

    const barH = 32;
    const gap = 12;
    const padY = 24;
    const padX = 8;
    const labelW = 100;
    const chartW = Math.max(400, containerW - labelW - padX * 2 - 40);

    const svgH = padY * 2 + data.length * barH + Math.max(0, data.length - 1) * gap;
    const svgW = padX * 2 + labelW + chartW + 80;

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

    return (
        <div ref={wrapperRef} className="relative">
            {/* Legend */}
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-600">
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
                        <line x1={labelW} y1={-8} x2={labelW} y2={svgH - padY * 2 + 8} stroke="#e5e7eb" strokeWidth={1} />
                        {data.map((d, i) => {
                            const y = i * (barH + gap);
                            const fuelW = d.total ? (d.fuel / maxTotal) * chartW : 0;
                            const serviceW = d.total ? (d.service / maxTotal) * chartW : 0;
                            const repairW = d.total ? (d.repair / maxTotal) * chartW : 0;
                            const fuelX = labelW;
                            const serviceX = fuelX + fuelW;
                            const repairX = serviceX + serviceW;
                            const totalW = fuelW + serviceW + repairW;

                            return (
                                <g key={d.key} transform={`translate(0, ${y})`}>
                                    {/* month label */}
                                    <text
                                        x={labelW - 8}
                                        y={barH / 2}
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                        fontSize="11"
                                        fill="#374151"
                                        fontWeight="500"
                                    >
                                        {d.label}
                                    </text>
                                    {/* fuel segment (left) */}
                                    {fuelW > 0 && (
                                        <rect
                                            x={fuelX}
                                            y={0}
                                            width={fuelW}
                                            height={barH}
                                            fill={fuelColor}
                                            stroke={fuelStroke}
                                            strokeWidth={0.75}
                                            rx={2}
                                            onMouseMove={(e) => onMove(e, `${d.label} • Fuel`, d.fuel)}
                                            onMouseLeave={onLeave}
                                        />
                                    )}
                                    {/* service segment (middle) */}
                                    {serviceW > 0 && (
                                        <rect
                                            x={serviceX}
                                            y={0}
                                            width={serviceW}
                                            height={barH}
                                            fill={serviceColor}
                                            stroke={serviceStroke}
                                            strokeWidth={0.75}
                                            rx={2}
                                            onMouseMove={(e) => onMove(e, `${d.label} • Service`, d.service)}
                                            onMouseLeave={onLeave}
                                        />
                                    )}
                                    {/* repair segment (right) */}
                                    {repairW > 0 && (
                                        <rect
                                            x={repairX}
                                            y={0}
                                            width={repairW}
                                            height={barH}
                                            fill={repairColor}
                                            stroke={repairStroke}
                                            strokeWidth={0.75}
                                            rx={2}
                                            onMouseMove={(e) => onMove(e, `${d.label} • Repair`, d.repair)}
                                            onMouseLeave={onLeave}
                                        />
                                    )}
                                    {/* Total label at end of bar */}
                                    {d.total > 0 && totalW >= 60 && (
                                        <text
                                            x={labelW + totalW / 2}
                                            y={barH / 2}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fontSize="10"
                                            fontWeight="600"
                                            fill="#ffffff"
                                        >
                                            {fmt(d.total)}
                                        </text>
                                    )}
                                    {/* Total label outside bar if bar is too small */}
                                    {d.total > 0 && totalW < 60 && (
                                        <text
                                            x={labelW + totalW + 8}
                                            y={barH / 2}
                                            textAnchor="start"
                                            dominantBaseline="middle"
                                            fontSize="10"
                                            fontWeight="600"
                                            fill="#374151"
                                        >
                                            {fmt(d.total)}
                                        </text>
                                    )}
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
