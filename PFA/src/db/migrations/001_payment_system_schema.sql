CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('card', 'ach_debit', 'sepa_debit', 'bacs_debit')),

    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER CHECK (card_exp_month BETWEEN 1 AND 12),
    card_exp_year INTEGER,
    card_fingerprint TEXT,

    bank_name TEXT,
    bank_last4 TEXT,
    bank_account_type TEXT,

    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    billing_name TEXT,
    billing_email TEXT,
    billing_address JSONB,

    requires_3ds BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_methods_customer_id ON payment_methods(customer_id);
CREATE INDEX idx_payment_methods_stripe_pm_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(customer_id, is_default) WHERE is_default = TRUE;

-- Defines available subscription tiers and pricing
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_price_id TEXT NOT NULL UNIQUE,
    stripe_product_id TEXT NOT NULL,

    -- Plan details
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),

    -- Pricing
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    billing_interval billing_interval NOT NULL,
    billing_interval_count INTEGER NOT NULL DEFAULT 1 CHECK (billing_interval_count > 0),

    -- Trial configuration
    trial_period_days INTEGER CHECK (trial_period_days >= 0),

    -- Features and limits
    features JSONB,
    limits JSONB,

    -- Metered billing
    usage_type TEXT CHECK (usage_type IN ('licensed', 'metered')),
    metered_aggregate TEXT CHECK (metered_aggregate IN ('sum', 'last_during_period', 'last_ever', 'max')),

    -- Status
    active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(active) WHERE active = TRUE;

-- ============================================================================
-- ENHANCED SUBSCRIPTIONS TABLE (Additional fields)
-- ============================================================================
-- Add missing fields to existing subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS default_payment_method_id UUID REFERENCES payment_methods(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pause_collection JSONB;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
-- Complete audit trail of all payment attempts
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,

    -- Stripe references
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,

    -- Transaction details
    type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'dispute', 'payout', 'adjustment')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'requires_action')),

    -- Amounts
    amount INTEGER NOT NULL,
    amount_refunded INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',

    -- Fee breakdown
    application_fee INTEGER,
    processing_fee INTEGER,
    net_amount INTEGER,

    -- Failure details
    failure_code TEXT,
    failure_message TEXT,

    -- Security
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    risk_level TEXT CHECK (risk_level IN ('normal', 'elevated', 'highest')),

    -- 3D Secure
    three_d_secure_status TEXT CHECK (three_d_secure_status IN ('required', 'optional', 'not_supported', 'authenticated')),

    -- Metadata
    description TEXT,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    succeeded_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_subscription_id ON transactions(subscription_id);
CREATE INDEX idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_stripe_pi_id ON transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================================
-- PAYMENT EVENTS LOG TABLE
-- ============================================================================
-- Detailed audit trail of all payment-related activities
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,

    -- Related entities
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,

    -- Event details
    event_data JSONB NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),

    -- Source tracking
    source TEXT NOT NULL CHECK (source IN ('api', 'webhook', 'system', 'admin')),
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX idx_payment_events_customer_id ON payment_events(customer_id);
CREATE INDEX idx_payment_events_subscription_id ON payment_events(subscription_id);
CREATE INDEX idx_payment_events_created_at ON payment_events(created_at DESC);
CREATE INDEX idx_payment_events_severity ON payment_events(severity) WHERE severity IN ('error', 'critical');

-- ============================================================================
-- BILLING HISTORY TABLE
-- ============================================================================
-- Complete payment timeline for customer communication
CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    -- History entry details
    action TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Amounts
    amount INTEGER,
    currency TEXT,

    -- Status
    success BOOLEAN NOT NULL,

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_history_customer_id ON billing_history(customer_id);
CREATE INDEX idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX idx_billing_history_created_at ON billing_history(created_at DESC);

-- ======================================================================
-- ENHANCED INVOICES TABLE (Additional fields)
-- ======================================================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'usd';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_remaining INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hosted_invoice_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_pdf TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_finalization_error TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS collection_method TEXT CHECK (collection_method IN ('charge_automatically', 'send_invoice'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- ============================================================================
-- INVOICE LINE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Stripe reference
    stripe_line_item_id TEXT,

    -- Item details
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_amount INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',

    -- Proration details
    is_proration BOOLEAN NOT NULL DEFAULT FALSE,
    proration_details JSONB,

    -- Tax
    tax_amounts JSONB,

    -- Period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- ============================================================================
-- DUNNING MANAGEMENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS dunning_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Attempt details
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    retry_at TIMESTAMPTZ NOT NULL,
    attempted_at TIMESTAMPTZ,

    -- Status
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'succeeded', 'failed', 'skipped')),

    -- Results
    transaction_id UUID REFERENCES transactions(id),
    failure_reason TEXT,

    -- Communication
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dunning_attempts_invoice_id ON dunning_attempts(invoice_id);
CREATE INDEX idx_dunning_attempts_retry_at ON dunning_attempts(retry_at) WHERE status = 'scheduled';
CREATE INDEX idx_dunning_attempts_status ON dunning_attempts(status);

