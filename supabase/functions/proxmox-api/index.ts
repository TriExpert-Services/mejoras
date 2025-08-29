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

interface ProxmoxConfig {
  host: string;
  username: string;
  tokenId: string;
  tokenSecret: string;
  port: number;
  node: string;
}

interface VMConfig {
  vmid: number;
  name: string;
  cores: number;
  memory: number; // in MB
  disk: number; // in GB
  template: string;
  node: string;
  password?: string;
}

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

    const { action, vmId, config } = await req.json();

    const proxmoxConfig: ProxmoxConfig = {
      host: Deno.env.get('PVE_API_URL')?.replace('https://', '').replace(':8006/api2/json', '') || 'pve.triexpertservice.com',
      username: 'root',
      tokenId: Deno.env.get('PVE_TOKEN_ID') || 'root@pam!server',
      tokenSecret: Deno.env.get('PVE_TOKEN_SECRET') || '',
      port: 8006,
      node: Deno.env.get('PVE_DEFAULT_NODE') || 'pve',
    };

    console.log('Proxmox config:', { ...proxmoxConfig, tokenSecret: '[HIDDEN]' });

    let result;

    switch (action) {
      case 'create':
        result = await createVM(proxmoxConfig, config);
        break;
      case 'start':
        result = await startVM(proxmoxConfig, vmId);
        break;
      case 'stop':
        result = await stopVM(proxmoxConfig, vmId);
        break;
      case 'status':
        result = await getVMStatus(proxmoxConfig, vmId);
        break;
      case 'delete':
        result = await deleteVM(proxmoxConfig, vmId);
        break;
      case 'list':
        result = await listVMs(proxmoxConfig);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Proxmox API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function makeProxmoxRequest(config: ProxmoxConfig, endpoint: string, method = 'GET', body?: string) {
  const url = `https://${config.host}:${config.port}/api2/json${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
    'Content-Type': 'application/json',
  };

  console.log(`Making ${method} request to: ${url}`);

  const response = await fetch(url, {
    method,
    headers,
    body,
    // Ignore SSL certificate errors for self-signed certificates
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Proxmox API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.data;
}

async function createVM(config: ProxmoxConfig, vmConfig: VMConfig) {
  console.log('Creating VM with config:', vmConfig);

  // Clone from template
  const cloneEndpoint = `/nodes/${config.node}/qemu/${vmConfig.template}/clone`;
  
  const cloneBody = {
    newid: vmConfig.vmid,
    name: vmConfig.name,
    full: 1,
    target: config.node,
  };

  const cloneResult = await makeProxmoxRequest(
    config, 
    cloneEndpoint, 
    'POST', 
    JSON.stringify(cloneBody)
  );

  console.log('Clone result:', cloneResult);

  // Wait for clone to complete
  await waitForTask(config, cloneResult);

  // Configure VM resources
  const configEndpoint = `/nodes/${config.node}/qemu/${vmConfig.vmid}/config`;
  
  const configBody = {
    cores: vmConfig.cores,
    memory: vmConfig.memory,
    // Set cloud-init drive
    ide2: 'local:cloudinit',
    // Network configuration
    ipconfig0: 'ip=dhcp',
    // Set password if provided
    ...(vmConfig.password && { cipassword: vmConfig.password }),
    ciuser: Deno.env.get('PVE_CI_USER') || 'ubuntu',
    sshkeys: Deno.env.get('PVE_SSH_KEYS') || '',
  };

  const configResult = await makeProxmoxRequest(
    config,
    configEndpoint,
    'PUT',
    JSON.stringify(configBody)
  );

  console.log('Config result:', configResult);

  // Resize disk if needed
  const resizeEndpoint = `/nodes/${config.node}/qemu/${vmConfig.vmid}/resize`;
  
  const resizeBody = {
    disk: 'scsi0',
    size: `${vmConfig.disk}G`,
  };

  try {
    const resizeResult = await makeProxmoxRequest(
      config,
      resizeEndpoint,
      'PUT',
      JSON.stringify(resizeBody)
    );
    console.log('Resize result:', resizeResult);
  } catch (error) {
    console.log('Resize failed (may not be needed):', error);
  }

  return { 
    vmid: vmConfig.vmid, 
    status: 'created',
    name: vmConfig.name,
    node: config.node 
  };
}

async function startVM(config: ProxmoxConfig, vmId: number) {
  const endpoint = `/nodes/${config.node}/qemu/${vmId}/status/start`;
  const result = await makeProxmoxRequest(config, endpoint, 'POST');
  
  console.log(`Started VM ${vmId}:`, result);
  return { vmid: vmId, status: 'starting', taskid: result };
}

async function stopVM(config: ProxmoxConfig, vmId: number) {
  const endpoint = `/nodes/${config.node}/qemu/${vmId}/status/stop`;
  const result = await makeProxmoxRequest(config, endpoint, 'POST');
  
  console.log(`Stopped VM ${vmId}:`, result);
  return { vmid: vmId, status: 'stopping', taskid: result };
}

async function deleteVM(config: ProxmoxConfig, vmId: number) {
  // First stop the VM if running
  try {
    await stopVM(config, vmId);
    // Wait a bit for stop to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (error) {
    console.log('VM may already be stopped:', error);
  }

  // Delete the VM
  const endpoint = `/nodes/${config.node}/qemu/${vmId}`;
  const result = await makeProxmoxRequest(config, endpoint, 'DELETE');
  
  console.log(`Deleted VM ${vmId}:`, result);
  return { vmid: vmId, status: 'deleted', taskid: result };
}

async function getVMStatus(config: ProxmoxConfig, vmId: number) {
  const endpoint = `/nodes/${config.node}/qemu/${vmId}/status/current`;
  const result = await makeProxmoxRequest(config, endpoint, 'GET');
  
  return {
    vmid: vmId,
    status: result.status,
    cpu: result.cpu,
    memory: result.mem,
    uptime: result.uptime,
    disk: result.disk,
    ...result
  };
}

async function listVMs(config: ProxmoxConfig) {
  const endpoint = `/nodes/${config.node}/qemu`;
  const result = await makeProxmoxRequest(config, endpoint, 'GET');
  
  return result.map((vm: any) => ({
    vmid: vm.vmid,
    name: vm.name,
    status: vm.status,
    cpu: vm.cpu,
    memory: vm.mem,
    uptime: vm.uptime,
  }));
}

async function waitForTask(config: ProxmoxConfig, taskId: string, timeout = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const taskEndpoint = `/nodes/${config.node}/tasks/${taskId}/status`;
      const taskResult = await makeProxmoxRequest(config, taskEndpoint, 'GET');
      
      if (taskResult.status === 'stopped') {
        if (taskResult.exitstatus === 'OK') {
          return taskResult;
        } else {
          throw new Error(`Task failed: ${taskResult.exitstatus}`);
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('Waiting for task...', error);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Task timeout');
}