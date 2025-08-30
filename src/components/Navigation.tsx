import React from 'react';
import { Server, User, Settings, Home, Package, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';
import type { User as AuthUser } from '@supabase/supabase-js';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isAdmin: boolean;
  user: AuthUser;
}

export function Navigation({ currentPage, onNavigate, isAdmin, user }: NavigationProps) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'plans', label: 'Planes VPS', icon: Package },
    { id: 'dashboard', label: 'Mis VPS', icon: Server },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: Settings });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <div className="bg-red-600 p-2 rounded-lg mr-3">
              <Server className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">VPS Proxmox</h1>
              <p className="text-xs text-gray-400">Plataforma de Gestión</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-900 text-red-200'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-3">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-300 max-w-40 truncate">
                  {user.email}
                </span>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">
                  Admin
                </span>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-700">
          <div className="flex justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center px-3 py-2 text-xs ${
                    isActive
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}