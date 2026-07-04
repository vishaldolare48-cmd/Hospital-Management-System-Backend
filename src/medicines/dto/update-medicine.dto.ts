import { IsOptional, IsString, IsNumber, Min, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMedicineDto {
  @ApiProperty({ example: 'Paracetamol 500mg', required: false, description: 'Name of the medicine' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 5.5, required: false, description: 'Price per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ example: 100, required: false, description: 'Available stock quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty?: number;

  @ApiProperty({ example: '2028-12-31', required: false, description: 'Expiry date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ example: true, required: false, description: 'Is medicine active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
