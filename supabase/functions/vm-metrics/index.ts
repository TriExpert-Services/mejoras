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

    const { orderId, action, templateId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'provision':
        result = await provisionVM(orderId, templateId);
        break;
      case 'start':
        result = await controlVM(orderId, 'start');
        break;
      case 'stop':
        result = await controlVM(orderId, 'stop');
        break;
      case 'delete':
        result = await deleteVM(orderId);
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

async function provisionVM(orderId: string, templateId?: number) {
  console.log(`Starting LXC container provisioning for order: ${orderId}`);
  
  // Use provided template or default
  const finalTemplateId = templateId || 101;
  console.log(`Using template ID: ${finalTemplateId}`);
  
  // Import template configuration
  const { getTemplateById } = await import('../../../../src/template-config.ts');
  const template = getTemplateById(finalTemplateId);
  
  if (!template) {
    throw new Error(`Template ${finalTemplateId} not found`);
  }
  
  console.log(`Using CT template: ${template.ctTemplate}`);

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
    const vmName = `ct-${orderId.substring(0, 8)}`;
    const rootPassword = generatePassword();

    // Check available CT templates
    console.log('Checking available CT templates...');
    try {
      const templatesResult = await callProxmoxAPI('list-templates', undefined, undefined);
      console.log('Available CT templates:', templatesResult);
    } catch (templateError) {
      console.warn('Could not list available templates:', templateError);
    }

    // Create VM record (keeping same table structure for compatibility)
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
        ip_address: 'Asignando...',
      })
      .select()
      .single();

    if (vmError || !vm) {
      throw new Error(`Failed to create container record: ${vmError?.message}`);
    }

    // Call Proxmox API to create LXC container
    const proxmoxResult = await callProxmoxAPI('create-lxc', undefined, {
      vmid,
      node: 'pve',
      ostemplate: template.ctTemplate,
      hostname: vmName,
      password: rootPassword,
      cores: order.vm_specs.cpu_cores,
      memory: order.vm_specs.ram_gb * 1024, // Convert GB to MB
      rootfs: order.vm_specs.disk_gb.toString(), // Disk size in GB
      net0: 'name=eth0,bridge=vmbr0,ip=dhcp',
      unprivileged: '1',
      features: 'nesting=1',
    });

    if (!proxmoxResult.success) {
      throw new Error(`Proxmox container creation failed: ${proxmoxResult.error}`);
    }

    console.log('Container created successfully, waiting for task completion...');
    
    // Wait for creation task to complete
    if (proxmoxResult.data) {
      await waitForTask(proxmoxResult.data, vmid);
    }
    
    console.log('Container configured successfully, now starting...');
    
    // Start the container
    try {
      await callProxmoxAPI('start', vmid, undefined);
      console.log(`Container ${vmid} started successfully`);
    } catch (startError) {
      console.warn(`Could not auto-start container ${vmid}:`, startError);
      // Container created but not started - still success
    }

    // Get container IP address after start
    let finalIPAddress = 'Configurando...';
    try {
      const statusResult = await callProxmoxAPI('status', vmid, undefined);
      if (statusResult.data && statusResult.data.status === 'running') {
        // Try to get network info
        setTimeout(async () => {
          try {
            const configResult = await callProxmoxAPI('config', vmid, undefined);
            console.log('Container config:', configResult);
          } catch (configError) {
            console.warn('Could not get container config:', configError);
          }
        }, 5000); // Wait 5 seconds for container to fully boot
      }
    } catch (statusError) {
      console.warn('Could not get container status:', statusError);
    }

    // Update container status
    await supabase
      .from('vms')
      .update({ 
        status: 'running', 
        ip_address: finalIPAddress,
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

    console.log(`LXC container provisioned successfully: ${vmid}`);

    return {
      vmId: vm.id,
      proxmoxVmId: vmid,
      status: 'running',
      ipAddress: finalIPAddress,
      templateId: finalTemplateId,
      templateName: template.name,
      credentials: {
        ip: finalIPAddress,
        username: 'root',
        password: rootPassword,
      }
    };

  } catch (error: any) {
    console.error(`Container provisioning failed for order ${orderId}:`, error);

    // Update order status to failed
    await supabase
      .from('orders')
      .update({ 
        status: 'failed', 
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    // Update container status to error if record exists
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
    throw new Error(`Container not found for order: ${orderId}`);
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

async function deleteVM(orderId: string) {
  console.log(`Deleting container for order: ${orderId}`);

  try {
    // Get container details
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .select('id, proxmox_vmid, status')
      .eq('order_id', orderId)
      .single();

    if (vmError || !vm) {
      throw new Error(`Container not found for order: ${orderId}`);
    }

    // Try to stop and delete container from Proxmox if it exists
    if (vm.proxmox_vmid) {
      try {
        console.log(`Stopping container ${vm.proxmox_vmid} before deletion...`);
        await callProxmoxAPI('stop', vm.proxmox_vmid);
        
        // Wait a moment for stop to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`Deleting container ${vm.proxmox_vmid} from Proxmox...`);
        await callProxmoxAPI('delete', vm.proxmox_vmid);
      } catch (proxmoxError) {
        console.warn(`Could not delete container from Proxmox: ${proxmoxError}`);
        // Continue with soft delete even if Proxmox delete fails
      }
    }

    // Soft delete the container record (using service role key)
    const { error: deleteError } = await supabase
      .from('vms')
      .update({ 
        deleted_at: new Date().toISOString(),
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (deleteError) {
      throw new Error(`Failed to delete container: ${deleteError.message}`);
    }

    console.log(`Container deleted successfully for order: ${orderId}`);
    return { success: true, vmId: vm.id };

  } catch (error: any) {
    console.error(`Error deleting container for order ${orderId}:`, error);
    
    // Update container with error status
    await supabase
      .from('vms')
      .update({ 
        status: 'error',
        error_message: `Delete failed: ${error.message}`,
        last_error_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    throw error;
  }
}

async function waitForTask(upid: string, vmid: number) {
  console.log(`Waiting for task ${upid} to complete...`);
  
  const maxAttempts = 30; // 1 minute max wait
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const taskResult = await callProxmoxAPI('task-status', undefined, { upid });
      
      if (taskResult.data) {
        const status = taskResult.data.status;
        console.log(`Task ${upid} status: ${status}`);
        
        if (status === 'stopped' || status === 'OK') {
          console.log(`Task ${upid} completed successfully`);
          return;
        }
        
        if (status === 'failed' || status === 'error') {
          throw new Error(`Task ${upid} failed`);
        }
      }
      
      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
    } catch (error) {
      console.warn(`Could not check task status: ${error}`);
      break;
    }
  }
  
  console.log(`Task wait timeout reached for ${upid}`);
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
  
  if (!response.ok) {
    throw new Error(result.error || 'Proxmox API call failed');
  }

  return result;
}

async function generateVMID(): Promise<number> {
  // Get existing VM IDs to avoid conflicts
  const { data: vms } = await supabase
    .from('vms')
    .select('proxmox_vmid')
    .not('proxmox_vmid', 'is', null)
    .order('proxmox_vmid', { ascending: false })
    .limit(1);

  const lastVmId = vms && vms.length > 0 ? vms[0].proxmox_vmid : 599;
  return Math.max(lastVmId + 1, 600); // Start LXC containers at 600
}

function generatePassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}
    existingVMs?.map(vm => vm.ip_address).filter(ip => ip && ip !== 'Configurando...') || []
  );

  // Generate IP in range 10.0.0.100-10.0.0.254
  for (let i = 100; i <= 254; i++) {
    const ip = `10.0.0.${i}`;
    if (!usedIPs.has(ip)) {
      return ip;
    }
  }

  throw new Error('No available IP addresses in range 10.0.0.100-10.0.0.254');
}