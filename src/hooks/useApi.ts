import { useEffect, useState } from 'react';
import { ApiPayment, apiService, ApiTicket, ProfitSummary } from '../services/api';

export function useTickets() {
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTickets();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const addTicket = async (ticketData: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTicket = await apiService.createTicket(ticketData);
      setTickets(prev => [newTicket, ...prev]);
      return newTicket;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ticket');
      throw err;
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      await apiService.deleteTicket(id);
      setTickets(prev => prev.filter(ticket => ticket._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket');
      throw err;
    }
  };

  const updateTicket = async (id: string, ticketData: Partial<ApiTicket>) => {
    try {
      const updatedTicket = await apiService.updateTicket(id, ticketData);
      setTickets(prev => prev.map(ticket => 
        ticket._id === id ? updatedTicket : ticket
      ));
      return updatedTicket;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
      throw err;
    }
  };

  const processRefund = async (id: string, refundData: { refundAmount: number; refundDate: string; refundReason: string }) => {
    try {
      const updatedTicket = await apiService.processRefund(id, refundData);
      setTickets(prev => prev.map(ticket => 
        ticket._id === id ? updatedTicket : ticket
      ));
      return updatedTicket;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
      throw err;
    }
  };
  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    loading,
    error,
    addTicket,
    deleteTicket,
    updateTicket,
    processRefund,
    refetch: fetchTickets
  };
}

export function usePayments() {
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPayments();
      setPayments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (paymentData: Omit<ApiPayment, '_id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newPayment = await apiService.createPayment(paymentData);
      setPayments(prev => [newPayment, ...prev]);
      return newPayment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment');
      throw err;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      await apiService.deletePayment(id);
      setPayments(prev => prev.filter(payment => payment._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
      throw err;
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return {
    payments,
    loading,
    error,
    addPayment,
    deletePayment,
    refetch: fetchPayments
  };
}

export function useProfitSummary() {
  const [summary, setSummary] = useState<ProfitSummary>({
    train: 0,
    bus: 0,
    flight: 0,
    total: 0,
    totalTickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProfitSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary
  };
}
