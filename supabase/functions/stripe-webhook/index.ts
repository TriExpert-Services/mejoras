import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  // Handle subscription billing events
  if (event.type === 'invoice.payment_failed') {
    const invoice = stripeData as Stripe.Invoice;
    if (invoice.customer) {
      await handlePaymentFailed(invoice.customer as string, invoice);
    }
    return;
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = stripeData as Stripe.Invoice;
    if (invoice.customer) {
      await handlePaymentSucceeded(invoice.customer as string, invoice);
    }
    return;
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = stripeData as Stripe.Subscription;
    if (subscription.customer) {
      await handleSubscriptionDeleted(subscription.customer as string);
    }
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status, id: sessionId } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
          session_id: sessionId,
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    } else {
      // Handle subscription checkout completion - create order and trigger VM provisioning
      try {
        const session = stripeData as Stripe.Checkout.Session;
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        
        if (!priceId) {
          throw new Error('No price ID found in session');
        }

        // Get VM specs for this price
        const { data: vmSpec, error: specError } = await supabase
          .from('vm_specs')
          .select('*')
          .eq('price_id', priceId)
          .single();

        if (specError || !vmSpec) {
          throw new Error(`VM spec not found for price ID: ${priceId}`);
        }

        // Get user from customer
        const { data: customer, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single();

        if (customerError || !customer) {
          throw new Error(`User not found for customer: ${customerId}`);
        }

        // Create order record
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: customer.user_id,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent as string,
            vm_spec_id: vmSpec.id,
            status: 'pending',
            total_amount: (session.amount_total || 0) / 100, // Convert cents to dollars
            currency: session.currency || 'usd',
          })
          .select()
          .single();

        if (orderError || !order) {
          throw new Error(`Failed to create order: ${orderError?.message}`);
        }

        // Get template ID from session metadata
        const templateId = session.metadata?.template_id ? parseInt(session.metadata.template_id) : 101;
        
        EdgeRuntime.waitUntil(triggerVMProvisioning(order.id, templateId));

        console.info(`Created order ${order.id} and triggered VM provisioning`);

      } catch (error: any) {
        console.error('Error processing subscription checkout:', error);
      }
    }
  }
}

async function handlePaymentFailed(customerId: string, invoice: Stripe.Invoice) {
  try {
    console.log(`Payment failed for customer: ${customerId}`);
    
    // Update subscription status to past_due
    const { error: subError } = await supabase
      .from('stripe_subscriptions')
      .update({ 
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);

    if (subError) {
      console.error('Error updating subscription status:', subError);
    }

    // Trigger billing management
    EdgeRuntime.waitUntil(triggerBillingManagement(customerId, 'payment_failed'));
    
  } catch (error: any) {
    console.error('Error handling payment failed:', error);
  }
}

async function handlePaymentSucceeded(customerId: string, invoice: Stripe.Invoice) {
  try {
    console.log(`Payment succeeded for customer: ${customerId}`);
    
    // Update subscription status to active
    const { error: subError } = await supabase
      .from('stripe_subscriptions')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);

    if (subError) {
      console.error('Error updating subscription status:', subError);
    }

    // Trigger billing management to reactivate VMs
    EdgeRuntime.waitUntil(triggerBillingManagement(customerId, 'payment_succeeded'));
    
  } catch (error: any) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handleSubscriptionDeleted(customerId: string) {
  try {
    console.log(`Subscription deleted for customer: ${customerId}`);
    
    // Update subscription status to canceled
    const { error: subError } = await supabase
      .from('stripe_subscriptions')
      .update({ 
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);

    if (subError) {
      console.error('Error updating subscription status:', subError);
    }

    // Trigger billing management for final cancellation
    EdgeRuntime.waitUntil(triggerBillingManagement(customerId, 'subscription_canceled'));
    
  } catch (error: any) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function triggerBillingManagement(customerId: string, action: string) {
  try {
    const billingUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/billing-manager`;
    
    const response = await fetch(billingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        customerId,
        action,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Billing management failed: ${error}`);
    }

    const result = await response.json();
    console.log(`Billing management triggered for customer ${customerId}:`, result);

  } catch (error: any) {
    console.error(`Failed to trigger billing management for customer ${customerId}:`, error);
  }
}

async function triggerVMProvisioning(orderId: string, templateId?: number) {
  try {
    const provisionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/vm-provisioner`;
    
    const response = await fetch(provisionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        orderId,
        action: 'provision',
        templateId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`VM provisioning failed: ${error}`);
    }

    const result = await response.json();
    console.log(`VM provisioning triggered successfully for order ${orderId} with template ${templateId}:`, result);

  } catch (error: any) {
    console.error(`Failed to trigger VM provisioning for order ${orderId} with template ${templateId}:`, error);
    
    // Update order status to failed
    await supabase
      .from('orders')
      .update({ 
        status: 'failed', 
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}