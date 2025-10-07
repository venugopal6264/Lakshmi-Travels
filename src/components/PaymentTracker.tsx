import { Calendar, DollarSign, Download, Plane, Train, Bus, Layers } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ApiPayment, ApiTicket } from '../services/api';
import TicketTable from './TicketTable';

interface PaymentTrackerProps {
  payments: ApiPayment[];
  tickets: ApiTicket[];
  onAddPayment: (payment: Omit<ApiPayment, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  // New: allow creating tickets from here (for refund-as-open flow)
  onAddTicket: (ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  // New: allow deleting tickets from Paid view too
  onDeleteTicket: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function PaymentTracker({
  payments,
  tickets,
  onAddPayment,
  onAddTicket,
  onDeleteTicket,
  loading = false
}: PaymentTrackerProps) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [breakdownScope, setBreakdownScope] = useState<'all' | 'open' | 'paid'>('all');
  const [paymentData, setPaymentData] = useState({
    date: '',
    amount: '',
    period: '',
    account: '',
    isPartial: false
  });
  const [accountDueInfo, setAccountDueInfo] = useState<{ ticketTotal: number; refundTotal: number; partialTotal: number; remainingDue: number } | null>(null);

  // Local date filter (independent of Dashboard): default from Jan 1st of current year to today
  const toIso = (d: Date) => {
    // Normalize to local YYYY-MM-DD (avoid timezone shifting when using toISOString)
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().split('T')[0];
  };
  const today = new Date();
  const janFirst = new Date(today.getFullYear(), 0, 1);
  const [from, setFrom] = useState<string>(toIso(janFirst));
  const [to, setTo] = useState<string>(toIso(today));
  // Export UI state (CSV export)
  const [exportingPayments, setExportingPayments] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);
  const exportToastTimer = useRef<number | null>(null);
  useEffect(() => {
    // Ensure from <= to
    if (new Date(from) > new Date(to)) {
      setFrom(to);
    }
  }, [from, to]);
  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (exportToastTimer.current) {
        window.clearTimeout(exportToastTimer.current);
        exportToastTimer.current = null;
      }
    };
  }, []);

  // Prepare local date boundaries
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  // Filter tickets by date range
  const dateFilteredTickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.bookingDate);
    if (fromDate && ticketDate < fromDate) return false;
    if (toDate && ticketDate > toDate) return false;
    return true;
  });

  // Filter payments by date range for paid aggregates
  const dateFilteredPayments = payments.filter(p => {
    const payDate = new Date(p.date);
    if (fromDate && payDate < fromDate) return false;
    if (toDate && payDate > toDate) return false;
    return true;
  });

  // Build paid ticket IDs within date range (for per-range views)
  const paidTicketIds = React.useMemo(() => dateFilteredPayments.flatMap(p => p.tickets || []), [dateFilteredPayments]);
  // Global set of all paid ticket IDs (across all payments) for gating add-payment logic
  const allPaidTicketIds = React.useMemo(() => new Set<string>(payments.flatMap(p => p.tickets || [])), [payments]);
  // Open tickets = tickets not referenced by any payment (still unpaid)
  const openTickets = React.useMemo(() => tickets.filter(t => !allPaidTicketIds.has(t._id || '')), [tickets, allPaidTicketIds]);
  // Accounts having at least one open ticket
  const openAccounts = React.useMemo(() => Array.from(new Set(openTickets.map(t => t.account))).sort(), [openTickets]);

  // Payments are listed below; add per-account widgets

  // (Removed legacy all-accounts list; breakdown uses dateFilteredTickets directly)

  // Helper: compute per-account aggregates for All/Open/Paid subsets
  const breakdowns = React.useMemo(() => {
    type Agg = {
      booking: number;
      ticket: number;
      profit: number;
      refund: number;
      paid: number;
      due: number;
      count: number;
    };
    const empty = (): Agg => ({ booking: 0, ticket: 0, profit: 0, refund: 0, paid: 0, due: 0, count: 0 });

    // Prepare helpers
    const makeTotals = (map: Record<string, Agg>) => Object.values(map).reduce((acc, v) => {
      acc.booking += v.booking;
      acc.ticket += v.ticket;
      acc.profit += v.profit;
      acc.refund += v.refund;
      acc.paid += v.paid;
      acc.due += v.due;
      acc.count += v.count;
      return acc;
    }, empty());
    // Build paid ticket set (across filtered payments) and per-account tickets list
    const paidTicketIds = new Set<string>(dateFilteredPayments.flatMap((p) => p.tickets || []));
    const ticketsByAccount: Record<string, ApiTicket[]> = {};
    dateFilteredTickets.forEach((t) => {
      const a = t.account || '';
      if (!a) return;
      (ticketsByAccount[a] ||= []).push(t);
    });

    // Map account -> total partial payment amount (payments marked isPartial)
    const partialCredits: Record<string, number> = {};
    dateFilteredPayments.forEach(p => {
      if (p.isPartial && p.account) {
        partialCredits[p.account] = (partialCredits[p.account] || 0) + Number(p.amount || 0);
      }
    });

    const computeScope = (scope: 'all' | 'open' | 'paid') => {
      const map: Record<string, Agg> = {};
      Object.entries(ticketsByAccount).forEach(([a, ts]) => {
        let considered: ApiTicket[] = ts;
        if (scope === 'open') considered = ts.filter((t) => !paidTicketIds.has(t._id || ''));
        if (scope === 'paid') considered = ts.filter((t) => paidTicketIds.has(t._id || ''));

        const agg = empty();
        considered.forEach((t) => {
          agg.booking += Number(t.bookingAmount || 0);
          agg.ticket += Number(t.ticketAmount || 0);
          // Profit: ticketAmount - bookingAmount (ignore refunds)
          agg.profit += (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0));
          agg.refund += Number(t.refund || 0);
          agg.count += 1;
        });
        // Amount paid based on paid tickets' ticketAmount
        const paidTicketPortion = ts
          .filter((t) => paidTicketIds.has(t._id || ''))
          .reduce((s, t) => s + Number(t.ticketAmount || 0), 0);
        const partialCredit = partialCredits[a] || 0; // does not increase ticket count
        if (scope === 'all') {
          agg.paid = paidTicketPortion + partialCredit;
          // Due reduced by partial credits; include refunds
          agg.due = Math.max(0, (agg.ticket - paidTicketPortion - partialCredit)) + agg.refund;
        } else if (scope === 'open') {
          agg.paid = 0;
          // Open scope: show unpaid ticket amounts minus partial credit (not below 0) + refunds
          agg.due = Math.max(0, agg.ticket - partialCredit) + agg.refund;
        } else {
          // paid scope
          agg.paid = agg.ticket + partialCredit; // tickets fully paid plus partial credit counted
          // Surface refunds (still due to pay out) minus any unused partial credit (if partial credit exceeds refunds, clamp)
          agg.due = Math.max(0, agg.refund - partialCredit);
        }
        map[a] = agg;
      });
      return { byAccount: map, totals: makeTotals(map) };
    };

    return {
      all: computeScope('all'),
      open: computeScope('open'),
      paid: computeScope('paid'),
    };
  }, [dateFilteredTickets, dateFilteredPayments]);

  // Removed unused legacy totals in favor of per-account aggregates

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      // If full payment: attach all currently open tickets for selected account so they become paid.
      let attachTickets: string[] = [];
      if (!paymentData.isPartial && paymentData.account) {
        attachTickets = openTickets.filter(t => t.account === paymentData.account && t._id).map(t => t._id!)
      }
      await onAddPayment({
        date: paymentData.date,
        amount: parseFloat(paymentData.amount),
        period: paymentData.period,
        account: paymentData.account,
        tickets: attachTickets,
        isPartial: paymentData.isPartial
      });
      setPaymentData({ date: '', amount: '', period: '', account: '', isPartial: false });
      setShowAddPayment(false);
    } catch (error) {
      console.error('Failed to add payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // When account selection changes, compute due metrics for that account
  useEffect(() => {
    // Clear account if it no longer has open tickets
    if (paymentData.account && !openAccounts.includes(paymentData.account)) {
      setPaymentData(prev => ({ ...prev, account: '', amount: '', isPartial: false }));
      setAccountDueInfo(null);
      return;
    }
    if (!paymentData.account) {
      setAccountDueInfo(null);
      return;
    }
    const related = openTickets.filter(t => t.account === paymentData.account);
    const ticketTotal = related.reduce((s, t) => s + Number(t.ticketAmount || 0), 0);
    const refundTotal = related.reduce((s, t) => s + Number(t.refund || 0), 0);
    const partialTotal = payments.filter(p => p.isPartial && p.account === paymentData.account)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const remainingDue = Math.max(0, ticketTotal - refundTotal - partialTotal);
    setAccountDueInfo({ ticketTotal, refundTotal, partialTotal, remainingDue });
  }, [paymentData.account, openTickets, openAccounts, payments]);

  // One-time auto-fill amount with due when account changes (user can clear/edit freely afterwards)
  const prevAccountRef = useRef<string | null>(null);
  useEffect(() => {
    if (!paymentData.account || !accountDueInfo) return;
    if (prevAccountRef.current !== paymentData.account) {
      setPaymentData(prev => ({ ...prev, amount: accountDueInfo.remainingDue ? accountDueInfo.remainingDue.toString() : '', isPartial: false }));
      prevAccountRef.current = paymentData.account;
    }
  }, [paymentData.account, accountDueInfo]);

  // Auto toggle partial/full when amount changes relative to due
  useEffect(() => {
    if (!accountDueInfo) return;
    if (paymentData.amount === '') return;
    const amt = parseFloat(paymentData.amount);
    if (!isFinite(amt)) return;
    const isFull = Math.abs(amt - accountDueInfo.remainingDue) < 0.0001;
    setPaymentData(prev => ({ ...prev, isPartial: !isFull }));
  }, [paymentData.amount, accountDueInfo]);

  // Totals for payments are now shown on Dashboard

  // Profit by type for selected account scope
  const typeProfit = {
    train: dateFilteredTickets.filter(t => t.type === 'train').reduce((s, t) => s + (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)), 0),
    bus: dateFilteredTickets.filter(t => t.type === 'bus').reduce((s, t) => s + (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)), 0),
    flight: dateFilteredTickets.filter(t => t.type === 'flight').reduce((s, t) => s + (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0)), 0),
  };

  // Overall totals for current date range
  const totalsAll = React.useMemo(() => {
    let ticket = 0, booking = 0, refund = 0, profit = 0, count = 0, refundedCount = 0;
    for (const t of dateFilteredTickets) {
      const ta = Number(t.ticketAmount || 0);
      const ba = Number(t.bookingAmount || 0);
      const rf = Number(t.refund || 0);
      ticket += ta;
      booking += ba;
      refund += rf;
      profit += (ta - ba);
      count += 1;
      if (rf > 0) refundedCount += 1;
    }
    return { ticket, booking, refund, profit, count, refundedCount };
  }, [dateFilteredTickets]);

  // Monthly performance (tickets and profit per type)
  const monthlyStats = React.useMemo(() => {
    type Row = {
      key: string;
      label: string;
      trainCount: number; trainProfit: number;
      flightCount: number; flightProfit: number;
      busCount: number; busProfit: number;
      totalProfit: number; totalTickets: number;
    };
    const map: Record<string, Row> = {};
    dateFilteredTickets.forEach((t) => {
      const d = new Date(t.bookingDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
      if (!map[key]) {
        map[key] = {
          key, label,
          trainCount: 0, trainProfit: 0,
          flightCount: 0, flightProfit: 0,
          busCount: 0, busProfit: 0,
          totalProfit: 0, totalTickets: 0,
        };
      }
      const profitNet = (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0));
      map[key].totalProfit += profitNet;
      map[key].totalTickets += 1;
      if (t.type === 'train') { map[key].trainCount += 1; map[key].trainProfit += profitNet; }
      else if (t.type === 'flight') { map[key].flightCount += 1; map[key].flightProfit += profitNet; }
      else if (t.type === 'bus') { map[key].busCount += 1; map[key].busProfit += profitNet; }
    });
    const rows = Object.entries(map)
      .sort(([a], [b]) => (a < b ? 1 : -1)) // desc by month
      .map(([, v]) => v);
    const totals = rows.reduce((acc, r) => {
      acc.trainCount += r.trainCount; acc.trainProfit += r.trainProfit;
      acc.flightCount += r.flightCount; acc.flightProfit += r.flightProfit;
      acc.busCount += r.busCount; acc.busProfit += r.busProfit;
      acc.totalProfit += r.totalProfit; acc.totalTickets += r.totalTickets;
      return acc;
    }, { trainCount: 0, trainProfit: 0, flightCount: 0, flightProfit: 0, busCount: 0, busProfit: 0, totalProfit: 0, totalTickets: 0 });
    return { rows, totals };
  }, [dateFilteredTickets]);

  // Map ticket id -> ticket for deriving account when missing on old payments
  const ticketById = React.useMemo(() => {
    const m: Record<string, ApiTicket> = {};
    for (const t of tickets) {
      if (t._id) m[t._id] = t;
    }
    return m;
  }, [tickets]);

  // Sort payment history by date descending (most recent first)
  const sortedPayments = React.useMemo(() => {
    return [...dateFilteredPayments].sort((a, b) => {
      const ad = new Date(a.date).getTime();
      const bd = new Date(b.date).getTime();
      return bd - ad;
    });
  }, [dateFilteredPayments]);

  // Helper to compute per-payment aggregates from its tickets
  const aggregatesForPayment = React.useCallback((p: ApiPayment) => {
    let ticketSum = 0;
    let refundSum = 0;
    let profitNetSum = 0;
    let count = 0;
    for (const id of p.tickets || []) {
      const t = ticketById[id];
      if (!t) continue;
      ticketSum += Number(t.ticketAmount || 0);
      refundSum += Number(t.refund || 0);
      profitNetSum += (Number(t.ticketAmount || 0) - Number(t.bookingAmount || 0));
      count += 1;
    }
    return { ticketSum, refundSum, profitNetSum, count };
  }, [ticketById]);


  const exportPaymentReport = () => {
    setExportingPayments(true);
    try {
      const csvContent = [
        ['Date', 'Amount', 'Period'],
        ...dateFilteredPayments.map(p => [p.date, p.amount.toString(), p.period])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-report-${from}-to-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPayments(false);
      setShowExportToast(true);
      if (exportToastTimer.current) window.clearTimeout(exportToastTimer.current);
      exportToastTimer.current = window.setTimeout(() => setShowExportToast(false), 5000);
    }
  };

  // Handle refund for a paid ticket: create a new OPEN refund ticket with zero amounts
  const handleRefundForPaidTicket = async (id: string, refundData: { refund: number; refundDate: string; refundReason: string }) => {
    const base = tickets.find(t => t._id === id);
    if (!base) return;
    const refundAmt = Number(refundData.refund || 0);
    const refundDateStr = refundData.refundDate || new Date().toISOString().split('T')[0];
    // Create a new ticket record carrying the refund
    const payload: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'> = {
      ticketAmount: 0,
      bookingAmount: 0,
      profit: 0,
      refund: refundAmt,
      refundDate: refundDateStr,
      refundReason: refundData.refundReason || `Refund for ${base.pnr}`,
      type: base.type,
      service: base.service,
      account: base.account,
      bookingDate: refundDateStr,
      passengerName: `${base.passengerName}`,
      place: base.place,
      pnr: `Paid-${base.pnr}`,
      remarks: `Refund created from paid ticket ${base._id}`,
    };
    await onAddTicket(payload);
    // Optional UX: alert user
    setTimeout(() => {
      alert('Refund ticket created under Open Tickets.');
    }, 50);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden mb-6">
      {/* Colorful header to match Vehicles page */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment Tracker
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportPaymentReport}
              disabled={exportingPayments}
              className={`bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2 ${exportingPayments ? 'opacity-70 cursor-not-allowed' : 'hover:from-indigo-600 hover:to-blue-700'}`}
              title={exportingPayments ? 'Exporting…' : 'Export Report'}
            >
              {exportingPayments ? (
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
            <button
              onClick={() => setShowAddPayment(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-emerald-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm transition duration-200"
            >
              Add Payment
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Local Date Filter (independent of Dashboard) */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 p-3 rounded-md border border-indigo-100">
          <div>
            <label className="block text-xs font-medium text-indigo-800 mb-1">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-indigo-800 mb-1">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>
          <div className="flex items-end">
            <div className="text-xs text-indigo-700 bg-white/60 px-3 py-2 rounded border border-indigo-200">
              Showing data between <span className="font-semibold">{from}</span> and <span className="font-semibold">{to}</span>
            </div>
          </div>
        </div>

        {/* Summary widgets (date-filtered tickets) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8 mb-6">
          <div className="bg-indigo-50 p-4 rounded-lg border-t-4 border-indigo-500">
            <h3 className="text-sm font-medium text-indigo-600">Total Booking Amount</h3>
            <p className="text-2xl font-bold text-indigo-900">₹{Math.round(totalsAll.booking).toLocaleString()}</p>
            <p className="text-xs text-indigo-600">{totalsAll.count} tickets</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border-t-4 border-purple-500">
            <h3 className="text-sm font-medium text-purple-600">Total Ticket Amount</h3>
            <p className="text-2xl font-bold text-purple-900">₹{Math.round(totalsAll.ticket).toLocaleString()}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border-t-4 border-green-500">
            <h3 className="text-sm font-medium text-green-600">Total Profit</h3>
            <p className="text-2xl font-bold text-green-900">₹{Math.round(totalsAll.profit).toLocaleString()}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border-t-4 border-red-500">
            <h3 className="text-sm font-medium text-red-600">Total Refund</h3>
            <p className="text-2xl font-bold text-red-900">₹{Math.round(totalsAll.refund).toLocaleString()}</p>
            <p className="text-xs text-red-600">{totalsAll.refundedCount} tickets refunded</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-sky-100 p-4 rounded-lg flex items-center justify-between border border-blue-100 border-t-4 border-t-blue-500">
            <div>
              <h3 className="text-sm font-medium text-blue-600">Train Profit</h3>
              <p className="text-2xl font-bold text-blue-900">₹{Math.round(typeProfit.train).toLocaleString()}</p>
            </div>
            <Train className="w-6 h-6 text-blue-600" />
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg flex items-center justify-between border border-green-100 border-t-4 border-t-green-500">
            <div>
              <h3 className="text-sm font-medium text-green-600">Bus Profit</h3>
              <p className="text-2xl font-bold text-green-900">₹{Math.round(typeProfit.bus).toLocaleString()}</p>
            </div>
            <Bus className="w-6 h-6 text-green-600" />
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-100 p-4 rounded-lg flex items-center justify-between border border-purple-100 border-t-4 border-t-purple-500">
            <div>
              <h3 className="text-sm font-medium text-purple-600">Flight Profit</h3>
              <p className="text-2xl font-bold text-purple-900">₹{Math.round(typeProfit.flight).toLocaleString()}</p>
            </div>
            <Plane className="w-6 h-6 text-purple-600" />
          </div>
        </div>

        {/* Paid Tickets Table (moved from Dashboard) */}
        <div className="mt-6">
          <TicketTable
            tickets={dateFilteredTickets}
            paidTickets={paidTicketIds}
            onDeleteTicket={onDeleteTicket}
            onUpdateTicket={async () => { }}
            onProcessRefund={handleRefundForPaidTicket}
            onMarkAsPaid={async () => { }}
            onBulkMarkAsPaid={async () => { }}
            loading={loading}
            dateRange={{ from, to }}
            view="paid" payments={[]} />
        </div>

        {/* Combined Account Breakdown with scope toggle */}
        <div className="bg-white rounded-lg shadow-md p-4 border-t-4 border-t-indigo-500">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Account Breakdown
            </h3>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded border ${breakdownScope === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setBreakdownScope('all')}
              >All</button>
              <button
                className={`px-3 py-1 rounded border ${breakdownScope === 'open' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setBreakdownScope('open')}
              >Open</button>
              <button
                className={`px-3 py-1 rounded border ${breakdownScope === 'paid' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setBreakdownScope('paid')}
              >Paid</button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] relative rounded-md">
            <table className="w-full table-auto">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                  <th className="px-3 py-2 text-left font-semibold uppercase">Account</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">Tickets</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">Booking Amount</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">Ticket Amount</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">Profit</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">Amount Paid</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">Due Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white text-xs">
                {Object.entries(breakdowns[breakdownScope].byAccount).map(([account, v]) => (
                  <tr key={account} className="odd:bg-blue-50 even:bg-emerald-50 hover:brightness-95">
                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-800">{account}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{v.count}</td>
                    <td className="px-3 py-2 whitespace-nowrap">₹{Math.round(v.booking).toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap">₹{Math.round(v.ticket).toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-purple-900">₹{Math.round(v.profit).toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-green-700 font-medium">₹{Math.round(v.paid).toLocaleString()}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${v.due > 0 ? 'text-orange-700 font-semibold' : 'text-green-700 font-semibold'}`}>₹{Math.round(Math.max(0, v.due)).toLocaleString()}</td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 font-semibold text-xs">
                  <td className="px-3 py-2">Totals</td>
                  <td className="px-3 py-2">{breakdowns[breakdownScope].totals.count}</td>
                  <td className="px-3 py-2">₹{Math.round(breakdowns[breakdownScope].totals.booking).toLocaleString()}</td>
                  <td className="px-3 py-2">₹{Math.round(breakdowns[breakdownScope].totals.ticket).toLocaleString()}</td>
                  <td className="px-3 py-2 text-purple-900">₹{Math.round(breakdowns[breakdownScope].totals.profit).toLocaleString()}</td>
                  <td className="px-3 py-2 text-green-700">₹{Math.round(breakdowns[breakdownScope].totals.paid).toLocaleString()}</td>
                  <td className="px-3 py-2">₹{Math.round(Math.max(0, breakdowns[breakdownScope].totals.due)).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            {Object.keys(breakdowns[breakdownScope].byAccount).length === 0 && (
              <div className="text-center py-6 text-gray-500">No accounts in range.</div>
            )}
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="bg-white rounded-lg shadow-md p-4 mt-6 border-t-4 border-t-purple-500">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Monthly Performance
            </h3>
            <div className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded border border-purple-200">Filtered: {from} → {to}</div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] relative rounded-md">
            <table className="w-full table-auto">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-purple-700 to-violet-700 text-white">
                  <th rowSpan={2} className="px-3 py-2 text-left font-semibold uppercase align-middle">Month</th>
                  <th rowSpan={2} className="px-3 py-2 text-left font-semibold uppercase align-middle">Total Profit</th>
                  <th rowSpan={2} className="px-3 py-2 text-left font-semibold uppercase align-middle">Total Tickets</th>
                  <th colSpan={2} className="px-3 py-2 text-center align-middle font-semibold uppercase">Train</th>
                  <th colSpan={2} className="px-3 py-2 text-center align-middle font-semibold uppercase">Flight</th>
                  <th colSpan={2} className="px-3 py-2 text-center align-middle font-semibold uppercase">Bus</th>
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
                  <tr key={r.key} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-violet-50'} hover:brightness-95`}>
                    <td className="px-3 py-2 font-semibold text-gray-800">{r.label}</td>
                    <td className="px-3 py-2 text-purple-900 font-medium">₹{Math.round(r.totalProfit).toLocaleString()}</td>
                    <td className="px-3 py-2 font-medium">{r.totalTickets}</td>
                    <td className="px-3 py-2">{r.trainCount}</td>
                    <td className="px-3 py-2 text-blue-900">₹{Math.round(r.trainProfit).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.flightCount}</td>
                    <td className="px-3 py-2 text-purple-900">₹{Math.round(r.flightProfit).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.busCount}</td>
                    <td className="px-3 py-2 text-emerald-900">₹{Math.round(r.busProfit).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-gradient-to-r from-violet-50 to-purple-50 font-semibold text-xs">
                  <td className="px-3 py-2">Totals</td>
                  <td className="px-3 py-2 text-purple-900">₹{Math.round(monthlyStats.totals.totalProfit).toLocaleString()}</td>
                  <td className="px-3 py-2">{monthlyStats.totals.totalTickets}</td>
                  <td className="px-3 py-2">{monthlyStats.totals.trainCount}</td>
                  <td className="px-3 py-2 text-blue-900">₹{Math.round(monthlyStats.totals.trainProfit).toLocaleString()}</td>
                  <td className="px-3 py-2">{monthlyStats.totals.flightCount}</td>
                  <td className="px-3 py-2 text-purple-900">₹{Math.round(monthlyStats.totals.flightProfit).toLocaleString()}</td>
                  <td className="px-3 py-2">{monthlyStats.totals.busCount}</td>
                  <td className="px-3 py-2 text-emerald-900">₹{Math.round(monthlyStats.totals.busProfit).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            {monthlyStats.rows.length === 0 && (
              <div className="text-center py-6 text-gray-500">No tickets in range.</div>
            )}
          </div>
        </div>

        {showAddPayment && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto p-4 flex items-center justify-center">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Add Payment
                  </h3>
                  <p className="text-emerald-50 text-xs mt-0.5">Record a full or partial payment for an account.</p>
                </div>
                <button
                  onClick={() => setShowAddPayment(false)}
                  className="text-white/80 hover:text-white transition"
                  aria-label="Close"
                >✕</button>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6 overflow-y-auto max-h-[70vh]">
                {/* Account (only those with open tickets) */}
                <div className="flex flex-col gap-1 group">
                  <label className="text-xs font-semibold tracking-wide text-gray-600 group-focus-within:text-emerald-600">Account (open tickets only)</label>
                  <select
                    value={paymentData.account}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, account: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                    disabled={openAccounts.length === 0}
                  >
                    <option value="" disabled>{openAccounts.length === 0 ? 'No open accounts' : 'Select account'}</option>
                    {openAccounts.map(account => (
                      <option key={account} value={account}>{account}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">Accounts fully paid are hidden.</p>
                </div>
                {/* Field Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Date */}
                  <div className="flex flex-col gap-1 group">
                    <label className="text-xs font-semibold tracking-wide text-gray-600 group-focus-within:text-emerald-600">Payment Date</label>
                    <input
                      type="date"
                      value={paymentData.date}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      required
                    />
                  </div>
                  {/* Amount */}
                  <div className="flex flex-col gap-1 group">
                    <label className="text-xs font-semibold tracking-wide text-gray-600 group-focus-within:text-emerald-600">Amount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 1200"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      required
                    />
                  </div>
                  {/* Period */}
                  <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2 group">
                    <label className="text-xs font-semibold tracking-wide text-gray-600 group-focus-within:text-emerald-600">Period</label>
                    <input
                      type="text"
                      value={paymentData.period}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, period: e.target.value }))}
                      placeholder="e.g., Jan 1 - Jan 15 2025"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      required
                    />
                  </div>

                </div>
                {/* Partial Toggle moved to next line */}
                {!!paymentData.account && (
                  <div className="flex flex-col gap-2 group">
                    <label className="text-xs font-semibold tracking-wide text-gray-600">Partial Payment</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentData(p => ({ ...p, isPartial: !p.isPartial }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 ${paymentData.isPartial ? 'bg-emerald-600' : 'bg-gray-300'}`}
                        aria-pressed={paymentData.isPartial}
                        disabled={!accountDueInfo || accountDueInfo.remainingDue === 0}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${paymentData.isPartial ? 'translate-x-5' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className="text-xs text-gray-600">
                        {paymentData.isPartial ? 'Marked as partial' : 'Mark if amount doesn\'t settle all open tickets'}
                      </span>
                    </div>
                  </div>
                )}
                {/* Due Summary Box */}
                <div className="grid gap-4">
                  {accountDueInfo && paymentData.account && (
                    <div className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50/70 p-3">
                      <div className="flex flex-wrap gap-4 text-[11px] font-medium">
                        <div className="px-2 py-1 rounded bg-white/70 border border-emerald-200 text-emerald-700">Ticket Total: ₹{Math.round(accountDueInfo.ticketTotal).toLocaleString()}</div>
                        <div className="px-2 py-1 rounded bg-white/70 border border-emerald-200 text-emerald-700">Refund Total: ₹{Math.round(accountDueInfo.refundTotal).toLocaleString()}</div>
                        <div className="px-2 py-1 rounded bg-white/70 border border-amber-300 text-amber-700">Partial Paid: ₹{Math.round(accountDueInfo.partialTotal).toLocaleString()}</div>
                        <div className="px-2 py-1 rounded bg-emerald-600 text-white border border-emerald-700 shadow-sm">Remaining Due: ₹{Math.round(accountDueInfo.remainingDue).toLocaleString()}</div>
                        <div className="px-2 py-1 rounded border text-xs font-semibold tracking-wide ${paymentData.isPartial ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-emerald-500 bg-emerald-100 text-emerald-700'}">
                          {paymentData.isPartial ? 'Partial Payment' : 'Full Payment'}
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-800 leading-relaxed">
                        {paymentData.isPartial ? 'Amount entered is less than Remaining Due. It will be saved as a partial payment.' : 'Amount matches Remaining Due. This will be saved as a full payment.'}
                      </div>
                    </div>
                  )}
                  {/* Helper / Guidance */}
                  <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50/60 p-3 text-[11px] leading-relaxed text-emerald-800 flex flex-col gap-1">
                    <div className="font-semibold text-emerald-700">Guidance</div>
                    <div>Use Partial Payment when the client pays less than the total outstanding ticket amount. Full allocation to specific tickets will be supported in a future enhancement.</div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition"
                  >Cancel</button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-md shadow hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 text-sm font-semibold"
                  >
                    {submitting && <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {submitting ? 'Saving...' : 'Add Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mt-6 border-t-4 border-t-green-500">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-green-700">Payment History</h2>
          </div>
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
                    <th className="px-3 py-2 text-left font-semibold uppercase">Account</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase">Amount Received Date</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase">No. of Tickets</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase">Amount Received</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase">Ticket Amount</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase">Profit</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase">Refund</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white text-xs">
                  {sortedPayments.map((p, idx) => {
                    // Derive account if missing
                    let accLabel: string = p.account || '';
                    if (!accLabel) {
                      const accs = new Set<string>();
                      for (const id of p.tickets || []) {
                        const t = ticketById[id];
                        if (t?.account) accs.add(t.account);
                      }
                      if (accs.size === 1) accLabel = Array.from(accs)[0];
                      else if (accs.size > 1) accLabel = 'Multiple';
                      else accLabel = '—';
                    }
                    const agg = aggregatesForPayment(p);
                    // Odd rows white, even rows light green
                    const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-green-50';
                    const typeLabel = p.isPartial ? 'Partial' : 'Full';
                    return (
                      <tr key={p._id || idx} className={`${rowBg} hover:brightness-95 ${p.isPartial ? 'border-l-4 border-l-amber-500' : ''}`}>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">{accLabel}</td>
                        <td className="px-3 py-2 whitespace-nowrap flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500" />{new Date(p.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{agg.count}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-green-700">₹{Math.round(agg.ticketSum - agg.refundSum).toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">₹{Math.round(agg.ticketSum).toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-emerald-800">₹{Math.round(agg.profitNetSum).toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-red-700">₹{Math.round(agg.refundSum).toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-[10px] font-semibold ${p.isPartial ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{typeLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-gradient-to-r from-emerald-50 to-green-50 font-semibold text-xs">
                    <td className="px-3 py-2">Totals</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2">{sortedPayments.reduce((s, p) => s + aggregatesForPayment(p).count, 0)}</td>
                    <td className="px-3 py-2 text-green-700">₹{Math.round(sortedPayments.reduce((s, p) => s + (aggregatesForPayment(p).ticketSum - aggregatesForPayment(p).refundSum), 0)).toLocaleString()}</td>
                    <td className="px-3 py-2">₹{Math.round(sortedPayments.reduce((s, p) => s + aggregatesForPayment(p).ticketSum, 0)).toLocaleString()}</td>
                    <td className="px-3 py-2 text-emerald-800">₹{Math.round(sortedPayments.reduce((s, p) => s + aggregatesForPayment(p).profitNetSum, 0)).toLocaleString()}</td>
                    <td className="px-3 py-2 text-red-700">₹{Math.round(sortedPayments.reduce((s, p) => s + aggregatesForPayment(p).refundSum, 0)).toLocaleString()}</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Export confirmation popup */}
      {showExportToast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold">✓</div>
            <div className="text-sm text-gray-800">Payments report exported.</div>
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
  );
}
