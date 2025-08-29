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

    // Check if user is admin
    const adminEmails = ['admin@triexpertservice.com'];
    if (!adminEmails.includes(user.email || '')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin statistics
    const stats = await getAdminStats();
    const vms = await getRecentVMs();
    const orders = await getRecentOrders();

    return new Response(
      JSON.stringify({ stats, vms, orders }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Admin stats error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getAdminStats() {
  try {
    // Get VM counts
    const { count: totalVMs } = await supabase
      .from('vms')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const { count: activeVMs } = await supabase
      .from('vms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running')
      .is('deleted_at', null);

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

    // Get user count from stripe_customers as proxy
    const { count: totalUsers } = await supabase
      .from('stripe_customers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    return {
      totalUsers: totalUsers || 0,
      totalVMs: totalVMs || 0,
      activeVMs: activeVMs || 0,
      totalRevenue
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    throw error;
  }
}

async function getRecentVMs() {
  try {
    const { data: vmsData } = await supabase
      .from('vms')
      .select(`
        id,
        name,
        status,
        created_at,
        cpu_cores,
        ram_gb,
        user_id,
        vm_specs!inner (name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    return (vmsData || []).map(vm => ({
      ...vm,
      user_email: 'Usuario', // Fallback since we can't get email easily
      vm_spec_name: (vm.vm_specs as any)?.name || 'Sin especificar'
    }));
  } catch (error) {
    console.error('Error getting recent VMs:', error);
    throw error;
  }
}

async function getRecentOrders() {
  try {
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total_amount,
        created_at,
        user_id,
        vm_specs!inner (name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    return (ordersData || []).map(order => ({
      ...order,
      user_email: 'Usuario', // Fallback
      vm_spec_name: (order.vm_specs as any)?.name || 'Sin especificar'
    }));
  } catch (error) {
    console.error('Error getting recent orders:', error);
    throw error;
  }
}