import { IsNumber, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBillPaymentDto {
  @ApiProperty({ example: 150.0, description: 'Amount paid in this transaction' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amountPaid: number;
}
