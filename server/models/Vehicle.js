import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true }, // Display name, e.g., Breeza, FZs
        type: { type: String, enum: ['car', 'bike'], required: true },
        model: { type: String, default: '' }, // Model variant
        manufacturerDate: { type: Date, default: null },
        buyDate: { type: Date, default: null },
        fuelType: { type: String, enum: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'], default: 'Petrol' },
        fuelCapacity: { type: Number, default: null },
        licensePlate: { type: String, default: '' },
        chassisNumber: { type: String, default: '' },
        notes: { type: String, default: '' },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

vehicleSchema.index({ name: 1, type: 1 }, { unique: true });
vehicleSchema.index({ licensePlate: 1 }, { unique: false, sparse: true });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
