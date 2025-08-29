import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private proxmox: ProxmoxService,
  ) {}

  async getDashboardStats() {
    const [totalUsers, totalOrders, totalVMs, totalRevenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.vMInstance.count(),
      this.prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amountUsd: true },
      }),
    ]);

    const nodes = await this.proxmox.listNodes();

    return {
      totalUsers,
      totalOrders,
      totalVMs,
      totalRevenue: totalRevenue._sum.amountUsd || 0,
      nodes: nodes.length,
      nodeStatus: nodes,
    };
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: { user: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllVMs() {
    return this.prisma.vMInstance.findMany({
      include: { user: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}