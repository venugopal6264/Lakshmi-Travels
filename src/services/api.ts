// PDF upload removed

// Resolve API base URL from Vite env. Must be prefixed with VITE_ to be exposed to the client.
// Fallback to local server when not provided.
const API_URL: string = import.meta.env?.VITE_API_URL || "http://localhost:5050/api";
export interface ApiTicket {
  _id?: string;
  ticketAmount: number;
  profit: number;
  type: 'train' | 'bus' | 'flight';
  service: string;
  account: string;
  bookingDate: string;
  passengerName: string;
  place: string;
  pnr: string;
  bookingAmount: number;
  refund: number;
  // Optional refund details (present when a refund is processed)
  refundDate?: string;
  refundReason?: string;
  remarks: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiPayment {
  _id?: string;
  date: string;
  amount: number;
  period: string;
  account?: string;
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

export interface ApiFuel {
  _id?: string;
  date: string; // ISO date string
  vehicle: 'car' | 'bike';
  entryType: 'refueling' | 'service';
  odometer?: number | null;
  liters?: number | null;
  pricePerLiter?: number | null;
  total?: number | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FuelSummaryBucket {
  car: { liters: number; fuelSpend: number; serviceSpend: number };
  bike: { liters: number; fuelSpend: number; serviceSpend: number };
}

export interface FuelSummaryResponse {
  currentMonth: FuelSummaryBucket;
  lastMonth: FuelSummaryBucket;
  yearToDate: FuelSummaryBucket;
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
        credentials: 'include',
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

  async processRefund(id: string, refundData: { refund: number; refundDate: string; refundReason: string }): Promise<ApiTicket> {
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

  // Fuel API methods
  async getFuel(): Promise<ApiFuel[]> {
    return this.request<ApiFuel[]>('/fuel');
  }

  async createFuel(entry: Omit<ApiFuel, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiFuel> {
    return this.request<ApiFuel>('/fuel', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async updateFuel(id: string, entry: Partial<ApiFuel>): Promise<ApiFuel> {
    return this.request<ApiFuel>(`/fuel/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  }

  async deleteFuel(id: string): Promise<void> {
    await this.request(`/fuel/${id}`, {
      method: 'DELETE',
    });
  }

  async getFuelSummary(): Promise<FuelSummaryResponse> {
    return this.request<FuelSummaryResponse>('/fuel/summary');
  }

  // Health check
  async healthCheck(): Promise<{ message: string; timestamp: string }> {
    return this.request<{ message: string; timestamp: string }>('/health');
  }

  // Auth endpoints
  async getCurrentUser(): Promise<{ user: { sub: string; name?: string; email?: string; picture?: string } | null }> {
    return this.request('/auth/me');
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // PDF upload removed
}

export const apiService = new ApiService();
