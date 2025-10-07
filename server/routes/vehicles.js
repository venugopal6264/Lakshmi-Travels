import express from 'express';
import Vehicle from '../models/Vehicle.js';

const router = express.Router();

// util: parse month-year strings like MM-YYYY or YYYY-MM into a Date (first of month)
const parseMonthYear = (val) => {
  if (!val) return null;
  // If already a Date, normalize to first of that month
  if (val instanceof Date && !isNaN(val)) return new Date(val.getFullYear(), val.getMonth(), 1);
  const s = typeof val === 'string' ? val : String(val);
  const mmYYYY = /(\d{2})[-/](\d{4})/;
  const yyyyMM = /(\d{4})[-/](\d{2})/;
  let y, m;
  if (mmYYYY.test(s)) { const [, mm, yyyy] = s.match(mmYYYY); y = Number(yyyy); m = Number(mm) - 1; }
  else if (yyyyMM.test(s)) { const [, yyyy, mm] = s.match(yyyyMM); y = Number(yyyy); m = Number(mm) - 1; }
  else return null;
  return new Date(y, m, 1);
};

// List vehicles (optionally only active)
router.get('/', async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { active: true };
    const items = await Vehicle.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(v);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create vehicle
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const name = (b.name ?? '').toString().trim();
    const type = b.type;
    if (!name || !type) return res.status(400).json({ message: 'name and type are required' });
    const doc = {
      name,
      type,
      color: (b.color ?? '#3b82f6').toString().trim(),
      model: (b.model ?? '').toString().trim(),
      manufacturerDate: b.manufacturerDate ? parseMonthYear(b.manufacturerDate) : null,
      buyDate: b.buyDate ? new Date(b.buyDate) : null,
      fuelType: b.fuelType ?? 'Petrol',
      fuelCapacity: b.fuelCapacity === '' || b.fuelCapacity == null ? null : Number(b.fuelCapacity),
      licensePlate: (b.licensePlate ?? '').toString().trim(),
      chassisNumber: (b.chassisNumber ?? '').toString().trim(),
      notes: (b.notes ?? '').toString().trim(),
    };
    const v = new Vehicle(doc);
    const saved = await v.save();
    res.status(201).json(saved);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const patch = {};
    if (b.name !== undefined) patch.name = (b.name ?? '').toString().trim();
    if (b.type !== undefined) patch.type = b.type;
    if (b.color !== undefined) patch.color = (b.color ?? '').toString().trim();
    if (b.model !== undefined) patch.model = (b.model ?? '').toString().trim();
    if (b.manufacturerDate !== undefined) patch.manufacturerDate = b.manufacturerDate ? parseMonthYear(b.manufacturerDate) : null;
    if (b.buyDate !== undefined) patch.buyDate = b.buyDate ? new Date(b.buyDate) : null;
    if (b.fuelType !== undefined) patch.fuelType = b.fuelType;
    if (b.fuelCapacity !== undefined) patch.fuelCapacity = b.fuelCapacity === '' || b.fuelCapacity == null ? null : Number(b.fuelCapacity);
    if (b.licensePlate !== undefined) patch.licensePlate = (b.licensePlate ?? '').toString().trim();
    if (b.chassisNumber !== undefined) patch.chassisNumber = (b.chassisNumber ?? '').toString().trim();
    if (b.notes !== undefined) patch.notes = (b.notes ?? '').toString().trim();
    if (b.active !== undefined) patch.active = !!b.active;

    const updated = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Soft delete (deactivate)
router.delete('/:id', async (req, res) => {
  try {
    const mode = req.query.mode || 'soft';
    if (mode === 'hard') {
      const del = await Vehicle.findByIdAndDelete(req.params.id);
      if (!del) return res.status(404).json({ message: 'Vehicle not found' });
      return res.json({ success: true, deleted: true });
    }
    const v = await Vehicle.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!v) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ success: true, deleted: false });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
