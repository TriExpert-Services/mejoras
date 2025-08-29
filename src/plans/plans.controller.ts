import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async create(@Body() createPlanDto: {
    name: string;
    cpu: number;
    ramMb: number;
    diskGb: number;
    priceUsd: number;
    allowSnapshots?: boolean;
  }) {
    return this.plansService.create(createPlanDto);
  }
}