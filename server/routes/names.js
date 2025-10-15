import express from 'express';
import Name from '../models/Name.js';

const router = express.Router();

// GET /api/names - list all names (newest first)
router.get('/', async (req, res) => {
    try {
        const items = await Name.find({}).sort({ createdAt: -1 }).lean();
        res.json(items);
    } catch (err) {
        console.error('Failed to list names', err);
        res.status(500).json({ error: 'Failed to list names' });
    }
});

// POST /api/names - create a new name entry
router.post('/', async (req, res) => {
    try {
        const { name, age, dob, account } = req.body || {};
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'name is required' });
        }
        const payload = { name: name.trim() };
        if (age != null && age !== '') payload.age = Number(age);
        if (dob) payload.dob = new Date(dob);
        if (account && typeof account === 'string') payload.account = account.trim();

        const created = await Name.create(payload);
        res.status(201).json(created);
    } catch (err) {
        console.error('Failed to create name', err);
        res.status(500).json({ error: 'Failed to create name' });
    }
});

export default router;
