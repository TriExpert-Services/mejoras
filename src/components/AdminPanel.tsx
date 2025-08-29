import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Server, 
  DollarSign, 
  Activity,
  RefreshCw,
  Settings,
  Eye,
  Trash2,
  Play,
  Square,
  AlertTriangle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalVMs: number;
  totalRevenue: number;
  activeVMs: number;
}

interface AdminVM {
  id: string;
  name: string;
  status: string;
  user_email: string;
  created_at: string;
  cpu_cores: number;
  ram_gb: number;
  vm_spec_name: string;
}

interface AdminOrder {
  id: string;
  user_email: string;
  status: string;
  total_amount: number;
  created_at: string;
  vm_spec_name: string;
}

export function AdminPanel() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalVMs: 0,
    totalRevenue: 0,
    activeVMs: 0
  });
  const [vms, setVms] = useState<AdminVM[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setStats(data.stats);
      setVms(data.vms);
      setOrders(data.orders);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar datos de admin');
      
      // Fallback: try to get basic data from database directly
      await fetchBasicData();
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicData = async () => {
    try {
      // Get VM counts from database directly
      const { count: vmCount } = await supabase
        .from('vms')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      
      const { count: activeVMCount } = await supabase
        .from('vms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running')
        .is('deleted_at', null);

      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      setStats({
        totalUsers: 0, // Cannot get user count without admin API
        totalVMs: vmCount || 0,
        activeVMs: activeVMCount || 0,
        totalRevenue
      });

      // Get VMs with basic info (no user emails)
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
          vm_specs (name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      const vmsBasic = (vmsData || []).map(vm => ({
        ...vm,
        user_email: 'Usuario',
        vm_spec_name: Array.isArray(vm.vm_specs) ? vm.vm_specs[0]?.name : vm.vm_specs?.name || 'Sin especificar'
      }));

      setVms(vmsBasic);

      // Get orders with basic info
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          user_id,
          vm_specs (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const ordersBasic = (ordersData || []).map(order => ({
        ...order,
        user_email: 'Usuario',
        vm_spec_name: Array.isArray(order.vm_specs) ? order.vm_specs[0]?.name : order.vm_specs?.name || 'Sin especificar'
      }));

      setOrders(ordersBasic);

    } catch (error) {
      console.error('Error fetching basic data:', error);
    }
  };

  const handleVMAction = async (vmId: string, action: 'start' | 'stop' | 'delete') => {
    setActionLoading(prev => ({ ...prev, [vmId]: true }));
    
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('vms')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', vmId);
        
        if (error) throw error;
      } else {
        // For start/stop, you'd call your VM provisioner
        console.log(`${action}ing VM ${vmId}`);
      }
      
      await fetchAdminData();
    } catch (error) {
      console.error(`Error ${action}ing VM:`, error);
      alert(`Error al ${action === 'start' ? 'iniciar' : action === 'stop' ? 'detener' : 'eliminar'} el VM`);
    } finally {
      setActionLoading(prev => ({ ...prev, [vmId]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      running: { variant: 'success' as const, text: 'Activo' },
      stopped: { variant: 'secondary' as const, text: 'Detenido' },
      creating: { variant: 'warning' as const, text: 'Creando' },
      pending: { variant: 'warning' as const, text: 'Pendiente' },
      error: { variant: 'destructive' as const, text: 'Error' },
      completed: { variant: 'success' as const, text: 'Completado' },
      processing: { variant: 'warning' as const, text: 'Procesando' },
      failed: { variant: 'destructive' as const, text: 'Fallida' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-4" />
          <span className="text-gray-600">Cargando panel de administración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
        <p className="text-gray-600">Gestiona usuarios, VPS y órdenes de la plataforma</p>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Usuarios Totales</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">VPS Totales</p>
                <p className="text-3xl font-bold">{stats.totalVMs}</p>
              </div>
              <Server className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">VPS Activos</p>
                <p className="text-3xl font-bold">{stats.activeVMs}</p>
              </div>
              <Activity className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Ingresos Totales</p>
                <p className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* VMs Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                VPS Recientes
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAdminData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vms.length === 0 ? (
                <div className="text-center py-8">
                  <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay VPS creados</p>
                </div>
              ) : (
                vms.map((vm) => (
                  <div key={vm.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{vm.name}</h4>
                        <p className="text-sm text-gray-600">{vm.user_email}</p>
                        <p className="text-xs text-blue-600">{vm.vm_spec_name}</p>
                      </div>
                      {getStatusBadge(vm.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{vm.cpu_cores} vCPU • {vm.ram_gb}GB RAM</span>
                      <div className="flex gap-2">
                        {vm.status === 'stopped' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVMAction(vm.id, 'start')}
                            disabled={actionLoading[vm.id]}
                            title="Iniciar VM"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {vm.status === 'running' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVMAction(vm.id, 'stop')}
                            disabled={actionLoading[vm.id]}
                            title="Detener VM"
                          >
                            <Square className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('¿Estás seguro de que quieres eliminar este VM?')) {
                              handleVMAction(vm.id, 'delete');
                            }
                          }}
                          disabled={actionLoading[vm.id]}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar VM"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Órdenes Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay órdenes registradas</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">${order.total_amount}</h4>
                        <p className="text-sm text-gray-600">{order.user_email}</p>
                        <p className="text-xs text-blue-600">{order.vm_spec_name}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString('es-ES')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Controls */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Controles del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => alert('Función de mantenimiento en desarrollo')}
              className="flex items-center justify-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              Modo Mantenimiento
            </Button>
            <Button
              variant="outline"
              onClick={fetchAdminData}
              disabled={loading}
              className="flex items-center justify-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </Button>
            <Button
              variant="outline"
              onClick={() => alert('Función de backup en desarrollo')}
              className="flex items-center justify-center"
            >
              <Eye className="h-4 w-4 mr-2" />
              Backup Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      {error && (
        <Card className="mt-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <h4 className="font-medium text-yellow-800 mb-2">Información de Debug</h4>
            <p className="text-sm text-yellow-700 mb-4">{error}</p>
            <p className="text-xs text-yellow-600">
              Tip: Verifica que las edge functions estén configuradas correctamente en Supabase.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
</invoke>