import { useState, useEffect } from 'react';
import { AuthWrapper } from './components/AuthWrapper';
import { ProductGrid } from './components/ProductGrid';
import { SuccessPage } from './components/SuccessPage';
import { VMDashboard } from './components/VMDashboard';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Check environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Faltan variables de entorno de Supabase');
      }

      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de configuración');
      console.error('App initialization error:', err);
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error de Configuración</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando aplicación...</p>
        </div>
      </div>
    );
  }

  // Check if we're on the success page
  const isSuccessPage = window.location.pathname === '/success' || 
                       window.location.search.includes('session_id');

  // Check if we're on the dashboard page
  const isDashboardPage = window.location.pathname === '/dashboard';

  if (isSuccessPage) {
    return <SuccessPage />;
  }

  if (isDashboardPage) {
    return (
      <AuthWrapper>
        <VMDashboard />
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Planes de VPS Proxmox
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Elige el plan perfecto para tus proyectos. Servidores virtuales potentes 
            con tecnología Proxmox, respaldos automáticos y soporte 24/7.
          </p>
        </div>
        
        <ProductGrid />
        
        <div className="bg-blue-50 rounded-lg p-6 mt-12">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">¿Por qué elegir nuestros VPS?</h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <strong className="text-blue-600">⚡ Rendimiento</strong>
                <p className="text-gray-600 mt-1">Hardware de última generación con almacenamiento SSD NVMe</p>
              </div>
              <div>
                <strong className="text-green-600">🔒 Seguridad</strong>
                <p className="text-gray-600 mt-1">Backups automáticos diarios y monitoreo constante</p>
              </div>
              <div>
                <strong className="text-purple-600">🚀 Escalabilidad</strong>
                <p className="text-gray-600 mt-1">Actualiza recursos fácilmente según tus necesidades</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

export default App;