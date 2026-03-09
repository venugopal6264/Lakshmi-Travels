import { DollarSign, TrendingUp } from 'lucide-react';
import { ApiPayment } from '../../services/api';
import BarRow from './BarRow';

interface MonthlyPaymentRow { key: string; label: string; amount: number }
interface MonthlyStatRow {
    key: string; label: string;
    trainCount: number; trainProfit: number;
    flightCount: number; flightProfit: number;
    busCount: number; busProfit: number;
    totalProfit: number; totalTickets: number;
}

interface ChartsRowProps {
    monthlyPayments: { rows: MonthlyPaymentRow[]; total: number };
    maxMonthlyReceived: number;
    monthlyStats: { rows: MonthlyStatRow[] };
    maxMonthlyProfit: number;
    paymentAccountFilter: string;
    paymentAccounts: string[];
    paymentTypeFilter: 'partial' | 'full';
    from: string;
    to: string;
    onPaymentAccountChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onFilterPartial: () => void;
    onFilterFull: () => void;
}

export default function ChartsRow({
    monthlyPayments,
    maxMonthlyReceived,
    monthlyStats,
    maxMonthlyProfit,
    paymentAccountFilter,
    paymentAccounts,
    paymentTypeFilter,
    from,
    to,
    onPaymentAccountChange,
    onFilterPartial,
    onFilterFull,
}: ChartsRowProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Monthly Amount Received Chart */}
            <div className="bg-white rounded-lg shadow-md p-2 border-t-4 border-t-green-500">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                    <h2 className="font-semibold text-green-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Monthly Amount Received
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs text-green-600">Account</label>
                        <select
                            value={paymentAccountFilter}
                            onChange={onPaymentAccountChange}
                            className="px-2 py-1.5 text-xs border border-green-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                            <option className="text-green-600" value="all">All</option>
                            {paymentAccounts.map(acc => (
                                <option key={acc} value={acc}>{acc}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded border text-xs ${paymentTypeFilter === 'partial' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                onClick={onFilterPartial}
                            >
                                Partial
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded border text-xs ${paymentTypeFilter === 'full' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                                onClick={onFilterFull}
                            >
                                Full
                            </button>
                        </div>
                    </div>
                </div>
                <div className="rounded-md border border-green-100 bg-gradient-to-b from-white to-green-50/40 p-2">
                    <div className="space-y-3">
                        {monthlyPayments.rows.map((r) => {
                            const amt = Math.max(0, Number(r.amount || 0));
                            const widthPercent = Math.max(2, Math.round((amt / maxMonthlyReceived) * 100));
                            const value = `₹${Math.round(amt).toLocaleString()}`;
                            return (
                                <BarRow
                                    key={r.key}
                                    label={r.label}
                                    value={value}
                                    widthPercent={widthPercent}
                                    barClass="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600"
                                />
                            );
                        })}
                    </div>
                    {monthlyPayments.rows.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">No payment data available</div>
                    )}
                </div>
            </div>

            {/* Monthly Profit Trend Chart */}
            <div className="bg-white rounded-lg shadow-md p-2 border-t-4 border-t-purple-500">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h4 className="font-semibold text-purple-700 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Monthly Profit Trend
                    </h4>
                    <div className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded border border-purple-200">
                        Filtered: {from} → {to}
                    </div>
                </div>
                <div className="rounded-md border border-purple-100 bg-gradient-to-b from-white to-purple-50/40 p-2">
                    <div className="space-y-3">
                        {monthlyStats.rows.map((r) => {
                            const profit = Math.max(0, Number(r.totalProfit || 0));
                            const widthPercent = Math.max(2, Math.round((profit / maxMonthlyProfit) * 100));
                            const value = `₹${Math.round(profit).toLocaleString()}`;
                            return (
                                <BarRow
                                    key={r.key}
                                    label={r.label}
                                    value={value}
                                    widthPercent={widthPercent}
                                    barClass="bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-700 hover:to-purple-600"
                                />
                            );
                        })}
                    </div>
                    {monthlyStats.rows.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">No profit data available</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Re-export ApiPayment to satisfy import lint if needed
export type { ApiPayment };
