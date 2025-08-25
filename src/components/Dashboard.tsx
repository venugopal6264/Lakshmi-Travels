import { BarChart3, Calendar, Download, TrendingUp, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiPayment, ApiTicket } from '../services/api';
import { useDateRange } from '../context/useDateRange';
import { downloadCSV, generateCSVReport } from '../utils/reportGenerator';
import TicketTable from './TicketTable';
import TicketForm from './TicketForm';

interface DashboardProps {
    tickets: ApiTicket[];
    payments: ApiPayment[];
    onAddTicket: (ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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
    onAddTicket,
    onDeleteTicket,
    onUpdateTicket,
    onProcessRefund,
    onMarkAsPaid,
    onBulkMarkAsPaid,
    loading
}: DashboardProps) {
    const { dateRange, setDateRange } = useDateRange();
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Parse YYYY-MM-DD as local date to avoid timezone shifts
    const parseLocalDate = (s?: string) => {
        if (!s) return null;
        const [y, m, d] = s.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };
    // Format a Date as YYYY-MM-DD using local time (no UTC shift)
    const formatLocalDate = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    // Get paid ticket IDs from payments
    const paidTicketIds = payments.flatMap(payment => payment.tickets);

    // Filter tickets by date range for account breakdown
    const dateFilteredTickets = tickets.filter(ticket => {
        const ticketDate = parseLocalDate(ticket.bookingDate) || new Date(ticket.bookingDate);
        const fromDate = parseLocalDate(dateRange.from);
        const toDate = parseLocalDate(dateRange.to);

        if (fromDate && ticketDate < fromDate) return false;
        if (toDate && ticketDate > toDate) return false;
        return true;
    });

    // Payments are not used in Dashboard KPIs (open tickets only)

    // Only OPEN tickets (unpaid per-ticket) should drive Dashboard widgets
    const openTickets = dateFilteredTickets.filter(t => !paidTicketIds.includes(t._id || ''));

    // KPI totals for OPEN tickets in the selected range
    const totalBookingAmount = openTickets.reduce((sum, t) => sum + t.amount, 0);
    const totalFare = openTickets.reduce((sum, t) => sum + t.fare, 0);
    const totalProfitAfterRefunds = openTickets.reduce((sum, t) => sum + (t.profit - (t.refundAmount || 0)), 0);

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
        // Prepare filtered tickets for export; CSV includes Fare only (as per generator)
        const csvContent = generateCSVReport(dateFilteredTickets);
        // Build filename: Account-BookingStartDate-EndDate
        const accounts = Array.from(new Set(dateFilteredTickets.map(t => t.account)));
        const accountLabel = accounts.length === 1 ? accounts[0] : 'AllAccounts';
        const start = dateFilteredTickets.length > 0 ? dateFilteredTickets
            .map(t => t.bookingDate)
            .sort()[0] : '';
        const end = dateFilteredTickets.length > 0 ? dateFilteredTickets
            .map(t => t.bookingDate)
            .sort()
            .slice(-1)[0] : '';
        const startLabel = start ? start.split('T')[0] : 'ALL';
        const endLabel = end ? end.split('T')[0] : 'ALL';
        const filename = `${accountLabel}-${startLabel}-${endLabel}.csv`;
        downloadCSV(csvContent, filename);
    };

    // Suggestions for TicketForm
    const existingAccounts = Array.from(new Set((tickets || []).map(t => t.account).filter(Boolean)));
    const existingServices = Array.from(new Set((tickets || []).map(t => t.service).filter(Boolean)));

    const handleAddTicketFromModal = async (ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => {
        await onAddTicket(ticket);
        setShowCreateModal(false);
    };

    // Local quick range selection, synced with context
    const [quickRange, setQuickRange] = useState<'all' | 'thisMonth' | 'lastMonth' | 'thisYear'>('all');
    useEffect(() => {
        const { from, to } = dateRange;
        if (!from && !to) {
            setQuickRange('all');
            return;
        }
        const today = new Date();
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const startOfThisYear = new Date(today.getFullYear(), 0, 1);
        const fromD = parseLocalDate(from);
        const toD = parseLocalDate(to);
        const isSameYMD = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
        if (fromD && isSameYMD(fromD, startOfThisMonth) && toD && toD.getFullYear() === today.getFullYear() && toD.getMonth() === today.getMonth()) {
            setQuickRange('thisMonth');
        } else if (fromD && isSameYMD(fromD, startOfLastMonth) && toD && isSameYMD(toD, endOfLastMonth)) {
            setQuickRange('lastMonth');
        } else if (fromD && isSameYMD(fromD, startOfThisYear) && toD && toD.getFullYear() === today.getFullYear()) {
            setQuickRange('thisYear');
        } else {
            setQuickRange('all');
        }
    }, [dateRange]);

    // Local UI handler for quick range selector; persists selection while delegating actual range via onDateRangeChange
    const handleQuickRangeChange = (filterType: string) => {
        setQuickRange(filterType as 'all' | 'thisMonth' | 'lastMonth' | 'thisYear');
        if (filterType === 'custom') return; // custom not implemented in header; could add date inputs if needed

        const today = new Date();
        let from = '';
        let to = formatLocalDate(today);

        switch (filterType) {
            case 'thisMonth':
                from = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
                break;
            case 'lastMonth': {
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                from = formatLocalDate(lastMonth);
                to = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 0));
                break;
            }
            case 'thisYear':
                from = formatLocalDate(new Date(today.getFullYear(), 0, 1));
                break;
            case 'all':
                from = '';
                to = '';
                break;
        }

        setDateRange({ from, to });
    };

    return (
        <>
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
                            value={quickRange}
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
                        onClick={() => setShowCreateModal(true)}
                        className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition duration-200 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Ticket
                    </button>
                    <button
                        onClick={exportReport}
                        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-900 transition duration-200 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Dashboard widgets: OPEN tickets only */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-600">Total Booking Amount</h3>
                    <p className="text-2xl font-bold text-purple-900">₹{totalBookingAmount.toLocaleString()}</p>
                    <p className="text-xs text-purple-600">{openTickets.length} open tickets</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-indigo-600">Total Fare</h3>
                    <p className="text-2xl font-bold text-indigo-900">₹{totalFare.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-600">Total Profit</h3>
                    <p className="text-2xl font-bold text-green-900">₹{totalProfitAfterRefunds.toLocaleString()}</p>
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

        {/* Account Breakdown (OPEN tickets only) */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
            Account Breakdown (Open Tickets)
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
        {/* Create Ticket Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white w-full max-w-5xl rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">Create New Ticket</h3>
                        <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <TicketForm
                        onAddTicket={handleAddTicketFromModal}
                        loading={loading}
                        existingAccounts={existingAccounts}
                        existingServices={existingServices}
                    />
                </div>
            </div>
        )}
        </>
    );
}
