import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// Middleware to ensure requester is admin
function requireAdmin(req, res, next) {
  const role = req.user?.role;
  if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
}

// GET /api/users - list all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// POST /api/users/:id/reset-password { newPassword }
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

export default router;