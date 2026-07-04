import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medicine, MedicineDocument } from './schemas/medicine.schema';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

@Injectable()
export class MedicinesService {
  constructor(
    @InjectModel(Medicine.name) private medicineModel: Model<MedicineDocument>,
  ) {}

  async create(dto: CreateMedicineDto): Promise<MedicineDocument> {
    const existing = await this.medicineModel.findOne({ name: { $regex: new RegExp(`^${dto.name}$`, 'i') } }).exec();
    if (existing) {
      throw new ConflictException('Medicine name already exists');
    }
    const newMedicine = new this.medicineModel(dto);
    return newMedicine.save();
  }

  async findAll(filters: { isActive?: boolean; lowStock?: boolean; search?: string }, page = 1, limit = 10): Promise<{ data: MedicineDocument[]; total: number }> {
    const query: any = {};
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    } else {
      query.isActive = true; // default to active only
    }

    if (filters.lowStock) {
      query.stockQty = { $lt: 10 };
    }

    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.medicineModel.find(query).skip(skip).limit(limit).sort({ name: 1 }).exec(),
      this.medicineModel.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<MedicineDocument> {
    const medicine = await this.medicineModel.findById(id).exec();
    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }
    return medicine;
  }

  async update(id: string, dto: UpdateMedicineDto): Promise<MedicineDocument> {
    const medicine = await this.findOne(id);
    if (dto.name && dto.name.toLowerCase() !== medicine.name.toLowerCase()) {
      const existing = await this.medicineModel.findOne({ name: { $regex: new RegExp(`^${dto.name}$`, 'i') } }).exec();
      if (existing) {
        throw new ConflictException('Medicine name already exists');
      }
    }
    const updated = await this.medicineModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException('Medicine not found');
    }
    return updated;
  }

  async deactivate(id: string): Promise<MedicineDocument> {
    const updated = await this.medicineModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException('Medicine not found');
    }
    return updated;
  }

  async adjustStock(id: string, qtyChange: number): Promise<MedicineDocument> {
    const medicine = await this.findOne(id);
    const newQty = medicine.stockQty + qtyChange;
    if (newQty < 0) {
      throw new BadRequestException(`Insufficient stock for medicine: ${medicine.name}. Available: ${medicine.stockQty}`);
    }
    const updated = await this.medicineModel.findByIdAndUpdate(id, { $inc: { stockQty: qtyChange } }, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException('Medicine not found');
    }
    return updated;
  }
}
