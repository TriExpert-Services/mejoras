import { Dispatch, SetStateAction, RefAttributes } from 'react';
import { ForwardRefExoticComponent, LucideProps } from 'lucide-react'; // Or your icon library
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

// In AdminSidebar.tsx or wherever the props are defined
interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  menuItems: {
    id: string;
    label: string;
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  }[];
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
    <aside className="w-80 bg-gray-800 border-r border-gray-700 h-screen overflow-y-auto">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center">
          <div className="bg-red-600 p-2 rounded-lg mr-3">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            <p className="text-sm text-gray-400">Panel de Administración</p>
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
                    ? "bg-red-900 border-red-600 shadow-sm" 
                    : "hover:bg-gray-700 border-transparent"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 mt-0.5 mr-3 transition-colors",
                  isActive 
                    ? "text-red-400" 
                    : "text-gray-400 group-hover:text-gray-200"
                )} />
                
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-sm transition-colors",
                    isActive 
                      ? "text-red-100" 
                      : "text-gray-200 group-hover:text-white"
                  )}>
                    {section.name}
                  </div>
                  <div className={cn(
                    "text-xs mt-1 transition-colors",
                    isActive 
                      ? "text-red-200" 
                      : "text-gray-400 group-hover:text-gray-300"
                  )}>
                    {section.description}
                  </div>
                </div>
                
                {isActive && (
                  <div className="w-1 h-8 bg-red-500 rounded-full ml-2"></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
