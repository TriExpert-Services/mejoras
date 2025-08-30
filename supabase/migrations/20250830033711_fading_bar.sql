/*
  # Populate custom templates with existing template configuration

  1. Data Population
    - Insert all existing templates from template-config.ts into custom_templates table
    - Templates include Ubuntu, Debian, AlmaLinux, Rocky Linux, CentOS, and Fedora
    - Each template has proper OS metadata, resource requirements, and CT template paths

  2. Template Configuration
    - Template IDs match the existing configuration (101-110)
    - Proper OS categorization and versioning
    - Minimum resource requirements for each template
    - Active status set to true for all templates

  3. Notes
    - These are the same templates used in the frontend configuration
    - CT template paths are configured for the actual Proxmox storage
    - All templates are marked as active and ready for use
*/

-- Insert all existing templates into the custom_templates table
INSERT INTO custom_templates (
  template_id, name, os, version, description, icon, color, ct_template, 
  is_active, min_cpu, min_ram_gb, min_disk_gb
) VALUES
  (101, 'Ubuntu 24.04 LTS', 'ubuntu', '24.04', 'Ubuntu 24.04 LTS Container - Rápido y eficiente para aplicaciones web', '🟠', 'orange', 'local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst', true, 1, 1, 20),
  (102, 'Ubuntu 22.04 LTS', 'ubuntu', '22.04', 'Ubuntu 22.04 LTS Container - Versión estable de larga duración', '🟠', 'orange', 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst', true, 1, 1, 20),
  (103, 'Ubuntu 25.04', 'ubuntu', '25.04', 'Ubuntu 25.04 Container - Última versión con características más recientes', '🟠', 'orange', 'local:vztmpl/ubuntu-25.04-standard_25.04-1.1_amd64.tar.zst', true, 1, 2, 25),
  (104, 'Debian 11', 'debian', '11', 'Debian 11 Bullseye Container - Sistema estable y ligero', '🔴', 'red', 'local:vztmpl/debian-11-standard_11.7-1_amd64.tar.zst', true, 1, 1, 20),
  (105, 'Debian 12', 'debian', '12', 'Debian 12 Bookworm Container - Sistema estable y confiable', '🔴', 'red', 'local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst', true, 1, 1, 20),
  (106, 'Debian 13', 'debian', '13', 'Debian 13 Trixie Container - Próxima generación estable', '🔴', 'red', 'local:vztmpl/debian-13-standard_13.0-1_amd64.tar.zst', true, 1, 2, 25),
  (107, 'AlmaLinux 9', 'almalinux', '9', 'AlmaLinux 9 Container - Distribución empresarial compatible con RHEL', '🔵', 'blue', 'local:vztmpl/almalinux-9-default_20240911_amd64.tar.xz', true, 1, 2, 25),
  (108, 'Rocky Linux 9', 'rocky', '9', 'Rocky Linux 9 Container - Distribución empresarial robusta', '🟢', 'green', 'local:vztmpl/rockylinux-9-default_20240912_amd64.tar.xz', true, 1, 2, 25),
  (109, 'CentOS Stream 9', 'centos', '9', 'CentOS Stream 9 Container - Versión rolling de CentOS', '🟡', 'yellow', 'local:vztmpl/centos-9-stream-default_20240826_amd64.tar.xz', true, 1, 2, 25),
  (110, 'Fedora 42', 'fedora', '42', 'Fedora 42 Container - Tecnologías más avanzadas y recientes', '🔵', 'blue', 'local:vztmpl/fedora-42-default_20250428_amd64.tar.xz', true, 2, 2, 30)
ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  os = EXCLUDED.os,
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  ct_template = EXCLUDED.ct_template,
  is_active = EXCLUDED.is_active,
  min_cpu = EXCLUDED.min_cpu,
  min_ram_gb = EXCLUDED.min_ram_gb,
  min_disk_gb = EXCLUDED.min_disk_gb,
  updated_at = now();