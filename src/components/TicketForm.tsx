import { Calendar, CreditCard, MapPin, Plus, Save, User } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ApiTicket } from '../services/api';

interface TicketFormProps {
  onAddTicket?: (ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onSave?: (ticketData: Partial<ApiTicket>) => Promise<void>;
  mode?: 'create' | 'edit';
  initial?: Partial<ApiTicket> | null;
  heading?: string;
  hideHeading?: boolean;
  loading?: boolean;
  existingAccounts?: string[];
  existingServices?: string[];
  existingPnrs?: string[]; // for duplicate PNR warning (non-blocking)
}

export default function TicketForm({ onAddTicket, onSave, mode = 'create', initial = null, heading, hideHeading = false, loading = false, existingAccounts = [], existingServices = [], existingPnrs = [] }: TicketFormProps) {
  // Helper to get today's date in YYYY-MM-DD (local) for <input type="date"/>
  const getToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  type TicketFormState = {
    ticketAmount: string;
    profit: string;
    type: 'train' | 'bus' | 'flight' | 'passport' | 'other';
    service: string;
    account: string;
    bookingDate: string;
    passengerName: string;
    place: string;
    pnr: string;
    bookingAmount: string;
    refund: string;
    remarks: string;
  };

  const initialFormState: TicketFormState = {
    ticketAmount: '',
    profit: '',
    type: 'train',
    service: '',
    account: '',
    bookingDate: getToday(),
    passengerName: '',
    place: '',
    pnr: '',
    bookingAmount: '',
    refund: '',
    remarks: ''
  };

  const [formData, setFormData] = useState<TicketFormState>(initialFormState);
  const initialEdit = useRef<TicketFormState | null>(null);

  // When editing, seed form with initial ticket values
  useEffect(() => {
    if (mode === 'edit' && initial) {
      type LegacyOrNew = Partial<ApiTicket> & { amount?: number; fare?: number } & { ticketAmount?: number; bookingAmount?: number };
      const src = initial as LegacyOrNew;
      const seed: TicketFormState = {
        ticketAmount: src.ticketAmount != null ? String(src.ticketAmount) : (src.amount != null ? String(src.amount) : ''),
        profit: initial.profit != null ? String(initial.profit) : '',
        type: (initial.type as TicketFormState['type']) || 'train',
        service: initial.service || '',
        account: initial.account || '',
        bookingDate: initial.bookingDate ? initial.bookingDate.slice(0, 10) : getToday(),
        passengerName: initial.passengerName || '',
        place: initial.place || '',
        pnr: initial.pnr || '',
        bookingAmount: src.bookingAmount != null ? String(src.bookingAmount) : (src.fare != null ? String(src.fare) : ''),
        refund: typeof (initial as Partial<ApiTicket> & { refund?: number }).refund === 'number'
          ? String((initial as Partial<ApiTicket> & { refund?: number }).refund)
          : '',
        remarks: initial.remarks || ''
      };
      setFormData(seed);
      initialEdit.current = seed;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initial?._id]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  // Removed PDF upload UI

  const resetForm = () => {
    if (mode === 'edit' && initialEdit.current) {
      setFormData(initialEdit.current);
    } else {
      setFormData({ ...initialFormState, bookingDate: getToday() });
    }
    setErrors({});
  };

  // Removed PDF extraction handler

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sanitize place: remove all spaces
    const sanitizedPlace = (formData.place || '').replace(/\s+/g, '');

    const newErrors: Record<string, string> = {};

    if (!formData.ticketAmount) newErrors.ticketAmount = 'Ticket amount is required';
    if (!formData.profit) newErrors.profit = 'Profit is required';
    if (!formData.service) newErrors.service = 'Service is required';
    if (!formData.account) newErrors.account = 'Account is required';
    if (!formData.bookingDate) newErrors.bookingDate = 'Booking date is required';
    if (!formData.passengerName) newErrors.passengerName = 'Passenger name is required';
    if (!sanitizedPlace) newErrors.place = 'Place is required';
    if (!formData.pnr) newErrors.pnr = 'PNR is required';
    if (!formData.bookingAmount) newErrors.bookingAmount = 'Booking amount is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'edit' && onSave) {
        await onSave({
          ticketAmount: parseFloat(formData.ticketAmount),
          profit: parseFloat(formData.profit),
          type: formData.type,
          service: formData.service,
          account: formData.account,
          bookingDate: formData.bookingDate,
          passengerName: formData.passengerName,
          place: sanitizedPlace,
          pnr: formData.pnr,
          bookingAmount: parseFloat(formData.bookingAmount),
          refund: parseFloat(formData.refund) || 0,
          remarks: formData.remarks
        });
      } else if (onAddTicket) {
        await onAddTicket({
          ticketAmount: parseFloat(formData.ticketAmount),
          profit: parseFloat(formData.profit),
          type: formData.type,
          service: formData.service,
          account: formData.account,
          bookingDate: formData.bookingDate,
          passengerName: formData.passengerName,
          place: sanitizedPlace,
          pnr: formData.pnr,
          bookingAmount: parseFloat(formData.bookingAmount),
          refund: parseFloat(formData.refund) || 0,
          remarks: formData.remarks
        });
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value } as typeof prev;

      // Parse numbers safely
      const fare = parseFloat(next.bookingAmount);
      const amount = parseFloat(next.ticketAmount);
      const profit = parseFloat(next.profit);
      const hasFare = next.bookingAmount !== '' && !Number.isNaN(fare);
      const hasAmount = next.ticketAmount !== '' && !Number.isNaN(amount);
      const hasProfit = next.profit !== '' && !Number.isNaN(profit);

      // Calculation precedence rules:
      // - If user edits amount (with fare present) => derive profit = amount - fare
      // - If user edits profit (with fare present) => derive amount = fare + profit
      // - If user edits fare:
      //   * If amount present => derive profit
      //   * Else if profit present => derive amount
      if (name === 'ticketAmount' && hasFare && !Number.isNaN(amount)) {
        const p = amount - fare;
        next.profit = Number.isFinite(p) ? (Math.round(p * 100) / 100).toString() : next.profit;
      } else if (name === 'profit' && hasFare && !Number.isNaN(profit)) {
        const a = fare + profit;
        next.ticketAmount = Number.isFinite(a) ? (Math.round(a * 100) / 100).toString() : next.ticketAmount;
      } else if (name === 'bookingAmount' && hasFare) {
        if (hasAmount) {
          const p = amount - fare;
          next.profit = Number.isFinite(p) ? (Math.round(p * 100) / 100).toString() : next.profit;
        } else if (hasProfit) {
          const a = fare + profit;
          next.ticketAmount = Number.isFinite(a) ? (Math.round(a * 100) / 100).toString() : next.ticketAmount;
        }
      }

      return next;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Strip spaces from place on blur to enforce format visually
  const handlePlaceBlur = () => {
    setFormData(prev => ({ ...prev, place: (prev.place || '').replace(/\s+/g, '') }));
  };

  return (
    <>
      {!hideHeading && (
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          {mode === 'edit' ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {heading || (mode === 'edit' ? 'Edit Ticket' : 'Add New Ticket')}
        </h2>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div data-testId="type-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="flight">Flight</option>
              <option value="passport">Passport</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div data-testId="service-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking Account Name *
            </label>
            <input
              type="text"
              name="service"
              value={formData.service}
              onChange={handleChange}
              list="service-suggestions"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.service ? 'border-red-500' : 'border-gray-300'}
                `}
              placeholder="Start typing to search or add new service"
            />
            <datalist id="service-suggestions">
              {existingServices.map((svc) => (
                <option key={svc} value={svc} />
              ))}
            </datalist>
            {formData.service && !existingServices.includes(formData.service) && (
              <p className="text-xs text-gray-500 mt-1">New service will be created: {formData.service}</p>
            )}
            {errors.service && <p className="text-red-500 text-xs mt-1">{errors.service}</p>}
          </div>

          <div data-testId="booking-date-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Booking Date *
            </label>
            <input
              type="date"
              name="bookingDate"
              value={formData.bookingDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.bookingDate ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.bookingDate && <p className="text-red-500 text-xs mt-1">{errors.bookingDate}</p>}
          </div>

          <div data-testId="account-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account (Who will pay)*
            </label>
            <input
              type="text"
              name="account"
              value={formData.account}
              onChange={handleChange}
              list="account-suggestions"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.account ? 'border-red-500' : 'border-gray-300'}
                `}
              placeholder="Start typing to search or add new account"
            />
            <datalist id="account-suggestions">
              {existingAccounts.map((acc) => (
                <option key={acc} value={acc} />
              ))}
            </datalist>
            {formData.account && !existingAccounts.includes(formData.account) && (
              <p className="text-xs text-gray-500 mt-1">New account will be created: {formData.account}</p>
            )}
            {errors.account && <p className="text-red-500 text-xs mt-1">{errors.account}</p>}
          </div>

          <div data-testId="passenger-name-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Passenger Names *
            </label>
            <input
              type="text"
              name="passengerName"
              value={formData.passengerName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.passengerName ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Passenger names with ,"
            />
            {errors.passengerName && <p className="text-red-500 text-xs mt-1">{errors.passengerName}</p>}
          </div>

          <div data-testId="place-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Place *
            </label>
            <input
              type="text"
              name="place"
              value={formData.place}
              onChange={handleChange}
              onBlur={handlePlaceBlur}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.place ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Travel route/place"
            />
            {errors.place && <p className="text-red-500 text-xs mt-1">{errors.place}</p>}
          </div>

          <div data-testId="pnr-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CreditCard className="w-4 h-4 inline mr-1" />
              PNR/Ticket Number *
            </label>
            <input
              type="text"
              name="pnr"
              value={formData.pnr}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.pnr ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="PNR or ticket number"
            />
            {errors.pnr && <p className="text-red-500 text-xs mt-1">{errors.pnr}</p>}
            {mode === 'create' && formData.pnr && existingPnrs.some(p => p && p.toLowerCase() === formData.pnr.toLowerCase()) && !errors.pnr && (
              <p className="text-red-600 text-xs mt-1 font-medium">PNR already exists</p>
            )}
          </div>

          <div data-testId="booking-fare-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking Amount *
            </label>
            <input
              type="number"
              name="bookingAmount"
              value={formData.bookingAmount}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.bookingAmount ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Base booking amount"
            />
            {errors.bookingAmount && <p className="text-red-500 text-xs mt-1">{errors.bookingAmount}</p>}
          </div>

          <div data-testId="amount-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ticket Amount (Booking + Profit) *
            </label>
            <input
              type="number"
              name="ticketAmount"
              value={formData.ticketAmount}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ticketAmount ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Enter ticket amount"
            />
            {errors.ticketAmount && <p className="text-red-500 text-xs mt-1">{errors.ticketAmount}</p>}
          </div>

          <div data-testId="profit-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profit *
            </label>
            <input
              type="number"
              name="profit"
              value={formData.profit}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.profit ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Enter profit"
            />
            {errors.profit && <p className="text-red-500 text-xs mt-1">{errors.profit}</p>}
          </div>

          <div data-testId="refund-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund
            </label>
            <input
              type="number"
              name="refund"
              value={formData.refund}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Refund amount"
            />
          </div>

          <div className="md:col-span-1" data-testId="remarks-input">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional remarks..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 sticky bottom-0 bg-white border-t mt-6 py-4 z-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition duration-200"
            >
              Reset
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting || loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'edit' ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {submitting ? 'Saving...' : (mode === 'edit' ? 'Save Changes' : 'Save Ticket')}
          </button>
        </div>
      </form>
    </>
  );
}
