import React from 'react';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard,
  Server,
  Activity,
  Settings,
  CreditCard,
  FileText,
  HelpCircle,
  BarChart3,
  Shield
} from 'lucide-react';

interface UserSidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
}

export function UserSidebar({ currentSection, onSectionChange }: UserSidebarProps) {
  const sections = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Vista general de tus VPS'
    },
    {
      id: 'servers',
      name: 'Mis Servidores',
      icon: Server,
      description: 'Administrar VPS activos'
    },
    {
      id: 'metrics',
      name: 'Métricas',
      icon: Activity,
      description: 'Rendimiento en tiempo real'
    },
    {
      id: 'monitoring',
      name: 'Monitoreo',
      icon: BarChart3,
      description: 'Estadísticas detalladas'
    },
    {
      id: 'billing',
      name: 'Facturación',
      icon: CreditCard,
      description: 'Suscripciones y pagos'
    },
    {
      id: 'security',
      name: 'Seguridad',
      icon: Shield,
      description: 'Configuración de acceso'
    },
    {
      id: 'settings',
      name: 'Configuración',
      icon: Settings,
      description: 'Preferencias de cuenta'
    },
    {
      id: 'support',
      name: 'Soporte',
      icon: HelpCircle,
      description: 'Ayuda y documentación'
    }
  ];

  return (
    <aside className="w-72 bg-gray-800 border-r border-gray-700 h-screen overflow-y-auto">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center">
          <div className="bg-red-600 p-2 rounded-lg mr-3">
            <Server className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Mis VPS</h2>
            <p className="text-sm text-gray-400">Panel de Control</p>
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