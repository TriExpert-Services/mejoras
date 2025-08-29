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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">
            ¡Pago Exitoso!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <Server className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-800">
              Tu VPS está siendo configurado
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Recibirás los detalles de acceso por correo electrónico
            </p>
          </div>
          
          <p className="text-gray-600">
            Tu pago ha sido procesado correctamente. Tu servidor virtual 
            estará listo en unos minutos.
          </p>
          
          {sessionId && (
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="text-xs text-gray-500 mb-1">ID de Transacción:</p>
              <p className="text-sm font-mono text-gray-700 break-all">
                {sessionId}
              </p>
            </div>
          )}
          
          <Button onClick={handleContinue} className="w-full bg-blue-600 hover:bg-blue-700">
            Ver mis VPS
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}