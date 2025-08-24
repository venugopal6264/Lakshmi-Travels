import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
