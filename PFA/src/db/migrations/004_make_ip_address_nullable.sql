-- Migration: Make ip_address nullable in failed_login_attempts
-- Description: Allow null IP addresses for enhanced security when IP cannot be determined
-- This prevents shared rate limit pools and enables email-based rate limiting fallback
-- Date: 2026-02-14

-- Make ip_address column nullable
ALTER TABLE failed_login_attempts
ALTER COLUMN ip_address DROP NOT NULL;

-- Add partial index for non-null IP addresses (more efficient)
CREATE INDEX idx_failed_login_attempts_ip_address_not_null
ON failed_login_attempts(ip_address, attempt_time)
WHERE ip_address IS NOT NULL;

-- Update the original index comment for clarity
COMMENT ON INDEX idx_failed_login_attempts_user_id IS 'Index for email-based rate limiting when IP is unavailable';
COMMENT ON INDEX idx_failed_login_attempts_ip_address IS 'Index for IP-based rate limiting';
COMMENT ON INDEX idx_failed_login_attempts_attempt_time IS 'Index for time-based cleanup queries';
