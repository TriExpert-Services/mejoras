/*
  # Advanced Admin Features - IP Pools and Templates Management

  1. New Tables
    - `ip_pools` - Manage different IP ranges and networks
    - `custom_templates` - Store custom VM templates beyond defaults
    - `admin_settings` - Store global platform settings

  2. Security
    - Enable RLS on all new tables
    - Add policies for admin-only access

  3. Features
    - IP pool management with CIDR notation
    - Custom template storage and validation
    - Global settings for platform configuration
*/

-- IP Pools table for managing different IP ranges
CREATE TABLE IF NOT EXISTS ip_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cidr_range text NOT NULL, -- e.g., "10.0.0.0/24"
  gateway text NOT NULL, -- e.g., "10.0.0.1"
  start_ip inet NOT NULL, -- e.g., "10.0.0.100"
  end_ip inet NOT NULL, -- e.g., "10.0.0.254"
  vlan_id integer,
  bridge_name text DEFAULT 'vmbr0',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ip_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage IP pools"
  ON ip_pools
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@triexpertservice.com');

-- Custom Templates table for additional VM templates
CREATE TABLE IF NOT EXISTS custom_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id integer UNIQUE NOT NULL,
  name text NOT NULL,
  os text NOT NULL,
  version text NOT NULL,
  description text,
  icon text DEFAULT '📦',
  color text DEFAULT 'gray',
  ct_template text NOT NULL, -- Proxmox template filename
  is_active boolean DEFAULT true,
  min_cpu integer DEFAULT 1,
  min_ram_gb integer DEFAULT 1,
  min_disk_gb integer DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage custom templates"
  ON custom_templates
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@triexpertservice.com');

CREATE POLICY "Users can view active custom templates"
  ON custom_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admin Settings table for global configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  setting_type text DEFAULT 'string', -- string, number, boolean, json
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage settings"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@triexpertservice.com');

-- Add default IP pool
INSERT INTO ip_pools (name, description, cidr_range, gateway, start_ip, end_ip, vlan_id, bridge_name)
VALUES (
  'Default Network',
  'Red principal para VPS generales',
  '10.0.0.0/24',
  '10.0.0.1',
  '10.0.0.100',
  '10.0.0.254',
  200,
  'vmbr0'
) ON CONFLICT DO NOTHING;

-- Add some default admin settings
INSERT INTO admin_settings (setting_key, setting_value, description, setting_type)
VALUES 
  ('default_vm_bridge', 'vmbr0', 'Puente de red por defecto para VMs', 'string'),
  ('default_vm_vlan', '200', 'VLAN por defecto para nuevos VMs', 'number'),
  ('max_vms_per_user', '10', 'Máximo número de VMs por usuario', 'number'),
  ('auto_start_vms', 'true', 'Iniciar VMs automáticamente después de crearlos', 'boolean'),
  ('maintenance_mode', 'false', 'Modo mantenimiento de la plataforma', 'boolean')
ON CONFLICT (setting_key) DO NOTHING;

-- Add index for IP pool queries
CREATE INDEX IF NOT EXISTS idx_ip_pools_active ON ip_pools(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_templates_active ON custom_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ip_pools_updated_at') THEN
    CREATE TRIGGER update_ip_pools_updated_at
      BEFORE UPDATE ON ip_pools
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_templates_updated_at') THEN
    CREATE TRIGGER update_custom_templates_updated_at
      BEFORE UPDATE ON custom_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_settings_updated_at') THEN
    CREATE TRIGGER update_admin_settings_updated_at
      BEFORE UPDATE ON admin_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;