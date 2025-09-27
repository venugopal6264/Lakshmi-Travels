import { CheckCircle, Clock, DollarSign, Edit, Filter, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ApiTicket, ApiPayment } from '../services/api';
import EditTicketModal from './EditTicketModal';

interface TicketTableProps {
  tickets: ApiTicket[];
  paidTickets: string[];
  payments: ApiPayment[]; // needed for partial payment aggregation in bulk confirm modal
  onDeleteTicket: (id: string) => Promise<void>;
  onUpdateTicket: (id: string, ticketData: Partial<ApiTicket>) => Promise<void>;
  onProcessRefund: (id: string, refundData: { refund: number; refundDate: string; refundReason: string }) => Promise<void>;
  onMarkAsPaid: (ticketId: string) => Promise<void>;
  onBulkMarkAsPaid: (ticketIds: string[]) => Promise<void>;
  loading?: boolean;
  dateRange: { from: string; to: string };
  // Date range is controlled by parent; no handler here
  accountFilter?: string;
  onAccountFilterChange?: (value: string) => void;
  // Control which table(s) to show: open, paid, or both (default)
  view?: 'open' | 'paid' | 'both';
}

export default function TicketTable({
  tickets,
  paidTickets,
  payments,
  onDeleteTicket,
  onUpdateTicket,
  onProcessRefund,
  onBulkMarkAsPaid,
  loading = false,
  dateRange,
  accountFilter: accountFilterProp,
  onAccountFilterChange,
  view = 'both',
  // date handler removed
}: TicketTableProps) {
  // Lightweight SPA navigation helper (syncs with App's popstate listener)
  const navigateTo = (path: string) => {
    if (!path) return;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>(accountFilterProp ?? 'all');
  // Keep internal state in sync with controlled prop if provided
  useEffect(() => {
    if (accountFilterProp !== undefined && accountFilterProp !== accountFilter) {
      setAccountFilter(accountFilterProp);
    }
  }, [accountFilterProp, accountFilter]);
  const [sortField, setSortField] = useState<keyof ApiTicket>('bookingDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteTicket, setConfirmDeleteTicket] = useState<ApiTicket | null>(null);
  // per-row processing state removed as Mark as Paid button is hidden
  // Date filter is controlled in Dashboard header
  const [activeTable, setActiveTable] = useState<'open' | 'paid'>(view === 'paid' ? 'paid' : 'open');
  // Keep activeTable aligned if parent fixes the view
  useEffect(() => {
    if (view === 'open') setActiveTable('open');
    else if (view === 'paid') setActiveTable('paid');
  }, [view]);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [editingTicket, setEditingTicket] = useState<ApiTicket | null>(null);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [showConfirmBulk, setShowConfirmBulk] = useState<boolean>(false);
  // Fixed width for Passenger Name column (wrap content)
  const passengerColWidth = 160;

  // Theming: colorful styles for Open vs Paid tables
  const isOpenView = activeTable === 'open';
  const headerGradient = isOpenView
    ? 'bg-gradient-to-r from-amber-50 to-orange-100'
    : 'bg-gradient-to-r from-emerald-50 to-green-100';
  const headerBorder = isOpenView ? 'border-b border-orange-200' : 'border-b border-green-200';
  const titleColor = isOpenView ? 'text-orange-700' : 'text-green-700';
  const hoverRow = isOpenView ? 'hover:bg-orange-50/60' : 'hover:bg-green-50/60';
  const rowLeftBorder = isOpenView ? 'border-l-4 border-orange-400' : 'border-l-4 border-green-400';
  const totalsBg = isOpenView ? 'bg-orange-50' : 'bg-green-50';
  // Accent styling for inputs/selects based on view
  const controlBorder = isOpenView
    ? 'border-orange-300 focus:ring-orange-500 focus:border-orange-400'
    : 'border-green-300 focus:ring-green-500 focus:border-green-400';
  const controlIcon = isOpenView ? 'text-orange-400' : 'text-green-500';

  // Place column is now word-wrapped, not resizable

  // Filter tickets by date range
  const dateFilteredTickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.bookingDate);
    const fromDate = dateRange.from ? new Date(dateRange.from) : null;
    const toDate = dateRange.to ? new Date(dateRange.to) : null;

    if (fromDate && ticketDate < fromDate) return false;
    if (toDate && ticketDate > toDate) return false;
    return true;
  });

  // Segregate tickets into paid and unpaid
  const openTickets = dateFilteredTickets.filter(ticket =>
    !paidTickets.includes(ticket._id || '')
  );

  const paidTicketsData = dateFilteredTickets.filter(ticket =>
    paidTickets.includes(ticket._id || '')
  );

  const currentTickets = activeTable === 'open' ? openTickets : paidTicketsData;

  // Get unique accounts for filter dropdown based on the currently active table (open or paid)
  const uniqueAccounts = Array.from(new Set(currentTickets.map(ticket => ticket.account)));
  const uniqueServices = Array.from(new Set(tickets.map(ticket => ticket.service)));

  const filteredTickets = currentTickets.filter(ticket => {
    const matchesSearch =
      ticket.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.pnr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.place.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || ticket.type === filterType;
    const matchesAccount = accountFilter === 'all' || ticket.account === accountFilter;

    return matchesSearch && matchesFilter && matchesAccount;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  const totals = useMemo(() => {
    return filteredTickets.reduce(
      (acc, t) => {
        const ticketAmt = Number(t.ticketAmount || 0);
        const bookingAmt = Number(t.bookingAmount || 0);
        acc.count += 1;
        acc.ticketAmount += ticketAmt;
        acc.bookingAmount += bookingAmt;
        acc.refund += Number(t.refund || 0);
        // Profit definition: ticket amount - booking amount (refunds do NOT reduce profit)
        acc.profit += (ticketAmt - bookingAmt);
        return acc;
      },
      { count: 0, ticketAmount: 0, bookingAmount: 0, profit: 0, refund: 0 }
    );
  }, [filteredTickets]);

  const handleSort = (field: keyof ApiTicket) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    try {
      setDeletingId(id);
      await onDeleteTicket(id);
    } catch (error) {
      console.error('Failed to delete ticket:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // per-row mark-as-paid handler removed

  const handleBulkMarkAsPaid = async () => {
    if (selectedTickets.length === 0) return;

    try {
      setBulkLoading(true);
      await onBulkMarkAsPaid(selectedTickets);
      setSelectedTickets([]);
    } catch (error) {
      console.error('Failed to mark tickets as paid:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTickets.length === sortedTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(sortedTickets.map(ticket => ticket._id!));
    }
  };

  // Date range is provided by parent via props

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'train': return 'bg-blue-100 text-blue-800';
      case 'bus': return 'bg-green-100 text-green-800';
      case 'flight': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isRefunded = (ticket: ApiTicket) => {
    return Number(ticket.refund || 0) > 0;
  };
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${isOpenView ? 'border-t-4 border-orange-400' : 'border-t-4 border-green-500'}`}>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between sm:items-center mb-4">
        <h2 className={`text-xl font-semibold ${titleColor}`}>
          {activeTable === 'open' ? 'Open Tickets' : 'Paid Tickets'}
        </h2>
        <div className="flex items-center gap-2 sm:gap-4">
          {activeTable === 'open' && selectedTickets.length > 0 && (
            <button
              onClick={() => setShowConfirmBulk(true)}
              disabled={bulkLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              {bulkLoading ? (
                'Processing...'
              ) : (
                <>
                  Mark as Paid (<span>{selectedTickets.length}</span>)
                </>
              )}
            </button>
          )}
          <span className="text-sm text-green-600">
            {sortedTickets.length} of {currentTickets.length} tickets
          </span>
          {/* Cross-page quick toggle */}
          {view === 'open' && (
            <button
              type="button"
              onClick={() => navigateTo('/payment-tracker')}
              className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 transition flex items-center gap-1"
              title="Go to Paid Tickets"
            >
              <CheckCircle className="w-4 h-4" />
              Paid Tickets
            </button>
          )}
          {view === 'paid' && (
            <button
              type="button"
              onClick={() => navigateTo('/dashboard')}
              className="px-3 py-1.5 rounded-md bg-orange-500 text-white text-sm hover:bg-orange-600 transition flex items-center gap-1"
              title="Go to Open Tickets"
            >
              <Clock className="w-4 h-4" />
              Open Tickets
            </button>
          )}
        </div>
      </div>

      {/* Table Toggle (hidden when view is fixed) - profit always shown now */}
      {view === 'both' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTable('open')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${activeTable === 'open'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Clock className="w-4 h-4" />
            Open Tickets ({openTickets.length})
          </button>
          <button
            onClick={() => setActiveTable('paid')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${activeTable === 'paid'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <CheckCircle className="w-4 h-4" />
            Paid Tickets ({paidTicketsData.length})
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative w-full sm:flex-1">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${controlIcon}`} />
          <input
            type="text"
            placeholder="Search by passenger, PNR, or place..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-24 py-3 border rounded-md focus:outline-none focus:ring-2 text-lg ${controlBorder}`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:flex-none">
          <Filter className={`w-5 h-5 ${controlIcon}`} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`w-48 sm:w-52 px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 text-base ${controlBorder}`}
          >
            <option value="all">All Types</option>
            <option value="train">Train</option>
            <option value="bus">Bus</option>
            <option value="flight">Flight</option>
          </select>

          <select
            value={accountFilter}
            onChange={(e) => {
              const v = e.target.value;
              setAccountFilter(v);
              onAccountFilterChange?.(v);
            }}
            className={`w-56 sm:w-72 md:w-80 px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 text-base ${controlBorder}`}
          >
            <option value="all">All Accounts</option>
            {uniqueAccounts.map(account => (
              <option key={account} value={account}>{account}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`overflow-x-auto overflow-y-auto max-h-[60vh] relative pb-12`}>
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading tickets...</p>
          </div>
        )}

        <table className="w-full table-auto">
          <thead className={`sticky top-0 z-10 ${headerGradient} ${headerBorder}`}>
            <tr>
              {activeTable === 'open' && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedTickets.length === sortedTickets.length && sortedTickets.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {/* Account */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('account')}
              >
                Account {sortField === 'account' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Booking Date */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('bookingDate')}
              >
                B Date {sortField === 'bookingDate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* PNR */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PNR
              </th>
              {/* Passenger Name */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('passengerName')}
                style={{ width: passengerColWidth, minWidth: passengerColWidth, maxWidth: passengerColWidth }}
              >
                Passenger Name {sortField === 'passengerName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Ticket Amount */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ticketAmount')}
              >
                Ticket Amount {sortField === 'ticketAmount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Booking Amount */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking Amount
              </th>
              {/* Refund */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('refund')}
              >
                Refund {sortField === 'refund' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Profit */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('profit')}
              >
                Profit {sortField === 'profit' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Place */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none"
              >
                Place
              </th>
              {/* Service */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service
              </th>
              {/* Type */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('type')}
              >
                Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Actions */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>


            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-xs">
            {sortedTickets.map((ticket) => (
              <tr
                key={ticket._id}
                className={`${hoverRow} ${rowLeftBorder} transition-colors ${isRefunded(ticket) ? 'bg-red-50' : ''}`}
              >
                {activeTable === 'open' && (
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTickets.includes(ticket._id!)}
                      onChange={() => handleSelectTicket(ticket._id!)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                )}
                {/* Account */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                  {ticket.account}
                </td>
                {/* Booking Date */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                  {formatDate(ticket.bookingDate)}
                </td>
                {/* PNR */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900 font-mono">
                  {ticket.pnr}
                </td>
                {/* Passenger Name (wrap long names, fixed width) */}
                <td
                  className="px-4 py-4 text-xs text-gray-900 whitespace-normal break-words"
                  style={{ width: passengerColWidth, minWidth: passengerColWidth, maxWidth: passengerColWidth }}
                >
                  {ticket.passengerName}
                </td>
                {/* Ticket Amount */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                  ₹{Math.round(Number(ticket.ticketAmount || 0)).toLocaleString()}
                </td>
                {/* Booking Amount */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                  ₹{Math.round(Number(ticket.bookingAmount || 0)).toLocaleString()}
                </td>
                {/* Refund */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-red-600">
                  {Number(ticket.refund || 0) > 0 ? `₹${Math.round(Number(ticket.refund)).toLocaleString()}` : '₹0'}
                </td>
                {/* Profit (ticketAmount - bookingAmount; refund ignored) */}
                <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-green-600">
                  ₹{Math.round(Number(ticket.ticketAmount || 0) - Number(ticket.bookingAmount || 0)).toLocaleString()}
                </td>
                {/* Place display without spaces */}
                <td
                  className="px-4 py-4 text-xs text-gray-900 whitespace-normal break-words"
                  title={(ticket.place || '').replace(/\s+/g, '')}
                >
                  {(ticket.place || '').replace(/\s+/g, '')}
                </td>
                {/* Service */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                  {ticket.service || '-'}
                </td>
                {/* Type */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(ticket.type)}`}>
                    {ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTicket(ticket)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Edit ticket"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteTicket(ticket)}
                      disabled={deletingId === ticket._id}
                      className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                      title="Delete ticket"
                    >
                      {deletingId === ticket._id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Totals Row (sticky at bottom) */}
            <tr className={`${totalsBg} font-semibold sticky bottom-0 z-10 border-t border-gray-200 text-xs`}>
              {activeTable === 'open' && <td className="px-4 py-3"></td>}
              {/* Totals label spanning Account, Booking Date, PNR, Passenger Name */}
              <td className="px-4 py-3" colSpan={4}>Totals ({totals.count} tickets)</td>
              {/* Ticket and Booking totals */}
              <td className="px-4 py-3">₹{Math.round(totals.ticketAmount).toLocaleString()}</td>
              <td className="px-4 py-3">₹{Math.round(totals.bookingAmount).toLocaleString()}</td>
              {/* Refund total */}
              <td className="px-4 py-3 text-red-700">₹{Math.round(totals.refund).toLocaleString()}</td>
              <td className="px-4 py-3">₹{Math.round(totals.profit).toLocaleString()}</td>
              {/* Place, Service, Type, Actions placeholders */}
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
            </tr>
          </tbody>
        </table>

        {sortedTickets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No tickets found matching your criteria.
          </div>
        )}
      </div>

      {editingTicket && (
        <EditTicketModal
          ticket={editingTicket}
          isOpen={true}
          onClose={() => setEditingTicket(null)}
          onSave={(ticketData) => onUpdateTicket(editingTicket._id!, ticketData)}
          onRefund={(refundData) => onProcessRefund(editingTicket._id!, refundData)}
          onDelete={() => onDeleteTicket(editingTicket._id!)}
          existingAccounts={uniqueAccounts}
          existingServices={uniqueServices}
        />
      )}

      {confirmDeleteTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Confirm Delete</h3>
            <p className="text-sm text-gray-700 mb-4">Are you sure you want to delete this ticket? This action cannot be undone.</p>
            <div className="p-3 bg-gray-50 rounded border text-sm font-mono whitespace-pre-wrap break-words">
              {`Account: ${confirmDeleteTicket.account} | Type: ${confirmDeleteTicket.type}
Booking: ${formatDate(confirmDeleteTicket.bookingDate)} | Passenger: ${confirmDeleteTicket.passengerName}
PNR: ${confirmDeleteTicket.pnr} | Place: ${confirmDeleteTicket.place}
Amount: \u20B9${Math.round(Number(confirmDeleteTicket.ticketAmount || 0)).toLocaleString()} | Booking: \u20B9${Math.round(Number(confirmDeleteTicket.bookingAmount || 0)).toLocaleString()} | Profit: \u20B9${Math.round(Number(confirmDeleteTicket.ticketAmount || 0) - Number(confirmDeleteTicket.bookingAmount || 0)).toLocaleString()}${confirmDeleteTicket.refund ? ` | Refunded: \u20B9${Math.round(confirmDeleteTicket.refund)}` : ''}`}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => setConfirmDeleteTicket(null)}
                disabled={deletingId === confirmDeleteTicket._id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition disabled:opacity-50"
                onClick={async () => {
                  if (!confirmDeleteTicket?._id) return;
                  await handleDelete(confirmDeleteTicket._id);
                  setConfirmDeleteTicket(null);
                }}
                disabled={deletingId === confirmDeleteTicket._id}
              >
                {deletingId === confirmDeleteTicket._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk confirm modal */}
      {showConfirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Confirm Mark as Paid</h3>
            <p className="text-sm text-gray-700 mb-4">The following accounts will be marked as paid. Remaining Due = (Ticket - Refund) - Partial Paid. Any partial payment records shown will be cleared when you confirm.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Account</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Total Tickets</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Partial Paid</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Remaining Due (Ticket - Refund - Partial)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const byId: Record<string, ApiTicket> = Object.fromEntries(tickets.map(t => [t._id!, t]));
                    const selected = selectedTickets.map(id => byId[id]).filter(Boolean);
                    // Aggregate selected ticket net (ticket - refund) per account
                    const grouped: Record<string, { count: number; net: number; partial: number; remaining: number }> = {};
                    for (const t of selected) {
                      const acc = t.account || 'Unknown';
                      if (!grouped[acc]) grouped[acc] = { count: 0, net: 0, partial: 0, remaining: 0 };
                      grouped[acc].count += 1;
                      grouped[acc].net += Number(t.ticketAmount || 0) - Number(t.refund || 0);
                    }
                    // Add partial payments only for accounts that have selected tickets
                    payments.filter(p => p.isPartial && p.account && grouped[p.account]).forEach(p => {
                      const acc = p.account!;
                      grouped[acc].partial += Number(p.amount || 0);
                    });
                    // Compute remaining due = max(0, net - partial)
                    Object.values(grouped).forEach(row => {
                      row.remaining = Math.max(0, row.net - row.partial);
                    });
                    const rows = Object.entries(grouped);
                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="px-3 py-3 text-center text-gray-500">No tickets selected.</td>
                        </tr>
                      );
                    }
                    return (
                      <>
                        {rows.map(([acc, v]) => (
                          <tr key={acc} className="border-t">
                            <td className="px-3 py-2">{acc}</td>
                            <td className="px-3 py-2">{v.count}</td>
                            <td className="px-3 py-2 text-amber-700">₹{Math.round(v.partial).toLocaleString()}</td>
                            <td className="px-3 py-2 font-medium">₹{Math.round(v.remaining).toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="border-t bg-gray-50 font-medium">
                          <td className="px-3 py-2">Total</td>
                          <td className="px-3 py-2">{rows.reduce((s, [, v]) => s + v.count, 0)}</td>
                          <td className="px-3 py-2 text-amber-700">₹{Math.round(rows.reduce((s, [, v]) => s + v.partial, 0)).toLocaleString()}</td>
                          <td className="px-3 py-2">₹{Math.round(rows.reduce((s, [, v]) => s + v.remaining, 0)).toLocaleString()}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[10px] text-gray-500">On confirm: partial payment records (if any) are deleted and replaced with full payment(s) for the selected tickets.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => setShowConfirmBulk(false)}
                disabled={bulkLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
                onClick={async () => {
                  setShowConfirmBulk(false);
                  await handleBulkMarkAsPaid();
                }}
                disabled={bulkLoading}
              >
                {bulkLoading ? 'Processing…' : 'Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
