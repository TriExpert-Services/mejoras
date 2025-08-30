import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { 
  Network, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  AlertCircle,
  CheckCircle,
  Globe
} from 'lucide-react';

interface IPPool {
  id: string;
  name: string;
  description: string;
  cidr_range: string;
  gateway: string;
  start_ip: string;
  end_ip: string;
  vlan_id: number;
  bridge_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function IPPoolManagement() {
  const [ipPools, setIpPools] = useState<IPPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPool, setEditingPool] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPool, setNewPool] = useState({
    name: '',
    description: '',
    cidr_range: '',
    gateway: '',
    start_ip: '',
    end_ip: '',
    vlan_id: 200,
    bridge_name: 'vmbr0'
  });

  useEffect(() => {
    fetchIPPools();
  }, []);

  const fetchIPPools = async () => {
    try {
      const { data, error } = await supabase
        .from('ip_pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIpPools(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    try {
      setError(null);
      
      // Validate inputs
      if (!newPool.name || !newPool.cidr_range || !newPool.gateway || !newPool.start_ip || !newPool.end_ip) {
        throw new Error('Todos los campos son obligatorios');
      }

      const { data, error } = await supabase
        .from('ip_pools')
        .insert([{
          ...newPool,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      setIpPools(prev => [data, ...prev]);
      setShowCreateForm(false);
      setNewPool({
        name: '',
        description: '',
        cidr_range: '',
        gateway: '',
        start_ip: '',
        end_ip: '',
        vlan_id: 200,
        bridge_name: 'vmbr0'
      });

    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleToggleActive = async (poolId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ip_pools')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', poolId);

      if (error) throw error;

      setIpPools(prev => prev.map(pool => 
        pool.id === poolId ? { ...pool, is_active: !isActive } : pool
      ));
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este grupo de IPs?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ip_pools')
        .delete()
        .eq('id', poolId);

      if (error) throw error;

      setIpPools(prev => prev.filter(pool => pool.id !== poolId));
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando grupos de IP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Grupos IP</h2>
          <p className="text-gray-600">Administra rangos de IP y configuración de red</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Grupo IP
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-800">Crear Nuevo Grupo IP</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre del Grupo</label>
                <Input
                  value={newPool.name}
                  onChange={(e) => setNewPool(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ej: Producción Principal"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Descripción</label>
                <Input
                  value={newPool.description}
                  onChange={(e) => setNewPool(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="ej: Rango principal para VPS de producción"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Rango CIDR</label>
                <Input
                  value={newPool.cidr_range}
                  onChange={(e) => setNewPool(prev => ({ ...prev, cidr_range: e.target.value }))}
                  placeholder="ej: 10.0.0.0/24"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Gateway</label>
                <Input
                  value={newPool.gateway}
                  onChange={(e) => setNewPool(prev => ({ ...prev, gateway: e.target.value }))}
                  placeholder="ej: 10.0.0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">IP Inicial</label>
                <Input
                  value={newPool.start_ip}
                  onChange={(e) => setNewPool(prev => ({ ...prev, start_ip: e.target.value }))}
                  placeholder="ej: 10.0.0.100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">IP Final</label>
                <Input
                  value={newPool.end_ip}
                  onChange={(e) => setNewPool(prev => ({ ...prev, end_ip: e.target.value }))}
                  placeholder="ej: 10.0.0.254"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">VLAN ID</label>
                <Input
                  type="number"
                  value={newPool.vlan_id}
                  onChange={(e) => setNewPool(prev => ({ ...prev, vlan_id: parseInt(e.target.value) }))}
                  placeholder="200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Bridge</label>
                <Input
                  value={newPool.bridge_name}
                  onChange={(e) => setNewPool(prev => ({ ...prev, bridge_name: e.target.value }))}
                  placeholder="vmbr0"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button onClick={handleCreatePool} className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                Crear Grupo IP
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* IP Pools List */}
      <div className="grid gap-6">
        {ipPools.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay grupos IP configurados</h3>
              <p className="text-gray-600 mb-4">Crea tu primer grupo IP para comenzar</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Grupo
              </Button>
            </CardContent>
          </Card>
        ) : (
          ipPools.map((pool) => (
            <Card key={pool.id} className={pool.is_active ? 'border-green-200' : 'border-gray-200'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Network className="h-5 w-5 mr-2 text-blue-600" />
                      {pool.name}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">{pool.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pool.is_active ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Rango CIDR</label>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">{pool.cidr_range}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Gateway</label>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">{pool.gateway}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Rango IPs</label>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                      {pool.start_ip} - {pool.end_ip}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">VLAN/Bridge</label>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                      {pool.bridge_name}.{pool.vlan_id}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(pool.id, pool.is_active)}
                  >
                    {pool.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPool(pool.id)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePool(pool.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}