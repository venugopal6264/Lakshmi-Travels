import mongoose from 'mongoose';

const NameSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        age: { type: Number, default: null },
        dob: { type: Date, default: null },
        account: { type: String, trim: true, default: '' },
    },
    { timestamps: true }
);

const Name = mongoose.model('Name', NameSchema);
export default Name;
