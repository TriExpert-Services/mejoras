/*
  # Add INSERT policy for orders table

  1. Security Changes
    - Add policy for authenticated users to insert their own orders
    - Allows users to create orders where user_id matches their auth.uid()

  2. Notes
    - This enables manual VM creation from admin panel
    - Maintains security by ensuring users can only create orders for themselves
*/

-- Add INSERT policy for orders table
CREATE POLICY "Users can insert their own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);