import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bill, BillDocument } from './schemas/bill.schema';
import { CreateBillDto } from './dto/create-bill.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { MedicinesService } from '../medicines/medicines.service';
import { Prescription } from '../prescriptions/schemas/prescription.schema';
import { Doctor } from '../users/schemas/doctor.schema';

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(Bill.name) private billModel: Model<BillDocument>,
    @InjectModel(Prescription.name) private prescriptionModel: Model<Prescription>,
    @InjectModel('Doctor') private doctorModel: Model<Doctor>,
    private appointmentsService: AppointmentsService,
    private medicinesService: MedicinesService,
  ) {}

  async generateBill(dto: CreateBillDto, user: any): Promise<BillDocument> {
    const existingBill = await this.billModel.findOne({ appointmentId: new Types.ObjectId(dto.appointmentId) }).exec();
    if (existingBill) {
      throw new ConflictException('A bill has already been generated for this appointment');
    }

    const appointment = await this.appointmentsService.findOne(dto.appointmentId, user);

    if (appointment.status === 'Cancelled') {
      throw new BadRequestException('Cannot generate a bill for a cancelled appointment');
    }

    const lineItems = [];

    // Line Item 1: Consultation fee
    const doctor = await this.doctorModel.findById(appointment.doctorId).exec();
    const consultationFee = doctor?.consultationFee || 0;
    lineItems.push({
      description: `Consultation Fee (${doctor?.name || 'Doctor'})`,
      amount: consultationFee,
    });

    // Line Items 2: Prescribed medicines (fetch active prescription)
    const prescription = await this.prescriptionModel.findOne({
      appointmentId: appointment._id,
      isActive: true,
    }).exec();

    if (prescription) {
      for (const item of prescription.medicines) {
        try {
          const med = await this.medicinesService.findOne(item.medicineId.toString());
          const cost = med.unitPrice * item.quantity;
          lineItems.push({
            description: `${item.name} (${item.dosage}) x ${item.quantity}`,
            amount: cost,
          });
        } catch {
          lineItems.push({
            description: `${item.name} x ${item.quantity} (Stock record missing)`,
            amount: 0,
          });
        }
      }
    }

    // Line Items 3: Custom extra line items (e.g. lab charges)
    if (dto.customLineItems && dto.customLineItems.length > 0) {
      for (const item of dto.customLineItems) {
        lineItems.push({
          description: item.description,
          amount: item.amount,
        });
      }
    }

    const subtotal = lineItems.reduce((acc, curr) => acc + curr.amount, 0);
    const taxRate = dto.taxRate || 0;
    const discount = dto.discount || 0;
    
    let total = subtotal * (1 + taxRate / 100) - discount;
    if (total < 0) total = 0;

    const newBill = new this.billModel({
      appointmentId: appointment._id,
      patientId: appointment.patientId._id,
      lineItems,
      taxRate,
      discount,
      subtotal,
      total,
      paidAmount: 0,
      paymentStatus: 'Unpaid',
    });

    return newBill.save();
  }

  async recordPayment(id: string, amountPaid: number, user: any): Promise<BillDocument> {
    const bill = await this.billModel.findById(id).exec();
    if (!bill) {
      throw new NotFoundException('Bill record not found');
    }

    if (bill.paymentStatus === 'Cancelled' || bill.paymentStatus === 'Refunded') {
      throw new BadRequestException(`Cannot process payment for a ${bill.paymentStatus.toLowerCase()} invoice`);
    }

    const newPaidAmount = bill.paidAmount + amountPaid;
    if (newPaidAmount > bill.total) {
      throw new BadRequestException(`Payment excess: total due is ${bill.total - bill.paidAmount}, attempted: ${amountPaid}`);
    }

    bill.paidAmount = newPaidAmount;
    
    if (bill.paidAmount >= bill.total) {
      bill.paymentStatus = 'Paid';
    } else if (bill.paidAmount > 0) {
      bill.paymentStatus = 'Partial';
    } else {
      bill.paymentStatus = 'Unpaid';
    }

    return bill.save();
  }

  async cancelBill(id: string, user: any): Promise<BillDocument> {
    const bill = await this.billModel.findById(id).exec();
    if (!bill) {
      throw new NotFoundException('Bill record not found');
    }

    if (bill.paidAmount > 0) {
      bill.paymentStatus = 'Refunded';
    } else {
      bill.paymentStatus = 'Cancelled';
    }

    return bill.save();
  }

  async findAll(user: any, filters: { paymentStatus?: string; patientId?: string }, page = 1, limit = 10) {
    const query: any = {};

    if (user.role === 'patient') {
      query.patientId = new Types.ObjectId(user.sub);
    } else if (user.role === 'doctor') {
      throw new ForbiddenException('Doctors do not have direct access to financial bills');
    } else {
      if (filters.patientId) {
        query.patientId = new Types.ObjectId(filters.patientId);
      }
    }

    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.billModel.find(query)
        .populate('appointmentId')
        .populate('patientId', 'name email phone dob')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.billModel.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async findOne(id: string, user: any): Promise<BillDocument> {
    const bill = await this.billModel.findById(id)
      .populate({
        path: 'appointmentId',
        populate: { path: 'doctorId', select: 'name specialization' },
      })
      .populate('patientId', 'name email phone dob emergencyContact')
      .exec();

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (user.role === 'patient' && bill.patientId._id.toString() !== user.sub) {
      throw new ForbiddenException('You cannot access this bill');
    }
    if (user.role === 'doctor') {
      throw new ForbiddenException('Doctors do not have direct access to financial bills');
    }

    return bill;
  }
}
