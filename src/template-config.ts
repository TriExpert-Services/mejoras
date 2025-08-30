// Available Proxmox VM templates
export interface Template {
  id: number;
  name: string;
  os: string;
  version: string;
  description: string;
  icon: string;
  color: string;
}

export const templates: Template[] = [
  {
    id: 101,
    name: 'Ubuntu 24.04 LTS',
    os: 'ubuntu',
    version: '24.04',
    description: 'Ubuntu Server 24.04 LTS - Recomendado para la mayoría de aplicaciones',
    icon: '🟠',
    color: 'orange'
  },
  {
    id: 102,
    name: 'Ubuntu 22.04 LTS',
    os: 'ubuntu',
    version: '22.04', 
    description: 'Ubuntu Server 22.04 LTS - Versión estable de larga duración',
    icon: '🟠',
    color: 'orange'
  },
  {
    id: 103,
    name: 'Ubuntu 25.04',
    os: 'ubuntu',
    version: '25.04',
    description: 'Ubuntu Server 25.04 - Última versión con características más recientes',
    icon: '🟠',
    color: 'orange'
  },
  {
    id: 104,
    name: 'Debian 11',
    os: 'debian',
    version: '11',
    description: 'Debian 11 Bullseye - Sistema estable y confiable',
    icon: '🔴',
    color: 'red'
  },
  {
    id: 105,
    name: 'Debian 12',
    os: 'debian',
    version: '12',
    description: 'Debian 12 Bookworm - Versión actual estable',
    icon: '🔴',
    color: 'red'
  },
  {
    id: 106,
    name: 'Debian 13',
    os: 'debian',
    version: '13',
    description: 'Debian 13 Trixie - Versión testing más reciente',
    icon: '🔴',
    color: 'red'
  },
  {
    id: 107,
    name: 'AlmaLinux 9.6',
    os: 'almalinux',
    version: '9.6',
    description: 'AlmaLinux 9.6 - Distribución empresarial compatible con RHEL',
    icon: '🔵',
    color: 'blue'
  },
  {
    id: 108,
    name: 'Rocky Linux 9',
    os: 'rocky',
    version: '9',
    description: 'Rocky Linux 9 - Distribución empresarial robusta',
    icon: '🟢',
    color: 'green'
  }
];

export function getTemplateById(id: number): Template | undefined {
  return templates.find(template => template.id === id);
}

export function getTemplatesByOS(os: string): Template[] {
  return templates.filter(template => template.os === os);
}

// Default template recommendations by use case
export const defaultTemplates = {
  web: 101,      // Ubuntu 24.04 LTS
  development: 103, // Ubuntu 25.04 (latest)
  enterprise: 107,  // AlmaLinux 9.6
  stable: 102,      // Ubuntu 22.04 LTS
};