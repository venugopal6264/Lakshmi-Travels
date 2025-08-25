import React, { useMemo, useState } from 'react';
import { Calendar, Fuel, Plus } from 'lucide-react';
import { ApiFuel, FuelSummaryBucket, FuelSummaryResponse, apiService } from '../services/api';
import { useFuel } from '../hooks/useApi';

type VehicleType = 'car' | 'bike';

type FuelEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  vehicle: VehicleType;
  entryType: 'refueling' | 'service';
  odometer?: string;
  liters: string; // keep as string for inputs
  pricePerLiter: string;
  total: string; // auto-calculated
  notes?: string;
};

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

  return (
    <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden">
      {/* Colorful header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Fuel className="w-5 h-5" />
          Fuel Tracker
          <span className={`ml-2 inline-flex items-center rounded-full text-xs px-2 py-0.5 bg-white/20 text-white capitalize`}>{form.vehicle}</span>
        </h2>
      </div>
      <div className="p-6">

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

  {fuel.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Entries</h3>

      {/* Car table */}
          <div className="mb-8">
            <h4 className="font-medium text-blue-700 mb-2">Car</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-200">
                <thead className="bg-blue-600">
                  <tr>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">📅 Date</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">🏷️ Type</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">📏 Odometer</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">⛽ Liters</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">💲 Price/L</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">🧾 Total</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">🛣️ Mileage (km/L)</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">📝 Notes</th>
                  </tr>
                </thead>
        <FuelTableBody items={fuel} vehicle="car" />
        <FuelTableFooter items={fuel} vehicle="car" />
              </table>
            </div>
          </div>

      {/* Bike table */}
          <div>
      <h4 className="font-medium text-green-700 mb-2">Bike</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-green-200">
                <thead className="bg-green-600">
                  <tr>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">📅 Date</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">🏷️ Type</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">📏 Odometer</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">⛽ Liters</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">💲 Price/L</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">🧾 Total</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">🛣️ Mileage (km/L)</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">📝 Notes</th>
                  </tr>
                </thead>
        <FuelTableBody items={fuel} vehicle="bike" />
        <FuelTableFooter items={fuel} vehicle="bike" />
              </table>
            </div>
          </div>
        </div>
      )}

      <FuelSummarySection />
    </div>
    </div>
  );
}

