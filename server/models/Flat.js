import mongoose from 'mongoose';

const flatSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true },
    notes: { type: String, default: '' },
    currentTenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
}, { timestamps: true });

const Flat = mongoose.model('Flat', flatSchema);
export default Flat;
