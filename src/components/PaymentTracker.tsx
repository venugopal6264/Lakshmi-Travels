import { Calendar, DollarSign, Download, Plane, Train, Bus, Layers } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ApiPayment, ApiTicket } from '../services/api';

interface PaymentTrackerProps {
  payments: ApiPayment[];
  tickets: ApiTicket[];
  onAddPayment: (payment: Omit<ApiPayment, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  loading?: boolean;
}

export default function PaymentTracker({
  payments,
  tickets,
  onAddPayment,
  loading = false
}: PaymentTrackerProps) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [breakdownScope, setBreakdownScope] = useState<'all' | 'open' | 'paid'>('all');
  const [paymentData, setPaymentData] = useState({
    date: '',
    amount: '',
    period: '',
    account: ''
  });

  // Local date filter (independent of Dashboard): default last 1 month
  const toIso = (d: Date) => d.toISOString().split('T')[0];
  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const [from, setFrom] = useState<string>(toIso(oneMonthAgo));
  const [to, setTo] = useState<string>(toIso(today));
  useEffect(() => {
    // Ensure from <= to
    if (new Date(from) > new Date(to)) {
      setFrom(to);
    }
  }, [from, to]);

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

  // Payments are listed below; add per-account widgets

  // Get unique accounts from tickets
  const accounts = Array.from(new Set(dateFilteredTickets.map(ticket => ticket.account)));

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
          agg.profit += Number(t.profit || 0); // profit as stored
          agg.refund += Number(t.refund || 0);
          agg.count += 1;
        });
        // Amount paid based on paid tickets' ticketAmount
        const paidSumForAccount = ts
          .filter((t) => paidTicketIds.has(t._id || ''))
          .reduce((s, t) => s + Number(t.ticketAmount || 0), 0);
        if (scope === 'all') {
          agg.paid = paidSumForAccount;
          agg.due = agg.ticket - agg.paid; // due = all ticket - paid tickets
        } else if (scope === 'open') {
          agg.paid = 0;
          agg.due = agg.ticket; // all considered are unpaid
        } else {
          // paid scope
          agg.paid = agg.ticket; // all considered are paid tickets
          agg.due = 0;
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
      await onAddPayment({
        date: paymentData.date,
        amount: parseFloat(paymentData.amount),
        period: paymentData.period,
        account: paymentData.account,
        tickets: []
      });
      setPaymentData({ date: '', amount: '', period: '', account: '' });
      setShowAddPayment(false);
    } catch (error) {
      console.error('Failed to add payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Totals for payments are now shown on Dashboard

  // Profit by type for selected account scope
  const typeProfit = {
    train: dateFilteredTickets.filter(t => t.type === 'train').reduce((s, t) => s + (t.profit - (t.refund || 0)), 0),
    bus: dateFilteredTickets.filter(t => t.type === 'bus').reduce((s, t) => s + (t.profit - (t.refund || 0)), 0),
    flight: dateFilteredTickets.filter(t => t.type === 'flight').reduce((s, t) => s + (t.profit - (t.refund || 0)), 0),
  };

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
      const profitNet = Number(t.profit || 0) - Number(t.refund || 0);
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


  const exportPaymentReport = () => {
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
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Payment Tracker
        </h2>
        <div className="flex gap-2">
          <button
            onClick={exportPaymentReport}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition duration-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button
            onClick={() => setShowAddPayment(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition duration-200"
          >
            Add Payment
          </button>
        </div>
      </div>

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


      {/* Profit by Type (moved from Dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-sky-100 p-4 rounded-lg flex items-center justify-between border border-blue-100">
          <div>
            <h3 className="text-sm font-medium text-blue-600">Train Profit</h3>
            <p className="text-2xl font-bold text-blue-900">₹{Math.round(typeProfit.train).toLocaleString()}</p>
          </div>
          <Train className="w-6 h-6 text-blue-600" />
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg flex items-center justify-between border border-green-100">
          <div>
            <h3 className="text-sm font-medium text-green-600">Bus Profit</h3>
            <p className="text-2xl font-bold text-green-900">₹{Math.round(typeProfit.bus).toLocaleString()}</p>
          </div>
          <Bus className="w-6 h-6 text-green-600" />
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-fuchsia-100 p-4 rounded-lg flex items-center justify-between border border-purple-100">
          <div>
            <h3 className="text-sm font-medium text-purple-600">Flight Profit</h3>
            <p className="text-2xl font-bold text-purple-900">₹{Math.round(typeProfit.flight).toLocaleString()}</p>
          </div>
          <Plane className="w-6 h-6 text-purple-600" />
        </div>
      </div>

      {/* Combined Account Breakdown with scope toggle */}
      <div className="bg-white rounded-lg shadow-md p-4">
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
          <table className="w-full table-auto text-sm">
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
            <tbody className="divide-y divide-white">
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
              <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 font-semibold">
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
      <div className="bg-white rounded-lg shadow-md p-4 mt-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Monthly Performance
          </h3>
          <div className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded border border-purple-200">Filtered: {from} → {to}</div>
        </div>
        <div className="overflow-x-auto max-h-[60vh] relative rounded-md">
          <table className="w-full table-auto text-sm">
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
            <tbody className="divide-y divide-white">
              {monthlyStats.rows.map((r, idx) => (
                <tr key={r.key} className={`${idx % 2 === 0 ? 'bg-violet-50' : 'bg-purple-50'} hover:brightness-95`}>
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
              <tr className="bg-gradient-to-r from-violet-50 to-purple-50 font-semibold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Add New Payment</h3>
              <button onClick={() => setShowAddPayment(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentData.date}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <input
                    type="text"
                    value={paymentData.period}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, period: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Jan 1-15, 2025"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                  <select
                    value={paymentData.account}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, account: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="" disabled>Select account</option>
                    {accounts.map(account => (
                      <option key={account} value={account}>{account}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPayment(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition duration-200 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-800">Payment History</h3>
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
            <table className="w-full table-auto text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
                  <th className="px-3 py-2 text-left font-semibold uppercase">Account</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">Amount Received Date</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">No. of Tickets</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase">Tickets Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white">
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
                  const rowBg = idx % 2 === 0 ? 'bg-green-50' : 'bg-emerald-50';
                  return (
                    <tr key={p._id || idx} className={`${rowBg} hover:brightness-95`}>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">{accLabel}</td>
                      <td className="px-3 py-2 whitespace-nowrap flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500" />{new Date(p.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{(p.tickets || []).length}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-semibold text-green-700">₹{Math.round(Number(p.amount || 0)).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-gradient-to-r from-emerald-50 to-green-50 font-semibold">
                  <td className="px-3 py-2">Totals</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2">{sortedPayments.reduce((s, p) => s + (p.tickets?.length || 0), 0)}</td>
                  <td className="px-3 py-2 text-green-700">₹{Math.round(sortedPayments.reduce((s, p) => s + Number(p.amount || 0), 0)).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
