import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { 
  AlertTriangle, 
  Clock, 
  Play, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  Shield,
  Bell,
  Settings
} from 'lucide-react';

interface SuspendedVM {
  id: string;
  name: string;
  user_email: string;
  status: string;
  suspended_at: string;
  suspended_reason: string;
  cpu_cores: number;
  ram_gb: number;
  vm_spec_name: string;
  monthly_price: number;
  days_suspended: number;
  billing_grace_expires_at: string;
  subscription_status: string;
}

interface BillingConfig {
  grace_period_days: number;
  deletion_period_days: number;
  warning_days_before: number;
}

export function SuspensionManagement() {
  const [suspendedVMs, setSuspendedVMs] = useState<SuspendedVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [billingConfig, setBillingConfig] = useState<BillingConfig>({
    grace_period_days: 3,
    deletion_period_days: 30,
    warning_days_before: 1
  });

  useEffect(() => {
    fetchSuspendedVMs();
    fetchBillingConfig();
  }, []);

  const fetchSuspendedVMs = async () => {
    try {
      setError(null);
      
      // Get suspended VMs with user and subscription info
      const { data: vmsData, error: vmsError } = await supabase
        .from('vms')
        .select(`
          id,
          name,
          status,
          suspended_at,
          suspended_reason,
          cpu_cores,
          ram_gb,
          billing_grace_expires_at,
          user_id,
          vm_specs!inner (name, monthly_price)
        `)
        .eq('status', 'suspended')
        .is('deleted_at', null)
        .order('suspended_at', { ascending: false });

      if (vmsError) throw vmsError;

      // Get user emails for suspended VMs
      const vmWithUserInfo = await Promise.all(
        (vmsData || []).map(async (vm) => {
          // Get user info
          const { data: { user } } = await supabase.auth.admin.getUserById(vm.user_id);
          
          // Get subscription status
          const { data: subscription } = await supabase
            .from('stripe_subscriptions')
            .select('status')
            .eq('customer_id', vm.user_id)
            .single();

          const suspendedAt = new Date(vm.suspended_at);
          const daysSuspended = Math.floor((Date.now() - suspendedAt.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            ...vm,
            user_email: user?.email || 'Usuario desconocido',
            vm_spec_name: (vm.vm_specs as any)?.name || 'Sin especificar',
            monthly_price: (vm.vm_specs as any)?.monthly_price || 0,
            days_suspended: daysSuspended,
            subscription_status: subscription?.status || 'unknown'
          };
        })
      );

      setSuspendedVMs(vmWithUserInfo);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBillingConfig = async () => {
    try {
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['grace_period_days', 'deletion_period_days', 'warning_days_before']);

      if (settings) {
        const configObj = settings.reduce((acc, setting) => {
          acc[setting.setting_key as keyof BillingConfig] = parseInt(setting.setting_value);
          return acc;
        }, {} as any);

        setBillingConfig(prev => ({ ...prev, ...configObj }));
      }
    } catch (error) {
      console.error('Error fetching billing config:', error);
    }
  };

  const updateBillingConfig = async () => {
    try {
      setError(null);
      
      const updates = Object.entries(billingConfig).map(([key, value]) => ({
        setting_key: key,
        setting_value: value.toString(),
        description: getConfigDescription(key),
        setting_type: 'number'
      }));

      const { error } = await supabase
        .from('admin_settings')
        .upsert(updates, { onConflict: 'setting_key' });

      if (error) throw error;

      setSuccess('Configuración de facturación actualizada');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getConfigDescription = (key: string) => {
    const descriptions = {
      grace_period_days: 'Días de gracia antes de suspender VPS por falta de pago',
      deletion_period_days: 'Días antes de eliminar permanentemente VPS suspendidos',
      warning_days_before: 'Días antes del vencimiento para enviar advertencia'
    };
    return descriptions[key as keyof typeof descriptions] || '';
  };

  const handleReactivateVM = async (vmId: string) => {
    setActionLoading(prev => ({ ...prev, [vmId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      // Find VM order ID
      const vm = suspendedVMs.find(v => v.id === vmId);
      if (!vm) throw new Error('VM no encontrada');

      // Call billing manager to reactivate
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-manager`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: vm.user_id, // This should be stripe customer ID, might need adjustment
          action: 'payment_succeeded'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error reactivando VM');
      }

      setSuccess(`VM ${vm.name} reactivado correctamente`);
      await fetchSuspendedVMs();
      
    } catch (error: any) {
      setError(`Error reactivando VM: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [vmId]: false }));
    }
  };

  const handlePermanentDelete = async (vmId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar permanentemente este VPS? Esta acción no se puede deshacer.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [vmId]: true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const vm = suspendedVMs.find(v => v.id === vmId);
      if (!vm) throw new Error('VM no encontrada');

      // Get the order for this VM
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', vm.user_id)
        .single();

      if (!order) throw new Error('Orden no encontrada');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vm-provisioner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          action: 'delete'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error eliminando VM');
      }

      setSuccess(`VM ${vm.name} eliminado permanentemente`);
      await fetchSuspendedVMs();
      
    } catch (error: any) {
      setError(`Error eliminando VM: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [vmId]: false }));
    }
  };

  const runBillingCheck = async () => {
    setActionLoading(prev => ({ ...prev, 'billing-check': true }));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scheduled-billing-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error ejecutando chequeo de facturación');
      }

      const result = await response.json();
      setSuccess(`Chequeo completado: ${result.data?.suspensions || 0} suspensiones, ${result.data?.deletions || 0} eliminaciones`);
      await fetchSuspendedVMs();
      
    } catch (error: any) {
      setError(`Error en chequeo de facturación: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, 'billing-check': false }));
    }
  };

  const getStatusBadge = (vm: SuspendedVM) => {
    if (vm.days_suspended >= billingConfig.deletion_period_days) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Trash2 className="h-3 w-3" />
          Eliminación Pendiente
        </Badge>
      );
    } else if (vm.days_suspended >= billingConfig.grace_period_days) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Suspendido
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Período de Gracia
        </Badge>
      );
    }
  };

  const getSubscriptionBadge = (status: string) => {
    const config = {
      active: { variant: 'success' as const, text: 'Activa' },
      past_due: { variant: 'destructive' as const, text: 'Vencida' },
      canceled: { variant: 'secondary' as const, text: 'Cancelada' },
      trialing: { variant: 'warning' as const, text: 'Prueba' },
    };

    const statusConfig = config[status as keyof typeof config] || { variant: 'secondary' as const, text: status };
    return <Badge variant={statusConfig.variant}>{statusConfig.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando gestión de suspensiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Suspensiones</h2>
          <p className="text-gray-600">Administra VPS suspendidos por falta de pago</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setRefreshing(true);
              fetchSuspendedVMs();
            }}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            onClick={runBillingCheck}
            disabled={actionLoading['billing-check']}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Bell className="h-4 w-4 mr-2" />
            {actionLoading['billing-check'] ? 'Ejecutando...' : 'Ejecutar Chequeo'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Billing Configuration */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Configuración de Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Período de Gracia (días)</label>
              <Input
                type="number"
                value={billingConfig.grace_period_days}
                onChange={(e) => setBillingConfig(prev => ({ ...prev, grace_period_days: parseInt(e.target.value) || 3 }))}
                min="1"
                max="30"
              />
              <p className="text-xs text-blue-600 mt-1">Días antes de suspender por falta de pago</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Período hasta Eliminación (días)</label>
              <Input
                type="number"
                value={billingConfig.deletion_period_days}
                onChange={(e) => setBillingConfig(prev => ({ ...prev, deletion_period_days: parseInt(e.target.value) || 30 }))}
                min="7"
                max="365"
              />
              <p className="text-xs text-blue-600 mt-1">Días suspendido antes de eliminar permanentemente</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Advertencia Previa (días)</label>
              <Input
                type="number"
                value={billingConfig.warning_days_before}
                onChange={(e) => setBillingConfig(prev => ({ ...prev, warning_days_before: parseInt(e.target.value) || 1 }))}
                min="1"
                max="7"
              />
              <p className="text-xs text-blue-600 mt-1">Días antes de vencimiento para avisar</p>
            </div>
          </div>
          
          <Button onClick={updateBillingConfig} className="bg-blue-600 hover:bg-blue-700">
            <Settings className="h-4 w-4 mr-2" />
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">VPS Suspendidos</p>
                <p className="text-2xl font-bold text-orange-600">{suspendedVMs.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Período de Gracia</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {suspendedVMs.filter(vm => vm.days_suspended < billingConfig.grace_period_days).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes Eliminación</p>
                <p className="text-2xl font-bold text-red-600">
                  {suspendedVMs.filter(vm => vm.days_suspended >= billingConfig.deletion_period_days).length}
                </p>
              </div>
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Perdidos/mes</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${suspendedVMs.reduce((sum, vm) => sum + vm.monthly_price, 0).toFixed(0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suspended VMs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-red-600" />
            VPS Suspendidos ({suspendedVMs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suspendedVMs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay VPS suspendidos</h3>
              <p className="text-gray-600">Todos los VPS están activos y al día con los pagos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suspendedVMs.map((vm) => (
                <div key={vm.id} className="border border-red-200 bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{vm.name}</h3>
                        {getStatusBadge(vm)}
                      </div>
                      <p className="text-sm text-gray-600">{vm.user_email}</p>
                      <p className="text-xs text-blue-600">{vm.vm_spec_name} - ${vm.monthly_price}/mes</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        {getSubscriptionBadge(vm.subscription_status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {vm.cpu_cores} vCPU • {vm.ram_gb}GB RAM
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <label className="text-gray-600">Suspendido desde:</label>
                      <p className="font-medium">
                        {new Date(vm.suspended_at).toLocaleString('es-ES')} 
                        <span className="text-red-600 ml-2">({vm.days_suspended} días)</span>
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-gray-600">Razón:</label>
                      <p className="font-medium">{vm.suspended_reason || 'Falta de pago'}</p>
                    </div>
                    
                    {vm.billing_grace_expires_at && (
                      <div>
                        <label className="text-gray-600">Gracia expira:</label>
                        <p className="font-medium">
                          {new Date(vm.billing_grace_expires_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-gray-600">Eliminación en:</label>
                      <p className="font-medium text-red-600">
                        {Math.max(0, billingConfig.deletion_period_days - vm.days_suspended)} días
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-red-200">
                    <Button
                      size="sm"
                      onClick={() => handleReactivateVM(vm.id)}
                      disabled={actionLoading[vm.id]}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {actionLoading[vm.id] ? 'Reactivando...' : 'Reactivar VM'}
                    </Button>
                    
                    {vm.days_suspended >= billingConfig.deletion_period_days && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePermanentDelete(vm.id)}
                        disabled={actionLoading[vm.id]}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar Permanentemente
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Process Info */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Proceso Automatizado de Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-green-700">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">1. Pago Fallido</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Stripe webhook notifica fallo</li>
                  <li>• Se inicia período de gracia</li>
                  <li>• VPS continúa activo</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Suspensión</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Después de {billingConfig.grace_period_days} días</li>
                  <li>• VPS se detiene automáticamente</li>
                  <li>• Datos se preservan</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">3. Eliminación</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Después de {billingConfig.deletion_period_days} días suspendido</li>
                  <li>• Eliminación permanente</li>
                  <li>• Datos irrecuperables</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white border border-green-200 rounded p-3 mt-4">
              <p className="text-xs text-green-600">
                <strong>Automático:</strong> El sistema ejecuta chequeos programados cada 6 horas. 
                También puedes ejecutar manualmente el chequeo usando el botón "Ejecutar Chequeo".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}