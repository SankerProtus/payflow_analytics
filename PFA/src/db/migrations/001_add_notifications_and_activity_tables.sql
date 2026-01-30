-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'info', 'success', 'warning', 'error'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    CHECK (type IN ('info', 'success', 'warning', 'error')),
    CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE notifications IS 'System notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type: info, success, warning, error';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, medium, high, critical';
COMMENT ON COLUMN notifications.metadata IS 'Additional context data for the notification';

-- =====================================================
-- 2. ACTIVITY_LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL, -- 'subscription', 'payment', 'customer', 'invoice', 'user'
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'failed', 'succeeded'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (activity_type IN ('subscription', 'payment', 'customer', 'invoice', 'user', 'system'))
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_customer_id ON activity_logs(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_activity_logs_subscription_id ON activity_logs(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_type_created ON activity_logs(user_id, activity_type, created_at DESC);

COMMENT ON TABLE activity_logs IS 'Detailed activity and audit trail for all system actions';
COMMENT ON COLUMN activity_logs.activity_type IS 'Category of activity: subscription, payment, customer, invoice, user, system';
COMMENT ON COLUMN activity_logs.action IS 'The specific action performed';
COMMENT ON COLUMN activity_logs.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional context data (old values, new values, etc.)';

-- =====================================================
-- 3. USER_SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    dashboard_refresh_interval INTEGER NOT NULL DEFAULT 60, -- seconds
    default_date_range TEXT NOT NULL DEFAULT '30d', -- '7d', '30d', '90d', '1y'
    timezone TEXT NOT NULL DEFAULT 'UTC',
    currency TEXT NOT NULL DEFAULT 'usd',
    language TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'light', -- 'light', 'dark', 'auto'
    settings_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (theme IN ('light', 'dark', 'auto')),
    CHECK (dashboard_refresh_interval >= 10 AND dashboard_refresh_interval <= 300)
);

COMMENT ON TABLE user_settings IS 'User preferences and dashboard settings';
COMMENT ON COLUMN user_settings.dashboard_refresh_interval IS 'Auto-refresh interval in seconds (10-300)';
COMMENT ON COLUMN user_settings.default_date_range IS 'Default date range for reports (7d, 30d, 90d, 1y)';
COMMENT ON COLUMN user_settings.settings_json IS 'Additional custom settings in JSON format';

-- =====================================================
-- 4. CUSTOM_REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL, -- 'revenue', 'subscriptions', 'customers', 'custom'
    filters JSONB DEFAULT '{}'::jsonb,
    metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    schedule TEXT, -- 'daily', 'weekly', 'monthly', null for manual
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (report_type IN ('revenue', 'subscriptions', 'customers', 'churn', 'custom'))
);

CREATE INDEX idx_custom_reports_user_id ON custom_reports(user_id);
CREATE INDEX idx_custom_reports_is_active ON custom_reports(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE custom_reports IS 'User-defined custom reports and their configurations';
COMMENT ON COLUMN custom_reports.filters IS 'JSON object containing filter criteria';
COMMENT ON COLUMN custom_reports.metrics IS 'JSON array of metrics to include in the report';
COMMENT ON COLUMN custom_reports.schedule IS 'Auto-generation schedule (daily, weekly, monthly) or null for manual';

-- =====================================================
-- 5. CHURN_PREDICTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS churn_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    churn_risk_score NUMERIC(5,2) NOT NULL CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
    churn_risk_level TEXT NOT NULL, -- 'low', 'medium', 'high'
    contributing_factors JSONB DEFAULT '[]'::jsonb,
    predicted_churn_date DATE,
    confidence_score NUMERIC(5,2), -- 0-100
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    CHECK (churn_risk_level IN ('low', 'medium', 'high')),
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);

CREATE INDEX idx_churn_predictions_customer_id ON churn_predictions(customer_id);
CREATE INDEX idx_churn_predictions_risk_level ON churn_predictions(churn_risk_level);
CREATE INDEX idx_churn_predictions_is_current ON churn_predictions(is_current) WHERE is_current = TRUE;
CREATE INDEX idx_churn_predictions_calculated_at ON churn_predictions(calculated_at DESC);

