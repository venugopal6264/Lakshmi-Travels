export interface Ticket {
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
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
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

export interface PaymentRecord {
  _id?: string;
  date: string;
  amount: number;
  period: string;
  tickets: string[];
  createdAt?: string;
  updatedAt?: string;
}