function FuelSummarySection() {
  const [summary, setSummary] = React.useState<FuelSummaryResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<'currentMonth' | 'lastMonth' | 'yearToDate'>('currentMonth');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiService.getFuelSummary();
        if (!cancelled) setSummary(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load summary');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;
  if (error) return <p className="text-red-500 text-sm mt-6">{error}</p>;
  if (!summary) return null;

  const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString();
  const bucket = summary[period];

  const Card = ({ title, bucket }: { title: string; bucket: FuelSummaryBucket }) => (
    <div className="bg-white border rounded-md p-4 shadow-sm">
      <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['car', 'bike'] as const).map(v => (
          <div
            key={v}
            className={`rounded p-3 border-l-4 ${v === 'car' ? 'bg-blue-50 border-blue-400' : 'bg-green-50 border-green-400'}`}
          >
            <h5 className={`font-medium mb-2 capitalize ${v === 'car' ? 'text-blue-800' : 'text-green-800'}`}>{v}</h5>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Total Liters: {fmt(bucket[v].liters)}</li>
              <li>Fuel Spend: ₹{fmt(bucket[v].fuelSpend)}</li>
              <li>Service Spend: ₹{fmt(bucket[v].serviceSpend)}</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  // Simple bar charts using CSS for quick visualization
  const Chart = ({ title, bucket, field }: { title: string; bucket: FuelSummaryBucket; field: 'fuelSpend' | 'serviceSpend' | 'liters' }) => {
    const carVal = bucket.car[field];
    const bikeVal = bucket.bike[field];
    const max = Math.max(carVal, bikeVal, 1);
    const bar = (val: number, label: string, color: string) => (
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{label}</span><span>{field === 'liters' ? fmt(val) + ' L' : `₹${fmt(val)}`}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded">
          <div className="h-2 rounded" style={{ width: `${(val / max) * 100}%`, backgroundColor: color }} />
        </div>
      </div>
    );
    return (
      <div className="bg-white border rounded-md p-4 shadow-sm">
        <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
  {bar(carVal, 'Car', '#3b82f6')}
  {bar(bikeVal, 'Bike', '#10b981')}
      </div>
    );
  };

  return (
    <div className="mt-10 space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Summary</h3>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Charts period:</label>
        <select
          value={period}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setPeriod(e.target.value as 'currentMonth' | 'lastMonth' | 'yearToDate')
          }
          className="px-2 py-1 border rounded"
        >
          <option value="currentMonth">Current Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="yearToDate">Year to Date</option>
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Current Month" bucket={summary.currentMonth} />
        <Card title="Last Month" bucket={summary.lastMonth} />
        <Card title="Year to Date" bucket={summary.yearToDate} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Chart title={`Fuel Spend (₹) - ${periodLabel(period)}`} bucket={bucket} field="fuelSpend" />
        <Chart title={`Service Spend (₹) - ${periodLabel(period)}`} bucket={bucket} field="serviceSpend" />
        <Chart title={`Liters - ${periodLabel(period)}`} bucket={bucket} field="liters" />
      </div>
    </div>
  );
}

function FuelTableBody({ items, vehicle }: { items: ApiFuel[]; vehicle: 'car' | 'bike' }) {
  // Filter once and compute mileage in O(n)
  const list = React.useMemo(() => items.filter(i => i.vehicle === vehicle), [items, vehicle]);
  const mileageArr = React.useMemo(() => {
    const n = list.length;
    const olderOdo: Array<number | null> = new Array(n).fill(null);
    let lastSeenOdo: number | null = null; // walking from end (oldest) to start (newest)
    for (let i = n - 1; i >= 0; i--) {
      olderOdo[i] = lastSeenOdo;
      if (typeof list[i].odometer === 'number') lastSeenOdo = list[i].odometer as number;
    }
    const out: string[] = new Array(n).fill('');
    for (let i = 0; i < n; i++) {
      const e = list[i];
      if (e.entryType === 'refueling' && typeof e.liters === 'number' && e.liters > 0 && typeof e.odometer === 'number' && typeof olderOdo[i] === 'number') {
        const dist = (e.odometer as number) - (olderOdo[i] as number);
        if (dist > 0) out[i] = (Math.round((dist / (e.liters as number)) * 100) / 100).toString();
      }
    }
    return out;
  }, [list]);

  const tbodyClass = vehicle === 'car'
    ? 'divide-y divide-blue-100'
    : 'divide-y divide-green-100';
  const rowClass = vehicle === 'car'
    ? 'odd:bg-blue-50 even:bg-blue-100 hover:bg-blue-200'
    : 'odd:bg-green-50 even:bg-green-100 hover:bg-green-200';
  const typeBadge = (t: ApiFuel['entryType']) =>
    t === 'refueling'
      ? 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800'
      : 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800';

  return (
    <tbody className={tbodyClass}>
      {list.map((e, idx) => (
        <tr key={e._id} className={rowClass}>
          <td className="px-4 py-2 whitespace-nowrap">{e.date?.slice(0, 10)}</td>
          <td className="px-4 py-2 whitespace-nowrap capitalize"><span className={typeBadge(e.entryType)}>{e.entryType}</span></td>
          <td className="px-4 py-2 whitespace-nowrap">{e.odometer ?? ''}</td>
          <td className="px-4 py-2 whitespace-nowrap">{e.liters ?? ''}</td>
          <td className="px-4 py-2 whitespace-nowrap">{e.pricePerLiter ?? ''}</td>
          <td className="px-4 py-2 whitespace-nowrap">{e.total ?? ''}</td>
          <td className="px-4 py-2 whitespace-nowrap">{mileageArr[idx]}</td>
          <td className="px-4 py-2">{e.notes ?? ''}</td>
        </tr>
      ))}
    </tbody>
  );
}

function FuelTableFooter({ items, vehicle }: { items: ApiFuel[]; vehicle: 'car' | 'bike' }) {
  const { fuelTotal, serviceTotal } = React.useMemo(() => {
    let fuelTotal = 0;
    let serviceTotal = 0;
    for (const e of items) {
      if (e.vehicle !== vehicle) continue;
      if (typeof e.total === 'number') {
        if (e.entryType === 'refueling') fuelTotal += e.total;
        else if (e.entryType === 'service') serviceTotal += e.total;
      }
    }
    return { fuelTotal, serviceTotal };
  }, [items, vehicle]);

  const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString();
  const tClass = vehicle === 'car' ? 'bg-blue-50 text-blue-900' : 'bg-green-50 text-green-900';
  const badge = vehicle === 'car' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

  // 8 columns total; place summary in the Total column, span across remaining
  return (
    <tfoot>
      <tr className={tClass}>
        <td className="px-4 py-2" colSpan={5}>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>Totals</span>
        </td>
        <td className="px-4 py-2 whitespace-nowrap align-top">
          <div className="text-xs space-y-1">
            <div>Fuel: ₹{fmt(fuelTotal)}</div>
            <div>Service: ₹{fmt(serviceTotal)}</div>
          </div>
        </td>
        <td className="px-4 py-2" colSpan={2}></td>
      </tr>
    </tfoot>
  );
}

function periodLabel(p: 'currentMonth' | 'lastMonth' | 'yearToDate') {
  switch (p) {
    case 'currentMonth': return 'Current Month';
    case 'lastMonth': return 'Last Month';
    case 'yearToDate': return 'Year to Date';
  }
}
