import React from 'react';
import { AuthWrapper } from './components/AuthWrapper';
import { ProductGrid } from './components/ProductGrid';
import { SuccessPage } from './components/SuccessPage';

function App() {
  // Check if we're on the success page
  const isSuccessPage = window.location.pathname === '/success' || 
                       window.location.search.includes('session_id');

  if (isSuccessPage) {
    return <SuccessPage />;
  }

  return (
    <AuthWrapper>
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Servicios de Traducción Profesional
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ofrecemos servicios de traducción certificada para documentos oficiales 
            y trámites legales con la más alta calidad y precisión.
          </p>
        </div>
        
        <ProductGrid />
      </div>
    </AuthWrapper>
  );
}

export default App;