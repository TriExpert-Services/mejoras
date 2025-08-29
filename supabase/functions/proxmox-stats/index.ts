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

    // Count VMs
    const runningVMs = vmList ? vmList.filter((vm: any) => vm.status === 'running').length : 0;
    const totalVMs = vmList ? vmList.length : 0;

    // Get storage info
    let storageData = null;
    let storageUsed = 0;
    let storageTotal = 100;
    
    try {
      console.log('Getting storage data...');
      storageData = await makeProxmoxRequest(config, `/nodes/${config.node}/storage`);
      console.log('Storage data:', storageData);
      
      const localStorage = storageData?.find((s: any) => 
        s.storage === 'local-lvm' || s.storage === 'local' || s.enabled
      );
      
      if (localStorage && localStorage.used && localStorage.total) {
        storageUsed = localStorage.used / (1024 * 1024 * 1024); // Convert to GB
        storageTotal = localStorage.total / (1024 * 1024 * 1024);
      }
    } catch (storageError) {
      console.warn('Could not get storage data:', storageError);
    }

    // Return real server metrics
    const result = {
      status: 'online',
      connected: true,
      timestamp: new Date().toISOString(),
      
      // Server metrics
      uptime: nodeData?.uptime || 0,
      cpu_usage: (nodeData?.cpu || 0) * 100,
      cpu_cores: nodeData?.cpuinfo?.cpus || 8,
      
      // Memory in GB  
      memory_used: nodeData?.memory ? (nodeData.memory.used / (1024 * 1024 * 1024)) : 0,
      memory_total: nodeData?.memory ? (nodeData.memory.total / (1024 * 1024 * 1024)) : 32,
      memory_usage_percent: nodeData?.memory ? (nodeData.memory.used / nodeData.memory.total) * 100 : 0,
      
      // Storage in GB
      disk_used: storageUsed,
      disk_total: storageTotal,
      disk_usage_percent: storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0,
      
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
        storage_available: !!storageData
      }
    };

    console.log('=== FINAL RESULT ===');
    console.log('Connected successfully:', result.connected);
    console.log('CPU usage:', result.cpu_usage);
    console.log('Memory usage:', result.memory_usage_percent);
    
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