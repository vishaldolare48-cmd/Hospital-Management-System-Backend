import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BillDocument = Bill & Document;

@Schema({ _id: false })
export class BillLineItem {
  @Prop({ required: true })
  description: string; // e.g. "Consultation Fee", "Paracetamol 500mg x 10"

  @Prop({ required: true, min: 0 })
  amount: number;
}

@Schema({ timestamps: true })
export class Bill {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true, index: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: [BillLineItem], required: true, default: [] })
  lineItems: BillLineItem[];

  @Prop({ required: true, min: 0, default: 0 })
  taxRate: number; // in percentage, e.g. 5 for 5%

  @Prop({ required: true, min: 0, default: 0 })
  discount: number; // in absolute currency value

  @Prop({ required: true, min: 0 })
  subtotal: number; // sum of lineItems amounts

  @Prop({ required: true, min: 0 })
  total: number; // (subtotal * (1 + taxRate/100)) - discount

  @Prop({ required: true, min: 0, default: 0 })
  paidAmount: number;

  @Prop({ required: true, enum: ['Paid', 'Unpaid', 'Partial', 'Refunded', 'Cancelled'], default: 'Unpaid' })
  paymentStatus: string;
}

export const BillSchema = SchemaFactory.createForClass(Bill);
