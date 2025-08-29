import React from 'react';
import { AuthWrapper } from './components/AuthWrapper';
import { ProductGrid } from './components/ProductGrid';
import { SuccessPage } from './components/SuccessPage';
import { VMDashboard } from './components/VMDashboard';

function App() {
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