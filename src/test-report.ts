import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hms';

async function testReport() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  // User schema
  const userSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.model('User', userSchema);

  // Appointment schema
  const appointmentSchema = new mongoose.Schema({}, { strict: false });
  const Appointment = mongoose.model('Appointment', appointmentSchema);

  // Bill schema
  const billSchema = new mongoose.Schema({}, { strict: false });
  const Bill = mongoose.model('Bill', billSchema);

  // Re-implement the getSummary function logic to test
  const query: any = {};

  const totalPatients = await User.countDocuments({ role: 'patient' }).exec();
  const totalDoctors = await User.countDocuments({ role: 'doctor' }).exec();

  const appointmentsQuery = { ...query };
  const totalAppointments = await Appointment.countDocuments(appointmentsQuery).exec();
  
  const appointmentsByStatus = await Appointment.aggregate([
    { $match: appointmentsQuery },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const billsQuery = { ...query };
  const financialStats = await Bill.aggregate([
    { $match: { ...billsQuery, paymentStatus: { $nin: ['Cancelled', 'Refunded'] } } },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$paidAmount' },
        totalBilled: { $sum: '$total' },
      },
    },
  ]);

  console.log('Raw financialStats:', financialStats);

  const totalEarnings = financialStats[0]?.totalEarnings || 0;
  const totalBilled = financialStats[0]?.totalBilled || 0;
  const pendingPayments = totalBilled - totalEarnings;

  console.log('\n--- Overview ---');
  console.log('Total Patients:', totalPatients);
  console.log('Total Doctors:', totalDoctors);
  console.log('Total Appointments:', totalAppointments);
  console.log('Total Earnings:', totalEarnings);
  console.log('Pending Payments:', pendingPayments);
  console.log('Appointments Breakdown:', appointmentsByStatus);

  await mongoose.disconnect();
}

testReport().catch(console.error);
