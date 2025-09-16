import { BarChart3, Calendar, Download, TrendingUp, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiPayment, ApiTicket } from '../services/api';
import { useDateRange } from '../context/useDateRange';
import { downloadPDFReport } from '../utils/reportGenerator';
import TicketTable from './TicketTable';
import TicketForm from './TicketForm';

interface DashboardProps {
    tickets: ApiTicket[];
    payments: ApiPayment[];
    onAddTicket: (ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onDeleteTicket: (id: string) => Promise<void>;
    onUpdateTicket: (id: string, ticketData: Partial<ApiTicket>) => Promise<void>;
    onProcessRefund: (id: string, refundData: { refund: number; refundDate: string; refundReason: string }) => Promise<void>;
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
    const [accountFilter, setAccountFilter] = useState<string>('all');
    // When clicking an account in the Account Breakdown table, set the filter
    const handleSelectAccountFromBreakdown = (account: string) => {
        if (!account) return;
        setAccountFilter(account);
        // Optionally could scroll into view of tickets table (future enhancement)
    };

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
    // Map ticketId -> latest paid date
    const paidDates: Record<string, string> = {};
    payments.forEach(p => {
        const d = p.date;
        (p.tickets || []).forEach(id => {
            if (!paidDates[id] || (new Date(d) > new Date(paidDates[id]))) {
                paidDates[id] = d;
            }
        });
    });

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
    const totalBookingAmount = openTickets.reduce((sum, t) => sum + (t.ticketAmount || 0), 0);
    const totalFare = openTickets.reduce((sum, t) => sum + (t.bookingAmount || 0), 0);
    // Profit: ticketAmount - bookingAmount (refunds do NOT reduce profit)
    const totalProfit = openTickets.reduce((sum, t) => sum + (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)), 0);
    const totalRefundAmount = openTickets.reduce((sum, t) => sum + (t.refund || 0), 0);
    const refundedTicketsCount = openTickets.filter(t => (t.refund || 0) > 0).length;

    // Calculate account breakdown (OPEN tickets only)
    const getAccountBreakdown = () => {
        const accountTotals: Record<string, { amount: number; refund: number; due: number; profit: number; count: number }> = {};
        openTickets.forEach(ticket => {
            const acc = ticket.account;
            if (!accountTotals[acc]) {
                accountTotals[acc] = { amount: 0, refund: 0, due: 0, profit: 0, count: 0 };
            }
            const amt = Number(ticket.ticketAmount || 0);
            const ref = Number(ticket.refund || 0);
            accountTotals[acc].amount += amt;
            accountTotals[acc].refund += ref;
            accountTotals[acc].due += Math.max(0, amt - ref);
            accountTotals[acc].profit += (Number(ticket.ticketAmount || 0) - Number(ticket.bookingAmount || 0));
            accountTotals[acc].count += 1;
        });
        return accountTotals;
    };

    const accountBreakdown = getAccountBreakdown();

    // Simplified cohesive styling for Account Breakdown rows handled via zebra + hover classes

    const exportReport = async () => {
        if (tickets.length === 0) {
            alert('No tickets to export');
            return;
        }
        // Export only OPEN tickets (exclude paid)
        const onlyOpen = openTickets;
        // Apply account filter to export if a specific account is selected
        const filteredForExport = accountFilter === 'all'
            ? onlyOpen
            : onlyOpen.filter(t => t.account === accountFilter);
        if (filteredForExport.length === 0) {
            alert('No tickets to export for the selected account/date range');
            return;
        }
        // Build filename: Account-BookingStartDate-EndDate
        const accounts = Array.from(new Set(filteredForExport.map(t => t.account)));
        const accountLabel = accountFilter !== 'all'
            ? accountFilter
            : (accounts.length === 1 ? accounts[0] : 'AllAccounts');
        const start = filteredForExport.length > 0 ? filteredForExport
            .map(t => t.bookingDate)
            .sort()[0] : '';
        const end = filteredForExport.length > 0 ? filteredForExport
            .map(t => t.bookingDate)
            .sort()
            .slice(-1)[0] : '';
        const startLabel = start ? start.split('T')[0] : 'ALL';
        const endLabel = end ? end.split('T')[0] : 'ALL';
        const filename = `${accountLabel}-${startLabel}-${endLabel}.pdf`;
        await downloadPDFReport(filteredForExport, {
            accountLabel,
            startLabel,
            endLabel,
            filename,
        });
    };

