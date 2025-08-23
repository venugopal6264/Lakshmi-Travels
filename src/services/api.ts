import { PdfUploadResponse } from "../types/pdf";

// Resolve API base URL from Vite env. Must be prefixed with VITE_ to be exposed to the client.
// Fallback to local server when not provided.
const API_URL: string = import.meta.env?.VITE_API_URL || "http://localhost:5050/api";
export interface ApiTicket {
  _id?: string;
  amount: number;
  profit: number;
  type: 'train' | 'bus' | 'flight';
  service: string;
  account: string;
  bookingDate: string;
  passengerName: string;
  place: string;
  pnr: string;
  fare: number;
  refund: number;
  remarks: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiPayment {
  _id?: string;
  date: string;
  amount: number;
  period: string;
  tickets: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfitSummary {
  train: number;
  bus: number;
  flight: number;
  total: number;
  totalTickets: number;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Ticket API methods
  async getTickets(): Promise<ApiTicket[]> {
    return this.request<ApiTicket[]>('/tickets');
  }

  async createTicket(ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiTicket> {
    return this.request<ApiTicket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  async updateTicket(id: string, ticket: Partial<ApiTicket>): Promise<ApiTicket> {
    return this.request<ApiTicket>(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ticket),
    });
  }

  async deleteTicket(id: string): Promise<void> {
    await this.request(`/tickets/${id}`, {
      method: 'DELETE',
    });
  }

  async processRefund(id: string, refundData: { refundAmount: number; refundDate: string; refundReason: string }): Promise<ApiTicket> {
    return this.request<ApiTicket>(`/tickets/${id}/refund`, {
      method: 'PUT',
      body: JSON.stringify(refundData),
    });
  }

  async getProfitSummary(): Promise<ProfitSummary> {
    return this.request<ProfitSummary>('/tickets/summary');
  }

  // Payment API methods
  async getPayments(): Promise<ApiPayment[]> {
    return this.request<ApiPayment[]>('/payments');
  }

  async createPayment(payment: Omit<ApiPayment, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiPayment> {
    return this.request<ApiPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async deletePayment(id: string): Promise<void> {
    await this.request(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ message: string; timestamp: string }> {
    return this.request<{ message: string; timestamp: string }>('/health');
  }

  // PDF upload and parsing
  async uploadPdf(file: File): Promise<PdfUploadResponse> {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch(`${API_URL}/pdf/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

export const apiService = new ApiService();
