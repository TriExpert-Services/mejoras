import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { Button } from './ui/button';
import { Server, Shield, Zap } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading, signOut } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-3 rounded-2xl">
              <Server className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            VPS <span className="text-blue-600">Proxmox</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Servidores virtuales potentes y confiables respaldados por tecnología Proxmox
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Alto Rendimiento</h3>
              <p className="text-sm text-gray-600">CPUs de última generación y almacenamiento SSD</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Máxima Seguridad</h3>
              <p className="text-sm text-gray-600">Backups automáticos y monitoreo 24/7</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Server className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Tecnología Proxmox</h3>
              <p className="text-sm text-gray-600">Virtualización empresarial confiable</p>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="flex items-center justify-center p-4">
          {authMode === 'login' ? (
            <LoginForm
              onSuccess={() => {}}
              onSwitchToSignup={() => setAuthMode('signup')}
            />
          ) : (
            <SignupForm
              onSuccess={() => {}}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">
                VPS Proxmox
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/dashboard'}
                className="text-gray-600 hover:text-gray-900"
              >
                Panel de Control
              </Button>
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}