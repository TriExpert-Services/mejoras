import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { action, vmId, config } = await req.json();
    
    console.log(`Proxmox API call: action=${action}, vmId=${vmId}`, config ? 'with config' : 'no config');

    // Get Proxmox configuration from environment
    const proxmoxHost = Deno.env.get('PVE_HOST');
    const tokenId = Deno.env.get('PVE_TOKEN_ID');
    const tokenSecret = Deno.env.get('PVE_TOKEN_SECRET');
    const defaultNode = Deno.env.get('PVE_DEFAULT_NODE') || 'pve';
    const tlsInsecure = Deno.env.get('PVE_TLS_INSECURE') === 'true';

    if (!proxmoxHost || !tokenId || !tokenSecret) {
      throw new Error('Missing Proxmox configuration');
    }

    // Prepare authentication headers
    const auth = `${tokenId}=${tokenSecret}`;
    const headers = {
      'Authorization': `PVEAPIToken=${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Handle different actions
    let endpoint = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'list-templates':
        console.log('Listing all VM templates...');
        endpoint = `/nodes/${config?.node || defaultNode}/qemu`;
        method = 'GET';
        break;
        
      case 'create':
        console.log(`Creating new VM ${config.vmid}...`);
        endpoint = `/nodes/${config.node}/qemu`;
        method = 'POST';
        body = new URLSearchParams({
          vmid: config.vmid.toString(),
          name: config.name,
          cores: config.cores.toString(),
          memory: config.memory.toString(),
          ostype: 'l26',
          agent: '1',
          net0: `virtio,bridge=${Deno.env.get('PVE_DEFAULT_BRIDGE') || 'vmbr0'}`,
          scsi0: `${Deno.env.get('PVE_DEFAULT_STORAGE') || 'local-lvm'}:${config.disk}`,
          boot: 'c',
          bootdisk: 'scsi0',
          scsihw: 'virtio-scsi-pci',
        });
        break;

      case 'start':
        console.log(`Starting VM ${vmId}...`);
        endpoint = `/nodes/${defaultNode}/qemu/${vmId}/status/start`;
        method = 'POST';
        body = new URLSearchParams();
        break;

      case 'stop':
        console.log(`Stopping VM ${vmId}...`);
        endpoint = `/nodes/${defaultNode}/qemu/${vmId}/status/stop`;
        method = 'POST';
        body = new URLSearchParams();
        break;

      case 'status':
        console.log(`Getting VM ${vmId} status...`);
        endpoint = `/nodes/${defaultNode}/qemu/${vmId}/status/current`;
        method = 'GET';
        break;

      case 'config':
        console.log(`Getting VM ${vmId} config...`);
        endpoint = `/nodes/${defaultNode}/qemu/${vmId}/config`;
        method = 'GET';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Make request to Proxmox API
    const protocol = tlsInsecure ? 'http' : 'https';
    const url = `${protocol}://${proxmoxHost}:8006/api2/json${endpoint}`;
    
    console.log(`Making Proxmox API request: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined,
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Proxmox API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Proxmox API error ${response.status}: ${JSON.stringify(result)}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Proxmox API success:', result);
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Proxmox API proxy error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});