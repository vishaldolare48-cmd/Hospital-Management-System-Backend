import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bill, BillSchema } from './schemas/bill.schema';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { MedicinesModule } from '../medicines/medicines.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bill.name, schema: BillSchema }]),
    AppointmentsModule,
    MedicinesModule,
    PrescriptionsModule,
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-hms-12345',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService, MongooseModule],
})
export class BillingModule {}
