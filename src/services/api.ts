// PDF upload removed

// Resolve API base URL from Vite env. Must be prefixed with VITE_ to be exposed to the client.
// Fallback to local server when not provided.
const API_URL: string = import.meta.env?.VITE_API_URL || "http://localhost:5050/api";
export interface ApiTicket {
  _id?: string;
  ticketAmount: number;
  bookingAmount: number;
  profit: number;
  type: 'train' | 'bus' | 'flight' | 'passport' | 'other';
  service: string;
  account: string;
  bookingDate: string;
  passengerName: string;
  place: string;
  pnr: string;
  refund?: number;
  refundDate?: string;
  refundReason?: string;
  remarks?: string;
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
  isPartial?: boolean;
  createdAt?: string;
  updatedAt?: string;
}


export interface ApiFuel {
  _id?: string;
  date: string; // ISO date string
  vehicle: 'car' | 'bike';
  vehicleId?: string | null;
  vehicleName?: string | null;
  entryType: 'refueling' | 'service' | 'repair';
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

// Tenancy types
export interface ApiFlat { _id?: string; number: string; notes?: string; currentTenant?: ApiTenant | null; createdAt?: string; updatedAt?: string }
export interface ApiTenant { _id?: string; name: string; phone?: string; aadharNumber?: string; startDate: string; endDate?: string | null; rentAmount: number; deposit?: number; flat: string | ApiFlat; active?: boolean; createdAt?: string; updatedAt?: string }
export interface ApiRentRecord { _id?: string; flat: string | ApiFlat; tenant: string | ApiTenant; month: string; amount: number; paid: boolean; paidDate?: string | null; notes?: string; createdAt?: string; updatedAt?: string }

export interface ApiName {
  _id?: string;
  name: string;
  age?: number | null;
  dob?: string | null; // ISO date string
  account?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const apiNames = {
  async list(): Promise<ApiName[]> {
    const res = await fetch(`${API_URL}/names`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch names');
    return res.json();
  },
  async create(body: { name: string; age?: number | null; dob?: string | null; account?: string | null }): Promise<ApiName> {
    const res = await fetch(`${API_URL}/names`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to create name');
    return res.json();
  },
};

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

  async clearPartialPayments(account: string): Promise<{ message: string; deleted: number; amount: number }> {
    return this.request(`/payments/partial/account/${encodeURIComponent(account)}`, {
      method: 'DELETE'
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

  // Vehicles API methods
  async getVehicles(includeInactive = false): Promise<Array<{ _id: string; name: string; type: 'car' | 'bike'; active: boolean; color?: string; model?: string; manufacturerDate?: string | null; buyDate?: string | null; fuelType?: string; fuelCapacity?: number | null; licensePlate?: string; chassisNumber?: string; notes?: string }>> {
    const q = includeInactive ? '?includeInactive=true' : '';
    return this.request(`/vehicles${q}`);
  }
  async createVehicle(v: { name: string; type: 'car' | 'bike'; color?: string; model?: string; manufacturerDate?: string | null; buyDate?: string | null; fuelType?: string; fuelCapacity?: number | null; licensePlate?: string; chassisNumber?: string; notes?: string }): Promise<{ _id: string; name: string; type: 'car' | 'bike'; active: boolean; color?: string }> {
    return this.request('/vehicles', { method: 'POST', body: JSON.stringify(v) });
  }
  async updateVehicle(id: string, patch: Partial<{ name: string; type: 'car' | 'bike'; active: boolean; color?: string; model?: string; manufacturerDate?: string | null; buyDate?: string | null; fuelType?: string; fuelCapacity?: number | null; licensePlate?: string; chassisNumber?: string; notes?: string }>): Promise<{ _id: string; name: string; type: 'car' | 'bike'; active: boolean; color?: string }> {
    return this.request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  }
  async deleteVehicle(id: string, mode: 'soft' | 'hard' = 'soft'): Promise<{ success: boolean; deleted?: boolean }> {
    const q = mode === 'hard' ? '?mode=hard' : '';
    return this.request(`/vehicles/${id}${q}`, { method: 'DELETE' });
  }
  async getVehicle(id: string) {
    return this.request(`/vehicles/${id}`);
  }

  // Tenancy API methods
  async getFlats(): Promise<ApiFlat[]> { return this.request('/tenancy/flats'); }
  async createFlat(number: string, notes = ''): Promise<ApiFlat> { return this.request('/tenancy/flats', { method: 'POST', body: JSON.stringify({ number, notes }) }); }
  async getTenants(): Promise<ApiTenant[]> { return this.request('/tenancy/tenants'); }
  async getFlatTenants(flatId: string): Promise<ApiTenant[]> { return this.request(`/tenancy/flats/${flatId}/tenants`); }
  async createTenant(input: { name: string; phone?: string; aadharNumber?: string; startDate: string; endDate?: string | null; rentAmount: number; deposit?: number; flatId: string }): Promise<ApiTenant> { return this.request('/tenancy/tenants', { method: 'POST', body: JSON.stringify(input) }); }
  async updateTenant(id: string, patch: Partial<ApiTenant>): Promise<ApiTenant> { return this.request(`/tenancy/tenants/${id}`, { method: 'PUT', body: JSON.stringify(patch) }); }
  async getRents(month?: string): Promise<ApiRentRecord[]> { const q = month ? `?month=${encodeURIComponent(month)}` : ''; return this.request(`/tenancy/rents${q}`); }
  async upsertRent(input: { flatId: string; tenantId: string; month: string; amount: number; paid?: boolean; paidDate?: string | null; notes?: string }): Promise<ApiRentRecord> { return this.request('/tenancy/rents/upsert', { method: 'POST', body: JSON.stringify(input) }); }
  async toggleRent(id: string): Promise<ApiRentRecord> { return this.request(`/tenancy/rents/${id}/toggle`, { method: 'PUT' }); }

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

  // Admin user management
  async getUsers(): Promise<{ users: Array<{ _id: string; username: string; role: string; createdAt?: string; updatedAt?: string; passwordHint?: string }> }> {
    return this.request('/admin/users');
  }
  async resetUserPassword(id: string, newPassword: string, passwordHint: string): Promise<{ success: boolean }> {
    return this.request(`/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword, passwordHint })
    });
  }

  // PDF upload removed
}

export const apiService = new ApiService();
