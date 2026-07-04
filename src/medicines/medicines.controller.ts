import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Medicines')
@Controller('medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedicinesController {
  constructor(private medicinesService: MedicinesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Add a new medicine (Admin only)' })
  async create(@Body() dto: CreateMedicineDto) {
    return this.medicinesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of medicines with search, pagination, and stock filters' })
  @ApiQuery({ name: 'search', required: false, description: 'Search medicine by name' })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean, description: 'Filter items with quantity < 10' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAll(
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const isLowStock = lowStock === 'true';
    return this.medicinesService.findAll({ lowStock: isLowStock, search }, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medicine by ID' })
  async getOne(@Param('id') id: string) {
    return this.medicinesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update medicine details (Admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateMedicineDto) {
    return this.medicinesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Soft delete / deactivate medicine (Admin only)' })
  async deactivate(@Param('id') id: string) {
    return this.medicinesService.deactivate(id);
  }

  @Patch(':id/adjust-stock')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually adjust stock level by incrementing/decrementing (Admin only)' })
  async adjustStock(@Param('id') id: string, @Body('qtyChange') qtyChange: number) {
    return this.medicinesService.adjustStock(id, qtyChange);
  }
}
