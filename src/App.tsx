import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthWrapper } from './components/AuthWrapper';
import { ProductGrid } from './components/ProductGrid';
import { SuccessPage } from './components/SuccessPage';
import { VMDashboard } from './components/VMDashboard';
import { AdminPanel } from './components/AdminPanel';
import { LandingPage } from './components/LandingPage';
import { Navigation } from './components/Navigation';

function App() {
  const [currentPage, setCurrentPage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    if (path === '/success' || searchParams.has('session_id')) {
      setCurrentPage('success');
    } else if (path === '/admin') {
      setCurrentPage('admin');
    } else if (path === '/dashboard') {
      setCurrentPage('dashboard');
    } else if (path === '/plans' || path === '/vps') {
      setCurrentPage('plans');
    } else {
      setCurrentPage('home');
    }

    // Check if user is admin (you can modify this logic)
    if (user?.email === 'admin@triexpertservice.com') {
      setIsAdmin(true);
    }
  }, [user, window.location.pathname]);

  // Handle navigation
  const navigate = (page: string) => {
    setCurrentPage(page);
    window.history.pushState({}, '', page === 'home' ? '/' : `/${page}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando plataforma VPS...</p>
        </div>
      </div>
    );
  }

  // Success page doesn't need auth wrapper
  if (currentPage === 'success') {
    return <SuccessPage />;
  }

  // Show landing page if not authenticated
  if (!user) {
    return <LandingPage onNavigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentPage={currentPage} 
        onNavigate={navigate} 
        isAdmin={isAdmin}
        user={user}
      />
      
      <main className="pt-16">
        {currentPage === 'admin' && isAdmin && (
          <AdminPanel />
        )}
        
        {currentPage === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <VMDashboard />
          </div>
        )}
        
        {currentPage === 'plans' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Planes de <span className="text-blue-600">VPS</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Servidores virtuales potentes con tecnología Proxmox. Aprovisionamiento automático y control total.
              </p>
            </div>
            <ProductGrid />
          </div>
        )}
        
        {currentPage === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Bienvenido a <span className="text-blue-600">VPS Proxmox</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Gestiona tus servidores virtuales desde un panel de control moderno y potente.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => navigate('plans')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Ver Planes VPS
                </button>
                <button
                  onClick={() => navigate('dashboard')}
                  className="bg-gray-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Ir al Dashboard
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-blue-600 text-xl">⚡</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Alto Rendimiento</h3>
                <p className="text-gray-600">Servidores con CPUs de última generación y almacenamiento SSD NVMe.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-green-600 text-xl">🛡️</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Máxima Seguridad</h3>
                <p className="text-gray-600">Backups automáticos, monitoreo 24/7 y protección DDoS incluida.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-purple-600 text-xl">🚀</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Aprovisionamiento Instantáneo</h3>
                <p className="text-gray-600">Tu VPS estará listo en menos de 5 minutos después del pago.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;