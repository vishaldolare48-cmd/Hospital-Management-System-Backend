import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CustomLineItemDto {
  @ApiProperty({ example: 'Lab Test (Blood Report)', description: 'Line item description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 50.0, description: 'Line item charge amount' })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateBillDto {
  @ApiProperty({ example: '64b1f3c30a84e3d3b73379ca', description: 'Associated Appointment ID' })
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @ApiProperty({ example: 5.0, required: false, description: 'Tax rate percentage (e.g. 5 for 5%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiProperty({ example: 10.0, required: false, description: 'Absolute discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ type: [CustomLineItemDto], required: false, description: 'Any additional lab or diagnostics charges' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomLineItemDto)
  customLineItems?: CustomLineItemDto[];
}
