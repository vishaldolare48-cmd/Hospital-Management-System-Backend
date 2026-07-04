import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hms';

async function checkDb() {
  console.log('Connecting to database at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('No database connection.');
    return;
  }

  const collections = await db.listCollections().toArray();
  console.log('\n--- Collection Counts ---');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`${col.name}: ${count} documents`);
  }

  console.log('\n--- Appointments ---');
  const appointments = await db.collection('appointments').find().toArray();
  console.log(JSON.stringify(appointments, null, 2));

  console.log('\n--- Bills ---');
  const bills = await db.collection('bills').find().toArray();
  console.log(JSON.stringify(bills, null, 2));

  await mongoose.disconnect();
}

checkDb().catch(console.error);
