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
  password: string;
  realm: string;
  port: number;
}

interface VMConfig {
  vmid: number;
  name: string;
  cores: number;
  memory: number; // in MB
  disk: number; // in GB
  template: string;
  node: string;
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
      host: Deno.env.get('PROXMOX_HOST') || 'localhost',
      username: Deno.env.get('PROXMOX_USERNAME') || 'root',
      password: Deno.env.get('PROXMOX_PASSWORD') || '',
      realm: Deno.env.get('PROXMOX_REALM') || 'pam',
      port: parseInt(Deno.env.get('PROXMOX_PORT') || '8006'),
    };

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

async function getProxmoxTicket(config: ProxmoxConfig): Promise<{ ticket: string; CSRFPreventionToken: string }> {
  const authUrl = `https://${config.host}:${config.port}/api2/json/access/ticket`;
  
  const authResponse = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: `${config.username}@${config.realm}`,
      password: config.password,
    }),
  });

  if (!authResponse.ok) {
    throw new Error(`Proxmox authentication failed: ${authResponse.statusText}`);
  }

  const authData = await authResponse.json();
  return {
    ticket: authData.data.ticket,
    CSRFPreventionToken: authData.data.CSRFPreventionToken,
  };
}

async function createVM(config: ProxmoxConfig, vmConfig: VMConfig) {
  const { ticket, CSRFPreventionToken } = await getProxmoxTicket(config);
  
  // Clone from template
  const cloneUrl = `https://${config.host}:${config.port}/api2/json/nodes/${vmConfig.node}/qemu/${vmConfig.template}/clone`;
  
  const cloneResponse = await fetch(cloneUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `PVEAuthCookie=${ticket}`,
      'CSRFPreventionToken': CSRFPreventionToken,
    },
    body: new URLSearchParams({
      newid: vmConfig.vmid.toString(),
      name: vmConfig.name,
      full: '1',
    }),
  });

  if (!cloneResponse.ok) {
    throw new Error(`Failed to clone VM: ${cloneResponse.statusText}`);
  }

  // Configure VM resources
  const configUrl = `https://${config.host}:${config.port}/api2/json/nodes/${vmConfig.node}/qemu/${vmConfig.vmid}/config`;
  
  const configResponse = await fetch(configUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `PVEAuthCookie=${ticket}`,
      'CSRFPreventionToken': CSRFPreventionToken,
    },
    body: new URLSearchParams({
      cores: vmConfig.cores.toString(),
      memory: vmConfig.memory.toString(),
      ide2: `local:cloudinit`,
      ipconfig0: 'ip=dhcp',
    }),
  });

  if (!configResponse.ok) {
    throw new Error(`Failed to configure VM: ${configResponse.statusText}`);
  }

  // Resize disk if needed
  const resizeUrl = `https://${config.host}:${config.port}/api2/json/nodes/${vmConfig.node}/qemu/${vmConfig.vmid}/resize`;
  
  await fetch(resizeUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `PVEAuthCookie=${ticket}`,
      'CSRFPreventionToken': CSRFPreventionToken,
    },
    body: new URLSearchParams({
      disk: 'scsi0',
      size: `${vmConfig.disk}G`,
    }),
  });

  return { vmid: vmConfig.vmid, status: 'created' };
}

async function startVM(config: ProxmoxConfig, vmId: number) {
  const { ticket, CSRFPreventionToken } = await getProxmoxTicket(config);
  
  const startUrl = `https://${config.host}:${config.port}/api2/json/nodes/pve/qemu/${vmId}/status/start`;
  
  const response = await fetch(startUrl, {
    method: 'POST',
    headers: {
      'Cookie': `PVEAuthCookie=${ticket}`,
      'CSRFPreventionToken': CSRFPreventionToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to start VM: ${response.statusText}`);
  }

  return { vmid: vmId, status: 'starting' };
}

async function stopVM(config: ProxmoxConfig, vmId: number) {
  const { ticket, CSRFPreventionToken } = await getProxmoxTicket(config);
  
  const stopUrl = `https://${config.host}:${config.port}/api2/json/nodes/pve/qemu/${vmId}/status/stop`;
  
  const response = await fetch(stopUrl, {
    method: 'POST',
    headers: {
      'Cookie': `PVEAuthCookie=${ticket}`,
      'CSRFPreventionToken': CSRFPreventionToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to stop VM: ${response.statusText}`);
  }

  return { vmid: vmId, status: 'stopping' };
}

async function getVMStatus(config: ProxmoxConfig, vmId: number) {
  const { ticket } = await getProxmoxTicket(config);
  
  const statusUrl = `https://${config.host}:${config.port}/api2/json/nodes/pve/qemu/${vmId}/status/current`;
  
  const response = await fetch(statusUrl, {
    headers: {
      'Cookie': `PVEAuthCookie=${ticket}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get VM status: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}