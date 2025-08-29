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

    const { orderId, action } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'provision':
        result = await provisionVM(orderId);
        break;
      case 'start':
        result = await controlVM(orderId, 'start');
        break;
      case 'stop':
        result = await controlVM(orderId, 'stop');
        break;
      case 'status':
        result = await getVMInfo(orderId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('VM provisioner error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function provisionVM(orderId: string) {
  console.log(`Starting VM provisioning for order: ${orderId}`);

  // Get order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      vm_specs (*)
    `)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderError?.message}`);
  }

  if (order.status !== 'pending') {
    throw new Error(`Order ${orderId} is not in pending status`);
  }

  // Update order status to processing
  await supabase
    .from('orders')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  try {
    // Generate unique VM ID
    const vmid = await generateVMID();
    const vmName = `vm-${orderId.substring(0, 8)}`;
    const rootPassword = generatePassword();

    // First check what templates are available
    console.log('Checking available VM templates...');
    try {
      const templatesResult = await callProxmoxAPI('list-templates', undefined, undefined);
      console.log('Available templates:', templatesResult);
    } catch (templateError) {
      console.warn('Could not list available templates:', templateError);
    }

    // First, check available templates
    console.log('Checking available VM templates...');
    try {
      const templatesResult = await callProxmoxAPI('list-templates', undefined, undefined);
      console.log('Available templates:', templatesResult);
    } catch (templateError) {
      console.warn('Could not list templates:', templateError);
    }

    // Create VM record
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .insert({
        user_id: order.user_id,
        order_id: orderId,
        vm_spec_id: order.vm_spec_id,
        name: vmName,
        proxmox_vmid: vmid,
        cpu_cores: order.vm_specs.cpu_cores,
        ram_gb: order.vm_specs.ram_gb,
        disk_gb: order.vm_specs.disk_gb,
        root_password: rootPassword,
        status: 'creating',
        proxmox_node: 'pve', // Default node
      })
      .select()
      .single();

    if (vmError || !vm) {
      throw new Error(`Failed to create VM record: ${vmError?.message}`);
    }

    // Get template ID from environment or use default
    const templateId = parseInt(Deno.env.get('PVE_TEMPLATE_ID') || '9000');
    
    // Call Proxmox API to create VM
    const proxmoxResult = await callProxmoxAPI('create', undefined, {
      vmid,
      name: vmName,
      cores: order.vm_specs.cpu_cores,
      memory: order.vm_specs.ram_gb * 1024, // Convert GB to MB
      disk: order.vm_specs.disk_gb,
      node: 'pve',
      password: rootPassword,
    });

    if (!proxmoxResult.success) {
      throw new Error(`Proxmox VM creation failed: ${proxmoxResult.error}`);
    }

    console.log('VM created successfully, now starting...');
    
    // Start the VM
    try {
      await callProxmoxAPI('start', vmid, undefined);
      console.log(`VM ${vmid} started successfully`);
    } catch (startError) {
      console.warn(`Could not auto-start VM ${vmid}:`, startError);
      // VM created but not started - still success
    }

    // Update VM status
    await supabase
      .from('vms')
      .update({ 
        status: 'running', 
        ip_address: 'Configurando...',
        provisioned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', vm.id);

    // Update order status to completed
    await supabase
      .from('orders')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    console.log(`VM provisioned successfully: ${vmid}`);

    return {
      vmId: vm.id,
      proxmoxVmId: vmid,
      status: 'running',
      ipAddress,
      credentials: {
        ip: ipAddress,
        username: 'root',
        password: rootPassword,
      }
    };

  } catch (error: any) {
    console.error(`VM provisioning failed for order ${orderId}:`, error);

    // Update order status to failed
    await supabase
      .from('orders')
      .update({ 
        status: 'failed', 
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Update VM status to error if VM record exists
    await supabase
      .from('vms')
      .update({ 
        status: 'error', 
        error_message: error.message,
        last_error_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    throw error;
  }
}

async function controlVM(orderId: string, action: 'start' | 'stop') {
  const { data: vm, error } = await supabase
    .from('vms')
    .select('proxmox_vmid, status')
    .eq('order_id', orderId)
    .single();

  if (error || !vm) {
    throw new Error(`VM not found for order: ${orderId}`);
  }

  const result = await callProxmoxAPI(action, vm.proxmox_vmid);
  
  const newStatus = action === 'start' ? 'running' : 'stopped';
  await supabase
    .from('vms')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('order_id', orderId);

  return result;
}

async function getVMInfo(orderId: string) {
  const { data: vm, error } = await supabase
    .from('vms')
    .select(`
      *,
      vm_specs (*),
      orders (*)
    `)
    .eq('order_id', orderId)
    .single();

  if (error || !vm) {
    throw new Error(`VM not found for order: ${orderId}`);
  }

  return vm;
}

async function callProxmoxAPI(action: string, vmId?: number, config?: any) {
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
      config,
    }),
  });

  const result = await response.json();
    throw new Error(result.error || 'Proxmox API call failed');
  }

  return result;
}

async function generateVMID(): Promise<number> {
  // Get existing VM IDs to avoid conflicts
  const { data: vms } = await supabase
    .from('vms')
    .select('proxmox_vmid')
    .order('proxmox_vmid', { ascending: false })
    .limit(1);

  const lastVmId = vms && vms.length > 0 ? vms[0].proxmox_vmid : 100;
  return (lastVmId || 100) + 1;
}

function generatePassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}