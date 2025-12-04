import express from 'express';
import Salary from '../models/Salary.js';

const router = express.Router();

// GET all salary records
router.get('/', async (req, res) => {
    try {
        const salaries = await Salary.find().sort({ year: -1 });
        res.json(salaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single salary record by year
router.get('/:year', async (req, res) => {
    try {
        const salary = await Salary.findOne({ year: parseInt(req.params.year) });
        if (!salary) return res.status(404).json({ error: 'Salary record not found' });
        res.json(salary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create new salary record
router.post('/', async (req, res) => {
    try {
        const {
            year, hikePercentage, previousSalary, finalSalary,
            revisionPercentage, revisionAmount, totalPercentage,
            bonusPercentage, bonusAmount, components, notes, effectiveDate
        } = req.body;

        // Check if year already exists
        const existing = await Salary.findOne({ year });
        if (existing) {
            return res.status(400).json({ error: 'Salary record for this year already exists' });
        }

        const salary = new Salary({
            year, hikePercentage, previousSalary, finalSalary,
            revisionPercentage, revisionAmount, totalPercentage,
            bonusPercentage, bonusAmount, components, notes, effectiveDate
        });

        await salary.save();
        res.status(201).json(salary);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT update salary record
router.put('/:id', async (req, res) => {
    try {
        const {
            year, hikePercentage, previousSalary, finalSalary,
            revisionPercentage, revisionAmount, totalPercentage,
            bonusPercentage, bonusAmount, components, notes, effectiveDate
        } = req.body;

        const salary = await Salary.findByIdAndUpdate(
            req.params.id,
            {
                year, hikePercentage, previousSalary, finalSalary,
                revisionPercentage, revisionAmount, totalPercentage,
                bonusPercentage, bonusAmount, components, notes, effectiveDate,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );

        if (!salary) return res.status(404).json({ error: 'Salary record not found' });
        res.json(salary);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE salary record
router.delete('/:id', async (req, res) => {
    try {
        const salary = await Salary.findByIdAndDelete(req.params.id);
        if (!salary) return res.status(404).json({ error: 'Salary record not found' });
        res.json({ message: 'Salary record deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
