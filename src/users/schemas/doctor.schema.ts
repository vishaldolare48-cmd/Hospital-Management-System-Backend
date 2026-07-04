import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from './user.schema';

export type DoctorDocument = Doctor & Document;

@Schema({ collection: 'doctors', timestamps: true })
export class Doctor extends User {
  @Prop()
  specialization?: string;

  @Prop()
  consultationFee?: number;

  @Prop({ type: [String], default: [] })
  workingHours?: string[];
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
