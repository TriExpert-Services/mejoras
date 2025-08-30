import React from 'react';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard,
  Users,
  Server,
  Network,
  FileImage,
  Settings,
  DollarSign,
  Activity,
  Shield,
  Database,
  FileText
} from 'lucide-react';

interface AdminSidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
}

export function AdminSidebar({ currentSection, onSectionChange }: AdminSidebarProps) {
  const sections = [
    {
      id: 'overview',
      name: 'Panel General',
      icon: LayoutDashboard,
      description: 'Estadísticas y resumen'
    },
    {
      id: 'users',
      name: 'Gestión de Usuarios',
      icon: Users,
      description: 'Administrar usuarios y permisos'
    },
    {
      id: 'vms',
      name: 'Gestión de VPS',
      icon: Server,
      description: 'Administrar servidores virtuales'
    },
    {
      id: 'ip-pools',
      name: 'Redes e IPs',
      icon: Network,
      description: 'Gestionar grupos de IP y redes'
    },
    {
      id: 'templates',
      name: 'Plantillas',
      icon: FileImage,
      description: 'Gestionar plantillas de SO'
    },
    {
      id: 'orders',
      name: 'Órdenes y Pagos',
      icon: DollarSign,
      description: 'Historial de transacciones'
    },
    {
      id: 'pricing',
      name: 'Precios y Stripe',
      icon: DollarSign,
      description: 'Gestionar precios y configuración de Stripe'
    },
    {
      id: 'legal',
      name: 'Legal y Políticas',
      icon: FileText,
      description: 'Términos de servicio y políticas'
    },
    {
      id: 'monitoring',
      name: 'Monitoreo',
      icon: Activity,
      description: 'Recursos del servidor'
    },
    {
      id: 'security',
      name: 'Seguridad',
      icon: Shield,
      description: 'Logs y seguridad'
    },
    {
      id: 'settings',
      name: 'Configuración',
      icon: Settings,
      description: 'Ajustes de la plataforma'
    }
  ];

  return (
    <aside className="w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="bg-purple-600 p-2 rounded-lg mr-3">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
            <p className="text-sm text-gray-600">Panel de Administración</p>
          </div>
        </div>
      </div>

      <nav className="p-4">
        <div className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "w-full flex items-start p-3 rounded-lg text-left transition-all duration-200 group",
                  isActive 
                    ? "bg-purple-100 border-purple-500 shadow-sm" 
                    : "hover:bg-gray-50 border-transparent"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 mt-0.5 mr-3 transition-colors",
                  isActive 
                    ? "text-purple-600" 
                    : "text-gray-500 group-hover:text-gray-700"
                )} />
                
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-sm transition-colors",
                    isActive 
                      ? "text-purple-900" 
                      : "text-gray-900 group-hover:text-gray-900"
                  )}>
                    {section.name}
                  </div>
                  <div className={cn(
                    "text-xs mt-1 transition-colors",
                    isActive 
                      ? "text-purple-700" 
                      : "text-gray-500 group-hover:text-gray-600"
                  )}>
                    {section.description}
                  </div>
                </div>
                
                {isActive && (
                  <div className="w-1 h-8 bg-purple-600 rounded-full ml-2"></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}