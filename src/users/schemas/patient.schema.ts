import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from './user.schema';

export type PatientDocument = Patient & Document;

@Schema({ collection: 'patients', timestamps: true })
export class Patient extends User {
  @Prop()
  dob?: Date;

  @Prop({
    type: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    _id: false,
  })
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };

  @Prop({ type: [String], default: [] })
  medicalHistory?: string[];
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
