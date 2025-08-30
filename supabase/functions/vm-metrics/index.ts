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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get vmId from URL
    const url = new URL(req.url);
    const vmId = url.searchParams.get('vmId');

    if (!vmId) {
      return new Response(
        JSON.stringify({ error: 'VM ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user authentication
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

    // Get VM from database
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .select('*')
      .eq('id', vmId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (vmError || !vm) {
      return new Response(
        JSON.stringify({ error: 'VM not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return mock metrics for now (to test if the function works)
    const mockMetrics = {
      vm_id: vmId,
      vm_name: vm.name,
      vm_spec: 'VPS',
      status: vm.status,
      running: vm.status === 'running',
      cpu_usage: Math.random() * 80 + 10, // Random between 10-90%
      memory_used_mb: Math.floor(Math.random() * 1024 + 512),
      memory_total_mb: vm.ram_gb * 1024,
      memory_usage_percent: Math.random() * 60 + 20,
      disk_used_gb: Math.floor(Math.random() * vm.disk_gb * 0.8),
      disk_total_gb: vm.disk_gb,
      disk_usage_percent: Math.random() * 50 + 10,
      network_in_mb: Math.floor(Math.random() * 100),
      network_out_mb: Math.floor(Math.random() * 100),
      uptime: Math.floor(Math.random() * 86400 * 7), // Random uptime up to 7 days
      last_updated: new Date().toISOString(),
      cpu_cores: vm.cpu_cores,
      ram_gb: vm.ram_gb,
      disk_gb: vm.disk_gb,
      ip_address: vm.ip_address || 'Asignando...',
    };

    return new Response(
      JSON.stringify(mockMetrics),
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