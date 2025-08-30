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
        result = await provisionLXC(orderId, templateId);
        break;
      case 'start':
        result = await controlLXC(orderId, 'start');
        break;
      case 'stop':
        result = await controlLXC(orderId, 'stop');
        break;
      case 'delete':
        result = await deleteLXC(orderId);
        break;
      case 'status':
        result = await getLXCInfo(orderId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('LXC provisioner error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function provisionLXC(orderId: string, templateId?: number) {
  console.log(`Starting LXC provisioning for order: ${orderId}`);
  
  // Use provided template or default to Ubuntu 24.04 LTS
  const finalTemplateId = templateId || 101;
  console.log(`Using template ID: ${finalTemplateId}`);

  // Get template configuration
  const template = getTemplateConfig(finalTemplateId);
  if (!template) {
    throw new Error(`Template ${finalTemplateId} not found`);
  }

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
    // Generate unique container ID
    const vmid = await generateVMID();
    const ipAddress = await generateUniqueIP();
    const containerName = `ct-${orderId.substring(0, 8)}`;
    const rootPassword = generatePassword();

    console.log(`Creating LXC container ${vmid} with template: ${template.ctTemplate}`);

    // Create VM record first
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .insert({
        user_id: order.user_id,
        order_id: orderId,
        vm_spec_id: order.vm_spec_id,
        name: containerName,
        proxmox_vmid: vmid,
        cpu_cores: order.vm_specs.cpu_cores,
        ram_gb: order.vm_specs.ram_gb,
        disk_gb: order.vm_specs.disk_gb,
        root_password: rootPassword,
        status: 'creating',
        proxmox_node: 'pve',
      })
      .select()
      .single();

    if (vmError || !vm) {
      throw new Error(`Failed to create VM record: ${vmError?.message}`);
    }

    // Call Proxmox API to create LXC container
    const proxmoxResult = await callProxmoxAPI('create-lxc', undefined, {
      vmid,
      node: 'pve',
      ostemplate: template.ctTemplate,
      hostname: containerName,
      password: rootPassword,
      cores: order.vm_specs.cpu_cores,
      memory: order.vm_specs.ram_gb * 1024, // Convert GB to MB
      disk: `${order.vm_specs.disk_gb}G`,
      net0: `name=eth0,bridge=vmbr0,ip=${ipAddress}/24,gw=10.0.0.1`,
      nameserver: '8.8.8.8',
      searchdomain: 'local',
    });

    if (!proxmoxResult.success) {
      throw new Error(`LXC creation failed: ${proxmoxResult.error}`);
    }

    console.log('LXC created successfully, waiting for completion...');
    
    // Wait for creation task to complete
    const upid = proxmoxResult.data.data;
    if (upid) {
      await waitForTask(upid);
      console.log(`LXC creation task ${upid} completed`);
    }
    
    console.log('LXC creation completed, now starting...');
    
    // Start the container
    try {
      await callProxmoxAPI('start', vmid, undefined);
      console.log(`LXC ${vmid} started successfully`);
    } catch (startError) {
      console.warn(`Could not auto-start LXC ${vmid}:`, startError);
      // Container created but not started - still success
    }

    // Update container status
    await supabase
      .from('vms')
      .update({ 
        status: 'running', 
        ip_address: ipAddress,
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
      ipAddress,
      templateId: finalTemplateId,
      containerType: 'lxc',
      credentials: {
        ip: ipAddress,
        username: 'root',
        password: rootPassword,
      }
    };

  } catch (error: any) {
    console.error(`LXC provisioning failed for order ${orderId}:`, error);

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

async function controlLXC(orderId: string, action: 'start' | 'stop') {
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

async function getLXCInfo(orderId: string) {
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
    throw new Error(`Container not found for order: ${orderId}`);
  }

  return vm;
}

async function deleteLXC(orderId: string) {
  console.log(`Deleting LXC container for order: ${orderId}`);

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

    // Try to stop and delete from Proxmox if it exists
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

    // Soft delete the VM record
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

    console.log(`LXC container deleted successfully for order: ${orderId}`);
    return { success: true, vmId: vm.id };

  } catch (error: any) {
    console.error(`Error deleting container for order ${orderId}:`, error);
    
    // Update VM with error status
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

async function waitForTask(upid: string, maxWaitSeconds = 120) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    try {
      const taskResult = await callProxmoxAPI('task-status', undefined, { upid });
      
      if (taskResult.success && taskResult.data.data) {
        const status = taskResult.data.data.status;
        console.log(`Task ${upid} status: ${status}`);
        
        if (status === 'stopped' || status === 'OK') {
          const exitstatus = taskResult.data.data.exitstatus;
          if (exitstatus !== 'OK' && exitstatus !== '0') {
            throw new Error(`Task failed with exit status: ${exitstatus}`);
          }
          return;
        }
      }
      
      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error checking task status:', error);
      // Continue waiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error(`Task ${upid} did not complete within ${maxWaitSeconds} seconds`);
}

async function generateVMID(): Promise<number> {
  // Get existing container IDs to avoid conflicts
  const { data: vms } = await supabase
    .from('vms')
    .select('proxmox_vmid')
    .order('proxmox_vmid', { ascending: false })
    .limit(1);

  const lastVmId = vms && vms.length > 0 ? vms[0].proxmox_vmid : 199;
  return Math.max(lastVmId + 1, 200); // Start containers from 200
}

function generatePassword(length = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

async function generateUniqueIP(): Promise<string> {
  // Get existing IP addresses from database
  const { data: existingVMs } = await supabase
    .from('vms')
    .select('ip_address')
    .not('deleted_at', 'is', null)
    .not('ip_address', 'is', null);

  const usedIPs = new Set(
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

// Template configuration mapping
function getTemplateConfig(templateId: number) {
  const templates: Record<number, { ctTemplate: string; name: string }> = {
    101: { ctTemplate: 'local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst', name: 'Ubuntu 24.04 LTS' },
    102: { ctTemplate: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst', name: 'Ubuntu 22.04 LTS' },
    103: { ctTemplate: 'local:vztmpl/ubuntu-25.04-standard_25.04-1.1_amd64.tar.zst', name: 'Ubuntu 25.04' },
    104: { ctTemplate: 'local:vztmpl/debian-11-standard_11.7-1_amd64.tar.zst', name: 'Debian 11' },
    105: { ctTemplate: 'local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst', name: 'Debian 12' },
    106: { ctTemplate: 'local:vztmpl/debian-13-standard_13.0-1_amd64.tar.zst', name: 'Debian 13' },
    107: { ctTemplate: 'local:vztmpl/almalinux-9-default_20240911_amd64.tar.xz', name: 'AlmaLinux 9' },
    108: { ctTemplate: 'local:vztmpl/rockylinux-9-default_20240912_amd64.tar.xz', name: 'Rocky Linux 9' },
    109: { ctTemplate: 'local:vztmpl/centos-9-stream-default_20240826_amd64.tar.xz', name: 'CentOS Stream 9' },
    110: { ctTemplate: 'local:vztmpl/fedora-42-default_20250428_amd64.tar.xz', name: 'Fedora 42' },
  };
  
  return templates[templateId];
}