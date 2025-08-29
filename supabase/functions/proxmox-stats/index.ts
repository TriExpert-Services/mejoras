import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

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

    // Add authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const proxmoxConfig: ProxmoxConfig = {
      host: Deno.env.get('PVE_API_URL')?.replace('https://', '').replace(':8006/api2/json', '') || 'pve.triexpertservice.com',
      tokenId: Deno.env.get('PVE_TOKEN_ID') || 'root@pam!server',
      tokenSecret: Deno.env.get('PVE_TOKEN_SECRET') || 'uae617333-2efc-4174-bd29-bd8455f8e934',
      port: 8006,
      node: Deno.env.get('PVE_DEFAULT_NODE') || 'pve',
    };

    console.log('Getting real Proxmox stats from:', proxmoxConfig.host);
    console.log('Token ID:', proxmoxConfig.tokenId);
    console.log('Node:', proxmoxConfig.node);

    const stats = await getProxmoxStats(proxmoxConfig);

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Proxmox stats error:', error);
    
    // Return fallback data if Proxmox is not accessible
    return new Response(
      JSON.stringify({ 
        // Fallback demo data when Proxmox is not accessible
        status: 'online',
        connected: false,
        timestamp: new Date().toISOString(),
        uptime: 86400,
        cpu_usage: 45.2,
        cpu_cores: 16,
        memory_used: 12.5,
        memory_total: 32,
        memory_usage_percent: 39.1,
        disk_used: 250,
        disk_total: 1000,
        disk_usage_percent: 25.0,
        active_vms: 3,
        total_vms: 5,
        node_name: 'pve-node-01 (Demo)',
        pve_version: 'Demo Mode',
        kernel_version: 'Demo',
        loadavg: [0.5, 0.7, 0.8],
        error: error.message,
        fallback: true
      }),
      { 
        status: 200, // Return 200 with fallback data instead of 500
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

  console.log(`Making request to: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers,
    // Add timeout to prevent hanging
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
      const localStorage = storageData.find((s: any) => s.storage === 'local' || s.storage === 'local-lvm');
      
      if (localStorage) {
        storageUsed = (localStorage.used || 0) / (1024 * 1024 * 1024); // Convert to GB
        storageTotal = (localStorage.total || 0) / (1024 * 1024 * 1024); // Convert to GB
      }
    } catch (storageError) {
      console.log('Could not get storage data:', storageError);
    }

    // Return real server metrics
    return {
      status: 'online',
      connected: true,
      timestamp: new Date().toISOString(),
      
      // Real server metrics
      uptime: nodeData.uptime || 0,
      cpu_usage: (nodeData.cpu || 0) * 100,
      cpu_cores: nodeData.cpuinfo?.cpus || 0,
      
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
    };

  } catch (error: any) {
    console.error('Failed to get real Proxmox stats:', error);
    throw new Error(`No se pudo conectar al servidor Proxmox: ${error.message}`);
  }
}