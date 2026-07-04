import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Doctor', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  date: Date; // normalized to YYYY-MM-DD

  @Prop({ required: true })
  timeSlot: string; // e.g. "09:00-10:00"

  @Prop({ required: true, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Confirmed' })
  status: string;

  @Prop()
  cancellationReason?: string;

  @Prop({ default: true })
  isBooked: boolean; // Set to true for active bookings, set to false/undefined when Cancelled to release the slot
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Compound unique index to prevent double booking.
// Filters only for active bookings (isBooked: true) to allow slots to be re-booked after cancellation.
AppointmentSchema.index(
  { doctorId: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { isBooked: true },
  },
);
