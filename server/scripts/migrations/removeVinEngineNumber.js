import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const Vehicle = mongoose.connection.collection('vehicles');
  const res = await Vehicle.updateMany({}, { $unset: { vin: '', engineNumber: '' } });
  console.log('Updated count:', res.modifiedCount ?? res.result?.nModified);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
