import express from 'express';
import Payment from '../models/Payment.js';

const router = express.Router();
// Get all payments
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new payment
router.post('/', async (req, res) => {
  try {
    const { date, amount, period, account = '', tickets = [], isPartial = false } = req.body;
    if (!date || !amount || !period) {
      return res.status(400).json({ message: 'date, amount, period are required' });
    }
    const payment = new Payment({ date, amount, period, account, tickets, isPartial: !!isPartial });
    const savedPayment = await payment.save();
    res.status(201).json(savedPayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete all partial payments for an account (used when converting remaining open tickets to full paid)
router.delete('/partial/account/:account', async (req, res) => {
  try {
    const { account } = req.params;
    if (!account) return res.status(400).json({ message: 'Account required' });
    const partials = await Payment.find({ account, isPartial: true });
    if (partials.length === 0) {
      return res.json({ message: 'No partial payments to delete', deleted: 0, amount: 0 });
    }
    const totalAmount = partials.reduce((s, p) => s + Number(p.amount || 0), 0);
    const ids = partials.map(p => p._id);
    await Payment.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Partial payments cleared', deleted: partials.length, amount: totalAmount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
