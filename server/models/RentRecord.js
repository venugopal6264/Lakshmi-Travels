import mongoose from 'mongoose';

const rentRecordSchema = new mongoose.Schema({
    flat: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    month: { type: String, required: true }, // format YYYY-MM
    amount: { type: Number, required: true },
    maintenance: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paidDate: { type: String, default: null }, // YYYY-MM-DD
    notes: { type: String, default: '' },
}, { timestamps: true, indexes: [{ fields: { flat: 1, tenant: 1, month: 1 }, options: { unique: true } }] });

rentRecordSchema.index({ flat: 1, tenant: 1, month: 1 }, { unique: true });

const RentRecord = mongoose.model('RentRecord', rentRecordSchema);
export default RentRecord;
