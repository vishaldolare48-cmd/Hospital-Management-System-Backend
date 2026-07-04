import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prescription, PrescriptionDocument } from './schemas/prescription.schema';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { MedicinesService } from '../medicines/medicines.service';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectModel(Prescription.name) private prescriptionModel: Model<PrescriptionDocument>,
    private appointmentsService: AppointmentsService,
    private medicinesService: MedicinesService,
  ) {}

  async create(dto: CreatePrescriptionDto, doctorId: string, doctorRole: string): Promise<PrescriptionDocument> {
    // 1. Fetch appointment and verify permission
    const appointment = await this.appointmentsService.findOne(dto.appointmentId, {
      sub: doctorId,
      role: doctorRole,
    });

    if (appointment.status === 'Cancelled') {
      throw new BadRequestException('Cannot add diagnostic records for a cancelled appointment');
    }

    if (doctorRole === 'doctor' && appointment.doctorId._id.toString() !== doctorId) {
      throw new ForbiddenException('You are not the assigned doctor for this appointment');
    }

    // 2. Validate medicine stock levels & resolve names
    const prescribedMedicines = [];
    for (const item of dto.medicines) {
      const med = await this.medicinesService.findOne(item.medicineId);
      if (!med.isActive) {
        throw new BadRequestException(`Medicine ${med.name} is deactivated and cannot be prescribed`);
      }
      if (med.stockQty < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${med.name}. Prescribed: ${item.quantity}, Available: ${med.stockQty}`);
      }
      prescribedMedicines.push({
        medicineId: new Types.ObjectId(item.medicineId),
        name: med.name,
        dosage: item.dosage,
        duration: item.duration,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    // 3. Decrement inventory
    for (const item of prescribedMedicines) {
      await this.medicinesService.adjustStock(item.medicineId.toString(), -item.quantity);
    }

    // 4. Handle append-only version control
    const existingVersions = await this.prescriptionModel.find({ appointmentId: appointment._id }).sort({ version: -1 }).exec();
    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;

    if (existingVersions.length > 0) {
      // Deactivate all previous versions
      await this.prescriptionModel.updateMany({ appointmentId: appointment._id }, { isActive: false }).exec();
    }

    // 5. Save prescription document
    const newPrescription = new this.prescriptionModel({
      appointmentId: appointment._id,
      patientId: appointment.patientId._id,
      doctorId: appointment.doctorId._id,
      symptoms: dto.symptoms,
      diagnosis: dto.diagnosis,
      medicines: prescribedMedicines,
      version: nextVersion,
      isActive: true,
    });

    const saved = await newPrescription.save();

    // 6. Auto-transition appointment status to Completed
    if (appointment.status !== 'Completed') {
      await this.appointmentsService.updateStatus(appointment._id.toString(), 'Completed', {
        sub: doctorId,
        role: doctorRole,
      });
    }

    return saved;
  }

  async findAll(user: any, page = 1, limit = 10) {
    const query: any = { isActive: true };

    if (user.role === 'patient') {
      query.patientId = new Types.ObjectId(user.sub);
    } else if (user.role === 'doctor') {
      query.doctorId = new Types.ObjectId(user.sub);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prescriptionModel.find(query)
        .populate('appointmentId')
        .populate('patientId', 'name email phone dob')
        .populate('doctorId', 'name email phone specialization')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.prescriptionModel.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async findOne(id: string, user: any): Promise<PrescriptionDocument> {
    const prescription = await this.prescriptionModel.findById(id)
      .populate('patientId', 'name email phone dob')
      .populate('doctorId', 'name email phone specialization')
      .exec();

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    if (user.role === 'patient' && prescription.patientId._id.toString() !== user.sub) {
      throw new ForbiddenException('You cannot access this prescription record');
    }
    if (user.role === 'doctor' && prescription.doctorId._id.toString() !== user.sub) {
      throw new ForbiddenException('You cannot access this prescription record');
    }

    return prescription;
  }

  async getHistory(appointmentId: string, user: any): Promise<PrescriptionDocument[]> {
    // Triggers visibility check via appointment fetching
    await this.appointmentsService.findOne(appointmentId, user);

    return this.prescriptionModel.find({ appointmentId: new Types.ObjectId(appointmentId) })
      .populate('doctorId', 'name specialization')
      .sort({ version: -1 })
      .exec();
  }
}
