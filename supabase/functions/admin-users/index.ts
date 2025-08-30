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

    // Verify user is authenticated and admin
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

    // Get user data with aggregated info
    const users = await getUsersWithStats();

    return new Response(
      JSON.stringify({ users }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Admin users error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getUsersWithStats() {
  try {
    // Get all users from auth.users using admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Error fetching users: ${authError.message}`);
    }

    const usersWithStats = await Promise.all(
      authUsers.users.map(async (authUser) => {
        // Get VM count
        const { count: vmCount } = await supabase
          .from('vms')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .is('deleted_at', null);

        // Get total spent
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('user_id', authUser.id)
          .eq('status', 'completed');

        const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

        // Get subscription status
        const { data: subscription } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', authUser.id)
          .single();

        return {
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          email_confirmed_at: authUser.email_confirmed_at,
          vm_count: vmCount || 0,
          total_spent: totalSpent,
          subscription_status: subscription?.status || 'not_started',
          is_admin: authUser.email === 'admin@triexpertservice.com'
        };
      })
    );

    return usersWithStats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  } catch (error: any) {
    console.error('Error getting users with stats:', error);
    throw error;
  }
}