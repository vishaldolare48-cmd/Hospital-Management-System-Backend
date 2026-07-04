import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PrescriptionDocument = Prescription & Document;

@Schema({ _id: false })
export class PrescriptionMedicine {
  @Prop({ type: Types.ObjectId, ref: 'Medicine', required: true })
  medicineId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // Snapshot of medicine name at time of prescribing

  @Prop({ required: true })
  dosage: string; // e.g. "1-0-1 after meals"

  @Prop({ required: true })
  duration: string; // e.g. "5 days"

  @Prop({ required: true, min: 1 })
  quantity: number; // total units prescribed, used to decrement stock

  @Prop()
  notes?: string;
}

@Schema({ timestamps: true })
export class Prescription {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true, index: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true })
  symptoms: string;

  @Prop({ required: true })
  diagnosis: string; // Clinical diagnosis notes

  @Prop({ type: [PrescriptionMedicine], default: [] })
  medicines: PrescriptionMedicine[];

  @Prop({ required: true, default: 1 })
  version: number;

  @Prop({ default: true })
  isActive: boolean; // active version flag
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
PrescriptionSchema.index({ appointmentId: 1, version: -1 });
