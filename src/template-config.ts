// Available Proxmox LXC CT templates
export interface Template {
  id: number;
  name: string;
  os: string;
  version: string;
  description: string;
  icon: string;
  color: string;
  ctTemplate: string; // Actual CT template filename from storage
}

export const templates: Template[] = [
  {
    id: 101,
    name: 'Ubuntu 24.04 LTS',
    os: 'ubuntu',
    version: '24.04',
    description: 'Ubuntu 24.04 LTS Container - Rápido y eficiente para aplicaciones web',
    icon: '🟠',
    color: 'orange',
    ctTemplate: 'local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst'
  },
  {
    id: 102,
    name: 'Ubuntu 22.04 LTS',
    os: 'ubuntu',
    version: '22.04', 
    description: 'Ubuntu 22.04 LTS Container - Versión estable de larga duración',
    icon: '🟠',
    color: 'orange',
    ctTemplate: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst'
  },
  {
    id: 103,
    name: 'Ubuntu 25.04',
    os: 'ubuntu',
    version: '25.04',
    description: 'Ubuntu 25.04 Container - Última versión con características más recientes',
    icon: '🟠',
    color: 'orange',
    ctTemplate: 'local:vztmpl/ubuntu-25.04-standard_25.04-1.1_amd64.tar.zst'
  },
  {
    id: 104,
    name: 'Debian 11',
    os: 'debian',
    version: '11',
    description: 'Debian 11 Bullseye Container - Sistema estable y ligero',
    icon: '🔴',
    color: 'red',
    ctTemplate: 'local:vztmpl/debian-11-standard_11.7-1_amd64.tar.zst'
  },
  {
    id: 105,
    name: 'Debian 12',
    os: 'debian',
    version: '12',
    description: 'Debian 12 Bookworm Container - Sistema estable y confiable',
    icon: '🔴',
    color: 'red',
    ctTemplate: 'local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst'
  },
  {
    id: 106,
    name: 'Debian 13',
    os: 'debian',
    version: '13',
    description: 'Debian 13 Trixie Container - Próxima generación estable',
    icon: '🔴',
    color: 'red',
    ctTemplate: 'local:vztmpl/debian-13-standard_13.0-1_amd64.tar.zst'
  },
  {
    id: 107,
    name: 'AlmaLinux 9',
    os: 'almalinux',
    version: '9',
    description: 'AlmaLinux 9 Container - Distribución empresarial compatible con RHEL',
    icon: '🔵',
    color: 'blue',
    ctTemplate: 'local:vztmpl/almalinux-9-default_20240911_amd64.tar.xz'
  },
  {
    id: 108,
    name: 'Rocky Linux 9',
    os: 'rocky',
    version: '9',
    description: 'Rocky Linux 9 Container - Distribución empresarial robusta',
    icon: '🟢',
    color: 'green',
    ctTemplate: 'local:vztmpl/rockylinux-9-default_20240912_amd64.tar.xz'
  },
  {
    id: 109,
    name: 'CentOS Stream 9',
    os: 'centos',
    version: '9',
    description: 'CentOS Stream 9 Container - Versión rolling de CentOS',
    icon: '🟡',
    color: 'yellow',
    ctTemplate: 'local:vztmpl/centos-9-stream-default_20240826_amd64.tar.xz'
  },
  {
    id: 110,
    name: 'Fedora 42',
    os: 'fedora',
    version: '42',
    description: 'Fedora 42 Container - Tecnologías más avanzadas y recientes',
    icon: '🔵',
    color: 'blue',
    ctTemplate: 'local:vztmpl/fedora-42-default_20250428_amd64.tar.xz'
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
  enterprise: 107,  // AlmaLinux 9
  stable: 102,      // Ubuntu 22.04 LTS
};