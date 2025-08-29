import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ProxmoxConfig {
  host: string;
  username: string;
  password: string;
  realm: string;
  port: number;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const proxmoxConfig: ProxmoxConfig = {
      host: Deno.env.get('PROXMOX_HOST') || 'pve.triexpertservice.com',
      username: Deno.env.get('PROXMOX_USERNAME') || 'root',
      password: Deno.env.get('PROXMOX_PASSWORD') || '',
      realm: Deno.env.get('PROXMOX_REALM') || 'pam',
      port: parseInt(Deno.env.get('PROXMOX_PORT') || '8006'),
    };

    const stats = await getProxmoxStats(proxmoxConfig);

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Proxmox stats error:', error);
    
    // Return mock data for demo purposes
    const mockStats = {
      status: 'demo',
      uptime: 86400 * 7, // 7 days
      cpu_usage: 35.5,
      memory_used: 16.2,
      memory_total: 32,
      disk_used: 320,
      disk_total: 1000,
      active_vms: 12,
      node_name: 'pve-node-01'
    };

    return new Response(
      JSON.stringify(mockStats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

async function getProxmoxStats(config: ProxmoxConfig) {
  const { ticket } = await getProxmoxTicket(config);
  
  // Get node status
  const statusUrl = `https://${config.host}:${config.port}/api2/json/nodes/pve/status`;
  
  const response = await fetch(statusUrl, {
    headers: {
      'Cookie': `PVEAuthCookie=${ticket}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Proxmox stats: ${response.statusText}`);
  }

  const data = await response.json();
  const nodeData = data.data;

  // Get VM count
  const vmListUrl = `https://${config.host}:${config.port}/api2/json/nodes/pve/qemu`;
  
  const vmResponse = await fetch(vmListUrl, {
    headers: {
      'Cookie': `PVEAuthCookie=${ticket}`,
    },
  });

  let activeVMs = 0;
  if (vmResponse.ok) {
    const vmData = await vmResponse.json();
    activeVMs = vmData.data.filter((vm: any) => vm.status === 'running').length;
  }

  return {
    status: 'online',
    uptime: nodeData.uptime,
    cpu_usage: (nodeData.cpu * 100),
    memory_used: nodeData.memory.used / (1024 * 1024 * 1024), // Convert to GB
    memory_total: nodeData.memory.total / (1024 * 1024 * 1024), // Convert to GB
    disk_used: nodeData.rootfs.used / (1024 * 1024 * 1024), // Convert to GB
    disk_total: nodeData.rootfs.total / (1024 * 1024 * 1024), // Convert to GB
    active_vms: activeVMs,
    node_name: nodeData.name || 'pve'
  };
}