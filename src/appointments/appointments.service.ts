import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    private usersService: UsersService,
  ) {}

  async book(dto: BookAppointmentDto, currentUserId: string, currentUserRole: string): Promise<AppointmentDocument> {
    let patientId = dto.patientId;
    if (currentUserRole === 'patient') {
      patientId = currentUserId;
    } else if (!patientId) {
      throw new BadRequestException('Patient ID is required when booking as staff');
    }

    // Verify patient exists
    const patient = await this.usersService.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      throw new BadRequestException('Invalid patient ID');
    }

    // Verify doctor exists
    const doctor = await this.usersService.findById(dto.doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      throw new BadRequestException('Invalid doctor ID');
    }

    // Validate if slot exists in working hours
    const slotExists = (doctor as any).workingHours?.includes(dto.timeSlot);
    if (!slotExists) {
      throw new BadRequestException(`Selected slot "${dto.timeSlot}" is not in doctor's working hours`);
    }

    const normalizedDate = new Date(dto.date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Double booking check at application level
    const existingBooking = await this.appointmentModel.findOne({
      doctorId: new Types.ObjectId(dto.doctorId),
      date: normalizedDate,
      timeSlot: dto.timeSlot,
      isBooked: true,
    }).exec();
    if (existingBooking) {
      throw new ConflictException('The selected doctor slot is already booked');
    }

    try {
      const newAppointment = new this.appointmentModel({
        patientId: new Types.ObjectId(patientId),
        doctorId: new Types.ObjectId(dto.doctorId),
        date: normalizedDate,
        timeSlot: dto.timeSlot,
        status: 'Confirmed',
        isBooked: true,
      });
      return await newAppointment.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('The selected doctor slot is already booked');
      }
      throw error;
    }
  }

  async findAll(user: any, filters: { doctorId?: string; patientId?: string; status?: string; date?: string }, page = 1, limit = 10) {
    const query: any = {};

    // Roles access boundaries
    if (user.role === 'patient') {
      query.patientId = new Types.ObjectId(user.sub);
    } else if (user.role === 'doctor') {
      query.doctorId = new Types.ObjectId(user.sub);
    } else {
      // Admin/Receptionist filters
      if (filters.doctorId) {
        query.doctorId = new Types.ObjectId(filters.doctorId);
      }
      if (filters.patientId) {
        query.patientId = new Types.ObjectId(filters.patientId);
      }
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.date) {
      const parsedDate = new Date(filters.date);
      parsedDate.setUTCHours(0, 0, 0, 0);
      query.date = parsedDate;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.appointmentModel.find(query)
        .populate('patientId', 'name email phone dob')
        .populate('doctorId', 'name email phone specialization consultationFee')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1, timeSlot: 1 })
        .exec(),
      this.appointmentModel.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async findOne(id: string, user: any): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findById(id)
      .populate('patientId', 'name email phone dob emergencyContact medicalHistory')
      .populate('doctorId', 'name email phone specialization consultationFee workingHours')
      .exec();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check visibility boundary
    if (user.role === 'patient' && appointment.patientId._id.toString() !== user.sub) {
      throw new ForbiddenException('You cannot access this appointment record');
    }
    if (user.role === 'doctor' && appointment.doctorId._id.toString() !== user.sub) {
      throw new ForbiddenException('You cannot access this appointment record');
    }

    return appointment;
  }

  async cancel(id: string, reason: string, user: any): Promise<AppointmentDocument> {
    const appointment = await this.findOne(id, user);

    if (appointment.status === 'Cancelled' || appointment.status === 'Completed') {
      throw new BadRequestException(`Cannot cancel a ${appointment.status.toLowerCase()} appointment`);
    }

    appointment.status = 'Cancelled';
    appointment.cancellationReason = reason || 'Cancelled by user';
    appointment.isBooked = false; // release slot

    return appointment.save();
  }

  async updateStatus(id: string, status: string, user: any): Promise<AppointmentDocument> {
    const appointment = await this.findOne(id, user);

    if (user.role === 'patient') {
      throw new ForbiddenException('Patients cannot update appointment status');
    }

    if (appointment.status === 'Cancelled') {
      throw new BadRequestException('Cannot update status of a cancelled appointment');
    }

    appointment.status = status;
    if (status === 'Cancelled') {
      appointment.isBooked = false;
    }

    return appointment.save();
  }
}
