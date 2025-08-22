import { Calendar, CreditCard, MapPin, Plus, User } from 'lucide-react';
import React, { useState } from 'react';
import { ApiTicket } from '../services/api';
import PdfUpload from './PdfUpload';

interface TicketFormProps {
  onAddTicket: (ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  loading?: boolean;
}

export default function TicketForm({ onAddTicket, loading = false }: TicketFormProps) {
  type TicketFormState = {
    amount: string;
    profit: string;
    type: 'train' | 'bus' | 'flight';
    service: string;
    account: string;
    bookingDate: string;
    passengerName: string;
    place: string;
    pnr: string;
    fare: string;
    refund: string;
    remarks: string;
  };

  const [formData, setFormData] = useState<TicketFormState>({
    amount: '',
    profit: '',
    type: 'train',
    service: '',
    account: '',
    bookingDate: '',
    passengerName: '',
    place: '',
    pnr: '',
    fare: '',
    refund: '',
    remarks: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPdfUpload, setShowPdfUpload] = useState(false);

  const handlePdfDataExtracted = (extractedData: Partial<ApiTicket>) => {
    setFormData(prev => ({
      ...prev,
      amount: extractedData.amount?.toString() || prev.amount,
      profit: extractedData.profit?.toString() || prev.profit,
      type: extractedData.type || prev.type,
      service: extractedData.service || prev.service,
      account: extractedData.account || prev.account,
      bookingDate: extractedData.bookingDate || prev.bookingDate,
      passengerName: extractedData.passengerName || prev.passengerName,
      place: extractedData.place || prev.place,
      pnr: extractedData.pnr || prev.pnr,
      fare: extractedData.fare?.toString() || prev.fare,
      refund: extractedData.refund?.toString() || prev.refund,
      remarks: extractedData.remarks || prev.remarks
    }));
    setShowPdfUpload(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.amount) newErrors.amount = 'Amount is required';
    if (!formData.profit) newErrors.profit = 'Profit is required';
    if (!formData.service) newErrors.service = 'Service is required';
    if (!formData.account) newErrors.account = 'Account is required';
    if (!formData.bookingDate) newErrors.bookingDate = 'Booking date is required';
    if (!formData.passengerName) newErrors.passengerName = 'Passenger name is required';
    if (!formData.place) newErrors.place = 'Place is required';
    if (!formData.pnr) newErrors.pnr = 'PNR is required';
    if (!formData.fare) newErrors.fare = 'Fare is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      await onAddTicket({
        amount: parseFloat(formData.amount),
        profit: parseFloat(formData.profit),
        type: formData.type,
        service: formData.service,
        account: formData.account,
        bookingDate: formData.bookingDate,
        passengerName: formData.passengerName,
        place: formData.place,
        pnr: formData.pnr,
        fare: parseFloat(formData.fare),
        refund: parseFloat(formData.refund) || 0,
        remarks: formData.remarks
      });

      setFormData({
        amount: '',
        profit: '',
        type: 'train',
        service: '',
        account: '',
        bookingDate: '',
        passengerName: '',
        place: '',
        pnr: '',
        fare: '',
        refund: '',
        remarks: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to add ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5" />
        Add New Ticket
      </h2>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowPdfUpload(!showPdfUpload)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showPdfUpload ? 'Hide PDF Upload' : 'Upload PDF Ticket'}
        </button>
      </div>

      {showPdfUpload && (
        <PdfUpload onDataExtracted={handlePdfDataExtracted} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Enter amount"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          <div>
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

          <div>
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
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service *
            </label>
            <input
              type="text"
              name="service"
              value={formData.service}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.service ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Service name"
            />
            {errors.service && <p className="text-red-500 text-xs mt-1">{errors.service}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account *
            </label>
            <input
              type="text"
              name="account"
              value={formData.account}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.account ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Account name"
            />
            {errors.account && <p className="text-red-500 text-xs mt-1">{errors.account}</p>}
          </div>

          <div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Passenger Name *
            </label>
            <input
              type="text"
              name="passengerName"
              value={formData.passengerName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.passengerName ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Passenger name"
            />
            {errors.passengerName && <p className="text-red-500 text-xs mt-1">{errors.passengerName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Place *
            </label>
            <input
              type="text"
              name="place"
              value={formData.place}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.place ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Travel route/place"
            />
            {errors.place && <p className="text-red-500 text-xs mt-1">{errors.place}</p>}
          </div>

          <div>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fare *
            </label>
            <input
              type="number"
              name="fare"
              value={formData.fare}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fare ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Ticket fare"
            />
            {errors.fare && <p className="text-red-500 text-xs mt-1">{errors.fare}</p>}
          </div>

          <div>
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional remarks..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={submitting || loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Adding...' : 'Add Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
