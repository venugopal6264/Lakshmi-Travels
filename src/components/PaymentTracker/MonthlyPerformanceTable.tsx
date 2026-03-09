import { TrendingUp } from 'lucide-react';

interface MonthlyStatRow {
    key: string; label: string;
    trainCount: number; trainProfit: number;
    flightCount: number; flightProfit: number;
    busCount: number; busProfit: number;
    totalProfit: number; totalTickets: number;
}

interface MonthlyStatTotals {
    trainCount: number; trainProfit: number;
    flightCount: number; flightProfit: number;
    busCount: number; busProfit: number;
    totalProfit: number; totalTickets: number;
}

interface MonthlyPerformanceTableProps {
    monthlyStats: { rows: MonthlyStatRow[]; totals: MonthlyStatTotals };
    from: string;
    to: string;
}

function profitRowClass(idx: number): string {
    return `${idx % 2 === 0 ? 'bg-white' : 'bg-violet-50'} hover:brightness-95`;
}

export default function MonthlyPerformanceTable({ monthlyStats, from, to }: MonthlyPerformanceTableProps) {
    return (
        <div className="bg-white rounded-lg shadow-md p-2 mt-4 border-t-4 border-t-purple-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h4 className="font-semibold text-purple-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Monthly Profit Trend
                </h4>
                <div className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded border border-purple-200">
                    Filtered: {from} → {to}
                </div>
            </div>
            <div className="overflow-x-auto max-h-[60vh] relative rounded-md">
                <table className="w-full table-auto">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-purple-700 to-violet-700 text-white">
                            <th rowSpan={2} className="px-2 py-2 text-left font-semibold uppercase align-middle">Month</th>
                            <th rowSpan={2} className="px-2 py-2 text-left font-semibold uppercase align-middle">Total Profit</th>
                            <th rowSpan={2} className="px-2 py-2 text-left font-semibold uppercase align-middle">Total Tickets</th>
                            <th colSpan={2} className="px-2 py-2 text-center align-middle font-semibold uppercase">Train</th>
                            <th colSpan={2} className="px-2 py-2 text-center align-middle font-semibold uppercase">Flight</th>
                            <th colSpan={2} className="px-2 py-2 text-center align-middle font-semibold uppercase">Bus</th>
                        </tr>
                        <tr className="bg-gradient-to-r from-purple-500 to-violet-600 text-white">
                            <th className="px-3 py-1 text-left font-medium uppercase">Tickets</th>
                            <th className="px-3 py-1 text-left font-medium uppercase">Profit</th>
                            <th className="px-3 py-1 text-left font-medium uppercase">Tickets</th>
                            <th className="px-3 py-1 text-left font-medium uppercase">Profit</th>
                            <th className="px-3 py-1 text-left font-medium uppercase">Tickets</th>
                            <th className="px-3 py-1 text-left font-medium uppercase">Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white text-xs">
                        {monthlyStats.rows.map((r, idx) => (
                            <tr key={r.key} className={profitRowClass(idx)}>
                                <td className="px-2 py-2 font-semibold text-gray-800">{r.label}</td>
                                <td className="px-2 py-2 text-purple-900 font-medium">₹{Math.round(r.totalProfit).toLocaleString()}</td>
                                <td className="px-2 py-2 font-medium">{r.totalTickets}</td>
                                <td className="px-2 py-2">{r.trainCount}</td>
                                <td className="px-2 py-2 text-blue-900">₹{Math.round(r.trainProfit).toLocaleString()}</td>
                                <td className="px-2 py-2">{r.flightCount}</td>
                                <td className="px-2 py-2 text-purple-900">₹{Math.round(r.flightProfit).toLocaleString()}</td>
                                <td className="px-2 py-2">{r.busCount}</td>
                                <td className="px-2 py-2 text-emerald-900">₹{Math.round(r.busProfit).toLocaleString()}</td>
                            </tr>
                        ))}
                        <tr className="bg-gradient-to-r from-violet-50 to-purple-50 font-semibold text-xs">
                            <td className="px-2 py-2">Totals</td>
                            <td className="px-2 py-2 text-purple-900">₹{Math.round(monthlyStats.totals.totalProfit).toLocaleString()}</td>
                            <td className="px-2 py-2">{monthlyStats.totals.totalTickets}</td>
                            <td className="px-2 py-2">{monthlyStats.totals.trainCount}</td>
                            <td className="px-2 py-2 text-blue-900">₹{Math.round(monthlyStats.totals.trainProfit).toLocaleString()}</td>
                            <td className="px-2 py-2">{monthlyStats.totals.flightCount}</td>
                            <td className="px-2 py-2 text-purple-900">₹{Math.round(monthlyStats.totals.flightProfit).toLocaleString()}</td>
                            <td className="px-2 py-2">{monthlyStats.totals.busCount}</td>
                            <td className="px-2 py-2 text-emerald-900">₹{Math.round(monthlyStats.totals.busProfit).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
                {monthlyStats.rows.length === 0 && (
                    <div className="text-center py-6 text-gray-500">No tickets in range.</div>
                )}
            </div>
        </div>
    );
}
