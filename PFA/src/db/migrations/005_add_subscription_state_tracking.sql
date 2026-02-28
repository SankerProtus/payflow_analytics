-- Migration: Add subscription state transition tracking
-- Purpose: Track all status changes for audit and debugging
-- Date: 2024

-- Add subscription_state_transitions table
CREATE TABLE IF NOT EXISTS subscription_state_transitions (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscription_state_transitions_subscription_id
  ON subscription_state_transitions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_state_transitions_created_at
  ON subscription_state_transitions(created_at DESC);

-- Add idempotency_keys table for duplicate prevention
CREATE TABLE IF NOT EXISTS subscription_idempotency_keys (
  id SERIAL PRIMARY KEY,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_subscription_idempotency_keys_key
  ON subscription_idempotency_keys(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_subscription_idempotency_keys_user_customer
  ON subscription_idempotency_keys(user_id, customer_id);

-- Clean up expired idempotency keys (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM subscription_idempotency_keys
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to prevent multiple active subscriptions for same plan
-- (Optional - depends on business rules)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription_per_plan
  ON subscriptions(customer_id, plan_id)
  WHERE status IN ('active', 'trialing');

-- Add column for tracking webhook coordination (if not exists)
-- This prevents race conditions between API and webhooks
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(20) DEFAULT 'webhook'
  CHECK (created_via IN ('api', 'webhook', 'migration'));

-- Add index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_metadata_gin
  ON subscriptions USING gin(metadata);

-- Add invoice retry tracking columns (if not exist)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_finalization_error TEXT;

-- Add index for dunning management
CREATE INDEX IF NOT EXISTS idx_invoices_next_retry
  ON invoices(next_retry_at)
  WHERE status = 'open' AND next_retry_at IS NOT NULL;

COMMENT ON TABLE subscription_state_transitions IS 'Tracks all subscription status changes for audit trail';
COMMENT ON TABLE subscription_idempotency_keys IS 'Prevents duplicate subscription creation';
COMMENT ON COLUMN subscriptions.created_via IS 'Tracks whether subscription was created via API, webhook, or migration';
