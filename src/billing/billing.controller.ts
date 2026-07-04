import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillPaymentDto } from './dto/update-bill-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Billing & Payments')
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post()
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Generate a bill for a completed appointment (Admin/Receptionist only)' })
  async create(@Body() dto: CreateBillDto, @Request() req: any) {
    return this.billingService.generateBill(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of bills (Auto-filtered by role)' })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: ['Paid', 'Unpaid', 'Partial', 'Refunded', 'Cancelled'] })
  @ApiQuery({ name: 'patientId', required: false, description: 'Filter by patient ID (Staff only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAll(
    @Request() req: any,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('patientId') patientId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.billingService.findAll(req.user, { paymentStatus, patientId }, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a bill by ID' })
  async getOne(@Param('id') id: string, @Request() req: any) {
    return this.billingService.findOne(id, req.user);
  }

  @Patch(':id/payment')
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Record a payment transaction on a bill (Admin/Receptionist only)' })
  async pay(@Param('id') id: string, @Body() dto: UpdateBillPaymentDto, @Request() req: any) {
    return this.billingService.recordPayment(id, dto.amountPaid, req.user);
  }

  @Patch(':id/cancel')
  @Roles('admin')
  @ApiOperation({ summary: 'Cancel/Refund a bill (Admin only)' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.billingService.cancelBill(id, req.user);
  }
}
