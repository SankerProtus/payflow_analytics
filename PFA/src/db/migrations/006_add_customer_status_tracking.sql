-- Migration: Add Customer Status Tracking
-- Purpose: Add status column to customers table for better performance and consistency
-- Date: 2026-03-02

-- Create customer_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE customer_status AS ENUM (
            'active',      -- Has at least one active subscription
            'trialing',    -- Has trial subscriptions only
            'past_due',    -- Has past_due subscriptions
            'canceled',    -- All subscriptions canceled
            'paused',      -- All subscriptions paused
            'inactive'     -- No subscriptions or all ended
        );
    END IF;
END$$;

-- Add status column to customers table with default 'inactive'
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS status customer_status NOT NULL DEFAULT 'inactive';

-- Create index for efficient status-based queries
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_user_status ON customers(user_id, status);

-- Function to update customer status based on their subscriptions
CREATE OR REPLACE FUNCTION update_customer_status()
RETURNS TRIGGER AS $$
DECLARE
  customer_uuid UUID;
  new_status customer_status;
BEGIN
  -- Determine which customer to update
  IF TG_OP = 'DELETE' THEN
    customer_uuid := OLD.customer_id;
  ELSE
    customer_uuid := NEW.customer_id;
  END IF;

  -- Calculate new status based on subscription states
  SELECT
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'past_due') > 0 THEN 'past_due'::customer_status
      WHEN COUNT(*) FILTER (WHERE status = 'active') > 0 THEN 'active'::customer_status
      WHEN COUNT(*) FILTER (WHERE status = 'trialing') > 0 THEN 'trialing'::customer_status
      WHEN COUNT(*) FILTER (WHERE status = 'canceled') > 0 THEN 'canceled'::customer_status
      WHEN COUNT(*) FILTER (WHERE status = 'paused') > 0 THEN 'paused'::customer_status
      ELSE 'inactive'::customer_status
    END
  INTO new_status
  FROM subscriptions
  WHERE customer_id = customer_uuid;

  -- If no subscriptions found, default to inactive
  IF new_status IS NULL THEN
    new_status := 'inactive'::customer_status;
  END IF;

  -- Update customer status
  UPDATE customers
  SET status = new_status
  WHERE id = customer_uuid;

  RETURN NULL; -- For AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- Create trigger on subscriptions to auto-update customer status
DROP TRIGGER IF EXISTS trigger_update_customer_status ON subscriptions;
CREATE TRIGGER trigger_update_customer_status
AFTER INSERT OR UPDATE OF status OR DELETE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_customer_status();

-- Initialize status for existing customers
UPDATE customers c
SET status = (
  SELECT
    CASE
      WHEN COUNT(*) FILTER (WHERE s.status = 'past_due') > 0 THEN 'past_due'::customer_status
      WHEN COUNT(*) FILTER (WHERE s.status = 'active') > 0 THEN 'active'::customer_status
      WHEN COUNT(*) FILTER (WHERE s.status = 'trialing') > 0 THEN 'trialing'::customer_status
      WHEN COUNT(*) FILTER (WHERE s.status = 'canceled') > 0 THEN 'canceled'::customer_status
      WHEN COUNT(*) FILTER (WHERE s.status = 'paused') > 0 THEN 'paused'::customer_status
      ELSE 'inactive'::customer_status
    END
  FROM subscriptions s
  WHERE s.customer_id = c.id
);

-- Ensure customers with no subscriptions are set to inactive
UPDATE customers
SET status = 'inactive'::customer_status
WHERE id NOT IN (SELECT DISTINCT customer_id FROM subscriptions);

-- Add comment for documentation
COMMENT ON COLUMN customers.status IS 'Automatically maintained status based on subscription states. Updated via trigger.';
COMMENT ON FUNCTION update_customer_status() IS 'Automatically updates customer status when subscriptions change';
