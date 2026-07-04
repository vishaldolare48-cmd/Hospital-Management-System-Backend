import { IsEmail, IsNotEmpty, IsOptional, MinLength, IsString, IsEnum, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ example: 'staff@hms.com', description: 'Staff email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Staff password' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Staff Name', description: 'Staff full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1234567890', required: false, description: 'Staff phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'doctor', enum: ['admin', 'receptionist', 'doctor'], description: 'Staff role' })
  @IsEnum(['admin', 'receptionist', 'doctor'])
  role: string;

  // Doctor-specific fields
  @ApiProperty({ example: 'Cardiologist', required: false, description: 'Doctor specialization (Required if role is doctor)' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ example: 150, required: false, description: 'Doctor consultation fee (Required if role is doctor)' })
  @IsOptional()
  @IsNumber()
  consultationFee?: number;

  @ApiProperty({ example: ['09:00-10:00', '10:00-11:00'], required: false, description: 'Doctor working hours (Required if role is doctor)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingHours?: string[];
}
