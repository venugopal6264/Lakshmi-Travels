import { Calendar, DollarSign, Download, Plane, Train, Bus } from 'lucide-react';
import React, { useState } from 'react';
import { useDateRange } from '../context/useDateRange';
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
  const { dateRange } = useDateRange();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [paymentData, setPaymentData] = useState({
    date: '',
    amount: '',
    period: '',
    account: ''
  });

  // Prepare date boundaries once
  const fromDate = dateRange.from ? new Date(dateRange.from) : null;
  const toDate = dateRange.to ? new Date(dateRange.to) : null;

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

  // Helper: compute aggregates by account
  const aggregates = React.useMemo(() => {
    type Agg = { booking: number; profit: number; paid: number; due: number; count: number };
    const empty = (): Agg => ({ booking: 0, profit: 0, paid: 0, due: 0, count: 0 });

    const paidTicketIds = new Set<string>(dateFilteredPayments.flatMap(p => p.tickets));
    const openTickets = dateFilteredTickets.filter(t => !paidTicketIds.has(t._id || ''));
    const closedTickets = dateFilteredTickets.filter(t => paidTicketIds.has(t._id || ''));

    const openByAccount: Record<string, Agg> = {};
    const closedByAccount: Record<string, Agg> = {};

    const addTicket = (map: Record<string, Agg>, t: ApiTicket) => {
      const a = t.account;
      if (!map[a]) map[a] = empty();
  map[a].booking += (t.ticketAmount || 0);
  map[a].profit += (t.profit - (t.refund || 0));
      map[a].count += 1;
    };

    openTickets.forEach(t => addTicket(openByAccount, t));
    closedTickets.forEach(t => addTicket(closedByAccount, t));

    // Sum payments by account
    const paidByAccount: Record<string, number> = {};
    dateFilteredPayments.forEach(p => {
      const a = p.account || '';
      if (!a) return;
      paidByAccount[a] = (paidByAccount[a] || 0) + p.amount;
    });

    // For open accounts, paid is 0; due = profit
    Object.values(openByAccount).forEach(v => { v.paid = 0; v.due = v.profit; });
    // For closed accounts, paid comes from payments; due = profit - paid
    Object.entries(closedByAccount).forEach(([a, v]) => {
      v.paid = paidByAccount[a] || 0;
      v.due = v.profit - v.paid;
    });

    // Totals
    const sumAgg = (vals: Agg[]) => vals.reduce((acc, v) => ({
      booking: acc.booking + v.booking,
      profit: acc.profit + v.profit,
      paid: acc.paid + v.paid,
      due: acc.due + v.due,
      count: acc.count + v.count,
    }), empty());

    const totalsOpen = sumAgg(Object.values(openByAccount));
    const totalsClosed = sumAgg(Object.values(closedByAccount));

    return { openByAccount, closedByAccount, totalsOpen, totalsClosed };
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
        account: paymentData.account || (selectedAccount === 'all' ? '' : selectedAccount),
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
  const filteredForAccount = selectedAccount === 'all' ? dateFilteredTickets : dateFilteredTickets.filter(t => t.account === selectedAccount);
  const typeProfit = {
    train: filteredForAccount.filter(t => t.type === 'train').reduce((s, t) => s + (t.profit - (t.refund || 0)), 0),
    bus: filteredForAccount.filter(t => t.type === 'bus').reduce((s, t) => s + (t.profit - (t.refund || 0)), 0),
    flight: filteredForAccount.filter(t => t.type === 'flight').reduce((s, t) => s + (t.profit - (t.refund || 0)), 0),
  };

  const getNext15DayDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
  };

  const exportPaymentReport = () => {
    const csvContent = [
      ['Date', 'Amount', 'Period'],
      ...payments.map(p => [p.date, p.amount.toString(), p.period])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-report-${new Date().toISOString().split('T')[0]}.csv`;
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

      {/* Account Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Account
        </label>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Accounts</option>
          {accounts.map(account => (
            <option key={account} value={account}>{account}</option>
          ))}
        </select>
      </div>

      {/* Open Accounts Totals */}
      <div className="mb-4">
        <h3 className="text-md font-semibold text-gray-700 mb-2">Open Accounts Totals</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg"><h4 className="text-sm font-medium text-indigo-600">Booking</h4><p className="text-2xl font-bold text-indigo-900">₹{aggregates.totalsOpen.booking.toLocaleString()}</p></div>
          <div className="bg-green-50 p-4 rounded-lg"><h4 className="text-sm font-medium text-green-600">Profit</h4><p className="text-2xl font-bold text-green-900">₹{aggregates.totalsOpen.profit.toLocaleString()}</p></div>
          <div className="bg-blue-50 p-4 rounded-lg"><h4 className="text-sm font-medium text-blue-600">Paid</h4><p className="text-2xl font-bold text-blue-900">₹{aggregates.totalsOpen.paid.toLocaleString()}</p></div>
          <div className="bg-orange-50 p-4 rounded-lg"><h4 className="text-sm font-medium text-orange-600">Due</h4><p className="text-2xl font-bold text-orange-900">₹{aggregates.totalsOpen.due.toLocaleString()}</p></div>
        </div>
      </div>

      {/* Closed Accounts Totals */}
      <div className="mb-6">
        <h3 className="text-md font-semibold text-gray-700 mb-2">Closed Accounts Totals</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg"><h4 className="text-sm font-medium text-indigo-600">Booking</h4><p className="text-2xl font-bold text-indigo-900">₹{aggregates.totalsClosed.booking.toLocaleString()}</p></div>
          <div className="bg-green-50 p-4 rounded-lg"><h4 className="text-sm font-medium text-green-600">Profit</h4><p className="text-2xl font-bold text-green-900">₹{aggregates.totalsClosed.profit.toLocaleString()}</p></div>
          <div className="bg-blue-50 p-4 rounded-lg"><h4 className="text-sm font-medium text-blue-600">Paid</h4><p className="text-2xl font-bold text-blue-900">₹{aggregates.totalsClosed.paid.toLocaleString()}</p></div>
          <div className="bg-orange-50 p-4 rounded-lg"><h4 className="text-sm font-medium text-orange-600">Due</h4><p className="text-2xl font-bold text-orange-900">₹{aggregates.totalsClosed.due.toLocaleString()}</p></div>
        </div>
      </div>

      {/* Profit by Type (moved from Dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-600">Train Profit</h3>
            <p className="text-2xl font-bold text-blue-900">₹{typeProfit.train.toLocaleString()}</p>
          </div>
          <Train className="w-6 h-6 text-blue-600" />
        </div>
        <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-green-600">Bus Profit</h3>
            <p className="text-2xl font-bold text-green-900">₹{typeProfit.bus.toLocaleString()}</p>
          </div>
          <Bus className="w-6 h-6 text-green-600" />
        </div>
        <div className="bg-purple-50 p-4 rounded-lg flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-purple-600">Flight Profit</h3>
            <p className="text-2xl font-bold text-purple-900">₹{typeProfit.flight.toLocaleString()}</p>
          </div>
          <Plane className="w-6 h-6 text-purple-600" />
        </div>
      </div>

      {/* Account widgets: show Open and Closed sections separately when viewing all */}
      {selectedAccount === 'all' && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Open Accounts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(aggregates.openByAccount).map(([account, v]) => (
                <div key={account} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{account}</h4>
                    <span className="text-xs text-gray-500">{v.count} tickets</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-indigo-50 p-3 rounded">
                      <div className="text-indigo-600">Booking</div>
                      <div className="text-indigo-900 font-bold">₹{v.booking.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-green-600">Profit</div>
                      <div className="text-green-900 font-bold">₹{v.profit.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-blue-600">Paid</div>
                      <div className="text-blue-900 font-bold">₹{v.paid.toLocaleString()}</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="text-orange-600">Due</div>
                      <div className="text-orange-900 font-bold">₹{v.due.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Closed Accounts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(aggregates.closedByAccount).map(([account, v]) => (
                <div key={account} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{account}</h4>
                    <span className="text-xs text-gray-500">{v.count} tickets</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-indigo-50 p-3 rounded">
                      <div className="text-indigo-600">Booking</div>
                      <div className="text-indigo-900 font-bold">₹{v.booking.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-green-600">Profit</div>
                      <div className="text-green-900 font-bold">₹{v.profit.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-blue-600">Paid</div>
                      <div className="text-blue-900 font-bold">₹{v.paid.toLocaleString()}</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="text-orange-600">Due</div>
                      <div className="text-orange-900 font-bold">₹{v.due.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
                    value={paymentData.account || (selectedAccount !== 'all' ? selectedAccount : '')}
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
        {payments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{new Date(payment.date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600">{payment.period}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₹{payment.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded-md">
        <p className="text-sm text-yellow-800">
          <strong>Next Payment Due:</strong> {getNext15DayDate()} (15 days from today)
        </p>
      </div>
    </div>
  );
}
