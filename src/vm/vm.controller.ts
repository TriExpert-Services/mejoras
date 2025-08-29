import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { VMService } from './vm.service';
import { ApiTags, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('vm')
@Controller('me/vms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VMController {
  constructor(private readonly vmService: VMService) {}

  @Get()
  async getUserVMs(@Request() req) {
    return this.vmService.getUserVMs(req.user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'VM Instance ID' })
  async getVM(@Request() req, @Param('id') id: string) {
    return this.vmService.getVM(req.user.id, id);
  }

  @Post(':id/power/:action')
  @ApiParam({ name: 'id', description: 'VM Instance ID' })
  @ApiParam({ name: 'action', enum: ['start', 'stop', 'restart'] })
  async powerAction(
    @Request() req,
    @Param('id') id: string,
    @Param('action') action: 'start' | 'stop' | 'restart',
  ) {
    return this.vmService.performPowerAction(req.user.id, id, action);
  }

  @Post(':id/snapshots')
  @ApiParam({ name: 'id', description: 'VM Instance ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['name'],
    },
  })
  async createSnapshot(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.vmService.createSnapshot(req.user.id, id, body.name, body.description);
  }
}