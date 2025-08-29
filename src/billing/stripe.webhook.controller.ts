import { Controller, Headers, Post, Req, Res, Raw } from '@nestjs/common';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';
import { config } from '../common/config';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });

  constructor(private stripeService: StripeService) {}

  @Post()
  async handleWebhook(
    @Raw() body: Buffer,
    @Headers('stripe-signature') signature: string,
    @Res() res,
  ) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        config.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.stripeService.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
}