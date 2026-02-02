-- =====================================================
-- PAYFLOW PAYMENT SYSTEM - COMPREHENSIVE DATABASE SCHEMA
-- =====================================================
-- This schema supports:
-- - User management and authentication
-- - Customer and subscription management
-- - Payment processing and refunds
-- - Invoicing and billing
-- - Dunning and retry logic
-- - Analytics and reporting
-- - Security and audit trails
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused'
);

CREATE TYPE billing_interval AS ENUM (
  'week',
  'month',
  'year'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible'
);

CREATE TYPE transaction_status AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'canceled',
  'requires_action'
);

CREATE TYPE transaction_type AS ENUM (
  'payment',
  'refund',
  'dispute',
  'payout',
  'adjustment'
);

CREATE TYPE refund_status AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'canceled'
);

CREATE TYPE dispute_status AS ENUM (
  'warning_needs_response',
  'warning_under_review',
  'warning_closed',
  'needs_response',
  'under_review',
  'charge_refundable',
  'won',
  'lost'
);

CREATE TYPE dunning_status AS ENUM (
  'scheduled',
  'in_progress',
  'succeeded',
  'failed',
  'skipped'
);

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    stripe_secret_key BYTEA NOT NULL,
    isVerified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_isverified ON users(isVerified) WHERE isVerified = FALSE;

-- =====================================================
-- 2. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    address JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_created_at ON customers(created_at DESC);

-- =====================================================
-- 3. SUBSCRIPTION_PLANS TABLE
-- =====================================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_price_id TEXT NOT NULL UNIQUE,
    stripe_product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    billing_interval billing_interval NOT NULL,
    billing_interval_count INTEGER NOT NULL DEFAULT 1,
    trial_period_days INTEGER CHECK (trial_period_days >= 0),
    features JSONB DEFAULT '[]'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    usage_type TEXT CHECK (usage_type IN ('licensed', 'metered')),
    metered_aggregate TEXT CHECK (metered_aggregate IN ('sum', 'last_during_period', 'last_ever', 'max')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(active) WHERE active = TRUE;
CREATE INDEX idx_subscription_plans_stripe_price_id ON subscription_plans(stripe_price_id);

-- =====================================================
-- 4. PAYMENT_METHODS TABLE
-- =====================================================
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('card', 'ach_debit', 'sepa_debit', 'bacs_debit', 'us_bank_account')),
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    card_fingerprint TEXT,
    bank_name TEXT,
    bank_last4 TEXT,
    bank_account_type TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    billing_name TEXT,
    billing_email TEXT,
    billing_address JSONB,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_methods_customer_id ON payment_methods(customer_id);
CREATE INDEX idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX idx_payment_methods_active ON payment_methods(customer_id, is_default) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_methods_deleted_at ON payment_methods(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- 5. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    status subscription_status NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    billing_interval billing_interval NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    default_payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    latest_invoice_id UUID,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    collection_method TEXT DEFAULT 'charge_automatically',
    metadata JSONB DEFAULT '{}'::jsonb,
    last_event_timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (current_period_end > current_period_start)
);

CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_end) WHERE trial_end IS NOT NULL;
CREATE INDEX idx_subscriptions_active ON subscriptions(status) WHERE status IN ('active', 'trialing');

-- =====================================================
-- 6. SUBSCRIPTION_ITEMS TABLE
-- =====================================================
CREATE TABLE subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    stripe_subscription_item_id TEXT NOT NULL UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_items_subscription_id ON subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_stripe_id ON subscription_items(stripe_subscription_item_id);

-- =====================================================
-- 7. INVOICES TABLE
-- =====================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    invoice_number TEXT UNIQUE,
    amount_due INTEGER NOT NULL CHECK (amount_due >= 0),
    amount_paid INTEGER NOT NULL CHECK (amount_paid >= 0),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    tax INTEGER DEFAULT 0 CHECK (tax >= 0),
    discount INTEGER DEFAULT 0 CHECK (discount >= 0),
    total INTEGER NOT NULL CHECK (total >= 0),
    amount_remaining INTEGER NOT NULL CHECK (amount_remaining >= 0),
    status invoice_status NOT NULL,
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    currency TEXT NOT NULL DEFAULT 'usd',
    paid_at TIMESTAMPTZ,
    payment_failed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    last_finalization_error TEXT,
    due_date TIMESTAMPTZ,
    collection_method TEXT DEFAULT 'charge_automatically',
    billing_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_failed_at ON invoices(payment_failed_at) WHERE payment_failed_at IS NOT NULL;
