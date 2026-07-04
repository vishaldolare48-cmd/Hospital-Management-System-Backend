import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Doctor } from '../users/schemas/doctor.schema';
import { Patient } from '../users/schemas/patient.schema';
import { Appointment } from '../appointments/schemas/appointment.schema';
import { Bill } from '../billing/schemas/bill.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel('Doctor') private doctorModel: Model<Doctor>,
    @InjectModel('Patient') private patientModel: Model<Patient>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectModel(Bill.name) private billModel: Model<Bill>,
  ) {}

  async getSummary(startDateStr?: string, endDateStr?: string) {
    const query: any = {};

    if (startDateStr || endDateStr) {
      query.createdAt = {};
      if (startDateStr) {
        const start = new Date(startDateStr);
        if (isNaN(start.getTime())) {
          throw new BadRequestException('Invalid start date format');
        }
        start.setUTCHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDateStr) {
        const end = new Date(endDateStr);
        if (isNaN(end.getTime())) {
          throw new BadRequestException('Invalid end date format');
        }
        end.setUTCHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const totalPatients = await this.patientModel.countDocuments().exec();
    const totalDoctors = await this.doctorModel.countDocuments().exec();

    const appointmentsQuery = { ...query };
    const totalAppointments = await this.appointmentModel.countDocuments(appointmentsQuery).exec();
    
    const appointmentsByStatus = await this.appointmentModel.aggregate([
      { $match: appointmentsQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const billsQuery = { ...query };
    const financialStats = await this.billModel.aggregate([
      { $match: { ...billsQuery, paymentStatus: { $nin: ['Cancelled', 'Refunded'] } } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$paidAmount' },
          totalBilled: { $sum: '$total' },
        },
      },
    ]);

    const totalEarnings = financialStats[0]?.totalEarnings || 0;
    const totalBilled = financialStats[0]?.totalBilled || 0;
    const pendingPayments = totalBilled - totalEarnings;

    const doctorEarningsBreakdown = await this.billModel.aggregate([
      { $match: { ...billsQuery, paymentStatus: { $nin: ['Cancelled', 'Refunded'] } } },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointment',
        },
      },
      { $unwind: '$appointment' },
      {
        $lookup: {
          from: 'doctors',
          localField: 'appointment.doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      { $unwind: '$doctor' },
      {
        $group: {
          _id: '$appointment.doctorId',
          doctorName: { $first: '$doctor.name' },
          specialization: { $first: '$doctor.specialization' },
          earnings: { $sum: '$paidAmount' },
          billed: { $sum: '$total' },
          appointmentsCount: { $sum: 1 },
        },
      },
      { $sort: { earnings: -1 } },
    ]);

    return {
      overview: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        totalEarnings,
        pendingPayments,
      },
      appointmentsBreakdown: appointmentsByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      doctorEarningsBreakdown,
    };
  }
}
