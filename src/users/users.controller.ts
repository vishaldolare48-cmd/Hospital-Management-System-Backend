import { Controller, Get, Patch, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from './schemas/user.schema';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('admin', 'receptionist')
  @ApiOperation({ summary: 'Get all users with filtering and pagination (Admin/Receptionist only)' })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'receptionist', 'doctor', 'patient'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAll(
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const isActiveBool = isActive === undefined ? undefined : isActive === 'true';
    return this.usersService.findAll({ role, isActive: isActiveBool, search }, +page, +limit);
  }

  @Get('doctors')
  @ApiOperation({ summary: 'Get all active doctors (Accessible to all authenticated users)' })
  async getDoctors() {
    return this.usersService.findAll({ role: 'doctor', isActive: true }, 1, 100);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (Admin/Receptionist, or user themselves)' })
  async getOne(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user.role;
    const userId = req.user.sub;

    const targetUser = await this.usersService.findById(id);

    if (userRole === 'patient' && userId !== id) {
      throw new ForbiddenException('You cannot access details of another user');
    }

    if (userRole === 'doctor' && targetUser.role === 'patient') {
      const hasAppointment = await this.usersService.hasAppointmentWith(userId, id);
      if (!hasAppointment) {
        throw new ForbiddenException('You cannot access details of a patient without an appointment');
      }
    }

    return targetUser;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details (Admin or user themselves)' })
  async update(@Param('id') id: string, @Body() updateData: Partial<User>, @Request() req: any) {
    const userRole = req.user.role;
    const userId = req.user.sub;

    if (userRole !== 'admin' && userId !== id) {
      throw new ForbiddenException('You cannot modify another user');
    }
    
    // Prevent non-admins from changing their role or active status
    if (userRole !== 'admin') {
      delete updateData.role;
      delete updateData.isActive;
    }

    return this.usersService.update(id, updateData);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate user / soft-delete (Admin only)' })
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
