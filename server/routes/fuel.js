import express from 'express';
import Fuel from '../models/Fuel.js';

const router = express.Router();

// Get all fuel entries
router.get('/', async (req, res) => {
  try {
    const items = await Fuel.find().sort({ date: -1, createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new fuel entry
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const entry = new Fuel(payload);
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update an entry
router.put('/:id', async (req, res) => {
  try {
    const updated = await Fuel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Fuel entry not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an entry
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Fuel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Fuel entry not found' });
    res.json({ message: 'Fuel entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

// Summary endpoint: current month, last month, year-to-date
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const startOfCurrentMonth = new Date(y, m, 1);
    const startOfNextMonth = new Date(y, m + 1, 1);
    const startOfLastMonth = new Date(y, m - 1, 1);
    const endOfLastMonth = startOfCurrentMonth;
    const startOfYear = new Date(y, 0, 1);

    const aggregateRange = async (from, to) => {
      const result = await Fuel.aggregate([
        { $match: { date: { $gte: from, $lt: to } } },
        {
          $group: {
            _id: '$vehicle',
            liters: {
              $sum: {
                $cond: [
                  { $eq: ['$entryType', 'refueling'] },
                  { $ifNull: ['$liters', 0] },
                  0,
                ],
              },
            },
            fuelSpend: {
              $sum: {
                $cond: [
                  { $eq: ['$entryType', 'refueling'] },
                  {
                    $ifNull: [
                      '$total',
                      { $multiply: [{ $ifNull: ['$liters', 0] }, { $ifNull: ['$pricePerLiter', 0] }] },
                    ],
                  },
                  0,
                ],
              },
            },
            serviceSpend: {
              $sum: {
                $cond: [
                  { $in: ['$entryType', ['service', 'repair']] },
                  { $ifNull: ['$total', 0] },
                  0,
                ],
              },
            },
          },
        },
      ]);

      const base = {
        car: { liters: 0, fuelSpend: 0, serviceSpend: 0 },
        bike: { liters: 0, fuelSpend: 0, serviceSpend: 0 },
      };

      for (const row of result) {
        const key = row._id === 'bike' ? 'bike' : 'car';
        base[key] = {
          liters: row.liters || 0,
          fuelSpend: row.fuelSpend || 0,
          serviceSpend: row.serviceSpend || 0,
        };
      }
      return base;
    };

    const [currentMonth, lastMonth, yearToDate] = await Promise.all([
      aggregateRange(startOfCurrentMonth, startOfNextMonth),
      aggregateRange(startOfLastMonth, endOfLastMonth),
      aggregateRange(startOfYear, startOfNextMonth),
    ]);

    res.json({ currentMonth, lastMonth, yearToDate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
