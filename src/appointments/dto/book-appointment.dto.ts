import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookAppointmentDto {
  @ApiProperty({ example: '64b1f3c30a84e3d3b73379cc', required: false, description: 'Patient user ID. Optional for patient self-booking, required for staff booking.' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty({ example: '64b1f3c30a84e3d3b73379cd', description: 'Doctor user ID' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '2026-07-10', description: 'Appointment date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '09:00-10:00', description: 'Selected doctor slot' })
  @IsString()
  @IsNotEmpty()
  timeSlot: string;
}
