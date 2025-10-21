import { useEffect, useState } from 'react';
import { DateRangeProvider } from './context/DateRangeContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import AccountsPage from './components/AccountsPage';
import Navigation from './components/Navigation';
import PnrSearchModal from './components/PnrSearchModal';
import VehicleDashboard from './components/VehicleDashboard';
import ApartmentsPage from './components/ApartmentsPage';
import PaymentTracker from './components/PaymentTracker';
import CustomersDetails from './components/CustomersDetails';
import { usePayments, useTickets } from './hooks/useApi';
import { ApiTicket } from './services/api';

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
    else if (path.includes('apartments')) setCurrentPage('apartments');
    else if (path.includes('customers')) setCurrentPage('customers');
    else setCurrentPage('dashboard');

    const onPop = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('login')) setCurrentPage('login');
      else if (p.includes('payment')) setCurrentPage('payments');
      else if (p.includes('accounts')) setCurrentPage('accounts');
      else if (p.includes('vehicles')) setCurrentPage('fuel');
      else if (p.includes('apartments')) setCurrentPage('apartments');
      else if (p.includes('customers')) setCurrentPage('customers');
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
                : currentPage === 'apartments' ? '/apartments'
                  : currentPage === 'customers' ? '/customers'
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
  const [showPnr, setShowPnr] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} onOpenPnrSearch={() => setShowPnr(true)} />
      <div className="container mx-auto py-4">
        {renderCurrentPage()}
      </div>
      {/* PNR Search is rendered only when authenticated, so we mount it below */}
      {user && (
        <AuthedPnrPortal open={showPnr} onClose={() => setShowPnr(false)} />
      )}
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
    addPayment,
    deletePayment: deletePayment
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

  const handleBulkMarkAsPaid = async (ticketIds: string[]) => {
    const selectedTickets = tickets.filter(t => ticketIds.includes(t._id!));
    if (selectedTickets.length === 0) return;

    // Group selected tickets by account and compute totals: ticket - refund
    const byAccount = selectedTickets.reduce((acc, t) => {
      const key = t.account || 'Unknown';
      if (!acc[key]) acc[key] = { net: 0, ids: [] as string[] };
      const ticketAmt = Number(t.ticketAmount || 0);
      const refundAmt = Number(t.refund || 0);
      acc[key].net += (ticketAmt - refundAmt);
      acc[key].ids.push(t._id!);
      return acc;
    }, {} as Record<string, { net: number; ids: string[] }>);

    const today = new Date().toISOString().split('T')[0];

    // For each account: delete existing partial payments, then create a full payment for net amount
    for (const [account, info] of Object.entries(byAccount)) {
      // Delete partial payments for this account
      const partials = payments.filter(p => p.isPartial && p.account === account);
      for (const p of partials) {
        try {
          // Prefer hook delete if available
          await (deletePayment ? deletePayment(p._id!) : Promise.resolve());
        } catch (e) {
          console.error('Failed to delete partial payment', p._id, e);
        }
      }

      const fullAmount = Math.max(0, info.net);
      await addPayment({
        date: today,
        amount: fullAmount,
        period: `Bulk payment for ${info.ids.length} tickets (full)`,
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
      case 'apartments':
        return <ApartmentsPage />;
      case 'customers': {
        const existingAccounts = Array.from(new Set((tickets || []).map(t => t.account).filter(Boolean))) as string[];
        return <CustomersDetails open existingAccounts={existingAccounts} />;
      }
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

// Small helper to access hooks and wire data into PNR modal
function AuthedPnrPortal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tickets, updateTicket, processRefund, deleteTicket } = useTickets();
  const { payments } = usePayments();
  if (!open) return null;
  return (
    <PnrSearchModal
      isOpen={open}
      onClose={onClose}
      tickets={tickets}
      payments={payments}
      onUpdateTicket={async (id, data) => { await updateTicket(id, data); }}
      onProcessRefund={async (id, data) => { await processRefund(id, data); }}
      onDeleteTicket={async (id) => { await deleteTicket(id); }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DateRangeProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto py-4">
            <InnerApp />
          </div>
        </div>
      </DateRangeProvider>
    </AuthProvider>
  );
}