COMMENT ON TABLE churn_predictions IS 'ML-based churn predictions for active customers';
COMMENT ON COLUMN churn_predictions.churn_risk_score IS 'Numerical risk score from 0-100';
COMMENT ON COLUMN churn_predictions.contributing_factors IS 'JSON array of factors contributing to churn risk';
COMMENT ON COLUMN churn_predictions.is_current IS 'Whether this is the most recent prediction';

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to automatically create notifications for important events
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'low',
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, priority, metadata)
    VALUES (p_user_id, p_type, p_title, p_message, p_priority, p_metadata)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_action TEXT,
    p_description TEXT,
    p_customer_id UUID DEFAULT NULL,
    p_subscription_id UUID DEFAULT NULL,
    p_invoice_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO activity_logs (
        user_id, customer_id, subscription_id, invoice_id,
        activity_type, action, description, metadata
    )
    VALUES (
        p_user_id, p_customer_id, p_subscription_id, p_invoice_id,
        p_activity_type, p_action, p_description, p_metadata
    )
    RETURNING id INTO activity_id;

    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
      AND is_read = TRUE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger to update user_settings.updated_at
CREATE OR REPLACE FUNCTION update_user_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_settings_timestamp
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_timestamp();

-- Trigger to automatically create notification for failed payments
CREATE OR REPLACE FUNCTION notify_payment_failure()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_customer_name TEXT;
    v_amount NUMERIC;
BEGIN
    -- Only trigger on new payment failures
    IF NEW.payment_failed_at IS NOT NULL AND
       (OLD.payment_failed_at IS NULL OR NEW.retry_count > OLD.retry_count) THEN

        -- Get user_id and customer info
        SELECT c.user_id, c.name, s.amount / 100.0
        INTO v_user_id, v_customer_name, v_amount
        FROM subscriptions s
        JOIN customers c ON s.customer_id = c.id
        WHERE s.id = NEW.subscription_id;

        -- Create notification
        PERFORM create_notification(
            v_user_id,
            'error',
            'Payment Failed',
            COALESCE(v_customer_name, 'A customer') || ' payment of $' || v_amount || ' failed (attempt ' || NEW.retry_count || ')',
            CASE WHEN NEW.retry_count >= 3 THEN 'high' ELSE 'medium' END,
            jsonb_build_object(
                'invoice_id', NEW.id,
                'retry_count', NEW.retry_count,
                'amount', NEW.amount_due
            )
        );

        -- Log activity
        PERFORM log_activity(
            v_user_id,
            'payment',
            'failed',
            'Payment failed for invoice ' || NEW.stripe_invoice_id || ' (attempt ' || NEW.retry_count || ')',
            (SELECT customer_id FROM subscriptions WHERE id = NEW.subscription_id),
            NEW.subscription_id,
            NEW.id,
            jsonb_build_object('retry_count', NEW.retry_count, 'amount', NEW.amount_due)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_payment_failure
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION notify_payment_failure();

-- Trigger to log subscription state changes
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user_id
    SELECT c.user_id INTO v_user_id
    FROM customers c
    WHERE c.id = NEW.customer_id;

    -- Log the activity
    IF TG_OP = 'INSERT' THEN
        PERFORM log_activity(
            v_user_id,
            'subscription',
            'created',
            'New subscription created',
            NEW.customer_id,
            NEW.id,
            NULL,
            jsonb_build_object('status', NEW.status, 'amount', NEW.amount)
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        PERFORM log_activity(
            v_user_id,
            'subscription',
            'status_changed',
            'Subscription status changed from ' || OLD.status || ' to ' || NEW.status,
            NEW.customer_id,
            NEW.id,
            NULL,
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_subscription_change
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION log_subscription_change();

-- =====================================================
-- 8. DEFAULT DATA
-- =====================================================

-- Create default settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_status
    ON invoices(subscription_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_status
    ON subscriptions(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_failed_recent
    ON invoices(payment_failed_at DESC)
    WHERE payment_failed_at >= NOW() - INTERVAL '30 days';

COMMENT ON INDEX idx_invoices_failed_recent IS 'Index for recent payment failures dashboard widget';

-- =====================================================
-- Migration Complete
-- =====================================================
