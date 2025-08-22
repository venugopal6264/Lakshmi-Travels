import dotenv from 'dotenv';
import express from 'express';
import Ticket from '../models/Ticket.js';
dotenv.config();

const router = express.Router();

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new ticket
router.post('/', async (req, res) => {
  try {
    const ticket = new Ticket(req.body);
    const savedTicket = await ticket.save();
    res.status(201).json(savedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a ticket
router.put('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Process refund for a ticket
router.put('/:id/refund', async (req, res) => {
  try {
    const { refundAmount, refundDate, refundReason } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { 
        refundAmount: refundAmount || 0,
        refundDate: refundDate || new Date(),
        refundReason: refundReason || ''
      },
      { new: true, runValidators: true }
    );
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a ticket
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profit summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await Ticket.aggregate([
      {
        $group: {
          _id: '$type',
          totalProfit: { $sum: '$profit' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      train: 0,
      bus: 0,
      flight: 0,
      total: 0
    };

    summary.forEach(item => {
      result[item._id] = item.totalProfit;
      result.total += item.totalProfit;
    });

    const totalTickets = await Ticket.countDocuments();
    
    res.json({ ...result, totalTickets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
export default router;
