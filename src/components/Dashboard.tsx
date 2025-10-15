import { BarChart3, Calendar, Download, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiPayment, ApiTicket } from '../services/api';
import { useDateRange } from '../context/useDateRange';
import { downloadPDFReport } from '../utils/reportGenerator';
import TicketTable from './TicketTable';
import TicketForm from './TicketForm';
import CustomersDetails from './CustomersDetails';
import OverviewPanels from './OverviewPanels';

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
    const [showCustomersDetails, setShowCustomersDetails] = useState(false);
    const [accountFilter, setAccountFilter] = useState<string>('all');
    const [exportingTickets, setExportingTickets] = useState(false);
    const [showExportToast, setShowExportToast] = useState(false);
    const exportToastTimer = useRef<number | null>(null);

    // Cleanup toast timer on unmount
    useEffect(() => {
        return () => {
            if (exportToastTimer.current) {
                window.clearTimeout(exportToastTimer.current);
                exportToastTimer.current = null;
            }
        };
    }, []);
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

    const openTickets = dateFilteredTickets.filter(t => !paidTicketIds.includes(t._id || ''));
    const totalBookingAmount = openTickets.reduce((sum, t) => sum + (t.ticketAmount || 0), 0); // total ticket amount
    const totalFare = openTickets.reduce((sum, t) => sum + (t.bookingAmount || 0), 0); // total booking amount
    // Profit: ticketAmount - bookingAmount (refunds do NOT reduce profit)
    const totalProfit = openTickets.reduce((sum, t) => sum + (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)), 0);
    const totalRefundAmount = openTickets.reduce((sum, t) => sum + (t.refund || 0), 0);
    const refundedTicketsCount = openTickets.filter(t => (t.refund || 0) > 0).length;
    // Total partial payments within same date window (align with account breakdown logic)
    const fromDateKP = parseLocalDate(dateRange.from);
    const toDateKP = parseLocalDate(dateRange.to);
    const totalPartialPaid = payments.filter(p => p.isPartial).filter(p => {
        const d = parseLocalDate(p.date) || new Date(p.date);
        if (fromDateKP && d < fromDateKP) return false;
        if (toDateKP && d > toDateKP) return false;
        return true;
    }).reduce((s, p) => s + Number(p.amount || 0), 0);
    // Remaining due formula: total ticket - refund - partial (>=0)
    const totalRemainingDue = Math.max(0, totalBookingAmount - totalRefundAmount - totalPartialPaid);

    // Account breakdown computation moved to OverviewPanels

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
        setExportingTickets(true);
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
        try {
            // Compute partial payments within same date window for included accounts
            const fromDate = parseLocalDate(dateRange.from);
            const toDate = parseLocalDate(dateRange.to);
            const includedAccounts = new Set(filteredForExport.map(t => t.account));
            const partialTotal = payments.filter(p => p.isPartial && p.account && includedAccounts.has(p.account)).filter(p => {
                const d = parseLocalDate(p.date) || new Date(p.date);
                if (fromDate && d < fromDate) return false;
                if (toDate && d > toDate) return false;
                return true;
            }).reduce((s, p) => s + Number(p.amount || 0), 0);
            await downloadPDFReport(filteredForExport, {
                accountLabel,
                startLabel,
                endLabel,
                filename,
                partialTotal,
            });
        } finally {
            setExportingTickets(false);
            setShowExportToast(true);
            if (exportToastTimer.current) window.clearTimeout(exportToastTimer.current);
            exportToastTimer.current = window.setTimeout(() => setShowExportToast(false), 5000);
        }
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
                        <h2 className="text-2xl font-semibold text-white">Dashboard</h2>
                        <div>
                            {/* Export confirmation popup */}
                            {showExportToast && (
                                <div className="fixed top-6 right-6 z-50">
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold">✓</div>
                                        <div className="text-sm text-gray-800">Tickets exported successfully.</div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (exportToastTimer.current) {
                                                    window.clearTimeout(exportToastTimer.current);
                                                    exportToastTimer.current = null;
                                                }
                                                setShowExportToast(false);
                                            }}
                                            className="ml-2 px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
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
                                disabled={exportingTickets}
                                className={`bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2 ${exportingTickets ? 'opacity-70 cursor-not-allowed' : 'hover:from-indigo-600 hover:to-blue-700'}`}
                                title={exportingTickets ? 'Exporting…' : 'Export Report'}
                            >
                                {exportingTickets ? (
                                    <span className="flex items-center gap-2">
                                        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Exporting…
                                    </span>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Export Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Body */}
                <div className="p-4 space-y-6">
                    <OverviewPanels
                        metrics={{
                            totalRemainingDue,
                            totalPartialPaid,
                            totalBookingAmount,
                            totalFare,
                            totalProfit,
                            totalRefundAmount,
                            refundedTicketsCount,
                        }}
                        openTickets={openTickets}
                        payments={payments}
                        dateRange={dateRange}
                        accountFilter={accountFilter}
                        onSelectAccount={handleSelectAccountFromBreakdown}
                    />

                    {/* OPEN tickets table */}
                    <TicketTable
                        tickets={tickets}
                        paidTickets={paidTicketIds}
                        payments={payments}
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
                        headerVariant="accountBreakdown"
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

            {/* Floating Names button (Meta-like ring) */}
            {!showCustomersDetails && (
                <button
                    type="button"
                    onClick={() => setShowCustomersDetails(true)}
                    aria-label="Customers"
                    title="Customers"
                    className="fixed bottom-24 right-5 z-40 active:scale-95 transition-transform"
                >
                    <span className="relative block h-14 w-14">
                        <span className="absolute inset-0 rounded-full p-[3px] bg-[conic-gradient(at_50%_50%,#10b981_0deg,#06b6d4_90deg,#7c3aed_180deg,#4f46e5_270deg,#10b981_360deg)] animate-[spin_4s_linear_infinite] shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                            <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-md text-[10px] font-semibold">
                                    Customers
                                </span>
                            </span>
                        </span>
                    </span>
                </button>
            )}

            {!showCreateModal && (
                <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    aria-label="Create Ticket"
                    title="Create Ticket"
                    className="fixed bottom-6 right-5 z-40 active:scale-95 transition-transform"
                >
                    <span className="relative block h-14 w-14">
                        <span className="absolute inset-0 rounded-full p-[3px] bg-[conic-gradient(at_50%_50%,#4f46e5_0deg,#7c3aed_90deg,#06b6d4_180deg,#10b981_270deg,#4f46e5_360deg)] animate-[spin_4s_linear_infinite] shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                            <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-md">
                                    <Plus className="w-5 h-5" />
                                </span>
                            </span>
                        </span>
                    </span>
                </button>
            )}

            {/* Customers Popup Modal */}
            <CustomersDetails open={showCustomersDetails} onClose={() => setShowCustomersDetails(false)} existingAccounts={existingAccounts} />

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-5xl m-4 my-8">
                        {/* Gradient border wrapper for colorful feel */}
                        <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-500 shadow-2xl">
                            <div className="bg-white rounded-2xl max-h-[90vh] flex flex-col">
                                {/* Gradient header with larger close icon */}
                                <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm">
                                    <h3 className="text-lg sm:text-xl font-semibold tracking-wide">Create New Ticket</h3>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        aria-label="Close"
                                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                {/* Subtle decorative top bar under header */}
                                <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-400" />

                                <div className="px-4 sm:px-6 py-4 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(99,102,241,0.08),transparent_70%)] flex-1 overflow-y-auto touch-pan-y [-webkit-overflow-scrolling:touch]">
                                    <TicketForm
                                        onAddTicket={handleAddTicketFromModal}
                                        loading={loading}
                                        existingAccounts={existingAccounts}
                                        existingServices={existingServices}
                                        existingPnrs={existingPnrs}
                                        hideHeading
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
