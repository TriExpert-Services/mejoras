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
        console.log('Listing all VM templates...');
        endpoint = `/nodes/${config?.node || defaultNode}/qemu`;
        method = 'GET';
        break;
        
      case 'resize':
        console.log(`Resizing VM ${vmId} resources...`);
        endpoint = `/nodes/${defaultNode}/qemu/${vmId}/config`;
        method = 'PUT';
        body = new URLSearchParams({
          cores: config.cores.toString(),
          memory: config.memory.toString(),
          ...(config.ipAddress && {
            ipconfig0: `ip=${config.ipAddress}/24,gw=${Deno.env.get('PVE_DEFAULT_GATEWAY') || '10.0.0.1'}`,
            cipassword: config.password,
          }),
        });
        break;

      case 'clone':
        console.log(`Cloning template ${config.template} to VM ${config.vmid}...`);
        endpoint = `/nodes/${config.node}/qemu/${config.template}/clone`;
        method = 'POST';
        body = new URLSearchParams({
          newid: config.vmid.toString(),
          name: config.name,
          node: config.node,
          storage: Deno.env.get('PVE_DEFAULT_STORAGE') || 'local-lvm',
          format: 'raw',
          full: '1', // Full clone
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
          console.log('Listing all CT templates...');
          endpoint = `/nodes/${config?.node || defaultNode}/storage/local/content?content=vztmpl`;
        break;
        
      case 'delete':
        console.log(`Deleting VM ${vmId}...`);
          console.log(`Resizing container ${vmId} resources...`);
          endpoint = `/nodes/${defaultNode}/lxc/${vmId}/config`;
        break;

      case 'status':
        console.log(`Getting VM ${vmId} status...`);
            rootfs: `${config.disk}`,
      case 'config':
        console.log(`Getting VM ${vmId} config...`);
        endpoint = `/nodes/${defaultNode}/qemu/${vmId}/config`;
        case 'create-lxc':
          console.log(`Creating LXC container ${config.vmid} from template ${config.ostemplate}...`);
          endpoint = `/nodes/${config.node}/lxc`;
      default:
        throw new Error(`Unknown action: ${action}`);
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

    const response = await fetch(url, {
      method,
      headers,
          console.log(`Starting container ${vmId}...`);
          endpoint = `/nodes/${defaultNode}/lxc/${vmId}/status/start`;

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Proxmox API error:', result);
          console.log(`Stopping container ${vmId}...`);
          endpoint = `/nodes/${defaultNode}/lxc/${vmId}/status/stop`;
          success: false, 
          error: `Proxmox API error ${response.status}: ${JSON.stringify(result)}` 
        }),
        { 
          status: response.status, 
          console.log(`Deleting container ${vmId}...`);
          endpoint = `/nodes/${defaultNode}/lxc/${vmId}`;
      );
    }

    console.log('Proxmox API success:', result);
          console.log(`Getting container ${vmId} status...`);
          endpoint = `/nodes/${defaultNode}/lxc/${vmId}/status/current`;
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

          console.log(`Getting container ${vmId} config...`);
          endpoint = `/nodes/${defaultNode}/lxc/${vmId}/config`;
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        case 'task-status':
          console.log(`Getting task status ${config.upid}...`);
          endpoint = `/nodes/${defaultNode}/tasks/${config.upid}/status`;
          method = 'GET';
          break;

        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});