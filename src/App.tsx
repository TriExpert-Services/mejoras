import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthWrapper } from './components/AuthWrapper';
import { ProductGrid } from './components/ProductGrid';
import { SuccessPage } from './components/SuccessPage';
import { VMDashboard } from './components/VMDashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('');
  const { user, loading } = useAuth();

  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    if (path === '/success' || searchParams.has('session_id')) {
      setCurrentPage('success');
    } else if (path === '/dashboard' || (user && path === '/')) {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('home');
    }
  }, [user, window.location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Success page doesn't need auth wrapper
  if (currentPage === 'success') {
    return <SuccessPage />;
  }

  return (
    <AuthWrapper>
      {currentPage === 'dashboard' ? (
        <VMDashboard />
      ) : (
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Planes de <span className="text-blue-600">VPS</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Servidores virtuales potentes con tecnología Proxmox. Aprovisionamiento automático y control total.
            </p>
          </div>
          
          <ProductGrid 
            onPurchaseStart={() => console.log('Purchase started')}
            onPurchaseComplete={() => setCurrentPage('success')}
          />
        </div>
      )}
    </AuthWrapper>
  );
}

export default App;