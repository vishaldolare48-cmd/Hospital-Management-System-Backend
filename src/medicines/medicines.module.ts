import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Medicine, MedicineSchema } from './schemas/medicine.schema';
import { MedicinesService } from './medicines.service';
import { MedicinesController } from './medicines.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Medicine.name, schema: MedicineSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-hms-12345',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [MedicinesController],
  providers: [MedicinesService],
  exports: [MedicinesService, MongooseModule],
})
export class MedicinesModule {}
