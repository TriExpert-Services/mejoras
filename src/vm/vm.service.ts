import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class VMService {
  constructor(
    private prisma: PrismaService,
    private proxmox: ProxmoxService,
    private queues: QueueService,
  ) {}

  async getUserVMs(userId: string) {
    return this.prisma.vMInstance.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVM(userId: string, vmInstanceId: string) {
    const vm = await this.prisma.vMInstance.findUnique({
      where: { id: vmInstanceId },
      include: { plan: true },
    });

    if (!vm || vm.userId !== userId) {
      throw new NotFoundException('VM not found');
    }

    // Get live status from Proxmox
    try {
      const status = await this.proxmox.getVMStatus(vm.node, vm.vmid);
      return { ...vm, liveStatus: status };
    } catch (error) {
      return { ...vm, liveStatus: null };
    }
  }

  async performPowerAction(userId: string, vmInstanceId: string, action: 'start' | 'stop' | 'restart') {
    const vm = await this.prisma.vMInstance.findUnique({
      where: { id: vmInstanceId },
    });

    if (!vm || vm.userId !== userId) {
      throw new NotFoundException('VM not found');
    }

    // Queue power action
    await this.queues.power.add(
      `power-${action}`,
      {
        vmInstanceId,
        action,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    return { message: `${action} action queued for VM ${vm.hostname}` };
  }

  async createSnapshot(userId: string, vmInstanceId: string, name: string, description?: string) {
    const vm = await this.prisma.vMInstance.findUnique({
      where: { id: vmInstanceId },
      include: { plan: true },
    });

    if (!vm || vm.userId !== userId) {
      throw new NotFoundException('VM not found');
    }

    if (!vm.plan.allowSnapshots) {
      throw new ForbiddenException('Snapshots not allowed for this plan');
    }

    // Queue snapshot creation
    await this.queues.snapshot.add(
      'create-snapshot',
      {
        vmInstanceId,
        snapshotName: name,
        description,
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    return { message: `Snapshot creation queued for VM ${vm.hostname}` };
  }
}