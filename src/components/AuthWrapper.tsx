import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { Button } from './ui/button';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Servicios de Traducción
            </h1>
            <div className="flex items-center space-x-4">
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