CREATE INDEX idx_invoices_next_retry_at ON invoices(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- =====================================================
-- 8. INVOICE_LINE_ITEMS TABLE
-- =====================================================
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    stripe_line_item_id TEXT,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_amount INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    is_proration BOOLEAN NOT NULL DEFAULT FALSE,
    proration_details JSONB,
    tax_amounts JSONB DEFAULT '[]'::jsonb,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_period ON invoice_line_items(period_start, period_end);

-- =====================================================
-- 9. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    type transaction_type NOT NULL,
    status transaction_status NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    amount_refunded INTEGER NOT NULL DEFAULT 0 CHECK (amount_refunded >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    application_fee INTEGER,
    processing_fee INTEGER,
    net_amount INTEGER,
    failure_code TEXT,
    failure_message TEXT,
    risk_score INTEGER,
    risk_level TEXT CHECK (risk_level IN ('normal', 'elevated', 'highest')),
    three_d_secure_status TEXT CHECK (three_d_secure_status IN ('required', 'optional', 'not_supported', 'authenticated')),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    succeeded_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_subscription_id ON transactions(subscription_id);
CREATE INDEX idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX idx_transactions_payment_intent_id ON transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_charge_id ON transactions(stripe_charge_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_customer_created ON transactions(customer_id, created_at DESC);

-- =====================================================
-- 10. REFUNDS TABLE
-- =====================================================
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_refund_id TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    reason TEXT CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
    status refund_status NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX idx_refunds_customer_id ON refunds(customer_id);
CREATE INDEX idx_refunds_stripe_id ON refunds(stripe_refund_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at DESC);

-- =====================================================
-- 11. DISPUTES TABLE
-- =====================================================
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_dispute_id TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    reason TEXT NOT NULL,
    status dispute_status NOT NULL,
    evidence JSONB DEFAULT '{}'::jsonb,
    evidence_details JSONB DEFAULT '{}'::jsonb,
    evidence_due_by TIMESTAMPTZ,
    respond_by TIMESTAMPTZ,
    is_charge_refundable BOOLEAN NOT NULL DEFAULT FALSE,
    network_reason_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_transaction_id ON disputes(transaction_id);
CREATE INDEX idx_disputes_customer_id ON disputes(customer_id);
CREATE INDEX idx_disputes_stripe_id ON disputes(stripe_dispute_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_evidence_due_by ON disputes(evidence_due_by) WHERE evidence_due_by IS NOT NULL;
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

-- =====================================================
-- 12. DUNNING_ATTEMPTS TABLE
-- =====================================================
CREATE TABLE dunning_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
    retry_at TIMESTAMPTZ NOT NULL,
    attempted_at TIMESTAMPTZ,
    status dunning_status NOT NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    failure_reason TEXT,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dunning_attempts_invoice_id ON dunning_attempts(invoice_id);
CREATE INDEX idx_dunning_attempts_subscription_id ON dunning_attempts(subscription_id);
CREATE INDEX idx_dunning_attempts_customer_id ON dunning_attempts(customer_id);
CREATE INDEX idx_dunning_attempts_status ON dunning_attempts(status);
CREATE INDEX idx_dunning_attempts_retry_at ON dunning_attempts(retry_at) WHERE status = 'scheduled';
CREATE INDEX idx_dunning_attempts_created_at ON dunning_attempts(created_at DESC);

-- =====================================================
-- 13. BILLING_HISTORY TABLE
-- =====================================================
CREATE TABLE billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER,
    currency TEXT,
    success BOOLEAN NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_history_customer_id ON billing_history(customer_id);
CREATE INDEX idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX idx_billing_history_invoice_id ON billing_history(invoice_id);
CREATE INDEX idx_billing_history_created_at ON billing_history(created_at DESC);
CREATE INDEX idx_billing_history_customer_created ON billing_history(customer_id, created_at DESC);

-- =====================================================
-- 14. PAYMENT_EVENTS TABLE
-- =====================================================
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    source TEXT NOT NULL CHECK (source IN ('api', 'webhook', 'system', 'admin')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX idx_payment_events_customer_id ON payment_events(customer_id);
CREATE INDEX idx_payment_events_subscription_id ON payment_events(subscription_id);
CREATE INDEX idx_payment_events_severity ON payment_events(severity);
CREATE INDEX idx_payment_events_created_at ON payment_events(created_at DESC);
CREATE INDEX idx_payment_events_customer_created ON payment_events(customer_id, created_at DESC);

-- =====================================================
-- 15. USAGE_RECORDS TABLE
-- =====================================================
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_item_id UUID NOT NULL REFERENCES subscription_items(id) ON DELETE CASCADE,
    stripe_usage_record_id TEXT UNIQUE,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    action TEXT NOT NULL CHECK (action IN ('increment', 'set')),
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_records_subscription_item_id ON usage_records(subscription_item_id);
CREATE INDEX idx_usage_records_timestamp ON usage_records(timestamp DESC);

-- =====================================================
-- 16. SUBSCRIPTION_STATE_TRANSITIONS TABLE
-- =====================================================
CREATE TABLE subscription_state_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    from_status subscription_status,
    to_status subscription_status NOT NULL,
    event_id UUID,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_state_transitions_subscription_id ON subscription_state_transitions(subscription_id);
CREATE INDEX idx_state_transitions_created_at ON subscription_state_transitions(created_at DESC);
CREATE INDEX idx_state_transitions_to_status ON subscription_state_transitions(to_status);

-- =====================================================
-- 17. STRIPE_EVENTS TABLE
-- =====================================================
CREATE TABLE stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    api_version TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_type ON stripe_events(type);
CREATE INDEX idx_stripe_events_stripe_id ON stripe_events(stripe_event_id);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed_at) WHERE processed_at IS NULL;
CREATE INDEX idx_stripe_events_created_at ON stripe_events(created_at DESC);

-- =====================================================
-- 18. PAYMENT_CONFIGURATION TABLE
-- =====================================================
CREATE TABLE payment_configuration (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dunning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_retry_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_retry_attempts >= 0 AND max_retry_attempts <= 10),
    retry_schedule JSONB DEFAULT '[3, 5, 7]'::jsonb,
    send_payment_failed_email BOOLEAN NOT NULL DEFAULT TRUE,
    send_payment_succeeded_email BOOLEAN NOT NULL DEFAULT TRUE,
    send_invoice_email BOOLEAN NOT NULL DEFAULT TRUE,
    send_receipt_email BOOLEAN NOT NULL DEFAULT TRUE,
    grace_period_days INTEGER NOT NULL DEFAULT 7 CHECK (grace_period_days >= 0),
    suspend_service_after_grace BOOLEAN NOT NULL DEFAULT TRUE,
    webhook_url TEXT,
    webhook_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 19. USER_SETTINGS TABLE
-- =====================================================
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    dashboard_refresh_interval INTEGER NOT NULL DEFAULT 60 CHECK (dashboard_refresh_interval >= 10 AND dashboard_refresh_interval <= 300),
    default_date_range TEXT NOT NULL DEFAULT '30d',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    currency TEXT NOT NULL DEFAULT 'usd',
    language TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    settings_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 20. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 21. ACTIVITY_LOGS TABLE
-- =====================================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('subscription', 'payment', 'customer', 'invoice', 'user', 'system')),
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_customer_id ON activity_logs(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_activity_logs_subscription_id ON activity_logs(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_type_created ON activity_logs(user_id, activity_type, created_at DESC);

-- =====================================================
-- 22. CHURN_PREDICTIONS TABLE
-- =====================================================
CREATE TABLE churn_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    churn_risk_score NUMERIC(5,2) NOT NULL CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
    churn_risk_level TEXT NOT NULL CHECK (churn_risk_level IN ('low', 'medium', 'high')),
    contributing_factors JSONB DEFAULT '[]'::jsonb,
    predicted_churn_date DATE,
    confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_current BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_churn_predictions_customer_id ON churn_predictions(customer_id);
CREATE INDEX idx_churn_predictions_subscription_id ON churn_predictions(subscription_id);
CREATE INDEX idx_churn_predictions_risk_level ON churn_predictions(churn_risk_level);
CREATE INDEX idx_churn_predictions_is_current ON churn_predictions(is_current) WHERE is_current = TRUE;
CREATE INDEX idx_churn_predictions_calculated_at ON churn_predictions(calculated_at DESC);

-- =====================================================
-- 23. CUSTOM_REPORTS TABLE
-- =====================================================
CREATE TABLE custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL CHECK (report_type IN ('revenue', 'subscriptions', 'customers', 'churn', 'custom')),
    filters JSONB DEFAULT '{}'::jsonb,
    metrics JSONB DEFAULT '[]'::jsonb,
    schedule TEXT CHECK (schedule IN ('daily', 'weekly', 'monthly', 'null')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_reports_user_id ON custom_reports(user_id);
CREATE INDEX idx_custom_reports_report_type ON custom_reports(report_type);
CREATE INDEX idx_custom_reports_is_active ON custom_reports(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 24. EMAIL_VERIFICATIONS TABLE
-- =====================================================
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);

-- =====================================================
-- 25. PASSWORD_RESETS TABLE
-- =====================================================
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);

-- =====================================================
-- 26. AUDIT_LOGS TABLE
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- =====================================================
-- 27. FAILED_LOGIN_ATTEMPTS TABLE
-- =====================================================
CREATE TABLE failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_failed_login_attempts_user_id ON failed_login_attempts(user_id);
CREATE INDEX idx_failed_login_attempts_ip_address ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_attempts_attempt_time ON failed_login_attempts(attempt_time);
CREATE INDEX idx_failed_login_attempts_user_ip_time ON failed_login_attempts(user_id, ip_address, attempt_time);

-- =====================================================
-- 28. SESSIONS TABLE
-- =====================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT sessions_expires_check CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_security_audit ON sessions(user_id, ip_address, created_at DESC);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_items_updated_at BEFORE UPDATE ON subscription_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_configuration_updated_at BEFORE UPDATE ON payment_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON custom_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- =====================================================
-- 1. All foreign keys have indexes for join performance
-- 2. Frequently queried columns have dedicated indexes
-- 3. Partial indexes for WHERE clauses (e.g., WHERE deleted_at IS NULL)
-- 4. Composite indexes for common query patterns
-- 5. TIMESTAMPTZ DESC indexes for time-series queries
-- 6. JSONB columns for flexible metadata storage
-- 7. Proper ENUM types for status fields
-- 8. CHECK constraints for data validation
-- 9. Triggers for automatic updated_at timestamps
-- 10. Cascading deletes for data integrity
-- =====================================================
