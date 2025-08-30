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

    // Parse vmId from query parameters
    const url = new URL(req.url);
    const vmId = url.searchParams.get('vmId');

    // Get the user's auth token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userToken = authHeader.replace('Bearer ', '');

    // Verify user is authenticated
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(userToken);

    if (getUserError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vmId) {
      return new Response(
        JSON.stringify({ error: 'VM ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get VM details from database - ensure user owns this VM
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .select('proxmox_vmid, status, ip_address, name, cpu_cores, ram_gb, disk_gb')
      .eq('id', vmId)
      .eq('user_id', user.id)
      .eq('deleted_at', null)
      .single();

    if (vmError || !vm) {
      return new Response(
        JSON.stringify({ error: 'VM not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call proxmox-api function to get real-time metrics
    const proxmoxApiUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/proxmox-api`;
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const proxmoxResponse = await fetch(proxmoxApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        action: 'status',
        vmId: vm.proxmox_vmid,
      }),
    });

    // Handle non-JSON responses (like HTML error pages)
    const responseText = await proxmoxResponse.text();
    let proxmoxResult;
    
    try {
      proxmoxResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Non-JSON response from proxmox-api:', responseText);
      throw new Error(`Proxmox API returned invalid response: ${responseText.substring(0, 100)}...`);
    }
    
    if (!proxmoxResponse.ok) {
      throw new Error(proxmoxResult.error || 'Failed to fetch Proxmox metrics');
    }

    // Extract Proxmox status data
    const proxmoxData = proxmoxResult.data || {};
    
    // Format response for VMMetrics interface
    const metrics = {
      vm_id: vmId,
      vm_name: vm.name,
      vm_spec: 'VPS', // Simplified
      status: vm.status,
      running: vm.status === 'running',
      cpu_usage: (proxmoxData.cpu || 0) * 100, // Convert to percentage
      memory_used_mb: proxmoxData.mem ? Math.round(proxmoxData.mem / (1024 * 1024)) : 0,
      memory_total_mb: proxmoxData.maxmem ? Math.round(proxmoxData.maxmem / (1024 * 1024)) : vm.ram_gb * 1024,
      memory_usage_percent: proxmoxData.mem && proxmoxData.maxmem ? (proxmoxData.mem / proxmoxData.maxmem) * 100 : 0,
      disk_used_gb: proxmoxData.disk ? Math.round(proxmoxData.disk / (1024 * 1024 * 1024)) : 0,
      disk_total_gb: vm.disk_gb,
      disk_usage_percent: proxmoxData.disk ? (proxmoxData.disk / (vm.disk_gb * 1024 * 1024 * 1024)) * 100 : 0,
      network_in_mb: proxmoxData.netin ? Math.round(proxmoxData.netin / (1024 * 1024)) : 0,
      network_out_mb: proxmoxData.netout ? Math.round(proxmoxData.netout / (1024 * 1024)) : 0,
      uptime: proxmoxData.uptime || 0,
      last_updated: new Date().toISOString(),
      cpu_cores: vm.cpu_cores,
      ram_gb: vm.ram_gb,
      disk_gb: vm.disk_gb,
      ip_address: vm.ip_address || 'Not assigned',
    };

    return new Response(
      JSON.stringify(metrics),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('VM metrics error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});