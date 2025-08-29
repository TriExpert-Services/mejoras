import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

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

    if (req.method === 'GET') {
      // Get metrics for user's VMs
      const vmId = new URL(req.url).searchParams.get('vmId');
      
      if (vmId) {
        // Get specific VM metrics
        const metrics = await getVMMetrics(user.id, vmId);
        return new Response(
          JSON.stringify(metrics),
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
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

async function getVMMetrics(userId: string, vmId: string) {
  try {
    // Get VM from database
    const { data: vm, error } = await supabase
      .from('vms')
      .select(`
        *,
        vm_specs (*)
      `)
      .eq('user_id', userId)
      .eq('id', vmId)
      .is('deleted_at', null)
      .single();

    if (error || !vm) {
      throw new Error('VM no encontrada');
    }

    // Get real-time metrics from Proxmox
    const proxmoxMetrics = await getProxmoxVMMetrics(vm.proxmox_vmid);

    return {
      vm_id: vm.id,
      vm_name: vm.name,
      vm_spec: vm.vm_specs?.name,
      status: vm.status,
      
      // Real-time metrics from Proxmox
      ...proxmoxMetrics,
      
      // Configuration
      cpu_cores: vm.cpu_cores,
      ram_gb: vm.ram_gb,
      disk_gb: vm.disk_gb,
      ip_address: vm.ip_address,
      
      // Updated timestamp
      last_updated: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error(`Error getting metrics for VM ${vmId}:`, error);
    throw error;
  }
}

async function getAllUserVMMetrics(userId: string) {
  try {
    // Get all user's VMs
    const { data: vms, error } = await supabase
      .from('vms')
      .select(`
        id,
        name,
        proxmox_vmid,
        status,
        cpu_cores,
        ram_gb,
        disk_gb,
        ip_address,
        vm_specs (name)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Error fetching VMs: ${error.message}`);
    }

    if (!vms || vms.length === 0) {
      return [];
    }

    // Get metrics for each VM
    const metrics = await Promise.all(
      vms.map(async (vm) => {
        try {
          const proxmoxMetrics = await getProxmoxVMMetrics(vm.proxmox_vmid);
          
          return {
            vm_id: vm.id,
            vm_name: vm.name,
            vm_spec: (vm.vm_specs as any)?.name,
            status: vm.status,
            
            // Real metrics
            ...proxmoxMetrics,
            
            // Configuration
            cpu_cores: vm.cpu_cores,
            ram_gb: vm.ram_gb,
            disk_gb: vm.disk_gb,
            ip_address: vm.ip_address,
          };
        } catch (error) {
          console.error(`Failed to get metrics for VM ${vm.id}:`, error);
          
          // Return basic info if metrics fail
          return {
            vm_id: vm.id,
            vm_name: vm.name,
            vm_spec: (vm.vm_specs as any)?.name,
            status: vm.status,
            error: 'No se pudieron obtener métricas',
            
            cpu_cores: vm.cpu_cores,
            ram_gb: vm.ram_gb,
            disk_gb: vm.disk_gb,
            ip_address: vm.ip_address,
          };
        }
      })
    );

    return metrics;

  } catch (error: any) {
    console.error('Error getting user VM metrics:', error);
    throw error;
  }
}

async function getProxmoxVMMetrics(proxmoxVmId: number) {
  try {
    const config = {
      host: Deno.env.get('PVE_API_URL')?.replace('https://', '').replace(':8006/api2/json', '') || 'pve.triexpertservice.com',
      tokenId: Deno.env.get('PVE_TOKEN_ID') || 'root@pam!server',
      tokenSecret: Deno.env.get('PVE_TOKEN_SECRET') || '',
      port: 8006,
      node: Deno.env.get('PVE_DEFAULT_NODE') || 'pve',
    };

    // Get current VM status and metrics
    const statusUrl = `https://${config.host}:${config.port}/api2/json/nodes/${config.node}/qemu/${proxmoxVmId}/status/current`;
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Proxmox API error ${response.status}`);
    }

    const data = await response.json();
    const vmData = data.data;

    // Get network interfaces
    let networkInfo = null;
    try {
      const networkUrl = `https://${config.host}:${config.port}/api2/json/nodes/${config.node}/qemu/${proxmoxVmId}/agent/network-get-interfaces`;
      const networkResponse = await fetch(networkUrl, {
        headers: {
          'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
        },
      });
      
      if (networkResponse.ok) {
        const networkData = await networkResponse.json();
        networkInfo = networkData.data;
      }
    } catch (error) {
      console.log('Could not get network info:', error);
    }

    return {
      // Status
      status: vmData.status,
      running: vmData.status === 'running',
      
      // Performance metrics
      cpu_usage: (vmData.cpu || 0) * 100, // Convert to percentage
      memory_used_mb: Math.round((vmData.mem || 0) / (1024 * 1024)),
      memory_total_mb: Math.round((vmData.maxmem || 0) / (1024 * 1024)),
      memory_usage_percent: vmData.maxmem ? (vmData.mem / vmData.maxmem) * 100 : 0,
      
      // Disk usage
      disk_used_gb: Math.round((vmData.disk || 0) / (1024 * 1024 * 1024)),
      disk_total_gb: Math.round((vmData.maxdisk || 0) / (1024 * 1024 * 1024)),
      disk_usage_percent: vmData.maxdisk ? (vmData.disk / vmData.maxdisk) * 100 : 0,
      
      // Network
      network_in_mb: Math.round((vmData.netin || 0) / (1024 * 1024)),
      network_out_mb: Math.round((vmData.netout || 0) / (1024 * 1024)),
      
      // System info
      uptime: vmData.uptime || 0,
      pid: vmData.pid,
      qmpstatus: vmData.qmpstatus,
      
      // Network interfaces (if available)
      network_interfaces: networkInfo,
      
      // Last updated
      last_updated: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error(`Failed to get Proxmox metrics for VM ${proxmoxVmId}:`, error);
    throw new Error(`No se pudieron obtener métricas del VM: ${error.message}`);
  }
}