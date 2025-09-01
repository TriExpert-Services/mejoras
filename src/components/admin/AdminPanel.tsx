import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AdminSidebar } from './AdminSidebar';
import { IPPoolManagement } from './IPPoolManagement';
import { TemplateManagement } from './TemplateManagement';
import { UserManagement } from './UserManagement';
import { PriceManagement } from './PriceManagement';
import { LegalManagement } from './LegalManagement';
import { 
  Users, 
  Server, 
  Database, 
  Settings, 
  Activity,
  Play,
  Square,
  Monitor as MonitorIcon,
  DollarSign,
  FileText
} from 'lucide-react';

interface VM {
  id: string;
  name: string;
  status: string;
  cpu_cores: number;
  ram_gb: number;
  disk_gb: number;
  ip_address: string;
  user_id: string;
  created_at: string;
  users: {
    email: string;
  };
}

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface VMSpec {
  id: string;
  name: string;
  cpu_cores: number;
  ram_gb: number;
  disk_gb: number;
  monthly_price: number;
}

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vms, setVMs] = useState<VM[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vmSpecs, setVMSpecs] = useState<VMSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch VMs with user data
      const { data: vmsData, error: vmsError } = await supabase
        .from('vms')
        .select(`
          *,
          users(email)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (vmsError) throw vmsError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch VM specs
      const { data: vmSpecsData, error: vmSpecsError } = await supabase
        .from('vm_specs')
        .select('*')
        .order('cpu_cores', { ascending: true });

      if (vmSpecsError) throw vmSpecsError;

      setVMs(vmsData || []);
      setUsers(usersData || []);
      setVMSpecs(vmSpecsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVMAction = async (vmId: string, action: 'start' | 'stop') => {
    try {
      setActionLoading(prev => ({ ...prev, [vmId]: true }));

      const { data, error } = await supabase.functions.invoke('proxmox-api', {
        body: { 
          action: action === 'start' ? 'start_vm' : 'stop_vm',
          vmId 
        }
      });

      if (error) throw error;

      // Refresh VM data
      await fetchDashboardData();
    } catch (error) {
      console.error(`Error ${action}ing VM:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [vmId]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      running: { variant: 'default' as const, label: 'Ejecutándose', color: 'bg-green-500' },
      stopped: { variant: 'secondary' as const, label: 'Detenido', color: 'bg-gray-500' },
      suspended: { variant: 'destructive' as const, label: 'Suspendido', color: 'bg-red-500' },
      pending: { variant: 'outline' as const, label: 'Pendiente', color: 'bg-yellow-500' },
      creating: { variant: 'outline' as const, label: 'Creando', color: 'bg-blue-500' },
      error: { variant: 'destructive' as const, label: 'Error', color: 'bg-red-600' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        <span className={`w-2 h-2 rounded-full ${config.color} mr-1`}></span>
        {config.label}
      </Badge>
    );
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'vms', label: 'Máquinas Virtuales', icon: Server },
    { id: 'ip-pools', label: 'IP Pools', icon: Database },
    { id: 'templates', label: 'Templates', icon: Settings },
    { id: 'prices', label: 'Precios', icon: DollarSign },
    { id: 'legal', label: 'Legal', icon: FileText }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'ip-pools':
        return <IPPoolManagement />;
      case 'templates':
        return <TemplateManagement />;
      case 'prices':
        return <PriceManagement />;
      case 'legal':
        return <LegalManagement />;
      case 'vms':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Gestión de VMs</h2>
              <Button 
                onClick={fetchDashboardData}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                Actualizar
              </Button>
            </div>
            
            <div className="grid gap-4">
              {vms.map((vm) => (
                <Card key={vm.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white">{vm.name}</h3>
                        <p className="text-sm text-gray-400">{vm.users?.email}</p>
                        <p className="text-xs text-gray-500">IP: {vm.ip_address || 'No asignada'}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(vm.status)}
                        {vm.status === 'suspended' && (
                          <p className="text-xs text-red-400 mt-1">
                            Suspendido por pago
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{vm.cpu_cores} vCPU • {vm.ram_gb}GB RAM • {vm.disk_gb}GB Disk</span>
                      <div className="flex gap-2">
                        {vm.status === 'stopped' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVMAction(vm.id, 'start')}
                            disabled={actionLoading[vm.id]}
                            title="Iniciar VM"
                            className="text-green-400 hover:text-green-300"
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
                            className="text-red-400 hover:text-red-300"
                          >
                            <Square className="h-3 w-3" />
                          </Button>
                        )}
                        {vm.status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="VM suspendida por falta de pago"
                            className="text-red-500"
                          >
                            <MonitorIcon className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Dashboard Administrativo</h2>
              <Button 
                onClick={fetchDashboardData}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                Actualizar
              </Button>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">
                        Total Usuarios
                      </CardTitle>
                      <Users className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{users.length}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">
                        VMs Activas
                      </CardTitle>
                      <Server className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {vms.filter(vm => vm.status === 'running').length}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">
                        Total VMs
                      </CardTitle>
                      <Database className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{vms.length}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">VMs Recientes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {vms.slice(0, 5).map((vm) => (
                        <div key={vm.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{vm.name}</p>
                            <p className="text-sm text-gray-400">{vm.users?.email}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(vm.status)}
                            {vm.status === 'suspended' && (
                              <p className="text-xs text-red-400 mt-1">
                                Suspendido por pago
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Planes Disponibles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {vmSpecs.slice(0, 5).map((spec) => (
                        <div key={spec.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{spec.name}</p>
                            <p className="text-sm text-gray-400">
                              {spec.cpu_cores} vCPU • {spec.ram_gb}GB RAM
                            </p>
                          </div>
                          <p className="text-red-400 font-medium">
                            ${spec.monthly_price}/mes
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex">
        <AdminSidebar currentSection={activeTab} onSectionChange={setActiveTab} />
        
        <main className="flex-1 p-6 ml-64">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
