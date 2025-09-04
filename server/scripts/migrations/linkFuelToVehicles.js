import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Vehicle from '../../models/Vehicle.js';
import Fuel from '../../models/Fuel.js';

dotenv.config();

async function ensureVehicle({ nameCandidates, fallbackName, type }) {
  // Try to find by name variants first
  for (const n of nameCandidates) {
    const v = await Vehicle.findOne({ type, name: new RegExp(`^${n}$`, 'i') });
    if (v) return v;
  }
  // Otherwise pick any existing of this type
  const any = await Vehicle.findOne({ type });
  if (any) return any;
  // Create fallback
  const created = await Vehicle.create({ name: fallbackName, type, active: true });
  return created;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI in environment. Aborting.');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  try {
    // Resolve canonical vehicles
    const breeza = await ensureVehicle({ nameCandidates: ['Breeza', 'Brezza'], fallbackName: 'Breeza', type: 'car' });
    const fzs = await ensureVehicle({ nameCandidates: ['FZs', 'FZS', 'FZ-S', 'FZ S'], fallbackName: 'FZs', type: 'bike' });

    console.log('Using vehicles:', { car: { id: String(breeza._id), name: breeza.name }, bike: { id: String(fzs._id), name: fzs.name } });

    // Link car entries
    const carFilter = {
      vehicle: 'car',
      $or: [
        { vehicleId: { $exists: false } },
        { vehicleId: null },
        { vehicleName: { $in: [null, '', 'car', 'Car'] } },
      ],
    };
    const carUpdate = {
      $set: {
        vehicleId: breeza._id,
        vehicleName: breeza.name,
      },
    };
    const carRes = await Fuel.updateMany(carFilter, carUpdate);
    console.log(`Updated car entries: matched=${carRes.matchedCount ?? carRes.n} modified=${carRes.modifiedCount ?? carRes.nModified}`);

    // Link bike entries
    const bikeFilter = {
      vehicle: 'bike',
      $or: [
        { vehicleId: { $exists: false } },
        { vehicleId: null },
        { vehicleName: { $in: [null, '', 'bike', 'Bike'] } },
      ],
    };
    const bikeUpdate = {
      $set: {
        vehicleId: fzs._id,
        vehicleName: fzs.name,
      },
    };
    const bikeRes = await Fuel.updateMany(bikeFilter, bikeUpdate);
    console.log(`Updated bike entries: matched=${bikeRes.matchedCount ?? bikeRes.n} modified=${bikeRes.modifiedCount ?? bikeRes.nModified}`);

    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
