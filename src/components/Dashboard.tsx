import { BarChart3, Calendar, Download, TrendingUp } from 'lucide-react';
import { ApiPayment, ApiTicket } from '../services/api';
import { useDateRange } from '../context/useDateRange';
import { downloadCSV, generateCSVReport } from '../utils/reportGenerator';
import TicketTable from './TicketTable';

interface DashboardProps {
    tickets: ApiTicket[];
    payments: ApiPayment[];
    onDeleteTicket: (id: string) => Promise<void>;
    onUpdateTicket: (id: string, ticketData: Partial<ApiTicket>) => Promise<void>;
    onProcessRefund: (id: string, refundData: { refundAmount: number; refundDate: string; refundReason: string }) => Promise<void>;
    onMarkAsPaid: (ticketId: string) => Promise<void>;
    onBulkMarkAsPaid: (ticketIds: string[]) => Promise<void>;
    loading: boolean;
}

export default function Dashboard({
    tickets,
    payments,
    onDeleteTicket,
    onUpdateTicket,
    onProcessRefund,
    onMarkAsPaid,
    onBulkMarkAsPaid,
    loading
}: DashboardProps) {
    const { dateRange, setDateRange } = useDateRange();
    // Get paid ticket IDs from payments
    const paidTicketIds = payments.flatMap(payment => payment.tickets);

    // Filter tickets by date range for account breakdown
    const dateFilteredTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.bookingDate);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;

        if (fromDate && ticketDate < fromDate) return false;
        if (toDate && ticketDate > toDate) return false;
        return true;
    });

    // Filter payments by date range for KPIs
    const dateFilteredPayments = payments.filter(p => {
        const payDate = new Date(p.date);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;
        if (fromDate && payDate < fromDate) return false;
        if (toDate && payDate > toDate) return false;
        return true;
    });

    // KPI totals for the selected range
    const totalBookingAmount = dateFilteredTickets.reduce((sum, t) => sum + t.amount, 0);
    const totalFare = dateFilteredTickets.reduce((sum, t) => sum + t.fare, 0);
    const totalProfitAfterRefunds = dateFilteredTickets.reduce((sum, t) => sum + (t.profit - (t.refundAmount || 0)), 0);
    const totalPaid = dateFilteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalProfitAfterRefunds - totalPaid;

    // Calculate account breakdown
    const getAccountBreakdown = () => {
        const accountTotals: Record<string, { amount: number; profit: number; count: number }> = {};

        dateFilteredTickets.forEach(ticket => {
            if (!accountTotals[ticket.account]) {
                accountTotals[ticket.account] = { amount: 0, profit: 0, count: 0 };
            }
            accountTotals[ticket.account].amount += ticket.amount;
            accountTotals[ticket.account].profit += ticket.profit;
            accountTotals[ticket.account].count += 1;
        });

        return accountTotals;
    };

    const accountBreakdown = getAccountBreakdown();

    const exportReport = () => {
        if (tickets.length === 0) {
            alert('No tickets to export');
            return;
        }
        const csvContent = generateCSVReport(tickets);
        const filename = `travel-tickets-report-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename);
    };

    // Map current dateRange to a quick selector value so the dropdown stays in sync across navigation
    const quickRangeValue = (() => {
        const { from, to } = dateRange;
        if (!from && !to) return 'all';

        const today = new Date();
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const startOfThisYear = new Date(today.getFullYear(), 0, 1);

        const parse = (s: string) => (s ? new Date(s) : null);
        const fromD = parse(from);
        const toD = parse(to);

        const isSameYMD = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

        // This Month: from = 1st of this month, to within this month (any day)
        if (fromD && isSameYMD(fromD, startOfThisMonth) && toD && toD.getFullYear() === today.getFullYear() && toD.getMonth() === today.getMonth()) {
            return 'thisMonth';
        }
        // Last Month: exact month span
        if (fromD && isSameYMD(fromD, startOfLastMonth) && toD && isSameYMD(toD, endOfLastMonth)) {
            return 'lastMonth';
        }
        // This Year: from = Jan 1 this year, to within this year
        if (fromD && isSameYMD(fromD, startOfThisYear) && toD && toD.getFullYear() === today.getFullYear()) {
            return 'thisYear';
        }
        return 'all';
    })();

    // Local UI handler for quick range selector; persists selection while delegating actual range via onDateRangeChange
    const handleQuickRangeChange = (filterType: string) => {
        if (filterType === 'custom') return; // custom not implemented in header; could add date inputs if needed

        const today = new Date();
        let from = '';
        let to = today.toISOString().split('T')[0];

        switch (filterType) {
            case 'thisMonth':
                from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                break;
            case 'lastMonth': {
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                from = lastMonth.toISOString().split('T')[0];
                to = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
                break;
            }
            case 'thisYear':
                from = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
                break;
            case 'all':
                from = '';
                to = '';
                break;
        }

    setDateRange({ from, to });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                    <p className="text-gray-600 mt-1">Overview of your travel tickets and profits</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Compact Date Filter */}
            <div className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-900 transition duration-200 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-white-1000" />
                        <select
                value={quickRangeValue}
                onChange={(e) => handleQuickRangeChange(e.target.value)}
                            className="bg-transparent text-md text-white focus:outline-none"
                            aria-label="Date Range"
                        >
                            <option value="all">All Time</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="thisYear">This Year</option>
                        </select>
                    </div>
                    <button
                        onClick={exportReport}
                        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-900 transition duration-200 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

                {/* Top-level KPIs moved from Payment Tracker */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-purple-600">Total Booking Amount</h3>
                        <p className="text-2xl font-bold text-purple-900">₹{totalBookingAmount.toLocaleString()}</p>
                        <p className="text-xs text-purple-600">{dateFilteredTickets.length} tickets</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-indigo-600">Total Fare</h3>
                        <p className="text-2xl font-bold text-indigo-900">₹{totalFare.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-green-600">Total Paid</h3>
                        <p className="text-2xl font-bold text-green-900">₹{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-orange-600">Remaining</h3>
                        <p className="text-2xl font-bold text-orange-900">₹{remaining.toLocaleString()}</p>
                    </div>
                </div>

                 <TicketTable
                tickets={tickets}
                paidTickets={paidTicketIds}
                onDeleteTicket={onDeleteTicket}
                onUpdateTicket={onUpdateTicket}
                onProcessRefund={onProcessRefund}
                onMarkAsPaid={onMarkAsPaid}
                onBulkMarkAsPaid={onBulkMarkAsPaid}
                loading={loading}
                     dateRange={dateRange}
            />

            {/* Profit summary moved to Payment Tracker */}

            {/* Account Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Account Breakdown
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Account
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tickets
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Amount
                                </th>
                                {/* Total Profit removed as requested */}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(accountBreakdown).map(([account, totals]) => (
                                <tr key={account} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {account}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {totals.count}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ₹{totals.amount.toLocaleString()}
                                    </td>
                                    {/* Profit column removed */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {Object.keys(accountBreakdown).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No tickets found for the selected date range.
                        </div>
                    )}
                </div>
            </div>

           
            {tickets.length === 0 && !loading && (
                <div className="text-center py-12">
                    <BarChart3 className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
                    <p className="text-gray-600">Add your first travel ticket to get started</p>
                </div>
            )}
        </div>
    );
}
