import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ProxmoxModule } from '../proxmox/proxmox.module';

@Module({
  imports: [ProxmoxModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}