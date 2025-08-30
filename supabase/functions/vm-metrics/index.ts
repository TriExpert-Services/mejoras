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

    const url = new URL(req.url);
    const vmId = url.searchParams.get('vmId');

    console.log('VM Metrics request for vmId:', vmId);

    if (vmId) {
      // Get specific VM metrics
      const vmMetrics = await getVMMetrics(vmId, user.id);
      return new Response(
        JSON.stringify(vmMetrics),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Get all user's VM metrics
      const allMetrics = await getAllUserVMMetrics(user.id);
      return new Response(
        JSON.stringify(allMetrics),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

async function getVMMetrics(vmId: string, userId: string) {
  try {
    // Get VM details and verify ownership
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .select(`
        id,
        name,
        status,
        proxmox_vmid,
        cpu_cores,
        ram_gb,
        disk_gb,
        ip_address,
        user_id,
        vm_specs!inner (name)
      `)
      .eq('id', vmId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (vmError || !vm) {
      throw new Error('VM not found', { cause: { status: 404, error: 'VM not found' } });
    }

    // Generate mock metrics based on VM status
    const baseMetrics = {
      vm_id: vm.id,
      vm_name: vm.name,
      vm_spec: (vm.vm_specs as any)?.name || 'Sin especificar',
      status: vm.status,
      running: vm.status === 'running',
      cpu_cores: vm.cpu_cores,
      ram_gb: vm.ram_gb,
      disk_gb: vm.disk_gb,
      ip_address: vm.ip_address || 'No asignada',
      last_updated: new Date().toISOString()
    };

    if (vm.status === 'running') {
      // Generate realistic metrics for running VM
      const metrics = {
        ...baseMetrics,
        cpu_usage: Math.random() * 50 + 10, // 10-60% CPU usage
        memory_used_mb: Math.floor((vm.ram_gb * 1024 * 0.3) + (Math.random() * vm.ram_gb * 1024 * 0.4)), // 30-70% memory usage
        memory_total_mb: vm.ram_gb * 1024,
        disk_used_gb: Math.floor((vm.disk_gb * 0.2) + (Math.random() * vm.disk_gb * 0.3)), // 20-50% disk usage
        disk_total_gb: vm.disk_gb,
        network_in_mb: Math.floor(Math.random() * 1000),
        network_out_mb: Math.floor(Math.random() * 800),
        uptime: Math.floor(Math.random() * 86400 * 7) // Random uptime up to 7 days
      };

      metrics.memory_usage_percent = (metrics.memory_used_mb / metrics.memory_total_mb) * 100;
      metrics.disk_usage_percent = (metrics.disk_used_gb / metrics.disk_total_gb) * 100;

      return metrics;
    } else {
      // VM is stopped - return zero metrics
      return {
        ...baseMetrics,
        cpu_usage: 0,
        memory_used_mb: 0,
        memory_total_mb: vm.ram_gb * 1024,
        memory_usage_percent: 0,
        disk_used_gb: 0,
        disk_total_gb: vm.disk_gb,
        disk_usage_percent: 0,
        network_in_mb: 0,
        network_out_mb: 0,
        uptime: 0
      };
    }

  } catch (error: any) {
    console.error('Error getting VM metrics:', error);
    if (error.cause?.status === 404) {
      const response = new Response(
        JSON.stringify({ error: error.cause.error }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
      throw response;
    }
    throw error;
  }
}

async function getAllUserVMMetrics(userId: string) {
  try {
    // Get all user's VMs
    const { data: vms, error: vmsError } = await supabase
      .from('vms')
      .select(`
        id,
        name,
        status,
        proxmox_vmid,
        cpu_cores,
        ram_gb,
        disk_gb,
        ip_address,
        vm_specs!inner (name)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (vmsError) throw vmsError;

    // Get metrics for each VM
    const allMetrics = await Promise.all(
      (vms || []).map(async (vm) => {
        try {
          return await getVMMetrics(vm.id, userId);
        } catch (error) {
          console.error(`Error getting metrics for VM ${vm.id}:`, error);
          return {
            vm_id: vm.id,
            vm_name: vm.name,
            vm_spec: (vm.vm_specs as any)?.name || 'Sin especificar',
            status: vm.status,
            running: false,
            error: 'Error obteniendo métricas',
            last_updated: new Date().toISOString()
          };
        }
      })
    );

    return allMetrics;

  } catch (error: any) {
    console.error('Error getting all VM metrics:', error);
    throw error;
  }
}