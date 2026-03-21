import { BookOpen } from 'lucide-react';

interface ServiceRow {
    service: string;
    count: number;
    openCount: number;
    paidCount: number;
    bookingAmount: number;
    ticketAmount: number;
    profit: number;
}

interface ServiceSummaryTableProps {
    rows: ServiceRow[];
    monthLabel: string;
    onSelectService?: (service: string) => void;
    selectedService?: string;
}

const cardColors = [
    'border-sky-400 bg-sky-50 text-sky-700',
    'border-indigo-400 bg-indigo-50 text-indigo-700',
    'border-emerald-400 bg-emerald-50 text-emerald-700',
    'border-purple-400 bg-purple-50 text-purple-700',
    'border-amber-400 bg-amber-50 text-amber-700',
    'border-rose-400 bg-rose-50 text-rose-700',
    'border-teal-400 bg-teal-50 text-teal-700',
    'border-orange-400 bg-orange-50 text-orange-700',
];

function cardColorClass(idx: number): string {
    return cardColors[idx % cardColors.length];
}

function cardSelectedClass(isSelected: boolean): string {
    return isSelected ? 'ring-2 ring-offset-1 ring-sky-500 brightness-95' : 'hover:brightness-95';
}

export default function ServiceSummaryTable({ rows, monthLabel, onSelectService, selectedService }: ServiceSummaryTableProps) {
    const totalCount = rows.reduce((s, r) => s + r.count, 0);
    const totalOpen = rows.reduce((s, r) => s + r.openCount, 0);
    const totalPaid = rows.reduce((s, r) => s + r.paidCount, 0);

    return (
        <div className="bg-white rounded-lg shadow-md p-2 mt-4 border-t-4 border-t-sky-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h4 className="font-semibold text-sky-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Booking Account (Service) — Tickets This Month
                </h4>
                <div className="text-xs text-sky-700 bg-sky-50 px-3 py-1 rounded border border-sky-200">
                    {monthLabel}
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">No tickets booked this month.</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {rows.map((r, idx) => (
                        <div
                            key={r.service}
                            onClick={() => onSelectService?.(r.service)}
                            className={`border-l-4 rounded-lg p-2 flex flex-col gap-1 cursor-pointer transition ${cardColorClass(idx)} ${cardSelectedClass(selectedService === r.service)}`}
                        >
                            {/* Row 1: Service name - ticket count */}
                            <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs font-semibold truncate" title={r.service}>{r.service || '—'}</span>
                                <span className="text-[10px] text-gray-400">-</span>
                                <span className="text-xs font-extrabold whitespace-nowrap">{r.count} Tickets</span>
                            </div>
                            {/* Row 2: Open count — Paid count */}
                            <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 whitespace-nowrap">
                                    Open&nbsp;{r.openCount}
                                </span>
                                <span className="text-[10px] text-gray-400">—</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 whitespace-nowrap">
                                    Paid&nbsp;{r.paidCount}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div className="border-l-4 border-gray-400 bg-gray-50 text-gray-700 rounded-lg p-2 flex flex-col gap-1">
                        {/* Row 1: Total - total count */}
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs font-semibold">Total</span>
                            <span className="text-[10px] text-gray-400">-</span>
                            <span className="text-xs font-extrabold whitespace-nowrap">{totalCount} Tickets</span>
                        </div>
                        {/* Row 2: Open total — Paid total */}
                        <div className="flex items-center gap-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 whitespace-nowrap">
                                Open&nbsp;{totalOpen}
                            </span>
                            <span className="text-[10px] text-gray-400">—</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 whitespace-nowrap">
                                Paid&nbsp;{totalPaid}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
