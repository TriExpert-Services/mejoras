import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Configuration
const GRACE_PERIOD_DAYS = 3;
const DELETION_PERIOD_DAYS = 30;

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customerId, action, scheduled } = await req.json();

    if (!customerId && !scheduled) {
      return new Response(
        JSON.stringify({ error: 'Customer ID is required unless running scheduled task' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'payment_failed':
        result = await handlePaymentFailed(customerId);
        break;
      case 'payment_succeeded':
        result = await handlePaymentSucceeded(customerId);
        break;
      case 'subscription_canceled':
        result = await handleSubscriptionCanceled(customerId);
        break;
      case 'scheduled_check':
        result = await runScheduledBillingCheck();
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Billing manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handlePaymentFailed(customerId: string) {
  console.log(`Processing payment failure for customer: ${customerId}`);
  
  try {
    // Get user's VMs
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // Start grace period - mark subscription as past_due
    const { error: updateError } = await supabase
      .from('stripe_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId);

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    console.log(`Customer ${customerId} marked as past_due - grace period started`);
    
    return { 
      action: 'grace_period_started',
      customerId,
      gracePeriodDays: GRACE_PERIOD_DAYS
    };

  } catch (error: any) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(customerId: string) {
  console.log(`Processing payment success for customer: ${customerId}`);
  
  try {
    // Get customer's user ID
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // Reactivate any suspended VMs
    const { data: suspendedVMs, error: getVMsError } = await supabase
      .from('vms')
      .select('id, order_id, proxmox_vmid, name')
      .eq('user_id', customer.user_id)
      .eq('status', 'suspended')
      .is('deleted_at', null);

    if (getVMsError) {
      throw new Error(`Failed to get suspended VMs: ${getVMsError.message}`);
    }

    const reactivatedVMs = [];

    for (const vm of suspendedVMs || []) {
      try {
        // Start VM in Proxmox
        await callProxmoxAPI('start', vm.proxmox_vmid);
        
        // Update VM status to running
        await supabase
          .from('vms')
          .update({
            status: 'running',
            suspended_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', vm.id);

        reactivatedVMs.push(vm);
        console.log(`Reactivated VM: ${vm.name} (${vm.proxmox_vmid})`);

      } catch (vmError) {
        console.error(`Failed to reactivate VM ${vm.name}:`, vmError);
        // Update VM with error but don't fail the entire process
        await supabase
          .from('vms')
          .update({
            error_message: `Reactivation failed: ${vmError.message}`,
            last_error_at: new Date().toISOString()
          })
          .eq('id', vm.id);
      }
    }

    console.log(`Payment succeeded - reactivated ${reactivatedVMs.length} VMs`);
    
    return { 
      action: 'vms_reactivated',
      customerId,
      reactivatedCount: reactivatedVMs.length
    };

  } catch (error: any) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(customerId: string) {
  console.log(`Processing subscription cancellation for customer: ${customerId}`);
  
  try {
    // Get customer's user ID
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // Suspend all active VMs immediately
    const { data: activeVMs, error: getVMsError } = await supabase
      .from('vms')
      .select('id, order_id, proxmox_vmid, name')
      .eq('user_id', customer.user_id)
      .in('status', ['running', 'stopped'])
      .is('deleted_at', null);

    if (getVMsError) {
      throw new Error(`Failed to get active VMs: ${getVMsError.message}`);
    }

    const suspendedVMs = [];

    for (const vm of activeVMs || []) {
      try {
        // Stop VM in Proxmox
        await callProxmoxAPI('stop', vm.proxmox_vmid);
        
        // Update VM status to suspended
        await supabase
          .from('vms')
          .update({
            status: 'suspended',
            suspended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', vm.id);

        suspendedVMs.push(vm);
        console.log(`Suspended VM: ${vm.name} (${vm.proxmox_vmid})`);

      } catch (vmError) {
        console.error(`Failed to suspend VM ${vm.name}:`, vmError);
      }
    }

    console.log(`Subscription canceled - suspended ${suspendedVMs.length} VMs`);
    
    return { 
      action: 'vms_suspended',
      customerId,
      suspendedCount: suspendedVMs.length
    };

  } catch (error: any) {
    console.error('Error handling subscription canceled:', error);
    throw error;
  }
}

async function runScheduledBillingCheck() {
  console.log('Running scheduled billing check...');
  
  try {
    // Check for subscriptions past_due for more than grace period
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - GRACE_PERIOD_DAYS);

    const { data: pastDueSubscriptions, error: pastDueError } = await supabase
      .from('stripe_subscriptions')
      .select(`
        customer_id,
        updated_at,
        status
      `)
      .eq('status', 'past_due')
      .lt('updated_at', gracePeriodDate.toISOString());

    if (pastDueError) {
      throw new Error(`Failed to get past due subscriptions: ${pastDueError.message}`);
    }

    console.log(`Found ${pastDueSubscriptions?.length || 0} subscriptions past grace period`);

    // Suspend VMs for past due subscriptions
    const suspensionResults = [];
    for (const subscription of pastDueSubscriptions || []) {
      try {
        const result = await suspendVMsForCustomer(subscription.customer_id);
        suspensionResults.push(result);
      } catch (error) {
        console.error(`Failed to suspend VMs for customer ${subscription.customer_id}:`, error);
      }
    }

    // Check for VMs suspended for more than deletion period
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() - DELETION_PERIOD_DAYS);

    const { data: vmsByDeletionDate, error: deletionError } = await supabase
      .from('vms')
      .select('id, user_id, order_id, proxmox_vmid, name, suspended_at')
      .eq('status', 'suspended')
      .lt('suspended_at', deletionDate.toISOString())
      .is('deleted_at', null);

    if (deletionError) {
      throw new Error(`Failed to get VMs for deletion: ${deletionError.message}`);
    }

    console.log(`Found ${vmsByDeletionDate?.length || 0} VMs past deletion period`);

    // Delete VMs past deletion period
    const deletionResults = [];
    for (const vm of vmsByDeletionDate || []) {
      try {
        const result = await deleteVMPermanently(vm);
        deletionResults.push(result);
      } catch (error) {
        console.error(`Failed to delete VM ${vm.name}:`, error);
      }
    }

    return {
      suspensions: suspensionResults.length,
      deletions: deletionResults.length,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      deletionPeriodDays: DELETION_PERIOD_DAYS
    };

  } catch (error: any) {
    console.error('Error in scheduled billing check:', error);
    throw error;
  }
}

async function suspendVMsForCustomer(customerId: string) {
  try {
    // Get customer's user ID
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // Get all active VMs for this customer
    const { data: activeVMs, error: getVMsError } = await supabase
      .from('vms')
      .select('id, order_id, proxmox_vmid, name')
      .eq('user_id', customer.user_id)
      .in('status', ['running', 'stopped'])
      .is('deleted_at', null);

    if (getVMsError) {
      throw new Error(`Failed to get active VMs: ${getVMsError.message}`);
    }

    const suspendedVMs = [];

    for (const vm of activeVMs || []) {
      try {
        // Stop VM in Proxmox if running
        await callProxmoxAPI('stop', vm.proxmox_vmid);
        
        // Update VM status to suspended
        await supabase
          .from('vms')
          .update({
            status: 'suspended',
            suspended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', vm.id);

        suspendedVMs.push(vm);
        console.log(`Suspended VM due to non-payment: ${vm.name} (${vm.proxmox_vmid})`);

      } catch (vmError) {
        console.error(`Failed to suspend VM ${vm.name}:`, vmError);
        // Continue with other VMs
      }
    }

    return {
      customerId,
      suspendedCount: suspendedVMs.length,
      suspendedVMs: suspendedVMs.map(vm => vm.name)
    };

  } catch (error: any) {
    console.error('Error suspending VMs for customer:', error);
    throw error;
  }
}

async function deleteVMPermanently(vm: any) {
  try {
    console.log(`Permanently deleting VM: ${vm.name} (${vm.proxmox_vmid})`);

    // Delete from Proxmox
    try {
      await callProxmoxAPI('delete', vm.proxmox_vmid);
      console.log(`Deleted VM ${vm.proxmox_vmid} from Proxmox`);
    } catch (proxmoxError) {
      console.warn(`Could not delete VM from Proxmox: ${proxmoxError}`);
      // Continue with database deletion even if Proxmox delete fails
    }

    // Mark as deleted in database
    const { error: deleteError } = await supabase
      .from('vms')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', vm.id);

    if (deleteError) {
      throw new Error(`Failed to mark VM as deleted: ${deleteError.message}`);
    }

    console.log(`VM ${vm.name} permanently deleted after grace period`);
    
    return {
      vmId: vm.id,
      vmName: vm.name,
      proxmoxVmId: vm.proxmox_vmid,
      deletedAt: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Error deleting VM permanently:', error);
    throw error;
  }
}

async function callProxmoxAPI(action: string, vmId?: number) {
  const proxmoxUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/proxmox-api`;
  
  const response = await fetch(proxmoxUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      action,
      vmId,
    }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Proxmox API call failed');
  }

  return result;
}