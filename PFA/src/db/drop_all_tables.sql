DROP TABLE IF EXISTS custom_reports CASCADE;
DROP TABLE IF EXISTS churn_predictions CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS failed_login_attempts CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS payment_configuration CASCADE;
DROP TABLE IF EXISTS usage_records CASCADE;
DROP TABLE IF EXISTS payment_events CASCADE;
DROP TABLE IF EXISTS billing_history CASCADE;
DROP TABLE IF EXISTS dunning_attempts CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS subscription_items CASCADE;
DROP TABLE IF EXISTS subscription_state_transitions CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS stripe_events CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS dunning_status CASCADE;
DROP TYPE IF EXISTS dispute_status CASCADE;
DROP TYPE IF EXISTS refund_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS billing_interval CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Confirmation message
SELECT 'All tables, types, and functions dropped successfully!' as status;
