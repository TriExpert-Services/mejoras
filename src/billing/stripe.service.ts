import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import Stripe from 'stripe';
import { config } from '../common/config';

@Injectable()
export class StripeService {
  private stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });

  constructor(
    private prisma: PrismaService,
    private queues: QueueService,
  ) {}

  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { plan: true, user: true },
    });

    if (!order) return;

    // Mark order as paid
    await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        status: 'PAID',
        stripePaymentId: session.payment_intent as string,
      },
    });

    // Generate unique VMID (simple random for now)
    const vmid = Math.floor(Math.random() * 50000) + 1000;
    
    // Queue VM provisioning job
    await this.queues.provision.add(
      'provision-vm',
      {
        orderId,
        vmid,
        hostname: `vm-${orderId.substring(0, 8)}`,
        node: config.PVE_DEFAULT_NODE,
        cpu: order.plan.cpu,
        ramMb: order.plan.ramMb,
        diskGb: order.plan.diskGb,
        vlan: config.PVE_DEFAULT_VLAN,
        ip: null, // Will be assigned during provisioning
        planId: order.planId,
        userId: order.userId,
      },
      {
        jobId: orderId, // Prevent duplicate jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }
}