import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        age: { type: Number, default: null },
        dob: { type: Date, default: null },
        account: { type: String, trim: true, default: '' },
        gender: { type: String, enum: ['male', 'female'], default: 'female', lowercase: true, trim: true },
        aadharNumber: { type: String, trim: true, default: '' },
    },
    { timestamps: true }
);

const CustomerDetails = mongoose.model('CustomerDetails', CustomerSchema);
export default CustomerDetails;
