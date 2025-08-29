import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabase';
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Network, 
  RefreshCw,
  Activity,
  Clock,
  Wifi,
  AlertCircle
} from 'lucide-react';

interface VMMetrics {
  vm_id: string;
  vm_name: string;
  vm_spec: string;
  status: string;
  running: boolean;
  cpu_usage: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_usage_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_usage_percent: number;
  network_in_mb: number;
  network_out_mb: number;
  uptime: number;
  last_updated: string;
  cpu_cores: number;
  ram_gb: number;
  disk_gb: number;
  ip_address: string;
  error?: string;
}

interface VMMetricsProps {
  vmId?: string;
  showAll?: boolean;
}

export function VMMetrics({ vmId, showAll = false }: VMMetricsProps) {
  const [metrics, setMetrics] = useState<VMMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 5 seconds for real-time metrics
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [vmId]);

  const fetchMetrics = async () => {
    // Only show loading on initial fetch
    if (metrics.length === 0) {
      setLoading(true);
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const url = vmId 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vm-metrics?vmId=${vmId}`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vm-metrics`;

      const response = await fetch(url, {
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
      setMetrics(Array.isArray(data) ? data : [data]);
      setError(null);

    } catch (error: any) {
      console.error('Error fetching VM metrics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'Detenido';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const getStatusBadge = (status: string, running: boolean) => {
    if (running) {
      return <Badge variant="success" className="flex items-center gap-1">
        <Activity className="h-3 w-3" />
        Activo
      </Badge>;
    }
    
    return <Badge variant="secondary">Detenido</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">Cargando métricas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Error al cargar métricas</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchMetrics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay métricas disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {metrics.map((metric) => (
        <Card key={metric.vm_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{metric.vm_name}</CardTitle>
                <p className="text-sm text-gray-600">{metric.vm_spec}</p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(metric.status, metric.running)}
                {refreshing && (
                  <div className="flex items-center text-xs text-blue-600">
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    Actualizando...
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={fetchMetrics}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {metric.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{metric.error}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* CPU Usage */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Cpu className="h-6 w-6 text-blue-600" />
                    <span className="text-xl font-bold text-blue-700">
                      {metric.cpu_usage.toFixed(1)}%
                    </span>
                  </div>
                  <h4 className="font-semibold text-blue-900 text-sm mb-1">CPU</h4>
                  <p className="text-xs text-blue-600">{metric.cpu_cores} vCPUs</p>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(metric.cpu_usage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <MemoryStick className="h-6 w-6 text-green-600" />
                    <span className="text-xl font-bold text-green-700">
                      {metric.memory_usage_percent.toFixed(1)}%
                    </span>
                  </div>
                  <h4 className="font-semibold text-green-900 text-sm mb-1">RAM</h4>
                  <p className="text-xs text-green-600">
                    {formatBytes(metric.memory_used_mb)} / {formatBytes(metric.memory_total_mb)}
                  </p>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(metric.memory_usage_percent, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Disk Usage */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <HardDrive className="h-6 w-6 text-purple-600" />
                    <span className="text-xl font-bold text-purple-700">
                      {metric.disk_usage_percent.toFixed(1)}%
                    </span>
                  </div>
                  <h4 className="font-semibold text-purple-900 text-sm mb-1">Disco</h4>
                  <p className="text-xs text-purple-600">
                    {metric.disk_used_gb}GB / {metric.disk_total_gb}GB
                  </p>
                  <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(metric.disk_usage_percent, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Network & Uptime */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Network className="h-6 w-6 text-orange-600" />
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-orange-900 text-sm mb-1">Red & Tiempo</h4>
                  <div className="text-xs text-orange-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Uptime:</span>
                      <span className="font-medium">{formatUptime(metric.uptime)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>In:</span>
                      <span>{formatBytes(metric.network_in_mb)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Out:</span>
                      <span>{formatBytes(metric.network_out_mb)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
              <span>Última actualización: {new Date(metric.last_updated).toLocaleTimeString('es-ES')}</span>
              <Wifi className="h-3 w-3 text-green-500" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}