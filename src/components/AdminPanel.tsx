import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const { data: users } = await supabase.auth.admin.listUsers();
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
        totalUsers: users?.users?.length || 0,
        totalVMs: vmCount || 0,
        activeVMs: activeVMCount || 0,
        totalRevenue
      });

      // Fetch VMs with user info
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

      // Get user emails for VMs
      const vmsWithEmails = await Promise.all(
        (vmsData || []).map(async (vm) => {
          const { data: user } = await supabase.auth.admin.getUserById(vm.user_id);
          return {
            ...vm,
            user_email: user.user?.email || 'Desconocido',
            vm_spec_name: (vm.vm_specs as any)?.name || 'Sin especificar'
          };
        })
      );

      setVms(vmsWithEmails);

      // Fetch recent orders with user info
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

      const ordersWithEmails = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: user } = await supabase.auth.admin.getUserById(order.user_id);
          return {
            ...order,
            user_email: user.user?.email || 'Desconocido',
            vm_spec_name: (order.vm_specs as any)?.name || 'Sin especificar'
          };
        })
      );

      setOrders(ordersWithEmails);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
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
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuarios Totales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">VPS Totales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalVMs}</p>
              </div>
              <Server className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">VPS Activos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeVMs}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
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
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vms.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay VPS creados</p>
              ) : (
                vms.map((vm) => (
                  <div key={vm.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{vm.name}</h4>
                        <p className="text-sm text-gray-600">{vm.user_email}</p>
                        <p className="text-xs text-gray-500">{vm.vm_spec_name}</p>
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
                          >
                            <Square className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVMAction(vm.id, 'delete')}
                          disabled={actionLoading[vm.id]}
                          className="text-red-600 hover:text-red-700"
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
                <p className="text-center text-gray-500 py-8">No hay órdenes registradas</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">${order.total_amount}</h4>
                        <p className="text-sm text-gray-600">{order.user_email}</p>
                        <p className="text-xs text-gray-500">{order.vm_spec_name}</p>
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
              className="flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
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
    </div>
  );
}