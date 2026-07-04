import { IsEmail, IsNotEmpty, IsOptional, MinLength, IsString, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class EmergencyContactDto {
  @ApiProperty({ example: 'Jane Doe', description: 'Contact person name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '9876543210', description: 'Contact person phone' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Spouse', description: 'Relationship to patient' })
  @IsString()
  @IsNotEmpty()
  relation: string;
}

export class RegisterPatientDto {
  @ApiProperty({ example: 'john@gmail.com', description: 'Patient email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Patient password' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Patient full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1234567890', required: false, description: 'Patient phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '1990-01-01', required: false, description: 'Patient date of birth' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiProperty({ type: EmergencyContactDto, required: false, description: 'Emergency contact details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}
