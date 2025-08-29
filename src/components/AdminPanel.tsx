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
  Trash2,
  Play,
  Square,
  AlertTriangle,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  AlertCircle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalVMs: number;
  totalRevenue: number;
  activeVMs: number;
}

interface ProxmoxStats {
  status: string;
  connected: boolean;
  uptime: number;
  cpu_usage: number;
  cpu_cores: number;
  memory_used: number;
  memory_total: number;
  memory_usage_percent: number;
  disk_used: number;
  disk_total: number;
  disk_usage_percent: number;
  active_vms: number;
  total_vms: number;
  node_name: string;
  pve_version?: string;
  kernel_version?: string;
  timestamp: string;
  debug?: {
    storage_details: any[];
  };
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
  const [proxmoxStats, setProxmoxStats] = useState<ProxmoxStats | null>(null);
  const [vms, setVms] = useState<AdminVM[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proxmoxLoading, setProxmoxLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAdminData();
    fetchProxmoxStats();
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
      setVms(data.vms || []);
      setOrders(data.orders || []);

    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      setError(error.message);
      
      // Set fallback data
      setStats({
        totalUsers: 0,
        totalVMs: 0,
        totalRevenue: 0,
        activeVMs: 0
      });
      setVms([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProxmoxStats = async () => {
    setProxmoxLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      console.log('Fetching real Proxmox stats...');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxmox-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Real Proxmox stats received:', data);
        setProxmoxStats(data);
        
        if (!data.connected) {
          setError(`Error de conexión: ${data.error || 'No se pudo conectar al servidor Proxmox'}`);
        } else {
          setError(null);
        }
      } else {
        throw new Error(data.error || `Error ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error connecting to Proxmox:', error);
      setError(`Error de Proxmox: ${error.message}`);
      
      // Set disconnected state
      setProxmoxStats({
        status: 'offline',
        connected: false,
        uptime: 0,
        cpu_usage: 0,
        cpu_cores: 0,
        memory_used: 0,
        memory_total: 0,
        memory_usage_percent: 0,
        disk_used: 0,
        disk_total: 0,
        disk_usage_percent: 0,
        active_vms: 0,
        total_vms: 0,
        node_name: 'Desconectado',
        timestamp: new Date().toISOString()
      });
    } finally {
      setProxmoxLoading(false);
    }
  };

  const handleVMAction = async (vmId: string, action: 'start' | 'stop' | 'delete') => {
    setActionLoading(prev => ({ ...prev, [vmId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      if (action === 'delete') {
        const { error } = await supabase
          .from('vms')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', vmId);
        
        if (error) throw error;
        await fetchAdminData();
      } else {
        // Get VM's order ID for Proxmox operations
        const { data: vm } = await supabase
          .from('vms')
          .select('order_id')
          .eq('id', vmId)
          .single();
        
        if (!vm) throw new Error('VM no encontrada');

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vm-provisioner`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: vm.order_id,
            action,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error al ${action === 'start' ? 'iniciar' : 'detener'} el VM`);
        }

        await fetchAdminData();
      }
      
    } catch (error: any) {
      console.error(`Error ${action}ing VM:`, error);
      setError(`Error al ${action === 'start' ? 'iniciar' : action === 'stop' ? 'detener' : 'eliminar'} el VM: ${error.message}`);
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
      online: { variant: 'success' as const, text: 'En Línea' },
      offline: { variant: 'destructive' as const, text: 'Desconectado' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary' as const, text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'Detenido';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
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
        <p className="text-gray-600">Gestiona usuarios, VPS y recursos del servidor Proxmox</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

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

      {/* Proxmox Server Resources */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Recursos del Servidor Proxmox
            </CardTitle>
            <div className="flex items-center gap-3">
              {proxmoxStats ? getStatusBadge(proxmoxStats.connected ? 'online' : 'offline') : (
                <Badge variant="secondary">Cargando...</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProxmoxStats}
                disabled={proxmoxLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${proxmoxLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {proxmoxStats && proxmoxStats.connected ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <Cpu className="h-8 w-8 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-700">
                    {proxmoxStats.cpu_usage.toFixed(1)}%
                  </span>
                </div>
                <h4 className="font-semibold text-blue-900 mb-1">CPU Usage</h4>
                <p className="text-sm text-blue-600">{proxmoxStats.cpu_cores} cores</p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(proxmoxStats.cpu_usage, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <MemoryStick className="h-8 w-8 text-green-600" />
                  <span className="text-2xl font-bold text-green-700">
                    {proxmoxStats.memory_usage_percent.toFixed(1)}%
                  </span>
                </div>
                <h4 className="font-semibold text-green-900 mb-1">RAM</h4>
                <p className="text-sm text-green-600">
                  {proxmoxStats.memory_used.toFixed(1)}GB / {proxmoxStats.memory_total.toFixed(0)}GB
                </p>
                <div className="w-full bg-green-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(proxmoxStats.memory_usage_percent, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <HardDrive className="h-8 w-8 text-purple-600" />
                  <span className="text-2xl font-bold text-purple-700">
                    {proxmoxStats.disk_usage_percent.toFixed(1)}%
                  </span>
                </div>
                <h4 className="font-semibold text-purple-900 mb-1">Almacenamiento</h4>
                <p className="text-sm text-purple-600">
                  {proxmoxStats.disk_used.toFixed(0)}GB / {proxmoxStats.disk_total.toFixed(0)}GB
                </p>
                <div className="w-full bg-purple-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(proxmoxStats.disk_usage_percent, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <Activity className="h-8 w-8 text-orange-600" />
                  <span className="text-2xl font-bold text-orange-700">
                    {formatUptime(proxmoxStats.uptime)}
                  </span>
                </div>
                <h4 className="font-semibold text-orange-900 mb-1">Uptime</h4>
                <p className="text-sm text-orange-600">Nodo: {proxmoxStats.node_name}</p>
                <div className="flex items-center mt-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-orange-600">{proxmoxStats.active_vms}/{proxmoxStats.total_vms} VMs</span>
                </div>
              </div>
            </div>
          ) : null}
          
          {/* Show detailed storage information */}
          {proxmoxStats && proxmoxStats.connected && proxmoxStats.debug?.storage_details && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Almacenamientos ({proxmoxStats.debug.storage_details.length})
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {proxmoxStats.debug.storage_details.map((storage: any, index: number) => (
                  <div key={storage.name} className="bg-white p-4 rounded-lg shadow-sm border">
                    <h4 className="font-medium text-gray-900 mb-2">{storage.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">Tipo: {storage.type}</p>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Usado:</span>
                      <span>{storage.used_gb.toFixed(1)} GB</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total:</span>
                      <span>{storage.total_gb.toFixed(1)} GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(storage.usage_percent, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {storage.usage_percent.toFixed(1)}% usado
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {proxmoxStats && !proxmoxStats.connected ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No se pudo conectar al servidor Proxmox</h3>
              <p className="text-sm text-gray-600 mb-4">
                Verifica la configuración del servidor en las variables de entorno
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProxmoxStats}
                disabled={proxmoxLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${proxmoxLoading ? 'animate-spin' : ''}`} />
                Reintentar Conexión
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
            <Settings className="h-5 w-5 mr-2" />
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
              onClick={() => {
                fetchAdminData();
                fetchProxmoxStats();
              }}
              disabled={loading || proxmoxLoading}
              className="flex items-center justify-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading || proxmoxLoading ? 'animate-spin' : ''}`} />
              Actualizar Todo
            </Button>
            <Button
              variant="outline"
              onClick={() => alert('Función de backup en desarrollo')}
              className="flex items-center justify-center"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              Backup Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      {proxmoxStats && !proxmoxStats.connected && (
        <Card className="mt-4 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 text-lg">Debug de Conexión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-orange-700 space-y-1">
              <p><strong>Estado:</strong> No conectado al servidor Proxmox</p>
              <p><strong>URL:</strong> https://pve.triexpertservice.com:8006</p>
              <p><strong>Node:</strong> pve</p>
              <p><strong>Token:</strong> root@pam!server</p>
              <hr className="my-2" />
              <p className="text-red-600"><strong>Configurar en Supabase Dashboard:</strong></p>
              <p className="font-mono text-xs">Settings → Edge Functions → Environment Variables</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}