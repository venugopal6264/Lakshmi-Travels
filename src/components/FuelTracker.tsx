import React, { useMemo, useState } from 'react';
import { Calendar, Fuel, Plus, } from 'lucide-react';
import { ApiFuel } from '../services/api';
import { useFuel } from '../hooks/useApi';
import {FuelEntry, FuelSummarySection, VehicleDash, VehicleType} from '../utils/FuelUtils';



export default function FuelTracker() {
  const getToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const initialForm: FuelEntry = {
    id: crypto.randomUUID(),
    date: getToday(),
    vehicle: 'car',
    entryType: 'refueling',
    odometer: '',
    liters: '',
    pricePerLiter: '',
    total: '',
    notes: ''
  };

  const [form, setForm] = useState<FuelEntry>(initialForm);
  const { fuel, addFuel } = useFuel();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const computedTotal = useMemo(() => {
    const liters = parseFloat(form.liters);
    const price = parseFloat(form.pricePerLiter);
    if (!Number.isFinite(liters) || !Number.isFinite(price)) return '';
    return (Math.round(liters * price * 100) / 100).toString();
  }, [form.liters, form.pricePerLiter]);

  const resetForm = () => {
    setForm({ ...initialForm, id: crypto.randomUUID(), date: getToday() });
    setErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.date) newErrors.date = 'Date is required';
    if (!form.vehicle) newErrors.vehicle = 'Vehicle is required';
    if (form.entryType === 'refueling') {
      if (!form.liters) newErrors.liters = 'Liters is required';
      if (!form.pricePerLiter) newErrors.pricePerLiter = 'Price/L is required';
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    const payload: Omit<ApiFuel, '_id' | 'createdAt' | 'updatedAt'> = {
      date: form.date,
      vehicle: form.vehicle,
      entryType: form.entryType,
      odometer: form.odometer ? Number(form.odometer) : null,
      liters: form.liters ? Number(form.liters) : null,
      pricePerLiter: form.pricePerLiter ? Number(form.pricePerLiter) : null,
      total: (computedTotal || form.total) ? Number(computedTotal || form.total) : null,
      notes: form.notes || ''
    };
    try {
      await addFuel(payload);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const ringClass = form.vehicle === 'car' ? 'focus:ring-blue-500' : 'focus:ring-green-500';
  const primaryBtn = form.vehicle === 'car'
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-green-600 hover:bg-green-700';

  // NEW: Vehicle tab state
  const [activeVehicle, setActiveVehicle] = useState<VehicleType>('car');

  // Keep vehicle tabs in sync with form selection
  React.useEffect(() => {
    setActiveVehicle(form.vehicle);
  }, [form.vehicle]);

  return (
    <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden">
      {/* Colorful header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Fuel className="w-5 h-5" />
          Fuel Tracker
          <span className="ml-2 inline-flex items-center rounded-full text-xs px-2 py-0.5 bg-white/20 text-white capitalize">
            {form.vehicle}
          </span>
        </h2>
      </div>
      <div className="p-6">
        {/* Entry form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${ringClass} ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
              <select
                name="vehicle"
                value={form.vehicle}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${ringClass} ${errors.vehicle ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="car">Car</option>
                <option value="bike">Bike</option>
              </select>
              {errors.vehicle && <p className="text-red-500 text-xs mt-1">{errors.vehicle}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                name="entryType"
                value={form.entryType}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${ringClass}`}
              >
                <option value="refueling">Refueling</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (km)</label>
              <input
                type="number"
                name="odometer"
                value={form.odometer}
                onChange={handleChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${ringClass}`}
                placeholder="e.g., 45210"
              />
            </div>

            {form.entryType === 'refueling' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Liters *</label>
                <input
                  type="number"
                  name="liters"
                  value={form.liters}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${ringClass} ${errors.liters ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g., 7.5"
                  step="0.01"
                  min="0"
                />
                {errors.liters && <p className="text-red-500 text-xs mt-1">{errors.liters}</p>}
              </div>
            )}

            {form.entryType === 'refueling' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price / Liter (₹) *</label>
                <input
                  type="number"
                  name="pricePerLiter"
                  value={form.pricePerLiter}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${ringClass} ${errors.pricePerLiter ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g., 106.8"
                  step="0.01"
                  min="0"
                />
                {errors.pricePerLiter && <p className="text-red-500 text-xs mt-1">{errors.pricePerLiter}</p>}
              </div>
            )}

            {form.entryType === 'refueling' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total (₹)</label>
                <input
                  type="number"
                  name="total"
                  value={computedTotal || form.total}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${ringClass}`}
                  placeholder="Auto-calculated"
                  step="0.01"
                  min="0"
                />
              </div>
            )}

            {form.entryType === 'service' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Amount (₹) *</label>
                <input
                  type="number"
                  name="total"
                  value={form.total}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${ringClass} ${errors.pricePerLiter ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g., 1500"
                  step="0.01"
                  min="0"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={1}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${ringClass}`}
                placeholder="Refueling place, work done, etc."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition duration-200"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`${primaryBtn} text-white px-6 py-2 rounded-md transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>

        {/* VEHICLE TABS (Car | Bike) */}
        {fuel.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 border-b">
              {(['car', 'bike'] as const).map(v => {
                const active = activeVehicle === v;
                const color = v === 'car' ? 'text-blue-600' : 'text-green-600';
                const underline = v === 'car' ? 'bg-blue-600' : 'bg-green-600';
                return (
                  <button
                    key={v}
                    onClick={() => {
                      setActiveVehicle(v);
                      setForm(prev => (prev.vehicle === v ? prev : { ...prev, vehicle: v }));
                    }}
                    className={`relative px-4 py-2 text-sm font-medium capitalize ${active ? color : 'text-gray-500'} hover:text-gray-800`}
                  >
                    {v}
                    {active && <span className={`absolute left-0 -bottom-px h-0.5 w-full ${underline}`} />}
                  </button>
                );
              })}
            </div>

            {/* Per-vehicle dashboard with inner tabs */}
            <VehicleDash vehicle={activeVehicle} items={fuel} />
          </div>
        )}

        <FuelSummarySection />
      </div>
    </div>
  );
}


