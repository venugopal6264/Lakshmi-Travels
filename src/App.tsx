import { useEffect, useState } from 'react';
import { DateRangeProvider } from './context/DateRangeContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import CreateTicketPage from './components/CreateTicketPage';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import FuelTracker from './components/FuelTracker';
import PaymentTracker from './components/PaymentTracker';
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
    else if (path.includes('fuel')) setCurrentPage('fuel');
    else if (path.includes('create')) setCurrentPage('create');
    else setCurrentPage('dashboard');

    const onPop = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('login')) setCurrentPage('login');
      else if (p.includes('payment')) setCurrentPage('payments');
      else if (p.includes('fuel')) setCurrentPage('fuel');
      else if (p.includes('create')) setCurrentPage('create');
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
      : currentPage === 'fuel' ? '/fuel-dashboard'
      : currentPage === 'create' ? '/create-ticket'
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
      <div className="container mx-auto px-4 py-8">
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
  };

  const handleDeleteTicket = async (id: string) => {
    await deleteTicket(id);
  };

  const handleUpdateTicket = async (id: string, ticketData: Partial<ApiTicket>) => {
    await updateTicket(id, ticketData);
  };

  const handleProcessRefund = async (id: string, refundData: { refundAmount: number; refundDate: string; refundReason: string }) => {
    await processRefund(id, refundData);
  };

  const handleMarkAsPaid = async (ticketId: string) => {
    const ticket = tickets.find(t => t._id === ticketId);
    if (!ticket) return;
    const today = new Date().toISOString().split('T')[0];
    await addPayment({
      date: today,
      amount: ticket.profit,
      period: `Payment for ticket ${ticket.pnr}`,
      tickets: [ticketId]
    });
  };

  const handleBulkMarkAsPaid = async (ticketIds: string[]) => {
    const selectedTickets = tickets.filter(t => ticketIds.includes(t._id!));
    const totalAmount = selectedTickets.reduce((sum, ticket) => sum + ticket.profit, 0);
    const today = new Date().toISOString().split('T')[0];
    await addPayment({
      date: today,
      amount: totalAmount,
      period: `Bulk payment for ${ticketIds.length} tickets`,
      tickets: ticketIds
    });
  };

  const render = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            tickets={tickets}
            payments={payments}
            onDeleteTicket={handleDeleteTicket}
            onUpdateTicket={handleUpdateTicket}
            onProcessRefund={handleProcessRefund}
            onMarkAsPaid={handleMarkAsPaid}
            onBulkMarkAsPaid={handleBulkMarkAsPaid}
            loading={ticketsLoading}
          />
        );
      case 'create':
        return (
          <CreateTicketPage
            onAddTicket={handleAddTicket}
            loading={ticketsLoading}
            tickets={tickets}
          />
        );
      case 'payments':
        return (
          <PaymentTracker
            payments={payments}
            tickets={tickets}
            onAddPayment={async (paymentData) => { await addPayment(paymentData); }}
            loading={paymentsLoading}
          />
        );
      case 'fuel':
        return <FuelTracker />;
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
