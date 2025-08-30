import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, Server } from 'lucide-react';

export function SuccessPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    setSessionId(sessionIdParam);
  }, []);

  const handleContinue = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-400">
            ¡Pago Exitoso!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-red-900 p-4 rounded-lg border border-red-700">
            <Server className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-200">
              Tu VPS está siendo configurado
            </p>
            <p className="text-xs text-red-300 mt-1">
              Recibirás los detalles de acceso por correo electrónico
            </p>
          </div>
          
          <p className="text-gray-300">
            Tu pago ha sido procesado correctamente. Tu servidor virtual 
            estará listo en unos minutos.
          </p>
          
          {sessionId && (
            <div className="bg-gray-800 p-3 rounded-md border border-gray-600">
              <p className="text-xs text-gray-400 mb-1">ID de Transacción:</p>
              <p className="text-sm font-mono text-gray-200 break-all">
                {sessionId}
              </p>
            </div>
          )}
          
          <Button onClick={handleContinue} className="w-full bg-red-600 hover:bg-red-700">
            Ver mis VPS
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}