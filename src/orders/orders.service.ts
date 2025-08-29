import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import Stripe from 'stripe';
import { config } from '../common/config';

@Injectable()
export class OrdersService {
  private stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });

  constructor(
    private prisma: PrismaService,
    private plansService: PlansService,
  ) {}

  async createCheckoutSession(userId: string, planId: string, successUrl: string, cancelUrl: string) {
    const plan = await this.plansService.findOne(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        planId,
        amountUsd: plan.priceUsd,
      },
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `VM Plan: ${plan.name}`,
              description: `${plan.cpu} CPU, ${plan.ramMb}MB RAM, ${plan.diskGb}GB Storage`,
            },
            unit_amount: Number(plan.priceUsd) * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?order=${order.id}`,
      cancel_url: cancelUrl,
      metadata: {
        orderId: order.id,
        userId,
        planId,
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return { url: session.url, orderId: order.id };
  }

  async findUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}