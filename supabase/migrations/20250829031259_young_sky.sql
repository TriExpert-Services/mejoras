/*
  # VPS Management and Order Processing

  1. New Tables
    - `vms`: Stores virtual machine instances
      - Links to authenticated users
      - Tracks VM configuration, status, and Proxmox details
      - Includes connection information (IP, credentials)
      
    - `orders`: Stores order information
      - Links orders to users and products
      - Tracks payment status and VM provisioning
      - References Stripe checkout sessions

    - `vm_specs`: Predefined VM specifications
      - CPU, RAM, disk, bandwidth configurations
      - Maps to Stripe price IDs
      - Used for VM creation templates

  2. Security
    - Enable RLS on all tables
    - Users can only view their own VMs and orders
    - Admin policies for management operations

  3. Status Types
    - VM status enum: pending, creating, running, stopped, error
    - Order status enum: pending, processing, completed, failed
*/

-- VM status enumeration
CREATE TYPE vm_status AS ENUM (
  'pending',
  'creating',
  'running',
  'stopped',
  'suspended',
  'error',
  'deleted'
);

-- Order status enumeration  
CREATE TYPE order_status AS ENUM (
  'pending',
  'processing', 
  'completed',
  'failed',
  'cancelled'
);

-- VM specifications table
CREATE TABLE IF NOT EXISTS vm_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id text UNIQUE NOT NULL,
  name text NOT NULL,
  cpu_cores integer NOT NULL,
  ram_gb integer NOT NULL,
  disk_gb integer NOT NULL,
  bandwidth_gb integer NOT NULL,
  monthly_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vm_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VM specs are publicly viewable"
  ON vm_specs
  FOR SELECT
  TO authenticated
  USING (true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  stripe_session_id text UNIQUE NOT NULL,
  stripe_payment_intent text,
  vm_spec_id uuid REFERENCES vm_specs(id) NOT NULL,
  status order_status DEFAULT 'pending' NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- VMs table
CREATE TABLE IF NOT EXISTS vms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  order_id uuid REFERENCES orders(id) NOT NULL,
  vm_spec_id uuid REFERENCES vm_specs(id) NOT NULL,
  
  -- VM identification
  name text NOT NULL,
  proxmox_vmid integer UNIQUE,
  
  -- VM configuration
  cpu_cores integer NOT NULL,
  ram_gb integer NOT NULL,
  disk_gb integer NOT NULL,
  
  -- Network configuration
  ip_address inet,
  ssh_port integer DEFAULT 22,
  
  -- Access credentials
  root_password text,
  
  -- Status and lifecycle
  status vm_status DEFAULT 'pending' NOT NULL,
  proxmox_node text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  provisioned_at timestamptz,
  suspended_at timestamptz,
  deleted_at timestamptz,
  
  -- Error handling
  error_message text,
  last_error_at timestamptz
);

ALTER TABLE vms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own VMs"
  ON vms
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can update their own VM status"
  ON vms
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Insert VM specifications based on the products
INSERT INTO vm_specs (price_id, name, cpu_cores, ram_gb, disk_gb, bandwidth_gb, monthly_price) VALUES
('price_1S05dfJkHWBWzjwgAERfprhv', 'VPS Básico', 1, 2, 40, 2000, 20.00),
('price_1S04lsJkHWBWzjwgX0EdVFB9', 'VPS Standard', 2, 4, 80, 4000, 20.00),
('price_1RzJWNJkHWBWzjwgU8cfOL59', 'VPS Premium', 4, 8, 160, 8000, 24.00),
('price_1RyMvTJkHWBWzjwgv48vwPF9', 'VPS Pro', 8, 16, 320, 16000, 50.00),
('price_1RyMtyJkHWBWzjwgUiFinRxB', 'VPS Enterprise', 12, 32, 640, 24000, 50.00)
ON CONFLICT (price_id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_vms_user_id ON vms(user_id);
CREATE INDEX IF NOT EXISTS idx_vms_proxmox_vmid ON vms(proxmox_vmid);
CREATE INDEX IF NOT EXISTS idx_vms_status ON vms(status);