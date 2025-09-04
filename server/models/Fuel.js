import mongoose from 'mongoose';

const fuelSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
  // vehicle type (car|bike)
  vehicle: { type: String, enum: ['car', 'bike'], required: true },
  // optional linkage to named vehicle
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: false },
  vehicleName: { type: String, required: false, default: '' },
    entryType: { type: String, enum: ['refueling', 'service'], required: true },
    odometer: { type: Number, required: false, default: null },
    liters: { type: Number, required: false, default: null },
    pricePerLiter: { type: Number, required: false, default: null },
    total: { type: Number, required: false, default: null },
    station: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const Fuel = mongoose.model('Fuel', fuelSchema);

export default Fuel;
