import React, { useEffect, useMemo, useState } from 'react';
import { Car, Plus, Settings } from 'lucide-react';
import { ApiFuel, apiService } from '../services/api';
import { useFuel } from '../hooks/useApi';
import { FuelSummarySection, VehicleDash, VehicleType } from '../utils/FuelUtils';

// Shared type for vehicles returned by API
type VehicleDoc = {
  _id: string;
  name: string;
  type: VehicleType;
  active: boolean;
  model?: string;
  manufacturerDate?: string | null;
  buyDate?: string | null;
  fuelType?: string;
  fuelCapacity?: number | null;
  licensePlate?: string;
  chassisNumber?: string;
  notes?: string;
};


export default function FuelTracker() {
  const vehicleDisplay: Record<VehicleType, string> = {
    car: 'Breeza',
    bike: 'FZs',
  };
  const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleManagerOpen, setVehicleManagerOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVehicleName, setSelectedVehicleName] = useState<string>(vehicleDisplay['car']);
  useEffect(() => {
    (async () => {
      try {
        const list = await apiService.getVehicles();
        const arr = list as VehicleDoc[];
        setVehicles(arr);
        // Prefer Car by default; fallback to first available
        const preferred = arr.find(v => v.type === 'car') || arr[0] || null;
        if (preferred) {
          setSelectedVehicleId(preferred._id);
          setSelectedVehicleName(preferred.name);
          setActiveVehicle(preferred.type);
          setActiveVehicleId(preferred._id);
        }
      } catch {
        // ignore
      }
    })();
  }, []);
  const { fuel, addFuel, updateFuel, deleteFuel } = useFuel();

  // entry modal state (create/edit)
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ApiFuel | null>(null);


  // NEW: Vehicle tab state: type + optional selected named vehicle id
  const [activeVehicle, setActiveVehicle] = useState<VehicleType>('car');
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);

  // primary action styles no longer needed here; using header buttons instead

  // No inline form: selection happens via tabs; default vehicle for modal comes from selection

  // Period filter state
  type PeriodKey = 'all' | '1m' | '3m' | '6m' | '1y';
  const [period, setPeriod] = useState<PeriodKey>('all');

  function subMonths(base: Date, m: number) {
    const d = new Date(base);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    return new Date(year, month - m, day);
  }

  const periodFilteredFuel = React.useMemo(() => {
    if (period === 'all') return fuel;
    const now = new Date();
    const start = period === '1m' ? subMonths(now, 1)
      : period === '3m' ? subMonths(now, 3)
        : period === '6m' ? subMonths(now, 6)
          : subMonths(now, 12);
    start.setHours(0, 0, 0, 0);
    return fuel.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= start;
    });
  }, [fuel, period]);

  // Visible list for current vehicle selection (for top date range display)
  const visibleList = React.useMemo(() => {
    return periodFilteredFuel.filter(i => {
      if (i.vehicle !== activeVehicle) return false;
      if (activeVehicleId) return i.vehicleId === activeVehicleId;
      return true;
    }).sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
  }, [periodFilteredFuel, activeVehicle, activeVehicleId]);

  const rangeInfo = React.useMemo(() => {
    const entriesCount = visibleList.length;
    if (!entriesCount) return null;
    const firstDate = visibleList[0]?.date ? new Date(visibleList[0].date!) : null;
    const lastDate = visibleList[entriesCount - 1]?.date ? new Date(visibleList[entriesCount - 1].date!) : null;
    const rangeDays = firstDate && lastDate ? Math.max(1, Math.ceil((+lastDate - +firstDate) / (1000 * 60 * 60 * 24)) + 1) : 0;
    return { entriesCount, firstDate, lastDate, rangeDays } as const;
  }, [visibleList]);

  function fmtDate(d?: Date | null) {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-0 overflow-hidden">
      {/* Colorful header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-green-500 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Car className="w-5 h-5" />
            Vehicles
            <span className="ml-2 inline-flex items-center rounded-full text-xs px-2 py-0.5 bg-white/20 text-white capitalize">
              {selectedVehicleName}
            </span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-emerald-600 hover:to-teal-600 ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2"
              title="Add new entry"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
            <button
              onClick={() => setVehicleManagerOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-indigo-600 hover:to-blue-700 ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2"
              title="Manage vehicles"
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
            <button
              onClick={() => setVehicleModalOpen(true)}
              className="bg-gradient-to-r from-lime-500 to-green-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full hover:from-lime-600 hover:to-green-700 ring-1 ring-white/20 shadow-sm transition duration-200 flex items-center gap-2"
              title="Add vehicle"
            >
              <Plus className="w-4 h-4" />
              Add vehicle
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Toolbar: Vehicle and Period selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              className="w-full px-3 py-2 rounded-md border-0 ring-1 ring-inset ring-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900"
              value={activeVehicleId ?? ''}
              onChange={(e) => {
                const id = e.target.value || null;
                setActiveVehicleId(id);
                if (id) {
                  const v = vehicles.find(x => x._id === id);
                  if (v) {
                    setActiveVehicle(v.type);
                    setSelectedVehicleId(v._id);
                    setSelectedVehicleName(v.name);
                  }
                }
              }}
            >
              <option value="">Select…</option>
              <optgroup label="Cars">
                {vehicles.filter(v => v.type === 'car').map(v => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </optgroup>
              <optgroup label="Bikes">
                {vehicles.filter(v => v.type === 'bike').map(v => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              className="w-full px-3 py-2 rounded-md border-0 ring-1 ring-inset ring-green-300 bg-gradient-to-r from-green-50 to-green-100 text-green-900"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            >
              <option value="all">All Time</option>
              <option value="1m">Last Month</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last 1 Year</option>
            </select>
          </div>
          <div className='md:col-span-1'>
            {/* Date range display at top */}
            {rangeInfo && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-1 text-sm text-indigo-900 ring-1 ring-indigo-200">
                  {rangeInfo.entriesCount} entries {rangeInfo.firstDate && rangeInfo.lastDate ? `(${fmtDate(rangeInfo.firstDate)} - ${fmtDate(rangeInfo.lastDate)})` : ''} • Last {rangeInfo.rangeDays} days
                </span>
              </div>
            )}
          </div>
        </div>


        {/* VEHICLE TABS (Car | Bike) */}
        {periodFilteredFuel.length > 0 && (
          <div className="mt-4">
            <VehicleDash
              vehicle={activeVehicle}
              items={periodFilteredFuel}
              vehicleId={activeVehicleId}
              vehicleName={undefined}
              onEdit={(e) => {
                setEditingEntry(e);
                setEntryModalOpen(true);
              }}
              onDelete={(e) => {
                if (e._id) deleteFuel(e._id);
              }}
            />
          </div>
        )}

        <FuelSummarySection items={periodFilteredFuel} />
      </div>
      {vehicleModalOpen && (
        <AddVehicleModal
          onClose={() => setVehicleModalOpen(false)}
          onAdded={(v: VehicleDoc) => {
            setVehicles(prev => {
              // prefer one active selection per type - keep newest at front
              const others = prev.filter(x => x._id !== v._id);
              const next: VehicleDoc[] = [v, ...others];
              return next;
            });
            setSelectedVehicleId(v._id);
            setSelectedVehicleName(v.name);
            setActiveVehicle(v.type);
            setVehicleModalOpen(false);
          }}
        />
      )}
      {vehicleManagerOpen && (
        <VehicleManagerModal
          vehicles={vehicles}
          onClose={() => setVehicleManagerOpen(false)}
          onUpdated={(v) => setVehicles(prev => prev.map(x => x._id === v._id ? v : x))}
          onDeleted={(id) => setVehicles(prev => prev.filter(x => x._id !== id))}
        />
      )}
      {entryModalOpen && (
        <FuelEntryModal
          initial={editingEntry}
          defaultVehicle={{ id: editingEntry?.vehicleId ?? selectedVehicleId, name: editingEntry?.vehicleName ?? selectedVehicleName, type: editingEntry?.vehicle ?? activeVehicle }}
          vehicles={vehicles}
          onClose={() => { setEntryModalOpen(false); setEditingEntry(null); }}
          onSave={async (payload, id) => {
            if (id) {
              await updateFuel(id, payload);
            } else {
              await addFuel(payload);
            }
            setEntryModalOpen(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}

function AddVehicleModal({ onClose, onAdded }: { onClose: () => void; onAdded: (v: { _id: string; name: string; type: VehicleType; active: boolean }) => void }) {
  const [form, setForm] = useState({
    name: '',
    type: 'car' as VehicleType,
    model: '',
    manufacturerDate: '',
    buyDate: '',
    fuelType: 'Petrol',
    fuelCapacity: '' as number | string,
    licensePlate: '',
    chassisNumber: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError('Vehicle name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        model: form.model.trim(),
        manufacturerDate: form.manufacturerDate || null,
        buyDate: form.buyDate || null,
        fuelType: form.fuelType,
        fuelCapacity: form.fuelCapacity ? Number(form.fuelCapacity) : null,
        licensePlate: form.licensePlate.trim(),
        chassisNumber: form.chassisNumber.trim(),
        notes: form.notes.trim(),
      };
      const v = await apiService.createVehicle(payload);
      onAdded(v as VehicleDoc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add vehicle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Add vehicle</h3>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select name="type" className="w-full px-3 py-2 border rounded-md" value={form.type} onChange={update}>
              <option value="car">Car</option>
              <option value="bike">Bike</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
            <input name="name" className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={update} placeholder="e.g., Breeza, FZs" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input name="model" className="w-full px-3 py-2 border rounded-md" value={form.model} onChange={update} placeholder="e.g., ZDi, FZ-S V3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Date (MM-YYYY)</label>
            <input name="manufacturerDate" placeholder="MM-YYYY" className="w-full px-3 py-2 border rounded-md" value={form.manufacturerDate} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buy Date</label>
            <input name="buyDate" type="date" className="w-full px-3 py-2 border rounded-md" value={form.buyDate} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuel type</label>
            <select name="fuelType" className="w-full px-3 py-2 border rounded-md" value={form.fuelType} onChange={update}>
              {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Capacity (L)</label>
            <input name="fuelCapacity" type="number" className="w-full px-3 py-2 border rounded-md" value={form.fuelCapacity} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
            <input name="licensePlate" className="w-full px-3 py-2 border rounded-md" value={form.licensePlate} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
            <input name="chassisNumber" className="w-full px-3 py-2 border rounded-md" value={form.chassisNumber} onChange={update} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full px-3 py-2 border rounded-md" value={form.notes} onChange={update} />
          </div>
          {error && <p className="text-red-600 text-sm md:col-span-2">{error}</p>}
          <div className="md:col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-2 text-gray-700 border rounded-md">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VehicleManagerModal({ vehicles, onClose, onUpdated, onDeleted }: { vehicles: VehicleDoc[]; onClose: () => void; onUpdated: (v: VehicleDoc) => void; onDeleted: (id: string) => void }) {
  const [editing, setEditing] = useState<VehicleDoc | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await apiService.deleteVehicle(id);
      onDeleted(id);
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Manage vehicles</h3>
          <button onClick={onClose} className="px-2 py-1 text-gray-600">Close</button>
        </div>
        <div className="divide-y">
          {vehicles.map(v => (
            <div key={v._id} className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <span>{v.name}</span>
                    <span className="text-xs capitalize inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-200">{v.type}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                    {v.model && <div><span className="text-gray-500">Model: </span>{v.model}</div>}
                    {v.manufacturerDate && (
                      <div>
                        <span className="text-gray-500">Mfg: </span>
                        {new Date(v.manufacturerDate).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', '-')}
                      </div>
                    )}
                    {v.licensePlate && <div><span className="text-gray-500">Plate: </span>{v.licensePlate}</div>}

                    {v.fuelType && <div><span className="text-gray-500">Fuel: </span>{v.fuelType}</div>}
                    {v.fuelCapacity != null && <div><span className="text-gray-500">Capacity: </span>{v.fuelCapacity} L</div>}
                    {v.buyDate && <div><span className="text-gray-500">Buy: </span>{String(v.buyDate).slice(0, 10)}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="text-indigo-600" onClick={() => setEditing(v)}>Edit</button>
                  <button className="text-red-600" disabled={busyId === v._id} onClick={() => remove(v._id)}>{busyId === v._id ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {editing && (
          <EditVehicleModal
            vehicle={editing}
            onClose={() => setEditing(null)}
            onSaved={(v) => { onUpdated(v); setEditing(null); }}
          />
        )}
      </div>
    </div>
  );
}

function EditVehicleModal({ vehicle, onClose, onSaved }: { vehicle: VehicleDoc; onClose: () => void; onSaved: (v: VehicleDoc) => void }) {
  const [form, setForm] = useState({
    name: vehicle.name || '',
    type: vehicle.type as VehicleType,
    model: vehicle.model || '',
    manufacturerDate: vehicle.manufacturerDate ? String(vehicle.manufacturerDate).slice(0, 7) : '',
    buyDate: vehicle.buyDate ? String(vehicle.buyDate).slice(0, 10) : '',
    fuelType: vehicle.fuelType || 'Petrol',
    fuelCapacity: vehicle.fuelCapacity ?? '',
    licensePlate: vehicle.licensePlate || '',
    chassisNumber: vehicle.chassisNumber || '',
    notes: vehicle.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const update = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: Partial<{ name: string; type: VehicleType; model: string; manufacturerDate: string | null; buyDate: string | null; fuelType: string; fuelCapacity: number | null; licensePlate: string; chassisNumber: string; notes: string }> = {
      name: form.name,
      type: form.type,
      model: form.model,
      manufacturerDate: form.manufacturerDate || null,
      buyDate: form.buyDate || null,
      fuelType: form.fuelType,
      fuelCapacity: form.fuelCapacity ? Number(form.fuelCapacity) : null,
      licensePlate: form.licensePlate,
      chassisNumber: form.chassisNumber,
      notes: form.notes,
    };
    try {
      const v = await apiService.updateVehicle(vehicle._id, payload);
      onSaved(v as VehicleDoc);
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Edit vehicle</h3>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select name="type" className="w-full px-3 py-2 border rounded-md" value={form.type} onChange={update}>
              <option value="car">Car</option>
              <option value="bike">Bike</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
            <input name="name" className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input name="model" className="w-full px-3 py-2 border rounded-md" value={form.model} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Date (MM-YYYY)</label>
            <input name="manufacturerDate" placeholder="MM-YYYY" className="w-full px-3 py-2 border rounded-md" value={form.manufacturerDate} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buy Date</label>
            <input name="buyDate" type="date" className="w-full px-3 py-2 border rounded-md" value={form.buyDate} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuel type</label>
            <select name="fuelType" className="w-full px-3 py-2 border rounded-md" value={form.fuelType} onChange={update}>
              {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Capacity (L)</label>
            <input name="fuelCapacity" type="number" className="w-full px-3 py-2 border rounded-md" value={form.fuelCapacity} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
            <input name="licensePlate" className="w-full px-3 py-2 border rounded-md" value={form.licensePlate} onChange={update} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
            <input name="chassisNumber" className="w-full px-3 py-2 border rounded-md" value={form.chassisNumber} onChange={update} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full px-3 py-2 border rounded-md" value={form.notes} onChange={update} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-2 text-gray-700 border rounded-md">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FuelEntryModal({ initial, defaultVehicle, vehicles, onClose, onSave }: { initial: ApiFuel | null; defaultVehicle: { id: string | null; name: string; type: VehicleType }; vehicles: VehicleDoc[]; onClose: () => void; onSave: (payload: Omit<ApiFuel, '_id' | 'createdAt' | 'updatedAt'>, id?: string) => void }) {
  const getToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [vehicleType, setVehicleType] = useState<VehicleType>(initial?.vehicle || defaultVehicle.type);
  const [vehicleId, setVehicleId] = useState<string | null>(initial?.vehicleId ?? defaultVehicle.id);
  const [entryType, setEntryType] = useState<ApiFuel['entryType']>(initial?.entryType || 'refueling');
  const [date, setDate] = useState<string>(initial?.date?.slice(0, 10) || getToday());
  const [odometer, setOdometer] = useState<string>(initial?.odometer != null ? String(initial.odometer) : '');
  const [liters, setLiters] = useState<string>(initial?.liters != null ? String(initial.liters) : '');
  const [pricePerLiter, setPricePerLiter] = useState<string>(initial?.pricePerLiter != null ? String(initial.pricePerLiter) : '');
  const [total, setTotal] = useState<string>(initial?.total != null ? String(initial.total) : '');
  const [notes, setNotes] = useState<string>(initial?.notes || '');
  const computedTotal = useMemo(() => {
    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    if (!Number.isFinite(l) || !Number.isFinite(p)) return '';
    return (Math.round(l * p * 100) / 100).toString();
  }, [liters, pricePerLiter]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = vehicles.find(v => v._id === vehicleId) || null;
    const payload: Omit<ApiFuel, '_id' | 'createdAt' | 'updatedAt'> = {
      date,
      vehicle: chosen?.type || vehicleType,
      vehicleId: chosen?._id || null,
      vehicleName: chosen?.name || defaultVehicle.name,
      entryType,
      odometer: odometer ? Number(odometer) : null,
      liters: entryType === 'refueling' && liters ? Number(liters) : null,
      pricePerLiter: entryType === 'refueling' && pricePerLiter ? Number(pricePerLiter) : null,
      total: (computedTotal || total) ? Number(computedTotal || total) : null,
      notes,
    };
    onSave(payload, initial?._id);
  };
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
        <h3 className="text-lg font-semibold mb-3">{initial ? 'Edit entry' : 'Add entry'}</h3>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" className="w-full px-3 py-2 border rounded-md" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select className="w-full px-3 py-2 border rounded-md" value={vehicleId ?? ''} onChange={e => {
              const id = e.target.value || null;
              setVehicleId(id);
              const v = vehicles.find(x => x._id === id);
              if (v) setVehicleType(v.type);
            }}>
              <option value="">Select…</option>
              <optgroup label="Cars">
                {vehicles.filter(v => v.type === 'car').map(v => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </optgroup>
              <optgroup label="Bikes">
                {vehicles.filter(v => v.type === 'bike').map(v => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select className="w-full px-3 py-2 border rounded-md" value={entryType} onChange={e => setEntryType(e.target.value as ApiFuel['entryType'])}>
              <option value="refueling">Refueling</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (km)</label>
            <input type="number" className="w-full px-3 py-2 border rounded-md" value={odometer} onChange={e => setOdometer(e.target.value)} />
          </div>
          {entryType === 'refueling' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Liters</label>
                <input type="number" className="w-full px-3 py-2 border rounded-md" value={liters} onChange={e => setLiters(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price / Liter (₹)</label>
                <input type="number" className="w-full px-3 py-2 border rounded-md" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total (₹)</label>
                <input type="number" className="w-full px-3 py-2 border rounded-md" value={computedTotal || total} onChange={e => setTotal(e.target.value)} />
              </div>
            </>
          )}
          {entryType === 'service' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Amount (₹)</label>
              <input type="number" className="w-full px-3 py-2 border rounded-md" value={total} onChange={e => setTotal(e.target.value)} />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-2 text-gray-700 border rounded-md">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}


