import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from './user.schema';

export type ReceptionistDocument = Receptionist & Document;

@Schema({ collection: 'receptionists', timestamps: true })
export class Receptionist extends User {}

export const ReceptionistSchema = SchemaFactory.createForClass(Receptionist);
