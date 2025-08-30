import React, { useState, useEffect } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { 
  CreditCard, 
  Calendar, 
  DollarSign,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  FileText
} from 'lucide-react';

interface Subscription {
  customer_id: string;
  subscription_id: string;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  payment_method_brand: string;
  payment_method_last4: string;
}

interface Order {
  customer_id: string;
  order_id: number;
  checkout_session_id: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

export function UserBilling() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { products } = useProducts();

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Get subscription data
      const { data: subData, error: subError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      } else {
        setSubscription(subData);
      }

      // Get orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from('stripe_user_orders')
        .select('*')
        .order('order_date', { ascending: false })
        .limit(10);

      if (ordersError && ordersError.code !== 'PGRST116') {
        console.error('Error fetching orders:', ordersError);
      } else {
        setOrders(ordersData || []);
      }

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (priceId: string | null) => {
    if (!priceId) {
      return 'Plan Desconocido';
    }
    const product = products.find(p => p.priceId === priceId);
    return product?.name || `Plan ${priceId.substring(0, 10)}...`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'success' as const, icon: CheckCircle, text: 'Activa' },
      trialing: { variant: 'warning' as const, icon: Clock, text: 'Período de Prueba' },
      past_due: { variant: 'destructive' as const, icon: AlertCircle, text: 'Pago Vencido' },
      canceled: { variant: 'secondary' as const, icon: AlertCircle, text: 'Cancelada' },
      incomplete: { variant: 'warning' as const, icon: Clock, text: 'Incompleta' },
      not_started: { variant: 'secondary' as const, icon: Clock, text: 'Sin Suscripción' },
      paid: { variant: 'success' as const, icon: CheckCircle, text: 'Pagado' },
      pending: { variant: 'warning' as const, icon: Clock, text: 'Pendiente' },
      completed: { variant: 'success' as const, icon: CheckCircle, text: 'Completado' },
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

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando información de facturación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Facturación y Suscripciones</h1>
        <p className="text-gray-600">Gestiona tus pagos y suscripciones activas</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
            Suscripción Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{getProductName(subscription.price_id)}</h3>
                  <p className="text-sm text-gray-600">ID: {subscription.price_id}</p>
                </div>
                {getStatusBadge(subscription.subscription_status)}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Período Actual</label>
                  <p className="text-sm">
                    {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                  </p>
                </div>
                
                {subscription.payment_method_brand && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Método de Pago</label>
                    <p className="text-sm">
                      {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
                    </p>
                  </div>
                )}
              </div>
              
              {subscription.cancel_at_period_end && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-700 text-sm">
                    Tu suscripción se cancelará al final del período actual ({formatDate(subscription.current_period_end)})
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin Suscripción Activa</h3>
              <p className="text-gray-600 mb-4">Contrata un plan para comenzar a usar VPS</p>
              <Button onClick={() => window.location.href = '/plans'}>
                Ver Planes Disponibles
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Historial de Órdenes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No tienes órdenes registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.order_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {formatCurrency(order.amount_total, order.currency)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {formatDate(order.order_date)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Sesión: {order.checkout_session_id.substring(0, 20)}...
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.order_status)}
                    <p className="text-xs text-gray-500 mt-1">
                      {order.payment_status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}