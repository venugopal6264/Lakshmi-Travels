import express from 'express';
import mongoose from 'mongoose';
import CustomerDetails from '../models/CustomerDetails.js';

const router = express.Router();

// GET /api/customers - list all Customer names (newest first)
router.get('/', async (req, res) => {
    try {
        const items = await CustomerDetails.find({}).sort({ createdAt: -1 }).lean();
        res.json(items);
    } catch (err) {
        console.error('Failed to list customer names', err);
        res.status(500).json({ error: 'Failed to list customer names' });
    }
});

// POST /api/customers - create a new Customer name entry
router.post('/', async (req, res) => {
    try {
        const { name, age, dob, account, gender, aadharNumber } = req.body || {};
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'name is required' });
        }
        const payload = { name: name.trim() };
        if (age != null && age !== '') payload.age = Number(age);
        if (dob) payload.dob = new Date(dob);
        if (account && typeof account === 'string') payload.account = account.trim();
        if (gender && (gender === 'male' || gender === 'female')) payload.gender = gender;
        if (typeof aadharNumber === 'string') payload.aadharNumber = aadharNumber.trim();

        const created = await CustomerDetails.create(payload);
        res.status(201).json(created);
    } catch (err) {
        console.error('Failed to create customer name', err);
        res.status(500).json({ error: 'Failed to create customer name' });
    }
});

// PUT /api/customers/:id - update a customer entry
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'invalid id' });
        }
        const { name, age, dob, account, gender, aadharNumber } = req.body || {};
        const update = {};
        if (typeof name === 'string') update.name = name.trim();
        if (age === null || age === '' || typeof age === 'number') update.age = age === '' ? null : age;
        if (dob === null || typeof dob === 'string' || dob instanceof Date) update.dob = dob ? new Date(dob) : null;
        if (typeof account === 'string') update.account = account.trim();
        if (gender === 'male' || gender === 'female') update.gender = gender;
        if (typeof aadharNumber === 'string') update.aadharNumber = aadharNumber.trim();

        const updated = await CustomerDetails.findByIdAndUpdate(id, update, { new: true }).lean();
        if (!updated) return res.status(404).json({ error: 'not found' });
        res.json(updated);
    } catch (err) {
        console.error('Failed to update customer name', err);
        res.status(500).json({ error: 'Failed to update customer name' });
    }
});

// DELETE /api/customers/:id - delete a customer entry
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'invalid id' });
        }
        const deleted = await CustomerDetails.findByIdAndDelete(id).lean();
        if (!deleted) return res.status(404).json({ error: 'not found' });
        res.json({ ok: true });
    } catch (err) {
        console.error('Failed to delete customer name', err);
        res.status(500).json({ error: 'Failed to delete customer name' });
    }
});

export default router;
