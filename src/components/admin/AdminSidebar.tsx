import { useState } from 'react';
import { Button } from '../ui/button';
import { 
  LayoutDashboard,
  Users,
  Server,
  Settings,
  CreditCard,
  AlertTriangle,
  HardDrive,
  FileText,
  LogOut
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminSidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
}

export function AdminSidebar({ currentSection, onSectionChange }: AdminSidebarProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: Users,
    },
    {
      id: 'vms',
      label: 'VPS',
      icon: Server,
    },
    {
      id: 'suspensions',
      label: 'Suspensiones',
      icon: AlertTriangle,
    },
    {
      id: 'prices',
      label: 'Precios',
      icon: CreditCard,
    },
    {
      id: 'templates',
      label: 'Plantillas',
      icon: HardDrive,
    },
    {
      id: 'ip-pools',
      label: 'IP Pools',
      icon: Settings,
    },
    {
      id: 'legal',
      label: 'Legal',
      icon: FileText,
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Panel Admin</h2>
        <p className="text-sm text-gray-600">Gestión del sistema</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:bg-red-50"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          {loggingOut ? 'Cerrando...' : 'Cerrar Sesión'}
        </Button>
      </div>
    </div>
  );
}