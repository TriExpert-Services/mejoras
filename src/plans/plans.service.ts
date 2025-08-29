import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceUsd: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
    });
  }

  async create(data: {
    name: string;
    cpu: number;
    ramMb: number;
    diskGb: number;
    priceUsd: number;
    allowSnapshots?: boolean;
  }) {
    return this.prisma.plan.create({ data });
  }
}