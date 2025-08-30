import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Monitor, Maximize2, RotateCcw, X } from 'lucide-react';

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
    if (!vncRef.current) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get VNC ticket from our edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vnc-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vmId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get VNC ticket: ${response.statusText}`);
      }

      const { ticket, port } = await response.json();

      // Initialize noVNC
      const { default: RFB } = await import('https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/lib/rfb.js');
      
      const url = `wss://your-proxmox-node:${port}?vncticket=${ticket}`;
      const rfbConnection = new RFB(vncRef.current, url);

      rfbConnection.addEventListener('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
      });

      rfbConnection.addEventListener('disconnect', () => {
        setIsConnected(false);
        setRfb(null);
      });

      rfbConnection.addEventListener('credentialsrequired', () => {
        setError('Authentication required');
        setIsConnecting(false);
      });

      setRfb(rfbConnection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (rfb) {
      rfb.disconnect();
      setRfb(null);
    }
    setIsConnected(false);
  };

  const toggleFullscreen = () => {
    if (vncRef.current) {
      if (!document.fullscreenElement) {
        vncRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (rfb) {
        rfb.disconnect();
      }
    };
  }, [rfb]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full h-full max-w-6xl max-h-[90vh] m-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            VNC Console - {vmName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="gap-1"
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
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded">
              <p className="font-medium">Connection Error</p>
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={connectVNC}
                className="mt-2"
              >
                Retry Connection
              </Button>
            </div>
          )}
          
          {!isConnected && !isConnecting && !error && (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">VNC Console</h3>
                <p className="text-gray-600 mb-4">Connect to your virtual machine console</p>
                <Button onClick={connectVNC} className="gap-2">
                  <Monitor className="w-4 h-4" />
                  Connect to Console
                </Button>
              </div>
            </div>
          )}
          
          {isConnecting && (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Connecting to {vmName}...</p>
              </div>
            </div>
          )}
          
          <div
            ref={vncRef}
            className={`h-full w-full ${isConnected ? 'block' : 'hidden'}`}
            style={{ background: '#000' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}