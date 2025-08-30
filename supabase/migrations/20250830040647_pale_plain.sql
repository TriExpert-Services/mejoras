/*
  # Admin permissions for VM specs management

  1. Security Updates
    - Add admin policies for vm_specs table
    - Allow admin to update pricing information
    - Maintain read access for authenticated users

  2. Admin Capabilities
    - UPDATE: price_id and monthly_price fields
    - INSERT: new VM specifications
    - All operations for admin@triexpertservice.com

  3. User Access
    - SELECT: continues as before (publicly viewable)
*/

-- Add admin policies for vm_specs table
CREATE POLICY "Admin can manage VM specs"
  ON vm_specs
  FOR ALL
  TO authenticated
  USING (email() = 'admin@triexpertservice.com'::text)
  WITH CHECK (email() = 'admin@triexpertservice.com'::text);

-- Ensure admin can update pricing
CREATE POLICY "Admin can update VM pricing"
  ON vm_specs
  FOR UPDATE
  TO authenticated
  USING (email() = 'admin@triexpertservice.com'::text)
  WITH CHECK (email() = 'admin@triexpertservice.com'::text);