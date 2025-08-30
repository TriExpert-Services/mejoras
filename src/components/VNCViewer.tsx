import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Monitor, X, AlertCircle, Terminal, Maximize2, RotateCcw } from 'lucide-react';

interface VNCViewerProps {
  vmId: string;
  vmName: string;
  onClose: () => void;
}

declare global {
  interface Window {
    RFB: any;
  }
}

export function VNCViewer({ vmId, vmName, onClose }: VNCViewerProps) {
  const vncRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [noVNCReady, setNoVNCReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Check if noVNC is already loaded
    if (window.RFB) {
      setNoVNCReady(true);
    } else {
      // Dynamically load noVNC if not available
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@novnc/novnc@1.5.0/lib/rfb.js';
      script.onload = () => {
        setNoVNCReady(true);
      };
      script.onerror = () => {
        setError('Failed to load noVNC library');
      };
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    // Auto-connect when noVNC is ready
    if (noVNCReady) {
      connectToVNC();
    }
    
    return () => {
      // Cleanup RFB connection when component unmounts
      if (rfbRef.current) {
        rfbRef.current.disconnect();
      // Get VNC connection info from Proxmox
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

      const vncData = data.vncData;
      setConnectionInfo(vncData);

      // Create noVNC connection
      if (vncRef.current) {
        // Build WebSocket URL for Proxmox VNC
        const wsUrl = `wss://${vncData.host}:${vncData.port}/api2/json/nodes/${vncData.node}/lxc/${vncData.vmid}/vncwebsocket?port=${vncData.port}&vncticket=${encodeURIComponent(vncData.ticket)}`;
        
        console.log('Connecting to WebSocket:', wsUrl);

        // Create RFB connection
        rfbRef.current = new window.RFB(vncRef.current, wsUrl, {
          credentials: {
            username: vncData.user,
            password: vncData.ticket,
          },
        });

        // Set up event handlers
        rfbRef.current.addEventListener('connect', () => {
          console.log('VNC connected successfully');
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
        });

        rfbRef.current.addEventListener('disconnect', (e: any) => {
          console.log('VNC disconnected:', e.detail);
          setIsConnected(false);
          setIsConnecting(false);
          if (e.detail.clean === false) {
            setError('Conexión VNC perdida');
          }
        });

        rfbRef.current.addEventListener('securityfailure', (e: any) => {
          console.error('VNC security failure:', e.detail);
          setError('Error de autenticación VNC');
          setIsConnecting(false);
        });

        // Set quality and compression
        rfbRef.current.qualityLevel = 6;
        rfbRef.current.compressionLevel = 2;
      }

    } catch (err: any) {
      console.error('VNC connection error:', err);
      setError(err.message || 'Failed to connect to VM console');
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (rfbRef.current) {
      rfbRef.current.disconnect();
      rfbRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionInfo(null);
  };

  const reconnect = () => {
    disconnect();
    setTimeout(() => connectToVNC(), 1000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      vncRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <Card className="w-full h-full max-w-6xl max-h-[90vh] m-4 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50 flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            VNC Console - {vmName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}
              </span>
            </div>
            
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="gap-1"
              >
                <Maximize2 className="w-4 h-4" />
                Pantalla Completa
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              disabled={isConnecting}
              className="gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reconectar
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
        
        <CardContent className="flex-1 p-0 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <div>
                  <p className="font-medium">Error de Conexión VNC</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={connectToVNC}
                className="mt-2"
                disabled={isConnecting}
              >
                Reintentar Conexión
              </Button>
            </div>
          )}
          
          {isConnecting && !error && (
            <div className="flex items-center justify-center h-full bg-gray-50 m-4 rounded-lg">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Conectando a la consola VNC...</p>
                <p className="text-xs text-gray-500 mt-2">Obteniendo acceso al contenedor...</p>
              </div>
            </div>
          )}
          
          {/* VNC Display Area */}
          <div 
            ref={vncRef}
            className={`w-full ${isConnected ? 'h-full' : 'min-h-[400px]'} bg-black ${error || isConnecting ? 'hidden' : 'block'}`}
            style={{ 
              minHeight: isConnected ? '500px' : '400px',
              backgroundColor: '#000'
            }}
          />
          
          {!isConnected && !isConnecting && !error && (
            <div className="flex items-center justify-center h-full bg-gray-50 m-4 rounded-lg">
              <div className="text-center">
                <Terminal className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Consola VNC</h3>
                <p className="text-gray-600 mb-4">Acceso directo a la consola de tu VPS</p>
                <Button onClick={connectToVNC} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Terminal className="w-4 h-4" />
                  Conectar a Consola
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}