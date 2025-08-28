import { CheckCircle, Clock, DollarSign, Edit, Filter, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiTicket } from '../services/api';
import EditTicketModal from './EditTicketModal';

interface TicketTableProps {
  tickets: ApiTicket[];
  paidTickets: string[];
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
}

export default function TicketTable({
  tickets,
  paidTickets,
  onDeleteTicket,
  onUpdateTicket,
  onProcessRefund,
  onBulkMarkAsPaid,
  loading = false,
  dateRange,
  accountFilter: accountFilterProp,
  onAccountFilterChange,
  // date handler removed
}: TicketTableProps) {
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
  const [activeTable, setActiveTable] = useState<'open' | 'paid'>('open');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [editingTicket, setEditingTicket] = useState<ApiTicket | null>(null);
  const [showProfit, setShowProfit] = useState<boolean>(false);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  // Resizable "Place" column width (md+ only)
  const [placeColWidth, setPlaceColWidth] = useState<number>(240);
  const isResizingRef = useRef(false);

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

  const startResizePlace = (e: React.MouseEvent) => {
    // Start horizontal drag to resize the Place column
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = placeColWidth;
    isResizingRef.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = ev.clientX - startX;
      const next = Math.max(120, Math.min(800, startWidth + delta));
      setPlaceColWidth(next);
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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

  // Get unique accounts for filter dropdown
  const uniqueAccounts = Array.from(new Set(tickets.map(ticket => ticket.account)));
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
        acc.count += 1;
        acc.ticketAmount += Number(t.ticketAmount || 0);
        acc.bookingAmount += Number(t.bookingAmount || 0);
        acc.profit += Number(t.profit || 0) - Number(t.refund || 0);
        return acc;
      },
      { count: 0, ticketAmount: 0, bookingAmount: 0, profit: 0 }
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
              onClick={handleBulkMarkAsPaid}
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
        </div>
      </div>

      {/* Table Toggle */}
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
        <div className="ml-auto flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-blue-700">
            <input
              type="checkbox"
              checked={showProfit}
              onChange={(e) => setShowProfit(e.target.checked)}
              className="rounded border-blue-300 accent-blue-600 focus:ring-blue-500"
            />
            Show Profit
          </label>
        </div>
      </div>

  <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by passenger, PNR, or place..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-16 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Types</option>
            <option value="train">Train</option>
            <option value="bus">Bus</option>
            <option value="flight">Flight</option>
          </select>

          {activeTable === 'open' && (
            <select
              value={accountFilter}
              onChange={(e) => {
                const v = e.target.value;
                setAccountFilter(v);
                onAccountFilterChange?.(v);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Accounts</option>
              {uniqueAccounts.map(account => (
                <option key={account} value={account}>{account}</option>
              ))}
            </select>
          )}
        </div>
      </div>

  <div className="overflow-x-auto max-h-[60vh] relative">
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading tickets...</p>
          </div>
        )}

        <table className="w-full table-auto text-sm">
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
              {/* Account first */}
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
                Booking Date {sortField === 'bookingDate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Passenger Name */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('passengerName')}
              >
                Passenger Name {sortField === 'passengerName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Ticket Amount prominent */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ticketAmount')}
              >
                Ticket Amount {sortField === 'ticketAmount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Booking Amount (hide on xs) */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                Booking Amount
              </th>
              {/* Profit (hide on xs) */}
              {showProfit && (
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden sm:table-cell"
                  onClick={() => handleSort('profit')}
                >
                  Profit {sortField === 'profit' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              )}
              {/* Type (hide on xs) */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden sm:table-cell"
                onClick={() => handleSort('type')}
              >
                Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* PNR (hide on xs) */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                PNR
              </th>
              {/* Place (resizable on md+) */}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell relative select-none"
                style={{ width: placeColWidth, minWidth: placeColWidth }}
              >
                <div className="pr-3">Place</div>
                {/* Resize handle */}
                <div
                  role="separator"
                  aria-label="Resize Place column"
                  onMouseDown={startResizePlace}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-gray-200/60"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
      <tbody className="bg-white divide-y divide-gray-200">
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
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {ticket.account}
                </td>
                {/* Booking Date */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(ticket.bookingDate)}
                </td>
                {/* Passenger Name */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    {ticket.passengerName}
                    {isRefunded(ticket) && (
                      <div className="text-xs text-red-600 font-medium">
                        Refunded: ₹{ticket.refund}
                      </div>
                    )}
                  </div>
                </td>
                {/* Ticket Amount */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{Number(ticket.ticketAmount || 0).toLocaleString()}
                </td>
                {/* Booking Amount (hidden on xs) */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                  ₹{Number(ticket.bookingAmount || 0).toLocaleString()}
                </td>
                {/* Profit (hidden on xs) */}
                {showProfit && (
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600 hidden sm:table-cell">
                    ₹{(ticket.profit - (ticket.refund || 0)).toLocaleString()}
                  </td>
                )}
                {/* Type (hidden on xs) */}
                <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(ticket.type)}`}>
                    {ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)}
                  </span>
                </td>
                {/* PNR (hidden md-) */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono hidden md:table-cell">
                  {ticket.pnr}
                </td>
                {/* Place (hidden md-) */}
                <td
                  className="px-4 py-4 text-sm text-gray-900 truncate hidden md:table-cell"
                  style={{ width: placeColWidth, minWidth: placeColWidth, maxWidth: placeColWidth }}
                  title={ticket.place}
                >
                  {ticket.place}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
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
            {/* Totals Row */}
            <tr className={`${totalsBg} font-semibold`}>
              {activeTable === 'open' && <td className="px-4 py-3"></td>}
              <td className="px-4 py-3" colSpan={2}>Totals ({totals.count} tickets)</td>
              <td className="px-4 py-3">₹{totals.ticketAmount.toLocaleString()}</td>
              <td className="px-4 py-3 hidden sm:table-cell">₹{totals.bookingAmount.toLocaleString()}</td>
              {showProfit && (
                <td className="px-4 py-3 hidden sm:table-cell">₹{totals.profit.toLocaleString()}</td>
              )}
              <td className="px-4 py-3 hidden sm:table-cell"></td>
              <td className="px-4 py-3 hidden md:table-cell"></td>
              <td className="px-4 py-3 hidden md:table-cell"></td>
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
Amount: \u20B9${Number(confirmDeleteTicket.ticketAmount || 0).toLocaleString()} | Booking: \u20B9${Number(confirmDeleteTicket.bookingAmount || 0).toLocaleString()} | Profit: \u20B9${confirmDeleteTicket.profit.toLocaleString()}${confirmDeleteTicket.refund ? ` | Refunded: \u20B9${confirmDeleteTicket.refund}` : ''}`}
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
    </div>
  );
}
