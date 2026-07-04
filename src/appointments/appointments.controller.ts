import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('admin', 'receptionist', 'patient')
  @ApiOperation({ summary: 'Book an appointment (Patient self-service or Admin/Receptionist)' })
  async book(@Body() dto: BookAppointmentDto, @Request() req: any) {
    return this.appointmentsService.book(dto, req.user.sub, req.user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of appointments (Auto-filtered by role and permissions)' })
  @ApiQuery({ name: 'doctorId', required: false, description: 'Filter by doctor ID (Staff only)' })
  @ApiQuery({ name: 'patientId', required: false, description: 'Filter by patient ID (Staff only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'] })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAll(
    @Request() req: any,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.appointmentsService.findAll(req.user, { doctorId, patientId, status, date }, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment details by ID' })
  async getOne(@Param('id') id: string, @Request() req: any) {
    return this.appointmentsService.findOne(id, req.user);
  }

  @Patch(':id/cancel')
  @Roles('admin', 'receptionist', 'patient')
  @ApiOperation({ summary: 'Cancel an appointment (Patient own, or Admin/Receptionist)' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    return this.appointmentsService.cancel(id, reason, req.user);
  }

  @Patch(':id/status')
  @Roles('admin', 'receptionist', 'doctor')
  @ApiOperation({ summary: 'Update appointment status (Admin/Receptionist or Doctor only)' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
    return this.appointmentsService.updateStatus(id, status, req.user);
  }
}
