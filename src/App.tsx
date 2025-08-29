import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test basic functionality
    try {
      console.log('App starting...');
      console.log('Environment variables:', {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      setStatus('ready');
    } catch (err) {
      console.error('App error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setStatus('error');
    }
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Iniciando aplicación...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error de Aplicación</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            VPS Proxmox Platform
          </h1>
          <p className="text-gray-600 mb-4">
            Aplicación funcionando correctamente
          </p>
          <div className="bg-gray-100 p-3 rounded text-left text-xs">
            <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL}</p>
            <p><strong>Anon Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado ✓' : 'No configurado ✗'}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          >
            Probar Conexión
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;