import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { Button } from './ui/button';
import { 
  Server, 
  Shield, 
  Zap, 
  Clock, 
  CheckCircle, 
  Star,
  ArrowRight,
  Play
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuthForm, setShowAuthForm] = useState(false);
  const { products, loading: productsLoading } = useProducts();

  // Get the three main products for pricing preview
  const basicProduct = products.find(p => p.name.toLowerCase().includes('básico'));
  const premiumProduct = products.find(p => p.name.toLowerCase().includes('premium'));
  const enterpriseProduct = products.find(p => p.name.toLowerCase().includes('enterprise'));

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg mr-3">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">VPS TriExpert Services</h1>
                <p className="text-xs text-gray-500">Servidores Virtuales</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setShowAuthForm(true)}
              >
                Iniciar Sesión
              </Button>
              <Button
                onClick={() => {
                  setAuthMode('signup');
                  setShowAuthForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Comenzar Gratis
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {showAuthForm ? (
        /* Auth Form Overlay */
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 pt-20">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowAuthForm(false)}
              className="absolute -top-4 -right-4 z-10 bg-gray-800 border border-gray-600 rounded-full p-2 shadow-lg hover:bg-gray-700 text-white"
            >
              ×
            </button>
            
            {authMode === 'login' ? (
              <LoginForm
                onSuccess={() => onNavigate('dashboard')}
                onSwitchToSignup={() => setAuthMode('signup')}
              />
            ) : (
              <SignupForm
                onSuccess={() => onNavigate('dashboard')}
                onSwitchToLogin={() => setAuthMode('login')}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="pt-16">
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="bg-red-600 p-4 rounded-3xl inline-block mb-8">
                <Server className="h-16 w-16 text-white" />
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                VPS <span className="text-red-500">TriExpert Services</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
                Servidores virtuales de <span className="text-red-400 font-semibold">alto rendimiento</span> con 
                tecnología Avanzada. Aprovisionamiento automático en <span className="text-green-400 font-semibold">menos de 5 minutos</span>.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Button
                  size="lg"
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthForm(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-lg px-8 py-4"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Comenzar Ahora
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-lg px-8 py-4"
                >
                  Ver Planes
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                <div>
                  <div className="text-3xl font-bold text-red-400">99.9%</div>
                  <div className="text-sm text-gray-400">Uptime Garantizado</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-400">{"<5min"}</div>
                  <div className="text-sm text-gray-400">Aprovisionamiento</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400">24/7</div>
                  <div className="text-sm text-gray-400">Soporte Técnico</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-400">SSD</div>
                  <div className="text-sm text-gray-400">Almacenamiento</div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  ¿Por qué elegir nuestros VPS?
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Tecnología empresarial al alcance de todos los desarrolladores y empresas
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-gradient-to-br from-red-900 to-red-800 p-8 rounded-2xl border border-red-700">
                  <Zap className="h-12 w-12 text-red-400 mb-4" />
                  <h3 className="text-xl font-bold mb-3 text-white">Rendimiento Extremo</h3>
                  <p className="text-gray-300">
                    CPUs Intel Xeon, almacenamiento SSD NVMe y conectividad de 10Gbps para máximo rendimiento.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl">
                  <Shield className="h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-xl font-bold mb-3">Seguridad Avanzada</h3>
                  <p className="text-gray-700">
                    Firewall configurado, backups automáticos diarios y monitoreo continuo de seguridad.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl">
                  <Clock className="h-12 w-12 text-purple-600 mb-4" />
                  <h3 className="text-xl font-bold mb-3">Aprovisionamiento Rápido</h3>
                  <p className="text-gray-700">
                    Tu servidor estará listo y funcionando en menos de 5 minutos después del pago.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl">
                  <Server className="h-12 w-12 text-orange-600 mb-4" />
                  <h3 className="text-xl font-bold mb-3">Panel de Control</h3>
                  <p className="text-gray-700">
                    Interface moderna para gestionar tus VPS: iniciar, detener, monitorear recursos.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl">
                  <CheckCircle className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-bold mb-3">Soporte 24/7</h3>
                  <p className="text-gray-700">
                    Equipo técnico especializado disponible las 24 horas para resolver cualquier problema.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-8 rounded-2xl">
                  <Star className="h-12 w-12 text-teal-600 mb-4" />
                  <h3 className="text-xl font-bold mb-3">Root Completo</h3>
                  <p className="text-gray-700">
                    Acceso root total a tu servidor con la libertad de instalar cualquier software que necesites.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Preview */}
          <section id="planes" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Planes para cada necesidad
              </h2>
              <p className="text-xl text-gray-600 mb-12">
                Desde proyectos personales hasta aplicaciones empresariales
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {productsLoading ? (
                  <div className="col-span-3 text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500 text-sm">Cargando planes...</p>
                  </div>
                ) : (
                  <>
                    {/* Basic Plan */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-gray-100 hover:border-blue-200 transition-colors">
                      <h3 className="text-xl font-bold mb-2">{basicProduct?.name || 'VPS Básico'}</h3>
                      <p className="text-3xl font-bold text-blue-600 mb-4">
                        ${basicProduct?.price.toFixed(2) || '6.00'}
                        <span className="text-lg text-gray-500">/mes</span>
                      </p>
                      <p className="text-gray-600 mb-4">Perfecto para comenzar</p>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li>✓ {basicProduct?.specs?.cpu || '1 vCPU'}</li>
                        <li>✓ {basicProduct?.specs?.ram || '2 GB RAM'}</li>
                        <li>✓ {basicProduct?.specs?.disk || '40 GB SSD'}</li>
                        <li>✓ {basicProduct?.specs?.bandwidth || '2 TB'}</li>
                      </ul>
                    </div>
                    
                    {/* Premium Plan */}
                    <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-blue-500 relative">
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Más Popular
                      </div>
                      <h3 className="text-xl font-bold mb-2">{premiumProduct?.name || 'VPS Premium'}</h3>
                      <p className="text-3xl font-bold text-blue-600 mb-4">
                        ${premiumProduct?.price.toFixed(2) || '10.50'}
                        <span className="text-lg text-gray-500">/mes</span>
                      </p>
                      <p className="text-gray-600 mb-4">Para aplicaciones serias</p>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li>✓ {premiumProduct?.specs?.cpu || '4 vCPUs'}</li>
                        <li>✓ {premiumProduct?.specs?.ram || '8 GB RAM'}</li>
                        <li>✓ {premiumProduct?.specs?.disk || '160 GB SSD'}</li>
                        <li>✓ {premiumProduct?.specs?.bandwidth || '8 TB'}</li>
                      </ul>
                    </div>
                    
                    {/* Enterprise Plan */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-gray-100 hover:border-purple-200 transition-colors">
                      <h3 className="text-xl font-bold mb-2">{enterpriseProduct?.name || 'VPS Enterprise'}</h3>
                      <p className="text-3xl font-bold text-purple-600 mb-4">
                        ${enterpriseProduct?.price.toFixed(2) || '25.00'}
                        <span className="text-lg text-gray-500">/mes</span>
                      </p>
                      <p className="text-gray-600 mb-4">Máximo rendimiento</p>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li>✓ {enterpriseProduct?.specs?.cpu || '12 vCPUs'}</li>
                        <li>✓ {enterpriseProduct?.specs?.ram || '32 GB RAM'}</li>
                        <li>✓ {enterpriseProduct?.specs?.disk || '640 GB SSD'}</li>
                        <li>✓ {enterpriseProduct?.specs?.bandwidth || '24 TB'}</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
              
              <Button
                size="lg"
                onClick={() => {
                  setAuthMode('signup');
                  setShowAuthForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4"
              >
                Ver Todos los Planes
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                ¿Listo para potenciar tus proyectos?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Únete a miles de desarrolladores que confían en nuestros VPS
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthForm(true);
                  }}
                  className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-50"
                >
                  Crear Cuenta Gratis
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthForm(true);
                  }}
                  className="text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-blue-600"
                >
                  Ya tengo cuenta
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
