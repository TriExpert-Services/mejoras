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
    const proxmoxApiUrl = Deno.env.get('PVE_API_URL');
    const tokenId = Deno.env.get('PVE_TOKEN_ID');
    const tokenSecret = Deno.env.get('PVE_TOKEN_SECRET');
    const defaultNode = Deno.env.get('PVE_DEFAULT_NODE') || 'pve';

    if (!proxmoxApiUrl || !tokenId || !tokenSecret) {
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
        console.log('Listing all CT templates...');
        endpoint = `/nodes/${config?.node || defaultNode}/storage/local/content?content=vztmpl`;
        method = 'GET';
        break;
        
      case 'create-lxc':
        console.log(`Creating LXC container ${config.vmid} from template ${config.ostemplate}...`);
        endpoint = `/nodes/${config.node}/lxc`;
        method = 'POST';
        body = new URLSearchParams({
          vmid: config.vmid.toString(),
          ostemplate: config.ostemplate,
          hostname: config.hostname || `ct-${config.vmid}`,
          password: config.password,
          cores: config.cores.toString(),
          memory: config.memory.toString(),
          rootfs: config.rootfs.toString(),
          net0: config.net0 || 'name=eth0,bridge=vmbr0,ip=dhcp',
          unprivileged: '1', // Safer unprivileged containers
          features: 'nesting=1', // Allow Docker if needed
          nameserver: config.nameserver || '8.8.8.8',
          searchdomain: config.searchdomain || 'local',
        });
        break;

      case 'start':
        console.log(`Starting container ${vmId}...`);
        endpoint = `/nodes/${defaultNode}/lxc/${vmId}/status/start`;
        method = 'POST';
        body = new URLSearchParams();
        break;

      case 'stop':
        console.log(`Stopping container ${vmId}...`);
        endpoint = `/nodes/${defaultNode}/lxc/${vmId}/status/stop`;
        method = 'POST';
        body = new URLSearchParams();
        break;

      case 'delete':
        console.log(`Deleting container ${vmId}...`);
        endpoint = `/nodes/${defaultNode}/lxc/${vmId}`;
        method = 'DELETE';
        break;

      case 'status':
        console.log(`Getting container ${vmId} status...`);
        endpoint = `/nodes/${defaultNode}/lxc/${vmId}/status/current`;
        method = 'GET';
        break;

      case 'config':
        console.log(`Getting container ${vmId} config...`);
        endpoint = `/nodes/${defaultNode}/lxc/${vmId}/config`;
        method = 'GET';
        break;

      case 'task-status':
        console.log(`Getting task status ${config.upid}...`);
        endpoint = `/nodes/${defaultNode}/tasks/${config.upid}/status`;
        method = 'GET';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const url = `${proxmoxApiUrl}${endpoint}`;
    console.log(`Making ${method} request to: ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body,
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
    console.error('Proxmox API error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});