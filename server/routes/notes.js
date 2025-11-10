import express from 'express';
import Note from '../models/Note.js';

const router = express.Router();

// List notes (current user); optional ?pinned=true
router.get('/', async (req, res) => {
    try {
        const items = await Note.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create note
router.post('/', async (req, res) => {
    try {
        const payload = req.body;
        const entry = new Note(payload);
        const saved = await entry.save();
        res.status(201).json(saved);
    } catch (e) {
        res.status(400).json({ message: error.message });
    }
});

// Update note
router.put('/:id', async (req, res) => {
    try {
        const updated = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ message: 'Note not found' });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete note
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Note.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Fuel entry not found' });
        res.json({ message: 'Fuel entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
