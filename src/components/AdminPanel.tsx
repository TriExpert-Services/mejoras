import React, { useState, useEffect } from 'react';
import { AdminSidebar } from './admin/AdminSidebar';
import { IPPoolManagement } from './admin/IPPoolManagement';
import { TemplateManagement } from './admin/TemplateManagement';
import { UserManagement } from './admin/UserManagement';
import { PriceManagement } from './admin/PriceManagement';
import { LegalManagement } from './admin/LegalManagement';
import { TemplateSelector } from './TemplateSelector';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabase';
import { products } from '../stripe-config';
import { templates } from '../template-config';
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
  uptime_formatted?: string;
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
  order_id: string;
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
  const [currentSection, setCurrentSection] = useState('overview');
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proxmoxLoading, setProxmoxLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, number>>({});

  useEffect(() => {
    initialFetchData();
    
    const interval = setInterval(() => {
      if (currentSection === 'overview' || currentSection === 'monitoring') {
        silentFetchData();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [currentSection]);

  const initialFetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchAdminStats(),
        fetchProxmoxStats()
      ]);
    } catch (error: any) {
      console.error('Initial fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const silentFetchData = async () => {
    try {
      await Promise.all([
        fetchAdminStats(),
        fetchProxmoxStats()
      ]);
      setError(null);
    } catch (error: any) {
      console.error('Silent fetch error:', error);
    }
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAdminStats(),
        fetchProxmoxStats()
      ]);
      setError(null);
    } catch (error: any) {
      console.error('Manual refresh error:', error);
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAdminStats = async () => {
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
  };

  const fetchProxmoxStats = async () => {
    if (proxmoxStats === null) {
      setProxmoxLoading(true);
    }
    
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

      const vm = vms.find(v => v.id === vmId);
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
        throw new Error(errorData.error || `Error al ${action === 'start' ? 'iniciar' : action === 'stop' ? 'detener' : 'eliminar'} el VM`);
      }

      await fetchAdminStats();
      
    } catch (error: any) {
      console.error(`Error ${action}ing VM:`, error);
      setError(`Error al ${action === 'start' ? 'iniciar' : action === 'stop' ? 'detener' : 'eliminar'} el VM: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [vmId]: false }));
    }
  };
  
  const handleCreateVM = async (productId: string, templateId?: number) => {
    const actionKey = productId;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Producto no encontrado');
      
      const finalTemplateId = templateId || selectedTemplates[productId] || product.defaultTemplate || 101;
      
      const { data: vmSpec, error: specError } = await supabase
        .from('vm_specs')
        .select('id')
        .eq('name', product.name)
        .single();

      if (specError || !vmSpec) throw new Error('Especificación de VM no encontrada en la base de datos');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          stripe_session_id: `manual-admin-${Date.now()}-tpl${finalTemplateId}`,
          vm_spec_id: vmSpec.id,
          status: 'pending',
          total_amount: product.price,
          currency: 'usd',
        })
        .select()
        .single();

      if (orderError) throw new Error(`Error creando orden: ${orderError.message}`);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vm-provisioner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          action: 'provision',
          templateId: finalTemplateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creando VM');
      }

      const selectedTemplate = templates.find(t => t.id === finalTemplateId);
      alert(`VM con ${selectedTemplate?.name || 'plantilla seleccionada'} creado exitosamente! Revisa la lista de VPS.`);
      await fetchAdminStats();
      
    } catch (error: any) {
      console.error('Error creating VM:', error);
      setError(`Error creando VM: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
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
      suspended: { variant: 'destructive' as const, text: 'Suspendido' },
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
      <div className="flex h-screen bg-gray-900">
        <AdminSidebar currentSection={currentSection} onSectionChange={setCurrentSection} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-red-500 mx-auto mb-4" />
            <span className="text-gray-300">Cargando panel de administración...</span>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Panel General</h1>
              <p className="text-gray-300">Resumen general de la plataforma</p>
            </div>

            {error && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-red-200">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-red-600">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Usuarios Totales</p>
                      <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    </div>
                    <Users className="h-10 w-10 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600">
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

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-600">
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

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-600">
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

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Server className="h-5 w-5 mr-2 text-green-500" />
                  Crear VPS Rápido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => handleCreateVM('vps-basic-1', 101)}
                    disabled={actionLoading['vps-basic-1']}
                    className="bg-red-600 hover:bg-red-700 flex flex-col h-auto py-3"
                  >
                    <span className="font-medium">
                      {actionLoading['vps-basic-1'] ? 'Creando...' : 'VPS Básico'}
                    </span>
                    <span className="text-xs opacity-90">1 CPU • 2GB • Ubuntu</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleCreateVM('vps-standard-1', 101)}
                    disabled={actionLoading['vps-standard-1']}
                    className="bg-green-600 hover:bg-green-700 flex flex-col h-auto py-3"
                  >
                    <span className="font-medium">
                      {actionLoading['vps-standard-1'] ? 'Creando...' : 'VPS Standard'}
                    </span>
                    <span className="text-xs opacity-90">2 CPU • 4GB • Ubuntu</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleCreateVM('vps-premium-1', 107)}
                    disabled={actionLoading['vps-premium-1']}
                    className="bg-purple-600 hover:bg-purple-700 flex flex-col h-auto py-3"
                  >
                    <span className="font-medium">
                      {actionLoading['vps-premium-1'] ? 'Creando...' : 'VPS Premium'}
                    </span>
                    <span className="text-xs opacity-90">4 CPU • 8GB • AlmaLinux</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'monitoring':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Monitoreo del Servidor</h1>
              <p className="text-gray-300">Recursos en tiempo real del servidor Proxmox</p>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-white">
                    <Monitor className="h-5 w-5 mr-2" />
                    Recursos del Servidor Proxmox
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    {proxmoxStats ? getStatusBadge(proxmoxStats.connected ? 'online' : 'offline') : (
                      <Badge variant="secondary">Cargando...</Badge>
                    )}
                    {(loading || proxmoxLoading) && (
                      <div className="flex items-center text-xs text-red-400">
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        Actualizando...
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        setProxmoxLoading(true);
                        fetchProxmoxStats();
                      }}
                      disabled={proxmoxLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {proxmoxStats && proxmoxStats.connected ? (
                  <div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div className="bg-gradient-to-br from-red-900 to-red-800 p-6 rounded-xl border border-red-700">
                        <div className="flex items-center justify-between mb-3">
                          <Cpu className="h-8 w-8 text-red-400" />
                          <span className="text-2xl font-bold text-red-300">
                            {proxmoxStats.cpu_usage.toFixed(1)}%
                          </span>
                        </div>
                        <h4 className="font-semibold text-red-200 mb-1">CPU Usage</h4>
                        <p className="text-sm text-red-300">{proxmoxStats.cpu_cores} cores</p>
                        <div className="w-full bg-red-800 rounded-full h-2 mt-3">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(proxmoxStats.cpu_usage, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-900 to-green-800 p-6 rounded-xl border border-green-700">
                        <div className="flex items-center justify-between mb-3">
                          <MemoryStick className="h-8 w-8 text-green-400" />
                          <span className="text-2xl font-bold text-green-300">
                            {proxmoxStats.memory_usage_percent.toFixed(1)}%
                          </span>
                        </div>
                        <h4 className="font-semibold text-green-200 mb-1">RAM</h4>
                        <p className="text-sm text-green-300">
                          {proxmoxStats.memory_used.toFixed(1)}GB / {proxmoxStats.memory_total.toFixed(0)}GB
                        </p>
                        <div className="w-full bg-green-800 rounded-full h-2 mt-3">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(proxmoxStats.memory_usage_percent, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-xl border border-purple-700">
                        <div className="flex items-center justify-between mb-3">
                          <HardDrive className="h-8 w-8 text-purple-400" />
                          <span className="text-2xl font-bold text-purple-300">
                            {proxmoxStats.disk_usage_percent.toFixed(1)}%
                          </span>
                        </div>
                        <h4 className="font-semibold text-purple-200 mb-1">Almacenamiento</h4>
                        <p className="text-sm text-purple-300">
                          {proxmoxStats.disk_used.toFixed(0)}GB / {proxmoxStats.disk_total.toFixed(0)}GB
                        </p>
                        <div className="w-full bg-purple-800 rounded-full h-2 mt-3">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(proxmoxStats.disk_usage_percent, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-900 to-orange-800 p-6 rounded-xl border border-orange-700">
                        <div className="flex items-center justify-between mb-3">
                          <Activity className="h-8 w-8 text-orange-400" />
                          <div className="text-right">
                            <span className="text-lg font-bold text-orange-300">
                              {proxmoxStats.uptime_formatted || formatUptime(proxmoxStats.uptime)}
                            </span>
                            <p className="text-xs text-orange-400">{proxmoxStats.active_vms}/{proxmoxStats.total_vms} VMs</p>
                          </div>
                        </div>
                        <h4 className="font-semibold text-orange-200 text-sm mb-1">Red & Tiempo</h4>
                        <div className="text-xs text-orange-300 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Nodo:</span>
                            <span className="font-medium">{proxmoxStats.node_name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>PVE Ver:</span>
                            <span className="font-medium">{proxmoxStats.pve_version || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center mt-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-xs text-orange-300">En Línea</span>
                        </div>
                      </div>
                    </div>

                    {proxmoxStats.debug?.storage_details && (
                      <div className="mt-8">
                        <h3 className="text-xl font-semibold text-white mb-4">
                          Almacenamientos ({proxmoxStats.debug.storage_details.length})
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          {proxmoxStats.debug.storage_details.map((storage: any, index: number) => (
                            <div key={storage.name} className="bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-600">
                              <h4 className="font-medium text-white mb-2">{storage.name}</h4>
                              <p className="text-sm text-gray-300 mb-2">Tipo: {storage.type}</p>
                              <div className="flex justify-between text-sm mb-2 text-gray-300">
                                <span>Usado:</span>
                                <span>{storage.used_gb.toFixed(1)} GB</span>
                              </div>
                              <div className="flex justify-between text-sm mb-2 text-gray-300">
                                <span>Total:</span>
                                <span>{storage.total_gb.toFixed(1)} GB</span>
                              </div>
                              <div className="w-full bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-red-500 h-2 rounded-full" 
                                  style={{ width: `${Math.min(storage.usage_percent, 100)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {storage.usage_percent.toFixed(1)}% usado
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="font-medium text-white mb-2">No se pudo conectar al servidor Proxmox</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      Verifica la configuración del servidor en las variables de entorno
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchProxmoxStats}
                      disabled={proxmoxLoading}
                      className="border-red-600 text-red-400 hover:bg-red-900"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${proxmoxLoading ? 'animate-spin' : ''}`} />
                      Reintentar Conexión
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'users':
        return <UserManagement />;

      case 'vms':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Gestión de VPS</h1>
              <p className="text-gray-300">Administra todos los servidores virtuales</p>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Server className="h-5 w-5 mr-2 text-green-500" />
                  Crear VPS Manualmente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-300 mb-4">
                    Crear un VPS directamente sin pasar por Stripe (para testing)
                  </p>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-white">Creación Rápida</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={() => handleCreateVM('vps-basic-1', 101)}
                        disabled={actionLoading['vps-basic-1']}
                        className="bg-red-600 hover:bg-red-700 flex flex-col h-auto py-3"
                      >
                        <span className="font-medium">
                          {actionLoading['vps-basic-1'] ? 'Creando...' : 'VPS Básico'}
                        </span>
                        <span className="text-xs opacity-90">1 CPU • 2GB • Ubuntu 24.04</span>
                      </Button>
                      
                      <Button
                        onClick={() => handleCreateVM('vps-premium-1', 107)}
                        disabled={actionLoading['vps-premium-1']}
                        className="bg-purple-600 hover:bg-purple-700 flex flex-col h-auto py-3"
                      >
                        <span className="font-medium">
                          {actionLoading['vps-premium-1'] ? 'Creando...' : 'VPS Premium'}
                        </span>
                        <span className="text-xs opacity-90">4 CPU • 8GB • AlmaLinux</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-600 pt-6">
                    <h4 className="font-medium text-white mb-4">Crear con Sistema Operativo Personalizado</h4>
                    
                    <div className="space-y-4">
                      <TemplateSelector
                        allowedTemplateIds={[101, 102, 103, 104, 105, 107, 108]}
                        selectedTemplateId={selectedTemplates['custom'] || 101}
                        onTemplateChange={(templateId) => 
                          setSelectedTemplates(prev => ({ ...prev, custom: templateId }))
                        }
                      />
                      
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          onClick={() => handleCreateVM('vps-basic-1', selectedTemplates['custom'] || 101)}
                          disabled={actionLoading['vps-basic-1']}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-900"
                        >
                          {actionLoading['vps-basic-1'] ? 'Creando...' : 'Básico'}
                        </Button>
                        
                        <Button
                          onClick={() => handleCreateVM('vps-premium-1', selectedTemplates['custom'] || 101)}
                          disabled={actionLoading['vps-premium-1']}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-900"
                        >
                          {actionLoading['vps-premium-1'] ? 'Creando...' : 'Premium'}
                        </Button>
                        
                        <Button
                          onClick={() => handleCreateVM('vps-enterprise-1', selectedTemplates['custom'] || 101)}
                          disabled={actionLoading['vps-enterprise-1']}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-900"
                        >
                          {actionLoading['vps-enterprise-1'] ? 'Creando...' : 'Enterprise'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
                    <p className="text-xs text-yellow-200">
                      <strong>Nuevo:</strong> Ahora usa contenedores LXC (mucho más rápido). Creación en ~30 segundos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-white">
                    <Server className="h-5 w-5 mr-2" />
                    VPS Activos
                  </CardTitle>
                  <Button
                    onClick={() => {
                      manualRefresh();
                    }}
                    disabled={refreshing}
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-400 hover:bg-red-900"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vms.length === 0 ? (
                    <div className="text-center py-8">
                      <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No hay VPS creados</p>
                    </div>
                  ) : (
                    vms.map((vm) => (
                      <div key={vm.id} className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-white">{vm.name}</h4>
                            <p className="text-sm text-gray-300">{vm.user_email}</p>
                            <p className="text-xs text-red-400">{vm.vm_spec_name}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(vm.status)}
                            {vm.status === 'suspended' && (
                              <p className="text-xs text-red-600 mt-1">
                                Suspendido por pago
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-300">
                          <span>{vm.cpu_cores} vCPU • {vm.ram_gb}GB RAM</span>
                          <div className="flex gap-2">
                            {vm.status === 'stopped' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVMAction(vm.id, 'start')}
                                disabled={actionLoading[vm.id]}
                                title="Iniciar VM"
                                className="text-green-400 hover:text-green-300 hover:bg-gray-600"
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
                                className="text-orange-400 hover:text-orange-300 hover:bg-gray-600"
                              >
                                <Square className="h-3 w-3" />
                              </Button>
                            )}
                            {vm.status === 'suspended' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                title="VM suspendido por falta de pago"
                                className="text-red-500"
                              >
                                <Monitor className="h-3 w-3" />
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
                              className="text-red-400 hover:text-red-300 hover:bg-gray-600"
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
          </div>
        );

      case 'ip-pools':
        return <IPPoolManagement />;

      case 'templates':
        return <TemplateManagement />;

      case 'pricing':
        return <PriceManagement />;

      case 'legal':
        return <LegalManagement />;

      case 'orders':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Órdenes y Pagos</h1>
              <p className="text-gray-300">Historial completo de transacciones</p>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Órdenes Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No hay órdenes registradas</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div key={order.id} className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-white">${order.total_amount}</h4>
                            <p className="text-sm text-gray-300">{order.user_email}</p>
                            <p className="text-xs text-red-400">{order.vm_spec_name}</p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleString('es-ES')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Configuración del Sistema</h1>
              <p className="text-gray-300">Ajustes generales de la plataforma</p>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-400">
                  <Settings className="h-5 w-5 mr-2" />
                  Controles del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => alert('Función de mantenimiento en desarrollo')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Modo Mantenimiento
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      manualRefresh();
                    }}
                    disabled={refreshing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualizar Todo
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => alert('Función de backup en desarrollo')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    Backup Sistema
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-700 bg-green-900">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Test de Flujo Stripe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-green-300">
                    Para probar el flujo completo de Stripe → Webhook → Creación VM automática
                  </p>
                  
                  <Button
                    onClick={() => window.open('/plans', '_blank')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    🧪 Ir a Planes VPS (Test Stripe)
                  </Button>
                  
                  <div className="bg-gray-800 border border-green-700 rounded p-3 text-xs text-green-300">
                    <strong>Flujo de Testing:</strong><br />
                    1. Ir a Planes VPS<br />
                    2. Comprar cualquier plan con Stripe (modo test)<br />
                    3. Webhook debería crear VM automáticamente<br />
                    4. VM aparecerá en este panel admin
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">Sección en desarrollo</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <AdminSidebar currentSection={currentSection} onSectionChange={setCurrentSection} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export { AdminPanel }