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

    if (req.method !== 'POST') {
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

    const { vmId } = await req.json();

    if (!vmId) {
      return new Response(
        JSON.stringify({ error: 'VM ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get VM details and verify ownership
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .select('id, user_id, proxmox_vmid, status, name')
      .eq('id', vmId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (vmError || !vm) {
      return new Response(
        JSON.stringify({ error: 'VM not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if VM is running
    if (vm.status !== 'running') {
      return new Response(
        JSON.stringify({ error: 'VM must be running to access VNC console' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating VNC ticket for VM ${vm.proxmox_vmid} (${vm.name})`);

    // Generate VNC ticket from Proxmox
    const vncData = await generateVNCTicket(vm.proxmox_vmid);

    return new Response(
      JSON.stringify({
        success: true,
        vncData: {
          ...vncData,
          vmId: vm.id,
          vmName: vm.name,
          proxmoxVmId: vm.proxmox_vmid
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('VNC proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateVNCTicket(vmid: number) {
  try {
    console.log(`Generating VNC ticket for LXC container ${vmid}`);

    // Build Proxmox config
    const pveApiUrl = Deno.env.get('PVE_API_URL') || 'https://pve.triexpertservice.com:8006/api2/json';
    const pveTokenId = Deno.env.get('PVE_TOKEN_ID') || 'root@pam!server';
    const pveTokenSecret = Deno.env.get('PVE_TOKEN_SECRET') || 'uae617333-2efc-4174-bd29-bd8455f8e934';
    const pveNode = Deno.env.get('PVE_DEFAULT_NODE') || 'pve';

    const host = pveApiUrl.replace('https://', '').replace(':8006/api2/json', '');
    
    const proxmoxConfig = {
      host,
      tokenId: pveTokenId,
      tokenSecret: pveTokenSecret,
      port: 8006,
      node: pveNode,
    };

    console.log('Proxmox config:', {
      host: proxmoxConfig.host,
      node: proxmoxConfig.node,
      vmid
    });

    // Create VNC proxy ticket for LXC container
    const vncUrl = `https://${proxmoxConfig.host}:${proxmoxConfig.port}/api2/json/nodes/${proxmoxConfig.node}/lxc/${vmid}/vncproxy`;
    
    console.log('Creating VNC proxy at:', vncUrl);

    const response = await fetch(vncUrl, {
      method: 'POST',
      headers: {
        'Authorization': `PVEAPIToken=${proxmoxConfig.tokenId}=${proxmoxConfig.tokenSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        websocket: '1',
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`VNC proxy creation failed [${response.status}]:`, errorText);
      throw new Error(`Failed to create VNC proxy: ${errorText}`);
    }

    const data = await response.json();
    console.log('VNC proxy response:', data);

    if (!data.data) {
      throw new Error('No VNC data returned from Proxmox');
    }

    const vncData = data.data;

    return {
      ticket: vncData.ticket,
      port: vncData.port,
      user: vncData.user,
      host: proxmoxConfig.host,
      node: proxmoxConfig.node,
      vmid: vmid,
      websocket: true,
      // Note: WebSocket URL will be constructed in the frontend
    };

  } catch (error: any) {
    console.error('Error generating VNC ticket:', error);
    throw error;
  }
}