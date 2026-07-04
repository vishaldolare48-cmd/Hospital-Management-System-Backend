import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { Admin } from './schemas/admin.schema';
import { Receptionist } from './schemas/receptionist.schema';
import { Doctor } from './schemas/doctor.schema';
import { Patient } from './schemas/patient.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('Admin') private adminModel: Model<Admin>,
    @InjectModel('Receptionist') private receptionistModel: Model<Receptionist>,
    @InjectModel('Doctor') private doctorModel: Model<Doctor>,
    @InjectModel('Patient') private patientModel: Model<Patient>,
  ) {}

  async create(userData: Partial<User> & { password?: string } & any): Promise<any> {
    const role = userData.role;
    let model: Model<any>;
    if (role === 'admin') model = this.adminModel;
    else if (role === 'receptionist') model = this.receptionistModel;
    else if (role === 'doctor') model = this.doctorModel;
    else if (role === 'patient') model = this.patientModel;
    else throw new BadRequestException('Invalid user role');

    if (!userData.email) {
      throw new BadRequestException('Email is required');
    }
    if (!userData.password) {
      throw new BadRequestException('Password is required');
    }

    const emailLower = userData.email.toLowerCase();
    const existing = await this.findByEmail(emailLower);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    const userToSave = {
      ...userData,
      email: emailLower,
      passwordHash,
    };
    delete userToSave.password;

    const newUser = new model(userToSave);
    return newUser.save();
  }

  async findByEmail(email: string): Promise<any | null> {
    const emailLower = email.toLowerCase();
    const models: Model<any>[] = [this.adminModel, this.receptionistModel, this.doctorModel, this.patientModel];
    for (const model of models) {
      const user = await model.findOne({ email: emailLower }).exec();
      if (user) return user;
    }
    return null;
  }

  async findById(id: string): Promise<any> {
    const models: Model<any>[] = [this.adminModel, this.receptionistModel, this.doctorModel, this.patientModel];
    for (const model of models) {
      const user = await model.findById(id).exec();
      if (user) return user;
    }
    throw new NotFoundException('User not found');
  }

  async findAll(filters: { role?: string; isActive?: boolean; search?: string }, page = 1, limit = 10): Promise<{ data: any[]; total: number }> {
    if (filters.role) {
      let model: Model<any>;
      if (filters.role === 'admin') model = this.adminModel;
      else if (filters.role === 'receptionist') model = this.receptionistModel;
      else if (filters.role === 'doctor') model = this.doctorModel;
      else if (filters.role === 'patient') model = this.patientModel;
      else throw new BadRequestException('Invalid role filter');

      const query: any = {};
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
        model.countDocuments(query).exec(),
      ]);

      return { data, total };
    }

    // Combined query across all models
    const query: any = {};
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const models: Model<any>[] = [this.adminModel, this.receptionistModel, this.doctorModel, this.patientModel];
    const results = await Promise.all(models.map(m => m.find(query).exec()));
    const allData = results.flat().sort((a: any, b: any) => (b as any).createdAt.getTime() - (a as any).createdAt.getTime());
    const total = allData.length;
    const skip = (page - 1) * limit;
    const data = allData.slice(skip, skip + limit);

    return { data, total };
  }

  async update(id: string, updateData: Partial<User> & { password?: string } & any): Promise<any> {
    const result = await this.findByIdWithModel(id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
    const { user, model } = result;

    const updates: any = { ...updateData };

    if (updates.email && updates.email.toLowerCase() !== user.email) {
      const existing = await this.findByEmail(updates.email);
      if (existing) {
        throw new ConflictException('Email already exists');
      }
      updates.email = updates.email.toLowerCase();
    }

    if (updates.password) {
      const passwordHash = await bcrypt.hash(updates.password, 10);
      updates.passwordHash = passwordHash;
      delete updates.password;
    }

    const updatedUser = await model.findByIdAndUpdate(id, { $set: updates }, { new: true }).exec();
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  async deactivate(id: string): Promise<any> {
    return this.update(id, { isActive: false });
  }

  async hasAppointmentWith(doctorId: string, patientId: string): Promise<boolean> {
    const appointmentModel = this.doctorModel.db.model('Appointment');
    const count = await appointmentModel.countDocuments({
      doctorId: new Types.ObjectId(doctorId),
      patientId: new Types.ObjectId(patientId),
    }).exec();
    return count > 0;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const result = await this.findByIdWithModel(userId);
    if (!result) return;
    const { model } = result;

    const refreshTokenHash = refreshToken ? await bcrypt.hash(refreshToken, 10) : undefined;
    await model.findByIdAndUpdate(userId, { refreshTokenHash }).exec();
  }

  private async findByIdWithModel(id: string): Promise<{ user: any; model: Model<any> } | null> {
    const searchConfig: { model: Model<any>; role: string }[] = [
      { model: this.adminModel, role: 'admin' },
      { model: this.receptionistModel, role: 'receptionist' },
      { model: this.doctorModel, role: 'doctor' },
      { model: this.patientModel, role: 'patient' },
    ];
    for (const item of searchConfig) {
      const user = await item.model.findById(id).exec();
      if (user) return { user, model: item.model };
    }
    return null;
  }
}
