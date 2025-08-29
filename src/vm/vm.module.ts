import { Module } from '@nestjs/common';
import { VMController } from './vm.controller';
import { VMService } from './vm.service';
import { ProxmoxModule } from '../proxmox/proxmox.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [ProxmoxModule, QueueModule],
  controllers: [VMController],
  providers: [VMService],
  exports: [VMService],
})
export class VMModule {}