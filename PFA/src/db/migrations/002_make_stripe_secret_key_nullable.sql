-- =====================================================
-- Migration: Make stripe_secret_key nullable
-- =====================================================
-- Description: The stripe_secret_key should be nullable since users
-- don't have Stripe credentials when they first register.
-- They will add these credentials later in their profile settings.
-- =====================================================

ALTER TABLE users
ALTER COLUMN stripe_secret_key DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN users.stripe_secret_key IS 'Encrypted Stripe secret key - optional, added by user after registration';
