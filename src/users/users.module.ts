import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Doctor, DoctorSchema } from './schemas/doctor.schema';
import { Patient, PatientSchema } from './schemas/patient.schema';
import { Receptionist, ReceptionistSchema } from './schemas/receptionist.schema';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Admin', schema: AdminSchema },
      { name: 'Receptionist', schema: ReceptionistSchema },
      { name: 'Doctor', schema: DoctorSchema },
      { name: 'Patient', schema: PatientSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-hms-12345',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule { }
