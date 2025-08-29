import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Server } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth();

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


  // If user is authenticated, just return children (navigation handled in App.tsx)
  if (user) {
    return <>{children}</>;
  }

  // This case should not happen as App.tsx handles unauthenticated users
  return null;
}