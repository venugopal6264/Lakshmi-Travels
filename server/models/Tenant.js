import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    aadharNumber: { type: String, default: '' },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, default: null }, // YYYY-MM-DD or null if active
    rentAmount: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    flat: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', required: true },
    active: { type: Boolean, default: true },
}, { timestamps: true });

const Tenant = mongoose.model('Tenant', tenantSchema);
export default Tenant;
