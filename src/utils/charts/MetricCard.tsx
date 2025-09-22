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