    // Suggestions for TicketForm
    const existingAccounts = Array.from(new Set((tickets || []).map(t => t.account).filter(Boolean)));
    const existingServices = Array.from(new Set((tickets || []).map(t => t.service).filter(Boolean)));
    const existingPnrs = Array.from(new Set((tickets || []).map(t => t.pnr).filter(Boolean)));

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
            <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden">
                {/* Gradient header (match Vehicles) */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-6 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">Dashboard</h2>
                            <p className="text-white/90 mt-1">Overview of your travel tickets and profits</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Date Range Selector */}
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 sm:px-4 sm:py-2 text-sm text-white ring-1 ring-white/30">
                                <Calendar className="w-4 h-4" />
                                <select
                                    value={quickRange}
                                    onChange={(e) => handleQuickRangeChange(e.target.value)}
                                    className="bg-transparent text-sm sm:text-md text-white focus:outline-none"
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
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-emerald-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Create Ticket
                            </button>
                            <button
                                onClick={exportReport}
                                className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-indigo-600 hover:to-blue-700 ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export Report
                            </button>
                        </div>
                    </div>
                </div>
                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Dashboard widgets: OPEN tickets only */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8">
                        <div className="bg-purple-50 p-4 rounded-lg border-t-4 border-purple-500">
                            <h3 className="text-sm font-medium text-purple-600">Total Ticket Amount</h3>
                            <p className="text-2xl font-bold text-purple-900">₹{Math.round(totalBookingAmount).toLocaleString()}</p>
                            <p className="text-xs text-purple-600">{openTickets.length} open tickets</p>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-lg border-t-4 border-indigo-500">
                            <h3 className="text-sm font-medium text-indigo-600">Total Booking Amount</h3>
                            <p className="text-2xl font-bold text-indigo-900">₹{Math.round(totalFare).toLocaleString()}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border-t-4 border-green-500">
                            <h3 className="text-sm font-medium text-green-600">Total Profit</h3>
                            <p className="text-2xl font-bold text-green-900">₹{Math.round(totalProfit).toLocaleString()}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border-t-4 border-red-500">
                            <h3 className="text-sm font-medium text-red-600">Total Refund</h3>
                            <p className="text-2xl font-bold text-red-900">₹{Math.round(totalRefundAmount).toLocaleString()}</p>
                            <p className="text-xs text-red-600">{refundedTicketsCount} tickets refunded</p>
                        </div>
                    </div>

                    {/* Account Breakdown (OPEN tickets only) */}
                    <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden border-t-4 border-indigo-500">
                        <div className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Account Breakdown
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto max-h-[50vh] relative">
                                <table className="w-full table-auto text-sm">
                                    <thead className="sticky top-0 z-10 bg-gradient-to-r from-indigo-50 to-blue-100 border-b border-indigo-200">
                                        <tr>
                                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Account</th>
                                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Tickets</th>
                                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Total Amount</th>
                                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Refund</th>
                                            <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-medium text-gray-600 uppercase tracking-wider">Amount Due</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {Object.entries(accountBreakdown).map(([account, totals]) => (
                                            <tr
                                                key={account}
                                                className={`transition-colors odd:bg-white even:bg-indigo-50 hover:bg-indigo-100 ${accountFilter === account ? 'ring-2 ring-indigo-400' : ''}`}
                                            >
                                                <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap font-medium text-gray-900">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectAccountFromBreakdown(account)}
                                                        className={`text-left hover:underline focus:outline-none ${accountFilter === account ? 'text-indigo-700' : ''}`}
                                                        aria-label={`Filter tickets by account ${account}`}
                                                        title="Click to filter tickets by this account"
                                                    >
                                                        {account}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-gray-900">{totals.count}</td>
                                                <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-gray-900">₹{Math.round(totals.amount).toLocaleString()}</td>
                                                <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-red-700">₹{Math.round(totals.refund).toLocaleString()}</td>
                                                <td className="px-3 py-3 sm:px-4 sm:py-4 whitespace-nowrap font-semibold text-indigo-700">₹{Math.round(Math.max(0, totals.amount - totals.refund)).toLocaleString()}</td>
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
                    </div>

                    {/* OPEN tickets table */}
                    <TicketTable
                        tickets={tickets}
                        paidTickets={paidTicketIds}
                        paidDates={paidDates}
                        onDeleteTicket={onDeleteTicket}
                        onUpdateTicket={onUpdateTicket}
                        onProcessRefund={onProcessRefund}
                        onMarkAsPaid={onMarkAsPaid}
                        onBulkMarkAsPaid={onBulkMarkAsPaid}
                        loading={loading}
                        dateRange={dateRange}
                        accountFilter={accountFilter}
                        onAccountFilterChange={setAccountFilter}
                        view="open"
                    />

                    {/*No Tickets - will display create tickets form */}
                    {tickets.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <BarChart3 className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
                            <p className="text-gray-600">Add your first travel ticket to get started</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto">
                    <div className="bg-white w-full max-w-5xl rounded-lg shadow-lg p-0 sm:p-0 m-4 my-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-medium">Create New Ticket</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="px-4 sm:px-6 py-4">
                            <TicketForm
                                onAddTicket={handleAddTicketFromModal}
                                loading={loading}
                                existingAccounts={existingAccounts}
                                existingServices={existingServices}
                                existingPnrs={existingPnrs}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
