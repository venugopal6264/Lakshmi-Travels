import { ApiPayment, ApiTicket } from '../services/api';

interface OverviewPanelsProps {
    metrics: {
        totalRemainingDue: number;
        totalPartialPaid: number;
        totalBookingAmount: number;
        totalFare: number;
        totalProfit: number;
        totalRefundAmount: number;
        refundedTicketsCount: number;
    };
    openTickets: ApiTicket[];
    payments: ApiPayment[];
    dateRange: { from: string; to: string };
    accountFilter: string;
    onSelectAccount: (account: string) => void;
}

export default function OverviewPanels({ metrics, openTickets, payments, dateRange, accountFilter, onSelectAccount }: OverviewPanelsProps) {
    const parseLocalDate = (s?: string) => {
        if (!s) return null as Date | null;
        const [y, m, d] = s.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };

    type Row = { amount: number; booking: number; refund: number; partial: number; due: number; profit: number; count: number };
    const getAccountBreakdown = () => {
        const accountTotals: Record<string, Row> = {};
        openTickets.forEach(ticket => {
            const acc = ticket.account;
            if (!accountTotals[acc]) {
                accountTotals[acc] = { amount: 0, booking: 0, refund: 0, partial: 0, due: 0, profit: 0, count: 0 };
            }
            const amt = Number(ticket.ticketAmount || 0);
            const book = Number(ticket.bookingAmount || 0);
            const ref = Number(ticket.refund || 0);
            accountTotals[acc].amount += amt;
            accountTotals[acc].booking += book;
            accountTotals[acc].refund += ref;
            accountTotals[acc].profit += (amt - book);
            accountTotals[acc].count += 1;
        });
        const fromDate = parseLocalDate(dateRange.from);
        const toDate = parseLocalDate(dateRange.to);
        payments.forEach(p => {
            if (!p.isPartial) return;
            const payDate = parseLocalDate(p.date) || new Date(p.date);
            if (fromDate && payDate < fromDate) return;
            if (toDate && payDate > toDate) return;
            const acc = p.account;
            if (!acc) return;
            if (!accountTotals[acc]) {
                accountTotals[acc] = { amount: 0, booking: 0, refund: 0, partial: 0, due: 0, profit: 0, count: 0 };
            }
            accountTotals[acc].partial += Number(p.amount || 0);
        });
        Object.values(accountTotals).forEach(row => {
            row.due = Math.max(0, (row.amount - row.refund - row.partial));
        });
        return accountTotals;
    };

    const accountBreakdown = getAccountBreakdown();
    const {
        totalRemainingDue,
        totalPartialPaid,
        totalBookingAmount,
        totalFare,
        totalProfit,
        totalRefundAmount,
        refundedTicketsCount,
    } = metrics;

    return (
        <>
            {/* Dashboard widgets: OPEN tickets only */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 lg:gap-8">
                <div className="bg-blue-50 p-4 rounded-lg border-t-4 border-blue-500 order-1">
                    <h3 className="text-sm font-medium text-blue-600">Total Remaining Due</h3>
                    <p className="text-2xl font-bold text-blue-900">₹{Math.round(totalRemainingDue).toLocaleString()}</p>
                    <p className="text-[10px] text-blue-600">Ticket - Refund - Partial</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border-t-4 border-amber-500 order-2">
                    <h3 className="text-sm font-medium text-amber-600">Total Partial Paid</h3>
                    <p className="text-2xl font-bold text-amber-900">₹{Math.round(totalPartialPaid).toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border-t-4 border-purple-500 order-3">
                    <h3 className="text-sm font-medium text-purple-600">Total Ticket Amount</h3>
                    <p className="text-2xl font-bold text-purple-900">₹{Math.round(totalBookingAmount).toLocaleString()}</p>
                    <p className="text-xs text-purple-600">{openTickets.length} open tickets</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border-t-4 border-indigo-500 order-4">
                    <h3 className="text-sm font-medium text-indigo-600">Total Booking Amount</h3>
                    <p className="text-2xl font-bold text-indigo-900">₹{Math.round(totalFare).toLocaleString()}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-t-4 border-green-500 order-5">
                    <h3 className="text-sm font-medium text-green-600">Total Profit</h3>
                    <p className="text-2xl font-bold text-green-900">₹{Math.round(totalProfit).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border-t-4 border-red-500 order-6">
                    <h3 className="text-sm font-medium text-red-600">Total Refund</h3>
                    <p className="text-2xl font-bold text-red-900">₹{Math.round(totalRefundAmount).toLocaleString()}</p>
                    <p className="text-xs text-red-600">{refundedTicketsCount} tickets refunded</p>
                </div>
            </div>

            {/* Account Breakdown (OPEN tickets only) - header bar removed to keep a single header on the page */}
            <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden border-t-4 border-indigo-500 mt-6">
                <div className="overflow-x-auto max-h-[50vh] relative">
                    <table className="w-full table-auto">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-purple-500 text-white">
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold uppercase tracking-wider">Account</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold uppercase tracking-wider">Remaining Due</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold uppercase tracking-wider">Partial</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold uppercase tracking-wider">Tickets</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold uppercase tracking-wider">Total</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold uppercase tracking-wider">Refund</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold uppercase tracking-wider">Booking</th>
                                <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold uppercase tracking-wider">Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-xs">
                            {Object.entries(accountBreakdown).map(([account, totals]) => (
                                <tr
                                    key={account}
                                    className={`transition-colors odd:bg-white even:bg-indigo-50 hover:bg-indigo-100 ${accountFilter === account ? 'ring-2 ring-indigo-400' : ''}`}
                                >
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap font-medium text-gray-900">
                                        <button
                                            type="button"
                                            onClick={() => onSelectAccount(account)}
                                            className={`text-left hover:underline focus:outline-none ${accountFilter === account ? 'text-indigo-700' : ''}`}
                                            aria-label={`Filter tickets by account ${account}`}
                                            title="Click to filter tickets by this account"
                                        >
                                            {account}
                                        </button>
                                    </td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap font-semibold text-blue-700">₹{Math.round(totals.due).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-amber-700">₹{Math.round(totals.partial).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-gray-900">{totals.count}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-purple-900">₹{Math.round(totals.amount).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-red-700">₹{Math.round(totals.refund).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-indigo-900">₹{Math.round(totals.booking).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-green-900">₹{Math.round(totals.profit).toLocaleString()}</td>
                                </tr>
                            ))}
                            {/* Totals Row */}
                            {Object.keys(accountBreakdown).length > 0 && (
                                <tr className="bg-gradient-to-r from-purple-100 to-purple-200 font-semibold text-xs">
                                    <td className="px-3 py-3 sm:px-4 sm:py-4">Totals</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-blue-700">₹{Math.round(Object.values(accountBreakdown).reduce((s, v) => s + v.due, 0)).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-amber-700">₹{Math.round(Object.values(accountBreakdown).reduce((s, v) => s + v.partial, 0)).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4">{Object.values(accountBreakdown).reduce((s, v) => s + v.count, 0)}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-purple-900">₹{Math.round(Object.values(accountBreakdown).reduce((s, v) => s + v.amount, 0)).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-red-700">₹{Math.round(Object.values(accountBreakdown).reduce((s, v) => s + v.refund, 0)).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-indigo-900">₹{Math.round(Object.values(accountBreakdown).reduce((s, v) => s + v.booking, 0)).toLocaleString()}</td>
                                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-green-900">₹{Math.round(Object.values(accountBreakdown).reduce((s, v) => s + v.profit, 0)).toLocaleString()}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {Object.keys(accountBreakdown).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No tickets found for the selected date range.
                        </div>
                    )}
                </div>
                <p className="ml-3 mt-3 text-[10px] text-gray-500">
                    Remaining Due = Total Ticket - Refund - Partial Paid. Partial payments are cumulative and do not increase ticket count.
                </p>
            </div>
        </>
    );
}
