import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hms';

async function seed() {
  console.log('Connecting to database at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to database.');

  // Drop current collections to seed cleanly
  try {
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const col of collections) {
        console.log(`Dropping collection: ${col.name}`);
        await mongoose.connection.db.dropCollection(col.name);
      }
    }
  } catch (e: any) {
    console.log('No collections to drop or error dropping:', e.message);
  }

  // Schemas configuration for seeding
  const baseSchemaFields = {
    email: String,
    passwordHash: String,
    name: String,
    phone: String,
    role: String,
    isActive: { type: Boolean, default: true },
    refreshTokenHash: String,
  };

  const Admin = mongoose.model('Admin', new mongoose.Schema(baseSchemaFields, { collection: 'admins', timestamps: true }));
  const Receptionist = mongoose.model('Receptionist', new mongoose.Schema(baseSchemaFields, { collection: 'receptionists', timestamps: true }));
  
  const Doctor = mongoose.model('Doctor', new mongoose.Schema({
    ...baseSchemaFields,
    specialization: String,
    consultationFee: Number,
    workingHours: [String],
  }, { collection: 'doctors', timestamps: true }));

  const Patient = mongoose.model('Patient', new mongoose.Schema({
    ...baseSchemaFields,
    dob: Date,
    emergencyContact: mongoose.Schema.Types.Mixed,
    medicalHistory: [String],
  }, { collection: 'patients', timestamps: true }));

  // Medicine schema configuration for seeding
  const medicineSchema = new mongoose.Schema({
    name: String,
    unitPrice: Number,
    stockQty: Number,
    expiryDate: Date,
    isActive: Boolean,
  }, { timestamps: true });

  const Medicine = mongoose.model('Medicine', medicineSchema);

  const passwordHash = await bcrypt.hash('password123', 10);

  console.log('Seeding users...');
  const admin = {
    email: 'admin@hms.com',
    passwordHash,
    name: 'System Admin',
    phone: '111-222-3333',
    role: 'admin',
    isActive: true,
  };
  const receptionist = {
    email: 'receptionist@hms.com',
    passwordHash,
    name: 'Sarah Connor',
    phone: '222-333-4444',
    role: 'receptionist',
    isActive: true,
  };
  const doctors = [
    {
      email: 'doctor.smith@hms.com',
      passwordHash,
      name: 'Dr. John Smith',
      phone: '333-444-5555',
      role: 'doctor',
      isActive: true,
      specialization: 'Cardiologist',
      consultationFee: 150,
      workingHours: ['09:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00'],
    },
    {
      email: 'doctor.jones@hms.com',
      passwordHash,
      name: 'Dr. Amy Jones',
      phone: '444-555-6666',
      role: 'doctor',
      isActive: true,
      specialization: 'Pediatrician',
      consultationFee: 120,
      workingHours: ['09:00-10:00', '10:00-11:00', '14:00-15:00'],
    }
  ];
  const patient = {
    email: 'patient.doe@hms.com',
    passwordHash,
    name: 'John Doe',
    phone: '555-0199',
    role: 'patient',
    isActive: true,
    dob: new Date('1985-05-15'),
    emergencyContact: {
      name: 'Jane Doe',
      phone: '555-0200',
      relation: 'Spouse',
    },
    medicalHistory: ['Hypertension', 'Penicillin Allergy'],
  };

  await Promise.all([
    Admin.create(admin),
    Receptionist.create(receptionist),
    Doctor.insertMany(doctors),
    Patient.create(patient)
  ]);
  console.log('Seeded users successfully.');

  console.log('Seeding medicines...');
  const medicines = [
    {
      name: 'Paracetamol 500mg',
      unitPrice: 5.5,
      stockQty: 100,
      expiryDate: new Date('2028-12-31'),
      isActive: true,
    },
    {
      name: 'Amoxicillin 250mg',
      unitPrice: 12.0,
      stockQty: 50,
      expiryDate: new Date('2027-06-30'),
      isActive: true,
    },
    {
      name: 'Ibuprofen 400mg',
      unitPrice: 8.5,
      stockQty: 75,
      expiryDate: new Date('2028-03-15'),
      isActive: true,
    },
    {
      name: 'Cetirizine 10mg',
      unitPrice: 4.0,
      stockQty: 120,
      expiryDate: new Date('2028-09-30'),
      isActive: true,
    },
    {
      name: 'Metformin 500mg',
      unitPrice: 15.0,
      stockQty: 5,
      expiryDate: new Date('2029-01-01'),
      isActive: true,
    }
  ];

  await Medicine.insertMany(medicines);
  console.log('Seeded medicines successfully.');

  await mongoose.disconnect();
  console.log('Seeding complete. Connection closed.');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  mongoose.disconnect();
});
