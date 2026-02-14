-- =====================================================
-- Migration 003: Exchange Rates and Revenue Reconciliation
-- Purpose: Support multi-currency normalization and financial reconciliation
-- Date: 2026-02-14
-- =====================================================

-- Exchange rates table for multi-currency support
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency TEXT NOT NULL DEFAULT 'usd',
    target_currency TEXT NOT NULL,
    rate NUMERIC(20, 10) NOT NULL, -- High precision for exchange rates
    effective_date DATE NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual', -- 'api', 'manual', 'fallback'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(base_currency, target_currency, effective_date),
    CHECK (rate > 0),
    CHECK (base_currency != target_currency)
);

CREATE INDEX idx_exchange_rates_lookup
ON exchange_rates(base_currency, target_currency, effective_date DESC);

CREATE INDEX idx_exchange_rates_date
ON exchange_rates(effective_date DESC);

-- Revenue reconciliation tracking
CREATE TABLE IF NOT EXISTS revenue_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,

    -- Local database metrics (in cents, normalized to base currency)
    local_revenue_cents BIGINT NOT NULL DEFAULT 0,
    local_refunds_cents BIGINT NOT NULL DEFAULT 0,
    local_net_revenue_cents BIGINT NOT NULL DEFAULT 0,
    local_invoice_count INTEGER NOT NULL DEFAULT 0,

    -- Stripe reported metrics (in cents, normalized to base currency)
    stripe_revenue_cents BIGINT NOT NULL DEFAULT 0,
    stripe_refunds_cents BIGINT NOT NULL DEFAULT 0,
    stripe_net_revenue_cents BIGINT NOT NULL DEFAULT 0,
    stripe_invoice_count INTEGER NOT NULL DEFAULT 0,

    -- Discrepancy tracking
    revenue_difference_cents BIGINT NOT NULL DEFAULT 0,
    refund_difference_cents BIGINT NOT NULL DEFAULT 0,
    net_difference_cents BIGINT NOT NULL DEFAULT 0,
    invoice_count_difference INTEGER NOT NULL DEFAULT 0,

    -- Status and metadata
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'warning', 'critical')),
    discrepancy_percent NUMERIC(5, 2),
    notes TEXT,
    reconciled_by UUID REFERENCES users(id),
    reconciled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, reconciliation_date)
);

CREATE INDEX idx_reconciliations_user_date
ON revenue_reconciliations(user_id, reconciliation_date DESC);

CREATE INDEX idx_reconciliations_status
ON revenue_reconciliations(status, reconciliation_date DESC)
WHERE status != 'ok';

-- Add timezone column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

CREATE INDEX idx_customers_timezone ON customers(timezone);

-- Add optimistic locking version to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_subscriptions_version ON subscriptions(id, version);

-- Revenue snapshots for historical immutability
CREATE TABLE IF NOT EXISTS revenue_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    snapshot_hour TIMESTAMPTZ NOT NULL, -- For intraday snapshots if needed

    -- Subscription metrics (in base currency cents)
    mrr_cents BIGINT NOT NULL DEFAULT 0,
    arr_cents BIGINT NOT NULL DEFAULT 0,

    -- Revenue breakdown
    gross_revenue_cents BIGINT NOT NULL DEFAULT 0,
    refunds_cents BIGINT NOT NULL DEFAULT 0,
    net_revenue_cents BIGINT NOT NULL DEFAULT 0,

    -- Customer metrics
    active_subscriptions INTEGER NOT NULL DEFAULT 0,
    trialing_subscriptions INTEGER NOT NULL DEFAULT 0,
    active_customers INTEGER NOT NULL DEFAULT 0,

    -- Churn metrics
    new_customers INTEGER NOT NULL DEFAULT 0,
    churned_customers INTEGER NOT NULL DEFAULT 0,

    -- Currency breakdown (JSONB for flexibility)
    revenue_by_currency JSONB NOT NULL DEFAULT '{}'::jsonb,
    revenue_by_tier JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_revenue_snapshots_user_date
ON revenue_snapshots(user_id, snapshot_date DESC);

-- SQL function for exchange rate lookup with fallback
CREATE OR REPLACE FUNCTION get_exchange_rate(
    from_currency TEXT,
    to_currency TEXT,
    rate_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
    exchange_rate NUMERIC;
    fallback_date DATE;
BEGIN
    -- Same currency = 1.0
    IF LOWER(from_currency) = LOWER(to_currency) THEN
        RETURN 1.0;
    END IF;

    -- Try exact date match
    SELECT rate INTO exchange_rate
    FROM exchange_rates
    WHERE LOWER(base_currency) = LOWER(to_currency)
      AND LOWER(target_currency) = LOWER(from_currency)
      AND effective_date = rate_date
    LIMIT 1;

    IF exchange_rate IS NOT NULL THEN
        RETURN 1.0 / exchange_rate;
    END IF;

    -- Fallback: Try most recent rate within 7 days
    SELECT rate, effective_date INTO exchange_rate, fallback_date
    FROM exchange_rates
    WHERE LOWER(base_currency) = LOWER(to_currency)
      AND LOWER(target_currency) = LOWER(from_currency)
      AND effective_date <= rate_date
      AND effective_date >= rate_date - INTERVAL '7 days'
    ORDER BY effective_date DESC
    LIMIT 1;

    IF exchange_rate IS NOT NULL THEN
        RAISE WARNING 'Using fallback exchange rate from % for date %',
            fallback_date, rate_date;
        RETURN 1.0 / exchange_rate;
    END IF;

    -- No rate found
    RAISE EXCEPTION 'No exchange rate found for % to % on or near %',
        from_currency, to_currency, rate_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert default exchange rates (1:1 for USD)
INSERT INTO exchange_rates (base_currency, target_currency, rate, effective_date, source)
VALUES ('usd', 'usd', 1.0, CURRENT_DATE, 'manual')
ON CONFLICT (base_currency, target_currency, effective_date) DO NOTHING;

-- Add trigger for updated_at on exchange_rates
CREATE TRIGGER update_exchange_rates_updated_at
BEFORE UPDATE ON exchange_rates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration complete
COMMENT ON TABLE exchange_rates IS 'Daily exchange rates for multi-currency revenue normalization';
COMMENT ON TABLE revenue_reconciliations IS 'Daily reconciliation between local DB and Stripe revenue';
COMMENT ON TABLE revenue_snapshots IS 'Historical immutable snapshots of revenue metrics';
