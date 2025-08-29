import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlansModule } from './plans/plans.module';
import { OrdersModule } from './orders/orders.module';
import { BillingModule } from './billing/billing.module';
import { QueueModule } from './queue/queue.module';
import { ProxmoxModule } from './proxmox/proxmox.module';
import { VMModule } from './vm/vm.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PlansModule,
    OrdersModule,
    BillingModule,
    QueueModule,
    ProxmoxModule,
    VMModule,
    AdminModule,
  ],
})
export class AppModule {}