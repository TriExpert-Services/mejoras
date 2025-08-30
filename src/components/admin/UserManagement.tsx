import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Search, 
  Mail, 
  Calendar, 
  Server,
  DollarSign,
  Eye,
  Ban,
  UserCheck,
  RefreshCw
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  email_confirmed_at: string;
  vm_count: number;
  total_spent: number;
  subscription_status: string;
  is_admin: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setError(null);
      
      // Get users from auth.users (admin only)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      // Call admin function to get user data
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar usuarios');
      }

      const data = await response.json();
      setUsers(data.users || []);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'success' as const, text: 'Activo' },
      trialing: { variant: 'warning' as const, text: 'Prueba' },
      past_due: { variant: 'destructive' as const, text: 'Vencido' },
      canceled: { variant: 'secondary' as const, text: 'Cancelado' },
      not_started: { variant: 'secondary' as const, text: 'Sin Plan' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-gray-600">Administra usuarios y sus suscripciones</p>
        </div>
        <Button
          onClick={fetchUsers}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
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

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar usuarios por email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Los usuarios aparecerán aquí cuando se registren'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{user.email}</h3>
                        {user.is_admin && (
                          <Badge variant="warning" className="text-xs">Admin</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Registro: {new Date(user.created_at).toLocaleDateString('es-ES')}
                        </div>
                        
                        {user.last_sign_in_at && (
                          <div className="flex items-center">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Último acceso: {new Date(user.last_sign_in_at).toLocaleDateString('es-ES')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Server className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{user.vm_count} VPS</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">${user.total_spent.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(user.subscription_status)}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Detalles del Usuario</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">{selectedUser.email}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estado de Suscripción</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedUser.subscription_status)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">VPS Activos</label>
                    <p className="text-lg font-bold text-blue-600">{selectedUser.vm_count}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Gastado</label>
                    <p className="text-lg font-bold text-green-600">${selectedUser.total_spent.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Fecha de Registro</label>
                    <p className="text-sm">{new Date(selectedUser.created_at).toLocaleString('es-ES')}</p>
                  </div>
                  
                  {selectedUser.last_sign_in_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Último Acceso</label>
                      <p className="text-sm">{new Date(selectedUser.last_sign_in_at).toLocaleString('es-ES')}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedUser.email);
                      alert('Email copiado al portapapeles');
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Copiar Email
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('¿Suspender usuario? Esta acción requerirá intervención manual.')) {
                        alert('Función de suspensión en desarrollo');
                      }
                    }}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspender
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}