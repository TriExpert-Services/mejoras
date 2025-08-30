import { useState, useEffect } from 'react';
import { UserSidebar } from '../user/UserSidebar';
import { UserBilling } from '../user/UserBilling';
import { UserSettings } from '../user/UserSettings';
import { UserSupport } from '../user/UserSupport';
import { VMMetrics } from '../VMMetrics';
import { VNCViewer } from '../VNCViewer';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabase';
import { 
  Server, 
  Play, 
  Square, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Copy,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  CreditCard
} from 'lucide-react';

interface VM {
  id: string;
  name: string;
  status: string;
  cpu_cores: number;
  ram_gb: number;
  disk_gb: number;
  ip_address: string;
  ssh_port: number;
  root_password: string;
  created_at: string;
  provisioned_at: string;
  vm_specs: {
    name: string;
    monthly_price: number;
  };
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  completed_at: string;
  vm_specs: {
    name: string;
  };
}

export function VMDashboard() {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [vms, setVms] = useState<VM[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [vncViewer, setVncViewer] = useState<{ vmId: string; vmName: string } | null>(null);

  useEffect(() => {
    const setupComponent = async () => {
      // Initial data fetch
      await fetchUserData();
      
      // Get user for real-time subscription
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Set up real-time subscription for VMs
      const vmSubscription = supabase
        .channel('user-vms')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'vms',
            filter: `user_id=eq.${user.id}`
          },
          () => fetchUserDataSilent()
        )
        .subscribe();
      
      // Auto-refresh VM data every 15 seconds
      const dataRefreshInterval = setInterval(fetchUserDataSilent, 15000);
      
      return () => {
        clearInterval(dataRefreshInterval);
        vmSubscription.unsubscribe();
      };
    };
    
    setupComponent();
  }, []);

  const fetchUserDataSilent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's VMs
      const { data: vmsData, error: vmsError } = await supabase
        .from('vms')
        .select(`
          *,
          vm_specs (name, monthly_price)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (vmsError) {
        console.error('Error fetching VMs:', vmsError);
      } else {
        setVms(vmsData || []);
      }

      // Fetch user's orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          vm_specs (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else {
        setOrders(ordersData || []);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchUserData = async () => {
    setRefreshing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's VMs
      const { data: vmsData, error: vmsError } = await supabase
        .from('vms')
        .select(`
          *,
          vm_specs (name, monthly_price)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (vmsError) {
        console.error('Error fetching VMs:', vmsError);
      } else {
        setVms(vmsData || []);
      }

      // Fetch user's orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          vm_specs (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else {
        setOrders(ordersData || []);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleVMAction = async (vmId: string, action: 'start' | 'stop') => {
    setActionLoading(prev => ({ ...prev, [vmId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      // Find the order for this VM to get the order ID
      const vm = vms.find(v => v.id === vmId);
      if (!vm) throw new Error('VM no encontrada');

      const order = orders.find(o => o.id === vm.id); // This might need adjustment based on your data structure
      if (!order) throw new Error('Orden no encontrada');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vm-provisioner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          action,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error al ${action === 'start' ? 'iniciar' : 'detener'} el VM`);
      }

      // Refresh data
      await fetchUserData();

    } catch (error) {
      console.error(`Error ${action}ing VM:`, error);
      alert(error instanceof Error ? error.message : `Error al ${action === 'start' ? 'iniciar' : 'detener'} el VM`);
    } finally {
      setActionLoading(prev => ({ ...prev, [vmId]: false }));
    }
  };

  const togglePasswordVisibility = (vmId: string) => {
    setShowPasswords(prev => ({ ...prev, [vmId]: !prev[vmId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      running: { variant: 'success' as const, icon: CheckCircle, text: 'Activo' },
      stopped: { variant: 'secondary' as const, icon: Square, text: 'Detenido' },
      creating: { variant: 'warning' as const, icon: Clock, text: 'Creando' },
      pending: { variant: 'warning' as const, icon: Clock, text: 'Pendiente' },
      error: { variant: 'destructive' as const, icon: AlertTriangle, text: 'Error' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard de VPS</h1>
              <p className="text-gray-600">Vista general de tus servidores virtuales</p>
            </div>

            {/* VPS Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">VPS Activos</p>
                      <p className="text-3xl font-bold">{vms.filter(vm => vm.status === 'running').length}</p>
                    </div>
                    <Server className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Total VPS</p>
                      <p className="text-3xl font-bold">{vms.length}</p>
                    </div>
                    <Activity className="h-10 w-10 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">vCPUs Total</p>
                      <p className="text-3xl font-bold">{vms.reduce((sum, vm) => sum + vm.cpu_cores, 0)}</p>
                    </div>
                    <Cpu className="h-10 w-10 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">RAM Total</p>
                      <p className="text-3xl font-bold">{vms.reduce((sum, vm) => sum + vm.ram_gb, 0)} GB</p>
                    </div>
                    <MemoryStick className="h-10 w-10 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent VMs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Server className="h-5 w-5 mr-2 text-blue-600" />
                    VPS Recientes
                  </CardTitle>
                  <Button
                    onClick={fetchUserData}
                    disabled={refreshing}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {vms.length === 0 ? (
                  <div className="text-center py-12">
                    <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes VPS activos</h3>
                    <p className="text-gray-600 mb-4">Compra tu primer plan para comenzar</p>
                    <Button onClick={() => window.location.href = '/plans'}>
                      Ver Planes Disponibles
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vms.slice(0, 3).map((vm) => (
                      <div key={vm.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{vm.vm_specs?.name}</h4>
                          <p className="text-sm text-gray-600">{vm.name}</p>
                          <p className="text-xs text-blue-600">
                            {vm.cpu_cores} vCPU • {vm.ram_gb}GB RAM • {vm.disk_gb}GB SSD
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(vm.status)}
                          <p className="text-xs text-gray-500 mt-1">
                            ${vm.vm_specs?.monthly_price}/mes
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {vms.length > 3 && (
                      <Button
                        variant="ghost"
                        onClick={() => setCurrentSection('servers')}
                        className="w-full"
                      >
                        Ver todos los VPS ({vms.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'servers':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis Servidores</h1>
              <p className="text-gray-600">Gestiona todos tus VPS y su configuración</p>
            </div>

            {vms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes VPS activos</h3>
                  <p className="text-gray-600 mb-4">Compra tu primer plan para comenzar</p>
                  <Button onClick={() => window.location.href = '/plans'}>
                    Ver Planes Disponibles
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {vms.map((vm) => (
                  <Card key={vm.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl">{vm.vm_specs?.name}</CardTitle>
                          <p className="text-gray-600">{vm.name}</p>
                          <p className="text-xs text-gray-500">
                            Actualización automática cada 15s
                          </p>
                        </div>
                        {getStatusBadge(vm.status)}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-3">Especificaciones</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">CPU:</span>
                              <span>{vm.cpu_cores} vCPU{vm.cpu_cores > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">RAM:</span>
                              <span>{vm.ram_gb} GB</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Disco:</span>
                              <span>{vm.disk_gb} GB SSD</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Precio:</span>
                              <span>${vm.vm_specs?.monthly_price}/mes</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-3">Acceso</h4>
                          <div className="space-y-3 text-sm">
                            <div>
                              <label className="text-gray-600">IP Address:</label>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {vm.ip_address || 'Asignando...'}
                                </code>
                                {vm.ip_address && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(vm.ip_address)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-gray-600">Usuario:</label>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">root</code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard('root')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-gray-600">Contraseña:</label>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {showPasswords[vm.id] ? vm.root_password : '••••••••'}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePasswordVisibility(vm.id)}
                                >
                                  {showPasswords[vm.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                {showPasswords[vm.id] && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(vm.root_password)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {vm.status === 'running' && (
                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVMAction(vm.id, 'stop')}
                            disabled={actionLoading[vm.id]}
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Detener
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setVncViewer({ vmId: vm.id, vmName: vm.name })}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Consola VNC
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentSection('metrics')}
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            Ver Métricas
                          </Button>
                        </div>
                      )}
                      
                      {vm.status === 'stopped' && (
                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVMAction(vm.id, 'start')}
                            disabled={actionLoading[vm.id]}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Iniciar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'metrics':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Métricas de Rendimiento</h1>
              <p className="text-gray-600">Monitoreo en tiempo real de tus VPS</p>
            </div>

            {vms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay VPS para monitorear</h3>
                  <p className="text-gray-600">Las métricas aparecerán cuando tengas VPS activos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {vms.map((vm) => (
                  <div key={vm.id}>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Métricas para {vm.name} ({vm.vm_specs?.name})
                    </h3>
                    <VMMetrics vmId={vm.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'monitoring':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Monitoreo Avanzado</h1>
              <p className="text-gray-600">Estadísticas detalladas y histórico de rendimiento</p>
            </div>

            <Card>
              <CardContent className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Monitoreo Avanzado</h3>
                <p className="text-gray-600">Próximamente: gráficos históricos y alertas personalizadas</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'billing':
        return <UserBilling />;

      case 'security':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración de Seguridad</h1>
              <p className="text-gray-600">Administra el acceso y seguridad de tus VPS</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2 text-red-600" />
                  Acceso SSH
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Llaves SSH</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Configura llaves SSH para acceso sin contraseña (próximamente)
                    </p>
                    <Button variant="outline" size="sm" disabled>
                      Gestionar Llaves SSH
                    </Button>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Firewall</h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Configuración de firewall y reglas de red (próximamente)
                    </p>
                    <Button variant="outline" size="sm" disabled>
                      Configurar Firewall
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'settings':
        return <UserSettings />;

      case 'support':
        return <UserSupport />;

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Sección en desarrollo</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <UserSidebar currentSection={currentSection} onSectionChange={setCurrentSection} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <span className="text-gray-600">Cargando dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <UserSidebar currentSection={currentSection} onSectionChange={setCurrentSection} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {renderContent()}
        </div>
      </div>
      
      {/* VNC Viewer Modal */}
      {vncViewer && (
        <VNCViewer
          vmId={vncViewer.vmId}
          vmName={vncViewer.vmName}
          onClose={() => setVncViewer(null)}
        />
      )}
    </div>
  );
}