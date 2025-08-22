export interface ExtractedTicketData {
  amount?: number;
  profit?: number;
  type?: 'train' | 'bus' | 'flight';
  service?: string;
  account?: string;
  bookingDate?: string;
  passengerName?: string;
  place?: string;
  pnr?: string;
  fare?: number;
  refund?: number;
  remarks?: string;
}

export interface PdfUploadResponse {
  success: boolean;
  data?: ExtractedTicketData;
  error?: string;
  rawText?: string;
}
