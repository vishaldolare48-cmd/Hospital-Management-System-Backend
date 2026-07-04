import { IsNotEmpty, IsString, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PrescriptionMedicineDto {
  @ApiProperty({ example: '64b1f3c30a84e3d3b73379cf', description: 'Medicine ID' })
  @IsString()
  @IsNotEmpty()
  medicineId: string;

  @ApiProperty({ example: '1-0-1 after food', description: 'Dosage instructions' })
  @IsString()
  @IsNotEmpty()
  dosage: string;

  @ApiProperty({ example: '5 days', description: 'Duration of treatment' })
  @IsString()
  @IsNotEmpty()
  duration: string;

  @ApiProperty({ example: 10, description: 'Total quantity prescribed to be dispensed' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Take with warm water', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: '64b1f3c30a84e3d3b73379ca', description: 'Associated Appointment ID' })
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @ApiProperty({ example: 'Fever, cough, body ache', description: 'Patient symptoms' })
  @IsString()
  @IsNotEmpty()
  symptoms: string;

  @ApiProperty({ example: 'Viral Influenza', description: 'Clinical diagnosis' })
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @ApiProperty({ type: [PrescriptionMedicineDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionMedicineDto)
  medicines: PrescriptionMedicineDto[];
}
