import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ProxmoxConfig {
  host: string;
  tokenId: string;
  tokenSecret: string;
  port: number;
  node: string;
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

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Proxmox config from environment
    const proxmoxConfig: ProxmoxConfig = {
      host: Deno.env.get('PVE_API_URL')?.replace('https://', '').replace(':8006/api2/json', '') || 'pve.triexpertservice.com',
      tokenId: Deno.env.get('PVE_TOKEN_ID') || 'root@pam!server',
      tokenSecret: Deno.env.get('PVE_TOKEN_SECRET') || '',
      port: 8006,
      node: Deno.env.get('PVE_DEFAULT_NODE') || 'pve',
    };

    console.log('Connecting to Proxmox:', {
      host: proxmoxConfig.host,
      tokenId: proxmoxConfig.tokenId,
      node: proxmoxConfig.node,
      hasSecret: !!proxmoxConfig.tokenSecret
    });

    // Get real Proxmox stats
    const stats = await getProxmoxStats(proxmoxConfig);

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Proxmox stats error:', error);
    
    // Return error with details for debugging
    return new Response(
      JSON.stringify({ 
        error: error.message,
        connected: false,
        debug_info: {
          has_pve_url: !!Deno.env.get('PVE_API_URL'),
          has_token_id: !!Deno.env.get('PVE_TOKEN_ID'),
          has_token_secret: !!Deno.env.get('PVE_TOKEN_SECRET'),
          pve_host: Deno.env.get('PVE_API_URL')?.replace('https://', '').replace(':8006/api2/json', ''),
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function makeProxmoxRequest(config: ProxmoxConfig, endpoint: string) {
  const url = `https://${config.host}:${config.port}/api2/json${endpoint}`;
  
  const headers = {
    'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
    'Content-Type': 'application/json',
  };

  console.log(`Making Proxmox request to: ${url}`);
  console.log(`Using token: ${config.tokenId}=[SECRET]`);

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Proxmox API error: ${response.status} - ${errorText}`);
    throw new Error(`Proxmox API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log(`Proxmox API response for ${endpoint}:`, data);
  return data.data;
}

async function getProxmoxStats(config: ProxmoxConfig) {
  try {
    console.log('Getting node status from Proxmox...');
    
    // Get node status - REAL DATA
    const nodeData = await makeProxmoxRequest(config, `/nodes/${config.node}/status`);
    
    console.log('Real node data received:', nodeData);

    // Get VM list - REAL DATA  
    const vmList = await makeProxmoxRequest(config, `/nodes/${config.node}/qemu`);
    
    console.log('Real VM list:', vmList);

    // Count running VMs
    const runningVMs = vmList.filter((vm: any) => vm.status === 'running').length;
    const totalVMs = vmList.length;

    // Get storage info - REAL DATA
    let storageUsed = 0;
    let storageTotal = 0;
    
    try {
      const storageData = await makeProxmoxRequest(config, `/nodes/${config.node}/storage`);
      const localStorage = storageData.find((s: any) => s.storage === 'local-lvm' || s.storage === 'local');
      
      if (localStorage && localStorage.used && localStorage.total) {
        storageUsed = localStorage.used / (1024 * 1024 * 1024); // Convert to GB
        storageTotal = localStorage.total / (1024 * 1024 * 1024); // Convert to GB
      }
    } catch (storageError) {
      console.warn('Could not get storage data:', storageError);
      // Use fallback values if storage data not available
      storageUsed = 0;
      storageTotal = 100;
    }

    // Return real server metrics
    return {
      status: 'online',
      connected: true,
      timestamp: new Date().toISOString(),
      
      // Real server metrics
      uptime: nodeData.uptime || 0,
      cpu_usage: (nodeData.cpu || 0) * 100,
      cpu_cores: nodeData.cpuinfo?.cpus || nodeData.cpuinfo?.cores || 8,
      
      // Memory in GB  
      memory_used: (nodeData.memory?.used || 0) / (1024 * 1024 * 1024),
      memory_total: (nodeData.memory?.total || 0) / (1024 * 1024 * 1024),
      memory_usage_percent: nodeData.memory ? (nodeData.memory.used / nodeData.memory.total) * 100 : 0,
      
      // Storage in GB
      disk_used: storageUsed,
      disk_total: storageTotal,
      disk_usage_percent: storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0,
      
      // VM counts
      active_vms: runningVMs,
      total_vms: totalVMs,
      
      // Node info
      node_name: nodeData.name || config.node,
      pve_version: nodeData.pveversion || 'Unknown',
      kernel_version: nodeData.kversion || 'Unknown',
      
      // Load averages
      loadavg: nodeData.loadavg || [0, 0, 0],
      
      // Raw data for debugging
      raw_node_data: nodeData,
    };

  } catch (error: any) {
    console.error('Failed to get real Proxmox stats:', error);
    throw new Error(`No se pudo conectar al servidor Proxmox: ${error.message}`);
  }
}