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

    // DEBUG: Log environment variables
    console.log('=== PROXMOX DEBUG INFO ===');
    console.log('PVE_API_URL:', Deno.env.get('PVE_API_URL'));
    console.log('PVE_TOKEN_ID:', Deno.env.get('PVE_TOKEN_ID'));
    console.log('PVE_TOKEN_SECRET exists:', !!Deno.env.get('PVE_TOKEN_SECRET'));
    console.log('PVE_DEFAULT_NODE:', Deno.env.get('PVE_DEFAULT_NODE'));
    
    // Build Proxmox config - Using the exact values from Docker
    const pveApiUrl = Deno.env.get('PVE_API_URL') || 'https://pve.triexpertservice.com:8006/api2/json';
    const pveTokenId = Deno.env.get('PVE_TOKEN_ID') || 'root@pam!server';
    const pveTokenSecret = Deno.env.get('PVE_TOKEN_SECRET') || 'uae617333-2efc-4174-bd29-bd8455f8e934';
    const pveNode = Deno.env.get('PVE_DEFAULT_NODE') || 'pve';

    // Extract just the host from the API URL
    const host = pveApiUrl.replace('https://', '').replace(':8006/api2/json', '');
    
    const proxmoxConfig = {
      host,
      tokenId: pveTokenId,
      tokenSecret: pveTokenSecret,
      port: 8006,
      node: pveNode,
    };

    console.log('Final Proxmox config:', {
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
    
    // Return detailed error for debugging
    return new Response(
      JSON.stringify({ 
        error: error.message,
        connected: false,
        debug_info: {
          error_type: error.constructor.name,
          error_details: error.toString(),
          has_pve_url: !!Deno.env.get('PVE_API_URL'),
          has_token_id: !!Deno.env.get('PVE_TOKEN_ID'),
          has_token_secret: !!Deno.env.get('PVE_TOKEN_SECRET'),
          pve_host: Deno.env.get('PVE_API_URL'),
          timestamp: new Date().toISOString(),
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getProxmoxStats(config: any) {
  try {
    console.log('=== CONNECTING TO PROXMOX ===');
    console.log('Host:', config.host);
    console.log('Node:', config.node);
    console.log('Token ID:', config.tokenId);
    
    // Test connection first
    const testUrl = `https://${config.host}:${config.port}/api2/json/version`;
    
    console.log('Testing connection to:', testUrl);
    
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Test response status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('Test connection failed:', errorText);
      
      throw new Error(`Proxmox connection test failed [${testResponse.status}]: ${errorText}`);
    }

    const versionData = await testResponse.json();
    console.log('Proxmox version data:', versionData);

    // Get node status
    console.log('Getting node status...');
    const nodeData = await makeProxmoxRequest(config, `/nodes/${config.node}/status`);
    
    console.log('Node data received:', nodeData);

    // Get VM list 
    console.log('Getting VM list...');
    const vmList = await makeProxmoxRequest(config, `/nodes/${config.node}/qemu`);
    
    console.log('VM list received:', vmList);

    // Count VMs with detailed status
    let runningVMs = 0;
    let totalVMs = 0;
    
    if (vmList && Array.isArray(vmList)) {
      totalVMs = vmList.length;
      runningVMs = vmList.filter((vm: any) => vm.status === 'running').length;
      
      console.log(`VM Status breakdown:`, vmList.map((vm: any) => ({
        vmid: vm.vmid,
        name: vm.name,
        status: vm.status
      })));
    }
    
    console.log(`VM counts: ${runningVMs}/${totalVMs} running`);

    // Get ALL storage info
    let allStorageData = null;
    let totalStorageUsed = 0;
    let totalStorageTotal = 0;
    const storageDetails = [];
    
    try {
      console.log('Getting all storage data...');
      allStorageData = await makeProxmoxRequest(config, `/nodes/${config.node}/storage`);
      console.log('All storage data:', allStorageData);
      
      if (allStorageData && Array.isArray(allStorageData)) {
        // Process each storage
        allStorageData.forEach((storage: any) => {
          if (storage.enabled && storage.used !== undefined && storage.total !== undefined) {
            const usedGB = storage.used / (1024 * 1024 * 1024);
            const totalGB = storage.total / (1024 * 1024 * 1024);
            
            totalStorageUsed += usedGB;
            totalStorageTotal += totalGB;
            
            storageDetails.push({
              name: storage.storage,
              type: storage.type,
              used_gb: usedGB,
              total_gb: totalGB,
              usage_percent: totalGB > 0 ? (usedGB / totalGB) * 100 : 0,
              enabled: storage.enabled,
              content: storage.content
            });
          }
        });
      }
      
      console.log(`Total storage: ${totalStorageUsed.toFixed(1)}GB / ${totalStorageTotal.toFixed(1)}GB`);
      console.log('Storage details:', storageDetails);
      
    } catch (storageError) {
      console.warn('Could not get storage data:', storageError);
      // Set minimal defaults if storage info fails
      totalStorageUsed = 0;
      totalStorageTotal = 1000; // 1TB default
    }

    // Return real server metrics
    const result = {
      status: 'online',
      connected: true,
      timestamp: new Date().toISOString(),
      
      // Server metrics
      uptime: nodeData?.uptime || 0,
      uptime_formatted: formatUptime(nodeData?.uptime || 0),
      cpu_usage: (nodeData?.cpu || 0) * 100,
      cpu_cores: nodeData?.cpuinfo?.cpus || 8,
      
      // Memory in GB  
      memory_used: nodeData?.memory ? (nodeData.memory.used / (1024 * 1024 * 1024)) : 0,
      memory_total: nodeData?.memory ? (nodeData.memory.total / (1024 * 1024 * 1024)) : 32,
      memory_usage_percent: nodeData?.memory ? (nodeData.memory.used / nodeData.memory.total) * 100 : 0,
      
      // Storage in GB
      disk_used: totalStorageUsed,
      disk_total: totalStorageTotal,
      disk_usage_percent: totalStorageTotal > 0 ? (totalStorageUsed / totalStorageTotal) * 100 : 0,
      
      // VM counts
      active_vms: runningVMs,
      total_vms: totalVMs,
      
      // Node info
      node_name: nodeData?.name || config.node,
      pve_version: versionData?.data?.version || 'Unknown',
      
      // Debug info
      debug: {
        node_data_keys: nodeData ? Object.keys(nodeData) : [],
        vm_count: totalVMs,
        running_vms: runningVMs,
        storage_available: !!allStorageData,
        storage_count: storageDetails.length,
        storage_details: storageDetails
        vm_list: vmList ? vmList.map((vm: any) => ({
          vmid: vm.vmid,
          name: vm.name,
          status: vm.status,
          cpu: vm.cpu,
          memory: vm.mem
        })) : []
      }
    };

    console.log('=== FINAL RESULT ===');
    console.log('Connected successfully:', result.connected);
    console.log('CPU usage:', result.cpu_usage);
    console.log('Memory usage:', result.memory_usage_percent);
    console.log('VMs:', `${result.active_vms}/${result.total_vms}`);
    console.log('Uptime:', result.uptime_formatted);
    
    return result;

  } catch (error: any) {
    console.error('=== PROXMOX CONNECTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    
    throw new Error(`No se pudo conectar al servidor Proxmox: ${error.message}`);
  }
}

async function makeProxmoxRequest(config: any, endpoint: string, method = 'GET', body?: string) {
  const url = `https://${config.host}:${config.port}/api2/json${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
    'Content-Type': 'application/json',
  };

  console.log(`Making ${method} request to: ${url}`);
  console.log('Using auth header:', `PVEAPIToken=${config.tokenId}=[SECRET]`);

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API error ${response.status}:`, errorText);
    throw new Error(`Proxmox API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log('Response data structure:', typeof data, Object.keys(data || {}));
  return data.data;
}
function formatUptime(seconds: number): string {
  if (!seconds || seconds === 0) return 'Detenido';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}