-- ============================================================================
-- REFUNDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Stripe reference
    stripe_refund_id TEXT NOT NULL UNIQUE,

    -- Refund details
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    reason TEXT CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),

    -- Status
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),

    -- Metadata
    description TEXT,
    metadata JSONB,

    -- Approval workflow
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX idx_refunds_customer_id ON refunds(customer_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Stripe reference
    stripe_dispute_id TEXT NOT NULL UNIQUE,

    -- Dispute details
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('warning_needs_response', 'warning_under_review', 'warning_closed',
                                             'needs_response', 'under_review', 'charge_refunded', 'won', 'lost')),

    -- Evidence
    evidence JSONB,
    evidence_details JSONB,

    -- Deadlines
    evidence_due_by TIMESTAMPTZ,
    respond_by TIMESTAMPTZ,

    -- Resolution
    is_charge_refundable BOOLEAN,
    network_reason_code TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_customer_id ON disputes(customer_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_evidence_due_by ON disputes(evidence_due_by) WHERE status IN ('warning_needs_response', 'needs_response');

-- ============================================================================
-- COUPONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_coupon_id TEXT NOT NULL UNIQUE,

    -- Coupon details
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,

    -- Discount configuration
    percent_off DECIMAL(5,2) CHECK (percent_off > 0 AND percent_off <= 100),
    amount_off INTEGER CHECK (amount_off > 0),
    currency TEXT,

    -- Validity
    duration TEXT NOT NULL CHECK (duration IN ('once', 'repeating', 'forever')),
    duration_in_months INTEGER CHECK (duration_in_months > 0),

    -- Limits
    max_redemptions INTEGER,
    times_redeemed INTEGER NOT NULL DEFAULT 0,

    -- Status
    active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code ON coupons(code) WHERE active = TRUE;
CREATE INDEX idx_coupons_valid_until ON coupons(valid_until) WHERE valid_until IS NOT NULL;

-- ============================================================================
-- SUBSCRIPTION ITEMS TABLE (for multi-plan subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),

    -- Stripe reference
    stripe_subscription_item_id TEXT NOT NULL UNIQUE,

    -- Quantity
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_items_subscription_id ON subscription_items(subscription_id);

-- ============================================================================
-- USAGE RECORDS TABLE (for metered billing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_item_id UUID NOT NULL REFERENCES subscription_items(id) ON DELETE CASCADE,

    -- Stripe reference
    stripe_usage_record_id TEXT NOT NULL UNIQUE,

    -- Usage details
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    action TEXT NOT NULL CHECK (action IN ('increment', 'set')),

    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_records_subscription_item_id ON usage_records(subscription_item_id);
CREATE INDEX idx_usage_records_timestamp ON usage_records(timestamp DESC);

-- ============================================================================
-- PAYMENT CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Dunning configuration
    dunning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_retry_attempts INTEGER NOT NULL DEFAULT 4,
    retry_schedule JSONB NOT NULL DEFAULT '[3, 5, 7, 14]'::jsonb,
    -- Email configuration
    send_payment_failed_email BOOLEAN NOT NULL DEFAULT TRUE,
    send_payment_succeeded_email BOOLEAN NOT NULL DEFAULT TRUE,
    send_invoice_email BOOLEAN NOT NULL DEFAULT TRUE,
    send_receipt_email BOOLEAN NOT NULL DEFAULT TRUE,

    -- Grace period
    grace_period_days INTEGER NOT NULL DEFAULT 7,
    suspend_service_after_grace BOOLEAN NOT NULL DEFAULT TRUE,

    -- Webhooks
    webhook_url TEXT,
    webhook_secret TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(user_id)
);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one default payment method per customer
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE payment_methods
        SET is_default = FALSE
        WHERE customer_id = NEW.customer_id
        AND id != NEW.id
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_pm BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_payment_method();

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(nextval('invoice_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Active subscriptions with customer details
CREATE OR REPLACE VIEW v_active_subscriptions AS
SELECT
    s.id,
    s.stripe_subscription_id,
    s.status,
    s.amount,
    s.currency,
    s.billing_interval,
    s.current_period_start,
    s.current_period_end,
    c.id as customer_id,
    c.email as customer_email,
    c.name as customer_name,
    u.id as user_id,
    sp.name as plan_name,
    sp.tier as plan_tier
FROM subscriptions s
JOIN customers c ON s.customer_id = c.id
JOIN users u ON c.user_id = u.id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status IN ('active', 'trialing');

-- Failed payments requiring attention
CREATE OR REPLACE VIEW v_failed_payments_dunning AS
SELECT
    i.id as invoice_id,
    i.stripe_invoice_id,
    i.amount_due,
    i.currency,
    i.retry_count,
    i.payment_failed_at,
    i.next_retry_at,
    s.id as subscription_id,
    s.stripe_subscription_id,
    c.id as customer_id,
    c.email as customer_email,
    c.name as customer_name,
    COALESCE(da.attempt_number, 0) as dunning_attempts
FROM invoices i
JOIN subscriptions s ON i.subscription_id = s.id
JOIN customers c ON s.customer_id = c.id
LEFT JOIN dunning_attempts da ON i.id = da.invoice_id
WHERE i.status = 'open'
AND i.payment_failed_at IS NOT NULL
ORDER BY i.payment_failed_at ASC;

-- Revenue metrics
CREATE OR REPLACE VIEW v_revenue_metrics AS
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(DISTINCT customer_id) as customer_count,
    SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_revenue,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_transactions,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions
FROM transactions
WHERE type = 'payment'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ============================================================================
-- GRANT PERMISSIONS (adjust as needed for your user)
-- ============================================================================
-- Example: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- Example: GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON TABLE payment_methods IS 'Stores tokenized payment methods (never raw card data)';
COMMENT ON TABLE subscription_plans IS 'Defines available subscription tiers and pricing';
COMMENT ON TABLE transactions IS 'Complete audit trail of all payment attempts and outcomes';
COMMENT ON TABLE payment_events IS 'Detailed event log for payment operations and debugging';
COMMENT ON TABLE billing_history IS 'Customer-facing payment timeline';
COMMENT ON TABLE dunning_attempts IS 'Tracks failed payment retry attempts';
COMMENT ON TABLE refunds IS 'Refund processing and approval workflow';
COMMENT ON TABLE disputes IS 'Chargeback and dispute management';
