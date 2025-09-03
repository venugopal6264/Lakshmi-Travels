import React, { useMemo, useState } from 'react';
import { Calendar, Fuel, Plus, Wrench, CreditCard, Gauge } from 'lucide-react';
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

  // NEW: Vehicle tab state
  const [activeVehicle, setActiveVehicle] = useState<VehicleType>('car');

  // Keep vehicle tabs in sync with form selection
  React.useEffect(() => {
    if (form.vehicle !== activeVehicle) setActiveVehicle(form.vehicle);
  }, [form.vehicle, activeVehicle]);

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
                    onClick={() => setActiveVehicle(v)}
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

/** Per-vehicle dashboard: tabs General | Refueling | Service */
function VehicleDash({ vehicle, items }: { vehicle: VehicleType; items: ApiFuel[] }) {
  const [tab, setTab] = useState<'general' | 'refueling' | 'service'>('general');

  const list = useMemo(() => items.filter(i => i.vehicle === vehicle), [items, vehicle]);
  const sorted = useMemo(
    () => [...list].sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime()),
    [list]
  );

  // Totals and metrics
  const totals = useMemo(() => {
    let total = 0, refuel = 0, service = 0;
    let distance = 0;
    let prevOdo: number | null = null;

    for (const e of sorted) {
      const amt = typeof e.total === 'number' ? e.total : 0;
      total += amt;
      if (e.entryType === 'refueling') refuel += amt;
      if (e.entryType === 'service') service += amt;

      if (typeof e.odometer === 'number') {
        if (prevOdo != null && e.odometer > prevOdo) distance += e.odometer - prevOdo;
        prevOdo = e.odometer;
      }
    }
    const income = 0;
    const balance = total - income;
    const firstDate = sorted[0]?.date ? new Date(sorted[0].date!) : null;
    const lastDate = sorted[sorted.length - 1]?.date ? new Date(sorted[sorted.length - 1].date!) : null;
    const rangeDays =
      firstDate && lastDate ? Math.max(1, Math.ceil((+lastDate - +firstDate) / (1000 * 60 * 60 * 24)) + 1) : 0;
    const byDay = rangeDays ? total / rangeDays : 0;
    const byKm = distance ? total / distance : 0;
    const pct = (p: number, t: number) => (t ? (p / t) * 100 : 0);

    return {
      total, refuel, service, income, balance, distance, byDay, byKm,
      entriesCount: sorted.length,
      firstDate, lastDate, rangeDays,
      refuelPct: pct(refuel, total),
      servicePct: pct(service, total),
      expense: 0,
      expensePct: 0
    };
  }, [sorted]);

  const inr3 = (n = 0) =>
    `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;

  const colorBar = vehicle === 'car' ? 'bg-blue-600' : 'bg-green-600';
  const splitIconRefuel = 'text-amber-500';
  const splitIconService = 'text-stone-500';
  const splitIconExpense = 'text-rose-500';
  const distanceColor = 'text-sky-700';

  return (
    <section className="mt-4">
      {/* Inner tabs */}
      <div className="flex items-center gap-2 border-b mb-6">
        {(['general', 'refueling', 'service'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3 py-2 text-sm font-medium ${tab === t ? 'text-gray-800' : 'text-gray-500'}`}
          >
            {t === 'general' ? 'General' : t === 'refueling' ? 'Refueling' : 'Service'}
            {tab === t && <span className={`absolute left-0 -bottom-px h-0.5 w-full ${colorBar}`} />}
          </button>
        ))}
      </div>

      {/* Header line: N entries (from - to) - Last X days */}
      <div className="text-center text-sm text-gray-600 mb-6">
        {totals.entriesCount} entries{' '}
        {totals.firstDate && totals.lastDate
          ? `(${fmtDate(totals.firstDate)} - ${fmtDate(totals.lastDate)}) - Last ${totals.rangeDays} days`
          : ''}
      </div>

      {tab === 'general' && (
        <div className="space-y-8">
          {/* Balance / Cost / Income */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Balance"
              valueClass="text-red-600"
              value={inr3(totals.balance)}
              byDay={inr3(totals.byDay)}
              byKm={inr3(totals.byKm)}
            />
            <MetricCard
              title="Cost"
              valueClass="text-red-600"
              value={inr3(totals.total)}
              byDay={inr3(totals.byDay)}
              byKm={inr3(totals.byKm)}
            />
            <MetricCard
              title="Income"
              valueClass="text-green-600"
              value={inr3(totals.income)}
              byDay={inr3(0)}
              byKm={inr3(0)}
            />
          </div>

          {/* Cost split */}
          <div>
            <h4 className="text-gray-800 font-semibold mb-4">Cost split</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SplitItem
                icon={<Fuel className={`h-6 w-6 ${splitIconRefuel}`} />}
                label="Refueling"
                amount={inr3(totals.refuel)}
                percent={`${totals.refuelPct.toFixed(2)}%`}
              />
              <SplitItem
                icon={<Wrench className={`h-6 w-6 ${splitIconService}`} />}
                label="Services"
                amount={inr3(totals.service)}
                percent={`${totals.servicePct.toFixed(2)}%`}
              />
              <SplitItem
                icon={<CreditCard className={`h-6 w-6 ${splitIconExpense}`} />}
                label="Expenses"
                amount={inr3(totals.expense)}
                percent={`${totals.expensePct.toFixed(2)}%`}
              />
            </div>
          </div>

          {/* Distance */}
          <div>
            <h4 className="text-gray-800 font-semibold mb-3">Distance</h4>
            <div className="rounded-lg border p-4 bg-white">
              <div className="text-sm text-gray-600">Total</div>
              <div className={`text-3xl font-semibold ${distanceColor} flex items-center gap-2`}>
                <Gauge className="h-5 w-5 text-sky-500" />
                {totals.distance.toLocaleString()} km
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {Math.round((totals.distance / Math.max(1, totals.rangeDays)) * 100) / 100} km by day
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'refueling' && (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${vehicle === 'car' ? 'divide-blue-200' : 'divide-green-200'}`}>
            <thead className={vehicle === 'car' ? 'bg-blue-600' : 'bg-green-600'}>
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
            <FuelTableBody items={items} vehicle={vehicle} onlyType="refueling" />
            <FuelTableFooter items={items} vehicle={vehicle} onlyType="refueling" />
          </table>
        </div>
      )}

      {tab === 'service' && (
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${vehicle === 'car' ? 'divide-blue-200' : 'divide-green-200'}`}>
            <thead className={vehicle === 'car' ? 'bg-blue-600' : 'bg-green-600'}>
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
            <FuelTableBody items={items} vehicle={vehicle} onlyType="service" />
            <FuelTableFooter items={items} vehicle={vehicle} onlyType="service" />
          </table>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  title,
  value,
  valueClass,
  byDay,
  byKm
}: { title: string; value: string; valueClass?: string; byDay: string; byKm: string }) {
  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="text-sm text-gray-600">{title}</div>
      <div className={`text-3xl font-semibold ${valueClass ?? 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{byDay} By day</div>
      <div className="text-xs text-gray-500">{byKm} By km</div>
    </div>
  );
}

function SplitItem({ icon, label, amount, percent }: { icon: React.ReactNode; label: string; amount: string; percent: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
        {icon}
      </div>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-lg font-semibold text-gray-900">{amount}</div>
        <div className="text-xs text-amber-600">{percent}</div>
      </div>
    </div>
  );
}

function fmtDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

/** UPDATED: Body now supports optional onlyType filter (refueling | service) */
function FuelTableBody({
  items,
  vehicle,
  onlyType
}: { items: ApiFuel[]; vehicle: 'car' | 'bike'; onlyType?: ApiFuel['entryType'] }) {
  // Filter once and compute mileage in O(n)
  const list = React.useMemo(
    () => items.filter(i => i.vehicle === vehicle && (!onlyType || i.entryType === onlyType)),
    [items, vehicle, onlyType]
  );
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

/** UPDATED: Footer respects onlyType to show matching totals */
function FuelTableFooter({
  items,
  vehicle,
  onlyType
}: { items: ApiFuel[]; vehicle: 'car' | 'bike'; onlyType?: ApiFuel['entryType'] }) {
  const totals = React.useMemo(() => {
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

  return (
    <tfoot>
      <tr className={tClass}>
        <td className="px-4 py-2" colSpan={5}>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>Totals</span>
        </td>
        <td className="px-4 py-2 whitespace-nowrap align-top">
          <div className="text-xs space-y-1">
            {!onlyType && (
              <>
                <div>Fuel: ₹{fmt(totals.fuelTotal)}</div>
                <div>Service: ₹{fmt(totals.serviceTotal)}</div>
              </>
            )}
            {onlyType === 'refueling' && <div>Fuel: ₹{fmt(totals.fuelTotal)}</div>}
            {onlyType === 'service' && <div>Service: ₹{fmt(totals.serviceTotal)}</div>}
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