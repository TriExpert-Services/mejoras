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

    if (!vmId) {
      return new Response(
        JSON.stringify({ error: 'VM ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get VM details from database
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .select('proxmox_vmid, status, ip_address, name')
      .eq('id', vmId)
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
    
    const proxmoxResponse = await fetch(proxmoxApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        action: 'status',
        vmId: vm.proxmox_vmid,
      }),
    });

    const proxmoxResult = await proxmoxResponse.json();
    
    if (!proxmoxResponse.ok) {
      throw new Error(proxmoxResult.error || 'Failed to fetch Proxmox metrics');
    }

    // Format response for VMMetrics interface
    const metrics = {
      id: vmId,
      name: vm.name,
      status: vm.status,
      ipAddress: vm.ip_address || 'Not assigned',
      cpuUsage: proxmoxResult.data?.cpu_usage_percent || 0,
      memoryUsage: proxmoxResult.data?.memory_usage_percent || 0,
      diskUsage: proxmoxResult.data?.disk_usage_percent || 0,
      uptime: proxmoxResult.data?.uptime || 'Unknown',
      lastUpdated: new Date().toISOString(),
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