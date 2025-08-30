import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Monitor, Maximize2, RotateCcw, X, AlertCircle } from 'lucide-react';

// Global RFB type definition
declare global {
  interface Window {
    RFB: any;
  }
}

interface VNCViewerProps {
  vmId: string;
  vmName: string;
  onClose: () => void;
}

export function VNCViewer({ vmId, vmName, onClose }: VNCViewerProps) {
  const vncRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rfb, setRfb] = useState<any>(null);

  const connectVNC = async () => {
    if (!vncRef.current) {
      setError('VNC container not ready');
      return;
    }

    // Wait for noVNC library to load
    let attempts = 0;
    while (!window.RFB && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.RFB) {
      setError('noVNC library failed to load. Please refresh the page and try again.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('Getting VNC ticket for VM:', vmId);

      // Get VNC ticket from our edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

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
        throw new Error(errorData.error || `Failed to get VNC ticket: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('VNC ticket response:', data);

      if (!data.success || !data.vncData) {
        throw new Error('Invalid VNC response');
      }

      const { ticket, port, host, node, vmid } = data.vncData;

      // Construct WebSocket URL for Proxmox VNC
      const wsUrl = `wss://${host}:8006/api2/json/nodes/${node}/lxc/${vmid}/vncwebsocket?port=${port}&vncticket=${encodeURIComponent(ticket)}`;
      
      console.log('Connecting to WebSocket:', wsUrl);

      // Clear any existing content
      if (vncRef.current) {
        vncRef.current.innerHTML = '';
      }

      // Initialize noVNC RFB client
      const rfbConnection = new window.RFB(vncRef.current, wsUrl, {
        credentials: { password: '' }, // Empty password for ticket auth
      });

      rfbConnection.addEventListener('connect', () => {
        console.log('VNC connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      });

      rfbConnection.addEventListener('disconnect', (e: any) => {
        console.log('VNC disconnected:', e.detail);
        setIsConnected(false);
        setIsConnecting(false);
        setRfb(null);
        
        if (e.detail.clean === false) {
          setError(`Connection lost: ${e.detail.reason || 'Unknown reason'}`);
        }
      });

      rfbConnection.addEventListener('credentialsrequired', () => {
        console.error('VNC credentials required');
        setError('Authentication failed - credentials required');
        setIsConnecting(false);
      });

      rfbConnection.addEventListener('securityfailure', (e: any) => {
        console.error('VNC security failure:', e.detail);
        setError(`Security failure: ${e.detail.reason || 'Authentication failed'}`);
        setIsConnecting(false);
      });

      setRfb(rfbConnection);

    } catch (err: any) {
      console.error('VNC connection error:', err);
      setError(err.message || 'Failed to connect to VNC');
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (rfb) {
      rfb.disconnect();
      setRfb(null);
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  const toggleFullscreen = () => {
    if (vncRef.current) {
      if (!document.fullscreenElement) {
        vncRef.current.requestFullscreen().catch((err) => {
          console.error('Error entering fullscreen:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    // Auto-connect when component mounts
    const timer = setTimeout(() => {
      connectVNC();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (rfb) {
        rfb.disconnect();
      }
    };
  }, [vmId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full h-full max-w-6xl max-h-[90vh] m-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50">
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
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="gap-1"
              title="Pantalla completa"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={isConnected ? disconnect : connectVNC}
              disabled={isConnecting}
              className="gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              {isConnected ? 'Desconectar' : 'Conectar'}
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
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded">
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
                onClick={connectVNC}
                className="mt-2"
                disabled={isConnecting}
              >
                Reintentar Conexión
              </Button>
            </div>
          )}
          
          {!isConnected && !isConnecting && !error && (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Consola VNC</h3>
                <p className="text-gray-600 mb-4">Conecta a la consola de tu máquina virtual</p>
                <Button onClick={connectVNC} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Monitor className="w-4 h-4" />
                  Conectar a Consola
                </Button>
              </div>
            </div>
          )}
          
          {isConnecting && (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Conectando a {vmName}...</p>
                <p className="text-xs text-gray-500 mt-2">Esto puede tomar unos segundos</p>
              </div>
            </div>
          )}
          
          <div
            ref={vncRef}
            className={`h-full w-full ${isConnected ? 'block' : 'hidden'}`}
            style={{ 
              background: '#000',
              minHeight: '400px',
              display: isConnected ? 'block' : 'none'
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}