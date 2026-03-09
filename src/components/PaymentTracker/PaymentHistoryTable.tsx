import { Calendar, DollarSign } from 'lucide-react';
import { ApiPayment, ApiTicket } from '../../services/api';

interface PaymentHistoryTableProps {
    sortedPayments: ApiPayment[];
    ticketById: Record<string, ApiTicket>;
    loading: boolean;
    aggregatesForPayment: (p: ApiPayment) => {
        ticketSum: number;
        refundSum: number;
        profitNetSum: number;
        count: number;
    };
}

function paymentRowBg(idx: number): string {
    return idx % 2 === 0 ? 'bg-white' : 'bg-green-50';
}

function paymentTypeLabel(isPartial: boolean): string {
    return isPartial ? 'Partial' : 'Full';
}

function paymentTypeBadgeClass(isPartial: boolean): string {
    return `px-2 py-1 rounded text-[10px] font-semibold ${isPartial ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`;
}

function deriveAccountLabel(p: ApiPayment, ticketById: Record<string, ApiTicket>): string {
    if (p.account) return p.account;
    const accs = new Set<string>();
    for (const id of p.tickets || []) {
        const t = ticketById[id];
        if (t?.account) accs.add(t.account);
    }
    if (accs.size === 1) return Array.from(accs)[0];
    if (accs.size > 1) return 'Multiple';
    return '—';
}

export default function PaymentHistoryTable({
    sortedPayments,
    ticketById,
    loading,
    aggregatesForPayment,
}: PaymentHistoryTableProps) {
    return (
        <div className="bg-white rounded-lg shadow-md p-2 mt-4 border-t-4 border-t-green-500">
            <h2 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment History
            </h2>

            {loading && (
                <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                    <p className="mt-2 text-gray-600">Loading payments...</p>
                </div>
            )}

            {sortedPayments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments recorded yet.</p>
            ) : (
                <div className="overflow-x-auto max-h-[50vh] relative rounded-md">
                    <table className="w-full table-auto">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
                                <th className="px-2 py-2 text-left font-semibold uppercase">Account</th>
                                <th className="px-2 py-2 text-left font-semibold uppercase">Amount Received dt</th>
                                <th className="px-2 py-2 text-left font-semibold uppercase">Tickets</th>
                                <th className="px-2 py-2 text-left font-semibold uppercase">Amount Received</th>
                                <th className="px-2 py-2 text-left font-semibold uppercase">Ticket Amount</th>
                                <th className="px-2 py-2 text-left font-semibold uppercase">Profit</th>
                                <th className="px-2 py-2 text-left font-semibold uppercase">Refund</th>
                                <th className="px-2 py-2 text-left font-semibold uppercase">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white text-xs">
                            {sortedPayments.map((p, idx) => {
                                const accLabel = deriveAccountLabel(p, ticketById);
                                const agg = aggregatesForPayment(p);
                                const isPartial = !!p.isPartial;
                                const receivedVal = isPartial ? Number(p.amount || 0) : (agg.ticketSum - agg.refundSum);
                                const ticketVal = isPartial ? Number(p.amount || 0) : agg.ticketSum;
                                return (
                                    <tr
                                        key={p._id || idx}
                                        className={`${paymentRowBg(idx)} hover:brightness-95 ${isPartial ? 'border-l-4 border-l-amber-500' : ''}`}
                                    >
                                        <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-800">{accLabel}</td>
                                        <td className="px-2 py-2 whitespace-nowrap flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            {new Date(p.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap">{agg.count}</td>
                                        <td className="px-2 py-2 whitespace-nowrap font-semibold text-green-700">₹{Math.round(receivedVal).toLocaleString()}</td>
                                        <td className="px-2 py-2 whitespace-nowrap">₹{Math.round(ticketVal).toLocaleString()}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-emerald-800">₹{Math.round(agg.profitNetSum).toLocaleString()}</td>
                                        <td className="px-2 py-2 whitespace-nowrap text-red-700">₹{Math.round(agg.refundSum).toLocaleString()}</td>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <span className={paymentTypeBadgeClass(isPartial)}>{paymentTypeLabel(isPartial)}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {/* Totals row */}
                            <tr className="bg-gradient-to-r from-emerald-50 to-green-50 font-semibold text-xs">
                                <td className="px-2 py-2">Totals</td>
                                <td className="px-2 py-2"></td>
                                <td className="px-2 py-2">{sortedPayments.reduce((s, p) => s + aggregatesForPayment(p).count, 0)}</td>
                                <td className="px-2 py-2 text-green-700">
                                    ₹{Math.round(sortedPayments.reduce((s, p) => {
                                        const agg = aggregatesForPayment(p);
                                        return s + (p.isPartial ? Number(p.amount || 0) : (agg.ticketSum - agg.refundSum));
                                    }, 0)).toLocaleString()}
                                </td>
                                <td className="px-2 py-2">
                                    ₹{Math.round(sortedPayments.reduce((s, p) => {
                                        const agg = aggregatesForPayment(p);
                                        return s + (p.isPartial ? Number(p.amount || 0) : agg.ticketSum);
                                    }, 0)).toLocaleString()}
                                </td>
                                <td className="px-2 py-2 text-emerald-800">
                                    ₹{Math.round(sortedPayments.reduce((s, p) => s + aggregatesForPayment(p).profitNetSum, 0)).toLocaleString()}
                                </td>
                                <td className="px-2 py-2 text-red-700">
                                    ₹{Math.round(sortedPayments.reduce((s, p) => s + aggregatesForPayment(p).refundSum, 0)).toLocaleString()}
                                </td>
                                <td className="px-2 py-2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
