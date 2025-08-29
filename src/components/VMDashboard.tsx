import { useState, useEffect } from 'react';
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
  AlertTriangle
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
  const [vms, setVms] = useState<VM[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUserData();
    
    // Set up real-time subscription for VMs
    const vmSubscription = supabase
      .channel('user-vms')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'vms',
          filter: `user_id=eq.${supabase.auth.getUser().then(r => r.data.user?.id)}`
        },
        () => fetchUserData()
      )
      .subscribe();

    return () => {
      vmSubscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando tus VPS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* VMs Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Server className="h-6 w-6 text-blue-600 mr-2" />
          Mis VPS
        </h2>
        
        {vms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes VPS activos</h3>
              <p className="text-gray-600">Compra tu primer plan para comenzar</p>
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
                        variant="outline"
                        size="sm"
                        onClick={fetchUserData}
                        disabled={actionLoading[vm.id]}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
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

      {/* Recent Orders Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Órdenes Recientes</h2>
        
        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600">No tienes órdenes registradas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{order.vm_specs?.name}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${order.total_amount}</p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}