import { Download, DollarSign, Plus, Receipt } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiPayment, ApiTicket } from '../../services/api';
import TicketTable from '../TicketTable';
import AddPaymentModal, { CreateTicketModal } from './AddPaymentModal';
import AccountBreakdown from './AccountBreakdown';
import ChartsRow from './ChartsRow';
import MonthlyPerformanceTable from './MonthlyPerformanceTable';
import PaidTicketWidgets from './PaidTicketWidgets';
import PaymentHistoryTable from './PaymentHistoryTable';

interface PaymentTrackerProps {
    payments: ApiPayment[];
    tickets: ApiTicket[];
    onAddPayment: (payment: Omit<ApiPayment, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onAddTicket: (ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onDeleteTicket: (id: string) => Promise<void>;
    loading?: boolean;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function toIso(d: Date): string {
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().split('T')[0];
}

function exportBtnClass(exporting: boolean): string {
    return `bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2 ${exporting ? 'opacity-70 cursor-not-allowed' : 'hover:from-indigo-600 hover:to-blue-700'
        }`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentTracker({
    payments,
    tickets,
    onAddPayment,
    onAddTicket,
    onDeleteTicket,
    loading = false,
}: PaymentTrackerProps) {
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showCreateTicket, setShowCreateTicket] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [breakdownScope, setBreakdownScope] = useState<'all' | 'open' | 'paid'>('all');
    const [paymentData, setPaymentData] = useState({
        date: '', amount: '', period: '', account: '', isPartial: false,
    });
    const [accountDueInfo, setAccountDueInfo] = useState<{
        ticketTotal: number; refundTotal: number; partialTotal: number; remainingDue: number;
    } | null>(null);
    const [paymentAccountFilter, setPaymentAccountFilter] = useState<string>('all');
    const [paymentTypeFilter, setPaymentTypeFilter] = useState<'partial' | 'full'>('full');

    const today = new Date();
    const janFirst = new Date(2025, 0, 1);
    const [from, setFrom] = useState<string>(toIso(janFirst));
    const [to, setTo] = useState<string>(toIso(today));

    const [exportingPayments, setExportingPayments] = useState(false);
    const [showExportToast, setShowExportToast] = useState(false);
    const exportToastTimer = useRef<number | null>(null);

    useEffect(() => {
        if (new Date(from) > new Date(to)) setFrom(to);
    }, [from, to]);

    useEffect(() => {
        return () => {
            if (exportToastTimer.current) {
                window.clearTimeout(exportToastTimer.current);
                exportToastTimer.current = null;
            }
        };
    }, []);

    // ─── Derived data ──────────────────────────────────────────────────────────

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const dateFilteredTickets = tickets.filter(ticket => {
        const d = new Date(ticket.bookingDate);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
    });

    const dateFilteredPayments = payments.filter(p => {
        const d = new Date(p.date);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
    });

    const paymentAccounts = React.useMemo(() => {
        const set = new Set<string>();
        for (const p of dateFilteredPayments) { if (p.account) set.add(p.account); }
        return Array.from(set).sort();
    }, [dateFilteredPayments]);

    const accountFilteredPayments = React.useMemo(() => {
        let arr = dateFilteredPayments;
        if (paymentAccountFilter !== 'all') arr = arr.filter(p => p.account === paymentAccountFilter);
        arr = arr.filter(p => (paymentTypeFilter === 'partial' ? !!p.isPartial : !p.isPartial));
        return arr;
    }, [dateFilteredPayments, paymentAccountFilter, paymentTypeFilter]);

    const monthlyPayments = React.useMemo(() => {
        type Row = { key: string; label: string; amount: number };
        const map: Record<string, Row> = {};
        for (const p of accountFilteredPayments) {
            const d = new Date(p.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.toLocaleString(undefined, { month: 'short' })} ${String(d.getFullYear()).slice(-2)}`;
            if (!map[key]) map[key] = { key, label, amount: 0 };
            map[key].amount += Number(p.amount || 0);
        }
        const rows = Object.values(map).sort((a, b) => (a.key > b.key ? -1 : 1));
        return { rows, total: rows.reduce((s, r) => s + r.amount, 0) };
    }, [accountFilteredPayments]);

    const maxMonthlyReceived = React.useMemo(
        () => Math.max(1, ...monthlyPayments.rows.map(r => Math.max(0, Number(r.amount || 0)))),
        [monthlyPayments.rows]
    );

    const paidTicketIds = React.useMemo(
        () => dateFilteredPayments.flatMap(p => p.tickets || []),
        [dateFilteredPayments]
    );
    const allPaidTicketIds = React.useMemo(
        () => new Set<string>(payments.flatMap(p => p.tickets || [])),
        [payments]
    );
    const openTickets = React.useMemo(
        () => tickets.filter(t => !allPaidTicketIds.has(t._id || '')),
        [tickets, allPaidTicketIds]
    );
    const openAccounts = React.useMemo(
        () => Array.from(new Set(openTickets.map(t => t.account))).sort(),
        [openTickets]
    );

    const breakdowns = React.useMemo(() => {
        type Agg = { booking: number; ticket: number; profit: number; refund: number; paid: number; due: number; count: number };
        const empty = (): Agg => ({ booking: 0, ticket: 0, profit: 0, refund: 0, paid: 0, due: 0, count: 0 });
        const makeTotals = (map: Record<string, Agg>) =>
            Object.values(map).reduce((acc, v) => {
                acc.booking += v.booking; acc.ticket += v.ticket; acc.profit += v.profit;
                acc.refund += v.refund; acc.paid += v.paid; acc.due += v.due; acc.count += v.count;
                return acc;
            }, empty());

        const paidSet = new Set<string>(dateFilteredPayments.flatMap(p => p.tickets || []));
        const byAcc: Record<string, ApiTicket[]> = {};
        dateFilteredTickets.forEach(t => { const a = t.account || ''; if (!a) return; (byAcc[a] ||= []).push(t); });
        const partialCredits: Record<string, number> = {};
        dateFilteredPayments.forEach(p => {
            if (p.isPartial && p.account) partialCredits[p.account] = (partialCredits[p.account] || 0) + Number(p.amount || 0);
        });

        const computeScope = (scope: 'all' | 'open' | 'paid') => {
            const map: Record<string, Agg> = {};
            Object.entries(byAcc).forEach(([a, ts]) => {
                let considered = ts;
                if (scope === 'open') considered = ts.filter(t => !paidSet.has(t._id || ''));
                if (scope === 'paid') considered = ts.filter(t => paidSet.has(t._id || ''));
                const agg = empty();
                considered.forEach(t => {
                    agg.booking += Number(t.bookingAmount || 0); agg.ticket += Number(t.ticketAmount || 0);
                    agg.profit += (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0));
                    agg.refund += Number(t.refund || 0); agg.count += 1;
                });
                const paidPortion = considered.filter(t => paidSet.has(t._id || '')).reduce((s, t) => s + Number(t.ticketAmount || 0), 0);
                const partial = partialCredits[a] || 0;
                if (scope === 'all') {
                    agg.paid = paidPortion + partial;
                    const unpaid = considered.filter(t => !paidSet.has(t._id || '')).reduce((s, t) => s + Number(t.ticketAmount || 0), 0);
                    agg.due = Math.max(0, unpaid - partial) + agg.refund;
                } else if (scope === 'open') {
                    agg.paid = 0; agg.due = Math.max(0, agg.ticket - partial) + agg.refund;
                } else {
                    agg.paid = paidPortion + partial; agg.due = Math.max(0, agg.refund - partial);
                }
                map[a] = agg;
            });
            return { byAccount: map, totals: makeTotals(map) };
        };
        return { all: computeScope('all'), open: computeScope('open'), paid: computeScope('paid') };
    }, [dateFilteredTickets, dateFilteredPayments]);

    const paidTickets = React.useMemo(
        () => dateFilteredTickets.filter(t => t._id && paidTicketIds.includes(t._id)),
        [dateFilteredTickets, paidTicketIds]
    );

    const totalsPaid = React.useMemo(() => {
        let ticket = 0, booking = 0, refund = 0, profit = 0, count = 0, refundedCount = 0;
        for (const t of paidTickets) {
            const ta = Number(t.ticketAmount || 0); const ba = Number(t.bookingAmount || 0); const rf = Number(t.refund || 0);
            ticket += ta; booking += ba; refund += rf; profit += (ta - ba); count += 1;
            if (rf > 0) refundedCount += 1;
        }
        return { ticket, booking, refund, profit, count, refundedCount };
    }, [paidTickets]);

    const paidTypeProfit = React.useMemo(() => ({
        train: paidTickets.filter(t => t.type === 'train').reduce((s, t) => s + (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)), 0),
        bus: paidTickets.filter(t => t.type === 'bus').reduce((s, t) => s + (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)), 0),
        flight: paidTickets.filter(t => t.type === 'flight').reduce((s, t) => s + (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)), 0),
    }), [paidTickets]);

    const ticketById = React.useMemo(() => {
        const m: Record<string, ApiTicket> = {};
        for (const t of tickets) { if (t._id) m[t._id] = t; }
        return m;
    }, [tickets]);

    const sortedPayments = React.useMemo(
        () => [...accountFilteredPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [accountFilteredPayments]
    );

    const aggregatesForPayment = useCallback((p: ApiPayment) => {
        let ticketSum = 0, refundSum = 0, profitNetSum = 0, count = 0;
        for (const id of p.tickets || []) {
            const t = ticketById[id]; if (!t) continue;
            ticketSum += Number(t.ticketAmount || 0); refundSum += Number(t.refund || 0);
            profitNetSum += (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)); count += 1;
        }
        return { ticketSum, refundSum, profitNetSum, count };
    }, [ticketById]);

    const monthlyStats = React.useMemo(() => {
        type Row = { key: string; label: string; trainCount: number; trainProfit: number; flightCount: number; flightProfit: number; busCount: number; busProfit: number; totalProfit: number; totalTickets: number };
        const map: Record<string, Row> = {};
        dateFilteredTickets.forEach(t => {
            const d = new Date(t.bookingDate);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.toLocaleString(undefined, { month: 'short' })} ${String(d.getFullYear()).slice(-2)}`;
            if (!map[key]) map[key] = { key, label, trainCount: 0, trainProfit: 0, flightCount: 0, flightProfit: 0, busCount: 0, busProfit: 0, totalProfit: 0, totalTickets: 0 };
            const profitNet = (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0));
            map[key].totalProfit += profitNet; map[key].totalTickets += 1;
            if (t.type === 'train') { map[key].trainCount += 1; map[key].trainProfit += profitNet; }
            else if (t.type === 'flight') { map[key].flightCount += 1; map[key].flightProfit += profitNet; }
            else if (t.type === 'bus') { map[key].busCount += 1; map[key].busProfit += profitNet; }
        });
        const rows = Object.values(map).sort((a, b) => (a.key < b.key ? 1 : -1));
        const totals = rows.reduce((acc, r) => {
            acc.trainCount += r.trainCount; acc.trainProfit += r.trainProfit;
            acc.flightCount += r.flightCount; acc.flightProfit += r.flightProfit;
            acc.busCount += r.busCount; acc.busProfit += r.busProfit;
            acc.totalProfit += r.totalProfit; acc.totalTickets += r.totalTickets;
            return acc;
        }, { trainCount: 0, trainProfit: 0, flightCount: 0, flightProfit: 0, busCount: 0, busProfit: 0, totalProfit: 0, totalTickets: 0 });
        return { rows, totals };
    }, [dateFilteredTickets]);

    const maxMonthlyProfit = React.useMemo(
        () => Math.max(1, ...monthlyStats.rows.map(r => Math.max(0, r.totalProfit))),
        [monthlyStats.rows]
    );

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const prevAccountRef = useRef<string | null>(null);

    useEffect(() => {
        if (paymentData.account && !openAccounts.includes(paymentData.account)) {
            setPaymentData(prev => ({ ...prev, account: '', amount: '', isPartial: false }));
            setAccountDueInfo(null); return;
        }
        if (!paymentData.account) { setAccountDueInfo(null); return; }
        const related = openTickets.filter(t => t.account === paymentData.account);
        const ticketTotal = related.reduce((s, t) => s + Number(t.ticketAmount || 0), 0);
        const refundTotal = related.reduce((s, t) => s + Number(t.refund || 0), 0);
        const partialTotal = payments.filter(p => p.isPartial && p.account === paymentData.account).reduce((s, p) => s + Number(p.amount || 0), 0);
        setAccountDueInfo({ ticketTotal, refundTotal, partialTotal, remainingDue: ticketTotal - refundTotal - partialTotal });
    }, [paymentData.account, openTickets, openAccounts, payments]);

    useEffect(() => {
        if (!paymentData.account || !accountDueInfo) return;
        if (prevAccountRef.current !== paymentData.account) {
            setPaymentData(prev => ({ ...prev, amount: accountDueInfo.remainingDue ? accountDueInfo.remainingDue.toString() : '', isPartial: false }));
            prevAccountRef.current = paymentData.account;
        }
    }, [paymentData.account, accountDueInfo]);

    useEffect(() => {
        if (!accountDueInfo || paymentData.amount === '') return;
        const amt = parseFloat(paymentData.amount);
        if (!isFinite(amt)) return;
        setPaymentData(prev => ({ ...prev, isPartial: Math.abs(amt - accountDueInfo.remainingDue) >= 0.0001 }));
    }, [paymentData.amount, accountDueInfo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const attachTickets = !paymentData.isPartial && paymentData.account
                ? openTickets.filter(t => t.account === paymentData.account && t._id).map(t => t._id!)
                : [];
            await onAddPayment({
                date: paymentData.date, amount: parseFloat(paymentData.amount),
                period: paymentData.period, account: paymentData.account,
                tickets: attachTickets, isPartial: paymentData.isPartial,
            });
            setPaymentData({ date: '', amount: '', period: '', account: '', isPartial: false });
            setShowAddPayment(false);
        } catch (error) {
            console.error('Failed to add payment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRefundForPaidTicket = async (id: string, refundData: { refund: number; refundDate: string; refundReason: string }) => {
        const base = tickets.find(t => t._id === id);
        if (!base) return;
        const refundDateStr = refundData.refundDate || new Date().toISOString().split('T')[0];
        await onAddTicket({
            ticketAmount: 0, bookingAmount: 0, profit: 0,
            refund: Number(refundData.refund || 0), refundDate: refundDateStr,
            refundReason: refundData.refundReason || `Refund for ${base.pnr}`,
            type: base.type, service: base.service, account: base.account,
            bookingDate: refundDateStr, passengerName: base.passengerName,
            place: base.place, pnr: `Paid-${base.pnr}`,
            remarks: `Refund created from paid ticket ${base._id}`,
        });
        setTimeout(() => { alert('Refund ticket created under Open Tickets.'); }, 50);
    };

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value);
    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value);
    const handlePaymentAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => setPaymentAccountFilter(e.target.value);
    const handleScopeAll = () => setBreakdownScope('all');
    const handleScopeOpen = () => setBreakdownScope('open');
    const handleScopePaid = () => setBreakdownScope('paid');
    const handleFilterPartial = () => setPaymentTypeFilter('partial');
    const handleFilterFull = () => setPaymentTypeFilter('full');
    const handlePaymentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setPaymentData(prev => ({ ...prev, date: e.target.value }));
    const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setPaymentData(prev => ({ ...prev, amount: e.target.value }));
    const handlePaymentPeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => setPaymentData(prev => ({ ...prev, period: e.target.value }));
    const handlePaymentAccountModalChange = (e: React.ChangeEvent<HTMLSelectElement>) => setPaymentData(prev => ({ ...prev, account: e.target.value }));
    const handleTogglePartial = () => setPaymentData(p => ({ ...p, isPartial: !p.isPartial }));
    const handleOpenAddPayment = () => setShowAddPayment(true);
    const handleCloseAddPayment = () => setShowAddPayment(false);
    const handleOpenCreateTicket = () => setShowCreateTicket(true);
    const handleCloseCreateTicket = () => setShowCreateTicket(false);
    const handleCreateTicketFromModal = async (ticketData: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => {
        await onAddTicket(ticketData);
        setShowCreateTicket(false);
    };
    const handleDismissExportToast = () => {
        if (exportToastTimer.current) { window.clearTimeout(exportToastTimer.current); exportToastTimer.current = null; }
        setShowExportToast(false);
    };

    const exportPaymentReport = () => {
        setExportingPayments(true);
        try {
            const csvContent = [
                ['Date', 'Amount', 'Period'],
                ...dateFilteredPayments.map(p => [p.date, p.amount.toString(), p.period]),
            ].map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `payment-report-${from}-to-${to}.csv`; a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExportingPayments(false);
            setShowExportToast(true);
            if (exportToastTimer.current) window.clearTimeout(exportToastTimer.current);
            exportToastTimer.current = window.setTimeout(() => setShowExportToast(false), 5000);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden mb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-2 py-2">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-3">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Reports
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 lg:bg-white/10 lg: lg:p-1 lg:rounded-lg lg:border lg:border-white/20">
                        <div className="flex items-center gap-2">
                            <label className="text-xs lg:text-sm font-medium text-white whitespace-nowrap">From</label>
                            <input type="date" value={from} onChange={handleFromChange} className="px-2 py-1.5 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-white/50 bg-white/95 text-xs lg:text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs lg:text-sm font-medium text-white whitespace-nowrap">To</label>
                            <input type="date" value={to} onChange={handleToChange} className="px-2 py-1.5 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-white/50 bg-white/95 text-xs lg:text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={exportPaymentReport} disabled={exportingPayments} className={exportBtnClass(exportingPayments)} title={exportingPayments ? 'Exporting…' : 'Export Report'}>
                            {exportingPayments ? (
                                <span className="flex items-center gap-2"><span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Exporting…</span>
                            ) : (
                                <><Download className="w-4 h-4" />Export Report</>
                            )}
                        </button>
                        <button onClick={handleOpenAddPayment} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-emerald-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm transition duration-200">
                            Add Payment
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-2">

                <PaidTicketWidgets totalsPaid={totalsPaid} paidTypeProfit={paidTypeProfit} />

                <ChartsRow
                    monthlyPayments={monthlyPayments}
                    maxMonthlyReceived={maxMonthlyReceived}
                    monthlyStats={monthlyStats}
                    maxMonthlyProfit={maxMonthlyProfit}
                    paymentAccountFilter={paymentAccountFilter}
                    paymentAccounts={paymentAccounts}
                    paymentTypeFilter={paymentTypeFilter}
                    from={from}
                    to={to}
                    onPaymentAccountChange={handlePaymentAccountChange}
                    onFilterPartial={handleFilterPartial}
                    onFilterFull={handleFilterFull}
                />

                <PaymentHistoryTable
                    sortedPayments={sortedPayments}
                    ticketById={ticketById}
                    loading={loading}
                    aggregatesForPayment={aggregatesForPayment}
                />

                <AccountBreakdown
                    breakdowns={breakdowns}
                    breakdownScope={breakdownScope}
                    onScopeAll={handleScopeAll}
                    onScopeOpen={handleScopeOpen}
                    onScopePaid={handleScopePaid}
                />

                <MonthlyPerformanceTable monthlyStats={monthlyStats} from={from} to={to} />

                <div className="mt-3">
                    <TicketTable
                        tickets={dateFilteredTickets}
                        paidTickets={paidTicketIds}
                        onDeleteTicket={onDeleteTicket}
                        onUpdateTicket={async () => { }}
                        onProcessRefund={handleRefundForPaidTicket}
                        onBulkMarkAsPaid={async () => { }}
                        loading={loading}
                        dateRange={{ from, to }}
                        view="paid"
                        payments={[]}
                    />
                </div>
            </div>

            {/* Export toast */}
            {showExportToast && (
                <div className="fixed bottom-6 right-6 z-50">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold">✓</div>
                        <div className="text-sm text-gray-800">Payments report exported.</div>
                        <button type="button" onClick={handleDismissExportToast} className="ml-2 px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100">Close</button>
                    </div>
                </div>
            )}

            {/* Floating Action Buttons */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
                <button type="button" title="Create Ticket" aria-label="Create Ticket" onClick={handleOpenCreateTicket}
                    className="w-14 h-14 rounded-full shadow-xl ring-2 ring-blue-400/50 flex items-center justify-center transition transform hover:scale-110 hover:shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff' }}>
                    <Receipt className="w-7 h-7" />
                </button>
                <button type="button" title="Create Payment" aria-label="Create Payment" onClick={handleOpenAddPayment}
                    className="w-14 h-14 rounded-full shadow-xl ring-2 ring-emerald-400/50 flex items-center justify-center transition transform hover:scale-110 hover:shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}>
                    <Plus className="w-7 h-7" />
                </button>
            </div>

            {/* Modals */}
            {showAddPayment && (
                <AddPaymentModal
                    paymentData={paymentData}
                    accountDueInfo={accountDueInfo}
                    openAccounts={openAccounts}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    onClose={handleCloseAddPayment}
                    onAccountChange={handlePaymentAccountModalChange}
                    onDateChange={handlePaymentDateChange}
                    onAmountChange={handlePaymentAmountChange}
                    onPeriodChange={handlePaymentPeriodChange}
                    onTogglePartial={handleTogglePartial}
                />
            )}
            {showCreateTicket && (
                <CreateTicketModal
                    submitting={submitting}
                    onClose={handleCloseCreateTicket}
                    onAddTicket={handleCreateTicketFromModal}
                />
            )}
        </div>
    );
}
