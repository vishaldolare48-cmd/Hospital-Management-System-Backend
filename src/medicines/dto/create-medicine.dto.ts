import { IsNotEmpty, IsString, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMedicineDto {
  @ApiProperty({ example: 'Paracetamol 500mg', description: 'Name of the medicine' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5.5, description: 'Price per unit of medicine' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 100, description: 'Available stock quantity' })
  @IsNumber()
  @Min(0)
  stockQty: number;

  @ApiProperty({ example: '2028-12-31', description: 'Expiry date of the medicine batch' })
  @IsDateString()
  expiryDate: string;
}
