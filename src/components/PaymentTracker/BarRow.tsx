interface BarRowProps {
    label: string;
    value: string;
    widthPercent: number;
    barClass: string;
}

export default function BarRow({ label, value, widthPercent, barClass }: BarRowProps) {
    return (
        <div className="group/bar flex items-center gap-3">
            <div className="lg:w-20 w-14 text-xs font-medium text-gray-700 text-right flex-shrink-0">
                {label}
            </div>
            <div className="flex-1 relative">
                <div
                    className={`h-8 rounded-md ${barClass} shadow-sm transition-all duration-300 flex items-center justify-end px-2 cursor-pointer`}
                    style={{ width: `${widthPercent}%` }}
                >
                    <span className="text-xs font-semibold text-white whitespace-nowrap">{value}</span>
                </div>
                {/* Hover tooltip — appears above the bar */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20
                        invisible opacity-0 group-hover/bar:visible group-hover/bar:opacity-100
                        transition-opacity duration-150">
                    <div className="bg-gray-900 text-white text-xs font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap shadow-xl">
                        {label}: {value}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
            </div>
        </div>
    );
}
