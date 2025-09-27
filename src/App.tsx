import { useEffect, useState } from 'react';
import { DateRangeProvider } from './context/DateRangeContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import AccountsPage from './components/AccountsPage';
import Navigation from './components/Navigation';
import VehicleDashboard from './components/VehicleDashboard';
import PaymentTracker from './components/PaymentTracker';
import { usePayments, useTickets } from './hooks/useApi';
import { ApiTicket, apiService } from './services/api';

function InnerApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, loading } = useAuth();

  // Note: data hooks are moved into AuthedApp to avoid unauthorized calls before login

  // Lightweight router: sync currentPage with URL and browser history (no date range in URL)
  useEffect(() => {
    // On initial load, derive page from path
    const path = window.location.pathname.toLowerCase();
    if (path.includes('login')) setCurrentPage('login');
    else if (path.includes('payment')) setCurrentPage('payments');
    else if (path.includes('accounts')) setCurrentPage('accounts');
    else if (path.includes('vehicles')) setCurrentPage('fuel');
    else setCurrentPage('dashboard');

    const onPop = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('login')) setCurrentPage('login');
      else if (p.includes('payment')) setCurrentPage('payments');
      else if (p.includes('accounts')) setCurrentPage('accounts');
      else if (p.includes('vehicles')) setCurrentPage('fuel');
      else setCurrentPage('dashboard');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    // Push a readable path for the current page (no query params)
    const basePath =
      currentPage === 'dashboard' ? '/dashboard'
        : currentPage === 'login' ? '/login'
          : currentPage === 'payments' ? '/payment-tracker'
            : currentPage === 'accounts' ? '/accounts'
              : currentPage === 'fuel' ? '/vehicles'
                : '/dashboard';
    const currentUrl = window.location.pathname;
    if (currentUrl !== basePath) {
      window.history.pushState({}, '', basePath);
    }
  }, [currentPage]);

  // Gate routes: if not authenticated, force login page; if authenticated and on login, redirect to dashboard
  useEffect(() => {
    if (loading) return;
    const path = window.location.pathname.toLowerCase();
    if (!user) {
      if (!path.includes('/login')) setCurrentPage('login');
    } else {
      if (path.includes('/login')) setCurrentPage('dashboard');
    }
  }, [user, loading]);

  const renderCurrentPage = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-40 text-gray-600">Checking session…</div>
      );
    }
    if (!user) {
      return <LoginPage />;
    }
    return <AuthedApp currentPage={currentPage} />;
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="mx-auto px-4 py-4">
        {renderCurrentPage()}
      </div>
    </div>
  );
}

function AuthedApp({ currentPage }: { currentPage: string }) {
  const {
    tickets,
    loading: ticketsLoading,
    error: ticketsError,
    addTicket,
    deleteTicket,
    updateTicket,
    processRefund,
  } = useTickets();

  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    addPayment
  } = usePayments();

  const handleAddTicket = async (ticketData: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => {
    await addTicket(ticketData);
    // Navigate to dashboard and show basic success toast
    window.history.pushState({}, '', '/dashboard');
    // Simple feedback; can be replaced with a toast lib later
    setTimeout(() => {
      alert('Ticket has been registered successfully.');
    }, 50);
  };

  const handleDeleteTicket = async (id: string) => {
    await deleteTicket(id);
  };

  const handleUpdateTicket = async (id: string, ticketData: Partial<ApiTicket>) => {
    await updateTicket(id, ticketData);
  };

  const handleProcessRefund = async (id: string, refundData: { refund: number; refundDate: string; refundReason: string }) => {
    await processRefund(id, refundData);
  };

  const handleMarkAsPaid = async (ticketId: string) => {
    const ticket = tickets.find(t => t._id === ticketId);
    if (!ticket) return;
    const account = ticket.account;
    // Compute existing partial amount for account
    const partialTotal = payments.filter(p => p.isPartial && p.account === account)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    if (partialTotal > 0) {
      const proceed = window.confirm(`This account has a partial payment of ₹${Math.round(partialTotal)}. Marking this ticket as paid will remove the partial amount record(s). Continue?`);
      if (!proceed) return;
      try {
        await apiService.clearPartialPayments(account);
      } catch {
        alert('Failed to clear partial payments. Aborting mark as paid.');
        return;
      }
    }
    const today = new Date().toISOString().split('T')[0];
    await addPayment({
      date: today,
      amount: Number(ticket.ticketAmount || 0),
      period: `Payment for ticket ${ticket.pnr}`,
      account: ticket.account,
      tickets: [ticketId]
    });
  };

  const handleBulkMarkAsPaid = async (ticketIds: string[]) => {
    const selectedTickets = tickets.filter(t => ticketIds.includes(t._id!));
    if (selectedTickets.length === 0) return;
    // Determine accounts involved
    const accounts = Array.from(new Set(selectedTickets.map(t => t.account)));
    // For each account compute partial total
    const partialInfo = accounts.map(acc => ({
      account: acc,
      amount: payments.filter(p => p.isPartial && p.account === acc).reduce((s, p) => s + Number(p.amount || 0), 0)
    })).filter(p => p.amount > 0);
    if (partialInfo.length > 0) {
      const lines = partialInfo.map(p => `${p.account}: ₹${Math.round(p.amount)}`).join('\n');
      const proceed = window.confirm(`Partial payments exist for:\n${lines}\nProceed? They will be removed.`);
      if (!proceed) return;
      for (const p of partialInfo) {
        try { await apiService.clearPartialPayments(p.account); } catch { alert(`Failed to clear partials for ${p.account}`); return; }
      }
    }
    const today = new Date().toISOString().split('T')[0];
    // Group by account and create one payment per account
    const byAccount = selectedTickets.reduce((acc, t) => {
      const key = t.account || 'Unknown';
      if (!acc[key]) acc[key] = { amount: 0, ids: [] as string[] };
      acc[key].amount += Number(t.ticketAmount || 0);
      acc[key].ids.push(t._id!);
      return acc;
    }, {} as Record<string, { amount: number; ids: string[] }>);
    for (const [account, info] of Object.entries(byAccount)) {
      await addPayment({
        date: today,
        amount: info.amount,
        period: `Bulk payment for ${info.ids.length} tickets`,
        account,
        tickets: info.ids
      });
    }
  };

  const render = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            tickets={tickets}
            payments={payments}
            onAddTicket={handleAddTicket}
            onDeleteTicket={handleDeleteTicket}
            onUpdateTicket={handleUpdateTicket}
            onProcessRefund={handleProcessRefund}
            onMarkAsPaid={handleMarkAsPaid}
            onBulkMarkAsPaid={handleBulkMarkAsPaid}
            loading={ticketsLoading}
          />
        );
      case 'payments':
        return (
          <PaymentTracker
            payments={payments}
            tickets={tickets}
            onAddPayment={async (paymentData) => { await addPayment(paymentData); }}
            onAddTicket={async (ticketData) => { await addTicket(ticketData); }}
            onDeleteTicket={async (id) => { await deleteTicket(id); }}
            loading={paymentsLoading}
          />
        );
      case 'fuel':
        return <VehicleDashboard />;
      case 'accounts':
        return <AccountsPage />;
      default:
        return null;
    }
  };

  if (ticketsError || paymentsError) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">
            Unable to connect to the database. Please check your MongoDB connection.
          </p>
          <p className="text-sm text-red-600 mb-4">
            {ticketsError || paymentsError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }
  return render();
}

export default function App() {
  return (
    <AuthProvider>
      <DateRangeProvider>
        <InnerApp />
      </DateRangeProvider>
    </AuthProvider>
  );
}
