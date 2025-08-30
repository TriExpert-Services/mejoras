import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Monitor, Maximize2, RotateCcw, X, AlertCircle, Terminal } from 'lucide-react';

interface VNCViewerProps {
  vmId: string;
  vmName: string;
  onClose: () => void;
}

export function VNCViewer({ vmId, vmName, onClose }: VNCViewerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  const connectToVM = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      console.log('Getting VNC connection info for VM:', vmId);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vnc-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vmId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get VNC connection: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('VNC connection data received:', data);

      if (!data.success || !data.vncData) {
        throw new Error('Invalid VNC response');
      }

      setConnectionInfo(data.vncData);
      setIsConnected(true);
      setError(null);

    } catch (err: any) {
      console.error('VNC connection error:', err);
      setError(err.message || 'Failed to connect to VM console');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionInfo(null);
  };

  const openProxmoxConsole = () => {
    if (connectionInfo) {
      const { host, vmid } = connectionInfo;
      const proxmoxUrl = `https://${host}:8006/#v1:0:=lxc%2F${vmid}:4:5:=console::::`;
      window.open(proxmoxUrl, '_blank');
    }
  };

  useEffect(() => {
    // Auto-connect when component mounts
    connectToVM();
  }, [vmId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full h-full max-w-6xl max-h-[90vh] m-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Console Access - {vmName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Información obtenida' : isConnecting ? 'Conectando...' : 'Desconectado'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={isConnected ? disconnect : connectToVM}
              disabled={isConnecting}
              className="gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              {isConnected ? 'Desconectar' : 'Reconectar'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Cerrar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 h-[calc(100%-4rem)]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <div>
                  <p className="font-medium">Error de Conexión</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={connectToVM}
                className="mt-2"
                disabled={isConnecting}
              >
                Reintentar Conexión
              </Button>
            </div>
          )}
          
          {isConnecting && (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Obteniendo información de consola...</p>
                <p className="text-xs text-gray-500 mt-2">Conectando con Proxmox...</p>
              </div>
            </div>
          )}
          
          {isConnected && connectionInfo && (
            <div className="h-full bg-gray-50 rounded-lg p-6">
              <div className="text-center space-y-6">
                <div className="bg-green-100 p-4 rounded-lg inline-block">
                  <Terminal className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-green-800">Consola Lista</h3>
                  <p className="text-green-700 text-sm">Conexión VNC configurada correctamente</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg border space-y-4">
                  <h4 className="font-semibold text-gray-900">Información de Conexión:</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Host:</span>
                      <p className="font-mono bg-gray-100 p-2 rounded mt-1">{connectionInfo.host}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">VM ID:</span>
                      <p className="font-mono bg-gray-100 p-2 rounded mt-1">{connectionInfo.vmid}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Usuario:</span>
                      <p className="font-mono bg-gray-100 p-2 rounded mt-1">{connectionInfo.user}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Puerto:</span>
                      <p className="font-mono bg-gray-100 p-2 rounded mt-1">{connectionInfo.port}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-gray-700">
                    La consola VNC está configurada. Puedes acceder directamente desde Proxmox:
                  </p>
                  
                  <Button
                    onClick={openProxmoxConsole}
                    className="bg-blue-600 hover:bg-blue-700 text-lg px-6 py-3"
                  >
                    <Monitor className="w-5 h-5 mr-2" />
                    Abrir Consola en Proxmox
                  </Button>
                  
                  <p className="text-xs text-gray-500">
                    Se abrirá una nueva pestaña con acceso directo a la consola del contenedor
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Acceso Alternativo (SSH):</h5>
                  <div className="text-left space-y-2 text-sm">
                    <div>
                      <span className="text-blue-700">Comando SSH:</span>
                      <code className="block bg-blue-100 p-2 rounded mt-1 font-mono text-xs">
                        ssh root@{connectionInfo.host} -p 22
                      </code>
                    </div>
                    <p className="text-blue-600 text-xs">
                      Usa la contraseña root que se muestra en la sección "Mis Servidores"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!isConnected && !isConnecting && !error && (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
              <div className="text-center">
                <Terminal className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso a Consola</h3>
                <p className="text-gray-600 mb-4">Obtén acceso directo a la consola de tu VPS</p>
                <Button onClick={connectToVM} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Terminal className="w-4 h-4" />
                  Obtener Acceso a Consola
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}