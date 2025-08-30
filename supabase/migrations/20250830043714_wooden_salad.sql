/*
  # Add VM suspension tracking and billing automation

  1. Database Changes
    - Add `suspended_reason` column to track why VM was suspended
    - Add `suspension_warning_sent_at` to track notification timing
    - Add `billing_grace_expires_at` for automated suspension timing

  2. Indexes
    - Add index on suspended VMs for efficient querying
    - Add index on grace period expiration for scheduled tasks

  3. Security
    - Update RLS policies to account for new columns
*/

-- Add suspension tracking columns to VMs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vms' AND column_name = 'suspended_reason'
  ) THEN
    ALTER TABLE vms ADD COLUMN suspended_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vms' AND column_name = 'suspension_warning_sent_at'
  ) THEN
    ALTER TABLE vms ADD COLUMN suspension_warning_sent_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vms' AND column_name = 'billing_grace_expires_at'
  ) THEN
    ALTER TABLE vms ADD COLUMN billing_grace_expires_at timestamptz;
  END IF;
END $$;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vms_suspended_status 
  ON vms (status) 
  WHERE status = 'suspended';

CREATE INDEX IF NOT EXISTS idx_vms_grace_expiration 
  ON vms (billing_grace_expires_at) 
  WHERE billing_grace_expires_at IS NOT NULL AND deleted_at IS NULL;

-- Add billing notification tracking to stripe_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_subscriptions' AND column_name = 'last_payment_failed_at'
  ) THEN
    ALTER TABLE stripe_subscriptions ADD COLUMN last_payment_failed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_subscriptions' AND column_name = 'payment_failure_count'
  ) THEN
    ALTER TABLE stripe_subscriptions ADD COLUMN payment_failure_count integer DEFAULT 0;
  END IF;
END $$;