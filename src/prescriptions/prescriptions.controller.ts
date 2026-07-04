import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Prescriptions')
@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PrescriptionsController {
  constructor(private prescriptionsService: PrescriptionsService) {}

  @Post()
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Add diagnosis and prescription details (Doctor or Admin only)' })
  async create(@Body() dto: CreatePrescriptionDto, @Request() req: any) {
    return this.prescriptionsService.create(dto, req.user.sub, req.user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of active prescriptions (Auto-filtered by role and permissions)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAll(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.prescriptionsService.findAll(req.user, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a prescription by ID' })
  async getOne(@Param('id') id: string, @Request() req: any) {
    return this.prescriptionsService.findOne(id, req.user);
  }

  @Get('appointment/:appointmentId/history')
  @ApiOperation({ summary: 'Get version history of prescriptions for an appointment (Audit Trail)' })
  async getHistory(@Param('appointmentId') appointmentId: string, @Request() req: any) {
    return this.prescriptionsService.getHistory(appointmentId, req.user);
  }
}
