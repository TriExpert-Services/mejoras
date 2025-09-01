/*
  # Create VM specs table with pricing data

  1. New Tables
    - `vm_specs`
      - `id` (uuid, primary key)
      - `price_id` (text, unique) - Stripe price ID
      - `name` (text) - Product name
      - `cpu_cores` (integer) - Number of CPU cores
      - `ram_gb` (integer) - RAM in GB
      - `disk_gb` (integer) - Disk space in GB
      - `bandwidth_gb` (integer) - Bandwidth in GB
      - `monthly_price` (numeric) - Price per month
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `vm_specs` table
    - Add policy for authenticated users to read VM specs
    - Add policy for admin to manage VM specs

  3. Initial Data
    - Insert initial VM specification plans with Stripe price IDs
*/

-- Create VM specs table if it doesn't exist
CREATE TABLE IF NOT EXISTS vm_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id text UNIQUE NOT NULL,
  name text NOT NULL,
  cpu_cores integer NOT NULL,
  ram_gb integer NOT NULL,
  disk_gb integer NOT NULL,
  bandwidth_gb integer NOT NULL,
  monthly_price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vm_specs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "VM specs are publicly viewable" ON vm_specs;
DROP POLICY IF EXISTS "Admin can manage VM specs" ON vm_specs;
DROP POLICY IF EXISTS "Admin can update VM pricing" ON vm_specs;

-- Create policies for VM specs
CREATE POLICY "VM specs are publicly viewable"
  ON vm_specs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage VM specs"
  ON vm_specs
  FOR ALL
  TO authenticated
  USING (email() = 'admin@triexpertservice.com'::text)
  WITH CHECK (email() = 'admin@triexpertservice.com'::text);

-- Insert initial VM specs data
INSERT INTO vm_specs (price_id, name, cpu_cores, ram_gb, disk_gb, bandwidth_gb, monthly_price) VALUES
  ('price_1S1eJ0JkHWBWzjwgVcQlj38g', 'VPS Básico', 1, 2, 40, 2048, 6.00),
  ('price_1S1eNaJkHWBWzjwgqqUih4iB', 'VPS Standard', 2, 4, 80, 4096, 7.50),
  ('price_1S1eP2JkHWBWzjwgyoi0mSUW', 'VPS Premium', 4, 8, 160, 8192, 10.50),
  ('price_1S1eQ0JkHWBWzjwgou10GBIC', 'VPS Pro', 8, 16, 320, 16384, 16.50),
  ('price_1S1eR4JkHWBWzjwgRUrEqCu5', 'VPS Enterprise', 12, 32, 640, 24576, 25.00)
ON CONFLICT (price_id) DO UPDATE SET
  name = EXCLUDED.name,
  cpu_cores = EXCLUDED.cpu_cores,
  ram_gb = EXCLUDED.ram_gb,
  disk_gb = EXCLUDED.disk_gb,
  bandwidth_gb = EXCLUDED.bandwidth_gb,
  monthly_price = EXCLUDED.monthly_price,
  updated_at = now();

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for vm_specs if it doesn't exist
DROP TRIGGER IF EXISTS update_vm_specs_updated_at ON vm_specs;
CREATE TRIGGER update_vm_specs_updated_at
  BEFORE UPDATE ON vm_specs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();