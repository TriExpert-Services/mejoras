import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { products } from '../../stripe-config';
import { 
  DollarSign, 
  Edit, 
  Save, 
  X,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Package,
  RefreshCw,
  ExternalLink,
  Copy
} from 'lucide-react';

interface StripePrice {
  id: string;
  product_id: string;
  amount: number;
  currency: string;
  mode: 'payment' | 'subscription';
  active: boolean;
}

interface VMSpec {
  id: string;
  price_id: string;
  name: string;
  cpu_cores: number;
  ram_gb: number;
  disk_gb: number;
  bandwidth_gb: number;
  monthly_price: number;
  created_at: string;
  updated_at: string;
}

export function PriceManagement() {
  const [vmSpecs, setVmSpecs] = useState<VMSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSpec, setEditingSpec] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VMSpec>>({});

  useEffect(() => {
    fetchVMSpecs();
  }, []);

  const fetchVMSpecs = async () => {
    try {
      console.log('Fetching VM specs...');
      setError(null);
      
      const { data, error } = await supabase
        .from('vm_specs')
        .select('*')
        .order('monthly_price', { ascending: true });

      if (error) {
        console.error('Fetch VM specs error:', error);
        throw error;
      }
      
      console.log('VM specs fetched:', data);
      setVmSpecs(data || []);
    } catch (error: any) {
      console.error('fetchVMSpecs error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (spec: VMSpec) => {
    setEditingSpec(spec.id);
    setEditForm(spec);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingSpec(null);
    setEditForm({});
    setError(null);
    setSuccess(null);
  };

  const saveChanges = async () => {
    try {
      if (!editingSpec || !editForm.price_id || !editForm.monthly_price) {
        throw new Error('Precio ID y precio mensual son obligatorios');
      }

      const { error } = await supabase
        .from('vm_specs')
        .update({
          price_id: editForm.price_id,
          monthly_price: editForm.monthly_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSpec);

      if (error) throw error;

      setVmSpecs(prev => prev.map(spec => 
        spec.id === editingSpec 
          ? { ...spec, price_id: editForm.price_id!, monthly_price: editForm.monthly_price! }
          : spec
      ));

      setSuccess('Precios actualizados correctamente');
      setEditingSpec(null);
      setEditForm({});
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getCurrentProductConfig = (spec: VMSpec) => {
    return products.find(p => p.priceId === spec.price_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración de precios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Precios</h2>
          <p className="text-gray-600">Administra precios de VPS y configuración de Stripe</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchVMSpecs}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button
            onClick={() => window.open('https://dashboard.stripe.com/products', '_blank')}
            variant="outline"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Stripe Dashboard
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

      {/* Configuration Guide */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Configuración de Stripe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-700">
            <p><strong>Para actualizar precios:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Ve al <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener" className="underline">Dashboard de Stripe</a></li>
              <li>Crea o modifica el producto y su precio</li>
              <li>Copia el nuevo Price ID (price_xxxxx)</li>
              <li>Actualiza el Price ID aquí usando el botón "Editar"</li>
              <li>Los cambios se reflejarán inmediatamente en la plataforma</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* VM Specs with Pricing */}
      <div className="grid gap-6">
        {vmSpecs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay especificaciones de VPS</h3>
              <p className="text-gray-600">Las especificaciones aparecerán cuando se sincronicen con Stripe</p>
            </CardContent>
          </Card>
        ) : (
          vmSpecs.map((spec) => {
            const productConfig = getCurrentProductConfig(spec);
            const isEditing = editingSpec === spec.id;
            
            return (
              <Card key={spec.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{spec.name}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {spec.cpu_cores} vCPU • {spec.ram_gb}GB RAM • {spec.disk_gb}GB SSD • {spec.bandwidth_gb}TB Bandwidth
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ${spec.monthly_price.toFixed(2)}/mes
                      </div>
                      {productConfig ? (
                        <Badge variant="success" className="mt-1">
                          Configurado en Frontend
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="mt-1">
                          No configurado en Frontend
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Stripe Price ID</label>
                          <Input
                            value={editForm.price_id || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, price_id: e.target.value }))}
                            placeholder="price_xxxxxxxxxx"
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Obtén este ID desde el Dashboard de Stripe
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">Precio Mensual (USD)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.monthly_price || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, monthly_price: parseFloat(e.target.value) || 0 }))}
                            placeholder="19.99"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button onClick={saveChanges} className="bg-green-600 hover:bg-green-700">
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Cambios
                        </Button>
                        <Button variant="outline" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Stripe Price ID</label>
                          <div className="flex items-center gap-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                              {spec.price_id}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(spec.price_id)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-600">Estado en Frontend</label>
                          <div className="mt-1">
                            {productConfig ? (
                              <div className="text-sm">
                                <p className="text-green-700">✓ Configurado como: {productConfig.name}</p>
                                <p className="text-xs text-gray-500">Precio frontend: ${productConfig.price}</p>
                              </div>
                            ) : (
                              <p className="text-orange-700 text-sm">⚠ No encontrado en stripe-config.ts</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(spec)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar Precios
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://dashboard.stripe.com/products/${spec.price_id}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver en Stripe
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Sync Warning */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
            <div className="text-sm text-green-700">
              <p className="font-medium mb-1">✅ Sincronización Automática</p>
              <p>
                Los precios se actualizan automáticamente en el frontend cuando los modificas aquí. 
                Ya no necesitas editar manualmente 
                <code className="bg-green-100 px-1 rounded mx-1">src/stripe-config.ts</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { PriceManagement }