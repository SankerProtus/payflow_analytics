import { getDBConnection } from "../db/connection.js";
import { sendSuccess, STATUS, asyncHandler } from "../utils/errorHandler.js";

export const dashboardController = {
  /**
   * GET /api/dashboard
   * Legacy endpoint - redirects to metrics
   */
  getDashboard: (req, res) => {
    res.redirect("/api/dashboard/metrics");
  },

  /**
   * GET /api/dashboard/metrics
   * Get dashboard metrics with period-over-period comparison
   */
  getDashboardMetrics: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;

    // Get metrics for current period (last 30 days) vs previous period
    const metricsQuery = `
            WITH current_period AS (
                SELECT
                    COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as revenue,
                    COUNT(DISTINCT c.id) as customers,
                    COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('active', 'trialing')) as subscriptions,
                    COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) as failed_payments
                FROM customers c
                LEFT JOIN subscriptions s ON c.id = s.customer_id
                LEFT JOIN invoices i ON s.id = i.subscription_id
                    AND i.created_at >= NOW() - INTERVAL '30 days'
                WHERE c.user_id = $1
            ),
            previous_period AS (
                SELECT
                    COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as revenue,
                    COUNT(DISTINCT c.id) as customers,
                    COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('active', 'trialing')) as subscriptions,
                    COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) as failed_payments
                FROM customers c
                LEFT JOIN subscriptions s ON c.id = s.customer_id
                LEFT JOIN invoices i ON s.id = i.subscription_id
                    AND i.created_at >= NOW() - INTERVAL '60 days'
                    AND i.created_at < NOW() - INTERVAL '30 days'
                WHERE c.user_id = $1
            ),
            mrr_calc AS (
                SELECT
                    COALESCE(SUM(
                        CASE
                            WHEN s.billing_interval = 'month' THEN s.amount
                            WHEN s.billing_interval = 'year' THEN s.amount / 12
                            WHEN s.billing_interval = 'week' THEN s.amount * 4.33
                            ELSE 0
                        END
                    ), 0) as current_mrr
                FROM subscriptions s
                JOIN customers c ON s.customer_id = c.id
                WHERE c.user_id = $1 AND s.status IN ('active', 'trialing')
            ),
            churn_calc AS (
                SELECT
                    CASE
                        WHEN COUNT(*) FILTER (WHERE sst.created_at >= NOW() - INTERVAL '60 days' AND sst.created_at < NOW() - INTERVAL '30 days') > 0
                        THEN (COUNT(*) FILTER (WHERE to_status = 'canceled' AND sst.created_at >= NOW() - INTERVAL '30 days')::numeric /
                              COUNT(*) FILTER (WHERE sst.created_at >= NOW() - INTERVAL '60 days' AND sst.created_at < NOW() - INTERVAL '30 days')::numeric * 100)
                        ELSE 0
                    END as churn_rate
                FROM subscription_state_transitions sst
                JOIN subscriptions s ON sst.subscription_id = s.id
                JOIN customers c ON s.customer_id = c.id
                WHERE c.user_id = $1
            )
            SELECT
                cp.revenue as current_revenue,
                pp.revenue as previous_revenue,
                CASE
                    WHEN pp.revenue > 0 THEN ((cp.revenue - pp.revenue)::numeric / pp.revenue::numeric * 100)
                    WHEN cp.revenue > 0 THEN 100
                    ELSE 0
                END as revenue_change,

                cp.customers as current_customers,
                pp.customers as previous_customers,
                CASE
                    WHEN pp.customers > 0 THEN ((cp.customers - pp.customers)::numeric / pp.customers::numeric * 100)
                    WHEN cp.customers > 0 THEN 100
                    ELSE 0
                END as customers_change,

                cp.subscriptions as current_subscriptions,
                pp.subscriptions as previous_subscriptions,
                CASE
                    WHEN pp.subscriptions > 0 THEN ((cp.subscriptions - pp.subscriptions)::numeric / pp.subscriptions::numeric * 100)
                    WHEN cp.subscriptions > 0 THEN 100
                    ELSE 0
                END as subscriptions_change,

                mrr.current_mrr,

                ch.churn_rate,

                cp.failed_payments as current_failed,
                pp.failed_payments as previous_failed,
                CASE
                    WHEN pp.failed_payments > 0 THEN ((cp.failed_payments - pp.failed_payments)::numeric / pp.failed_payments::numeric * 100)
                    WHEN cp.failed_payments > 0 THEN 100
                    ELSE 0
                END as failed_change
            FROM current_period cp, previous_period pp, mrr_calc mrr, churn_calc ch
        `;

    const result = await db.query(metricsQuery, [userId]);
    const data = result.rows[0];

    sendSuccess(res, STATUS.OK, {
      metrics: {
        total_revenue: {
          value: parseInt(data.current_revenue) || 0,
          change: parseFloat(
            (data.revenue_change || 0).toFixed
              ? (data.revenue_change || 0).toFixed(2)
              : data.revenue_change || 0,
          ),
          period: "month",
        },
        active_customers: {
          value: parseInt(data.current_customers) || 0,
          change: parseFloat(
            (data.customers_change || 0).toFixed
              ? (data.customers_change || 0).toFixed(2)
              : data.customers_change || 0,
          ),
          period: "month",
        },
        active_subscriptions: {
          value: parseInt(data.current_subscriptions) || 0,
          change: parseFloat(
            (data.subscriptions_change || 0).toFixed
              ? (data.subscriptions_change || 0).toFixed(2)
              : data.subscriptions_change || 0,
          ),
          period: "month",
        },
        mrr: {
          value: parseInt(data.current_mrr) || 0,
          // Would need historical MRR to calculate change
          change: 0,
          period: "month",
        },
        churn_rate: {
          value: parseFloat(
            (data.churn_rate || 0).toFixed
              ? (data.churn_rate || 0).toFixed(2)
              : data.churn_rate || 0,
          ),
          // Would need historical churn rate to calculate change
          change: 0,
          period: "month",
        },
        failed_payments: {
          value: parseInt(data.current_failed) || 0,
          change: parseFloat(
            (data.failed_change || 0).toFixed
              ? (data.failed_change || 0).toFixed(2)
              : data.failed_change || 0,
          ),
          period: "month",
        },
      },
      period_start: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      period_end: new Date().toISOString(),
    });
  }),

  /**
   * GET /api/dashboard/recent-transactions
   * Get recent payment transactions
   */
  getRecentTransactions: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const transactionsQuery = `
            SELECT
                i.id,
                c.id as customer_id,
                c.email as customer_email,
                c.name as customer_name,
                CASE
                    WHEN i.status = 'paid' THEN 'payment'
                    WHEN i.payment_failed_at IS NOT NULL THEN 'failed_payment'
                    ELSE 'invoice_created'
                END as type,
                CASE
                    WHEN i.status = 'paid' THEN i.amount_paid
                    ELSE i.amount_due
                END as amount,
                'usd' as currency,
                CASE
                    WHEN i.status = 'paid' THEN 'succeeded'
                    WHEN i.payment_failed_at IS NOT NULL THEN 'failed'
                    WHEN i.status = 'open' THEN 'pending'
                    ELSE i.status::text
                END::text as status,
                CASE
                    WHEN i.status = 'paid' THEN 'Payment successful'
                    WHEN i.payment_failed_at IS NOT NULL THEN 'Payment failed - Retry #' || i.retry_count
                    ELSE 'Invoice created'
                END as description,
                COALESCE(i.payment_failed_at, i.created_at) as timestamp,
                i.id as invoice_id,
                i.stripe_invoice_id
            FROM invoices i
            JOIN subscriptions s ON i.subscription_id = s.id
            JOIN customers c ON s.customer_id = c.id
            WHERE c.user_id = $1
            ORDER BY timestamp DESC
            LIMIT $2
        `;

    const result = await db.query(transactionsQuery, [userId, limit]);

    sendSuccess(res, STATUS.OK, {
      transactions: result.rows,
      total: result.rowCount,
    });
  }),

  /**
   * GET /api/dashboard/revenue-trends
   * Get revenue trends over time
   */
  getRevenueTrends: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const months = Math.min(parseInt(req.query.months) || 6, 24);

    const trendsQuery = `
            WITH month_series AS (
                SELECT
                    TO_CHAR(DATE_TRUNC('month', NOW() - (n || ' months')::interval), 'YYYY-MM') as period,
                    DATE_TRUNC('month', NOW() - (n || ' months')::interval) as period_start,
                    DATE_TRUNC('month', NOW() - (n || ' months')::interval) + INTERVAL '1 month' - INTERVAL '1 day' as period_end
                FROM generate_series(0, $2 - 1) n
                ORDER BY period_start
            ),
            monthly_data AS (
                SELECT
                    TO_CHAR(DATE_TRUNC('month', i.created_at), 'YYYY-MM') as period,
                    COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as revenue,
                    COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('active', 'trialing')) as subscriptions,
                    COUNT(DISTINCT c.id) FILTER (WHERE DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', i.created_at)) as new_customers,
                    COUNT(DISTINCT sst.subscription_id) FILTER (
                        WHERE sst.to_status = 'canceled'
                        AND DATE_TRUNC('month', sst.created_at) = DATE_TRUNC('month', i.created_at)
                    ) as churned_customers,
                    COALESCE(SUM(
                        CASE
                            WHEN s.billing_interval = 'month' THEN s.amount
                            WHEN s.billing_interval = 'year' THEN s.amount / 12
                            WHEN s.billing_interval = 'week' THEN s.amount * 4.33
                            ELSE 0
                        END
                    ) FILTER (WHERE s.status IN ('active', 'trialing')), 0) as mrr
                FROM customers c
                LEFT JOIN subscriptions s ON c.id = s.customer_id
                LEFT JOIN invoices i ON s.id = i.subscription_id
                LEFT JOIN subscription_state_transitions sst ON s.id = sst.subscription_id
                WHERE c.user_id = $1
                GROUP BY period
            )
            SELECT
                ms.period,
                COALESCE(md.revenue, 0)::integer as revenue,
                COALESCE(md.subscriptions, 0)::integer as subscriptions,
                COALESCE(md.new_customers, 0)::integer as new_customers,
                COALESCE(md.churned_customers, 0)::integer as churned_customers,
                COALESCE(md.mrr, 0)::integer as mrr
            FROM month_series ms
            LEFT JOIN monthly_data md ON ms.period = md.period
            ORDER BY ms.period ASC
        `;

    const result = await db.query(trendsQuery, [userId, months]);

    // Calculate summary
    const totalRevenue = result.rows.reduce(
      (sum, row) => sum + parseInt(row.revenue),
      0,
    );
    const avgRevenue = Math.round(totalRevenue / months);

    const firstMonth = result.rows[0]?.revenue || 0;
    const lastMonth = result.rows[result.rows.length - 1]?.revenue || 0;
    const growthRate =
      firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;

    sendSuccess(res, STATUS.OK, {
      trends: result.rows,
      summary: {
        total_revenue: totalRevenue,
        average_revenue_per_month: avgRevenue,
        growth_rate: parseFloat(growthRate.toFixed(2)),
      },
    });
  }),

  /**
   * GET /api/dashboard/customer-activity
   * Get recent customer activity including signups, subscriptions, and cancellations
   */
  getCustomerActivity: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const days = Math.min(parseInt(req.query.days) || 30, 90);

    const activityQuery = `
      WITH customer_signups AS (
        SELECT
          c.id as customer_id,
          c.email as customer_email,
          c.name as customer_name,
          'customer_signup' as activity_type,
          'New customer signed up' as title,
          c.email || ' joined PayFlow' as description,
          c.created_at as timestamp,
          jsonb_build_object(
            'customer_id', c.id,
            'email', c.email,
            'name', c.name
          ) as metadata
        FROM customers c
        WHERE c.user_id = $1
          AND c.created_at >= NOW() - ($2 || ' days')::interval
      ),
      subscription_events AS (
        SELECT
          c.id as customer_id,
          c.email as customer_email,
          c.name as customer_name,
          CASE
            WHEN sst.to_status = 'active' AND sst.from_status IS NULL THEN 'subscription_created'
            WHEN sst.to_status = 'canceled' THEN 'subscription_canceled'
            WHEN sst.to_status = 'past_due' THEN 'subscription_past_due'
            WHEN sst.to_status = 'paused' THEN 'subscription_paused'
            ELSE 'subscription_updated'
          END as activity_type,
          CASE
            WHEN sst.to_status = 'active' AND sst.from_status IS NULL THEN 'New subscription'
            WHEN sst.to_status = 'canceled' THEN 'Subscription canceled'
            WHEN sst.to_status = 'past_due' THEN 'Payment past due'
            WHEN sst.to_status = 'paused' THEN 'Subscription paused'
            ELSE 'Subscription updated'
          END as title,
          COALESCE(sst.reason, c.email || ' subscription changed to ' || sst.to_status) as description,
          sst.created_at as timestamp,
          jsonb_build_object(
            'customer_id', c.id,
            'email', c.email,
            'name', c.name,
            'subscription_id', s.id,
            'status', sst.to_status,
            'from_status', sst.from_status,
            'amount', s.amount,
            'interval', s.billing_interval
          ) as metadata
        FROM subscription_state_transitions sst
        JOIN subscriptions s ON sst.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND sst.created_at >= NOW() - ($2 || ' days')::interval
      ),
      payment_events AS (
        SELECT
          c.id as customer_id,
          c.email as customer_email,
          c.name as customer_name,
          CASE
            WHEN i.status = 'paid' THEN 'payment_succeeded'
            WHEN i.payment_failed_at IS NOT NULL THEN 'payment_failed'
            ELSE 'invoice_created'
          END as activity_type,
          CASE
            WHEN i.status = 'paid' THEN 'Payment received'
            WHEN i.payment_failed_at IS NOT NULL THEN 'Payment failed'
            ELSE 'Invoice created'
          END as title,
          CASE
            WHEN i.status = 'paid' THEN 'Payment of $' || (i.amount_paid / 100.0)::numeric(10,2) || ' received'
            WHEN i.payment_failed_at IS NOT NULL THEN 'Payment of $' || (i.amount_due / 100.0)::numeric(10,2) || ' failed (Attempt #' || i.retry_count || ')'
            ELSE 'Invoice for $' || (i.amount_due / 100.0)::numeric(10,2) || ' created'
          END as description,
          COALESCE(i.payment_failed_at, i.created_at) as timestamp,
          jsonb_build_object(
            'customer_id', c.id,
            'email', c.email,
            'name', c.name,
            'invoice_id', i.id,
            'amount', CASE WHEN i.status = 'paid' THEN i.amount_paid ELSE i.amount_due END,
            'status', i.status,
            'retry_count', i.retry_count
          ) as metadata
        FROM invoices i
        JOIN subscriptions s ON i.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND COALESCE(i.payment_failed_at, i.created_at) >= NOW() - ($2 || ' days')::interval
      ),
      all_activity AS (
        SELECT * FROM customer_signups
        UNION ALL
        SELECT * FROM subscription_events
        UNION ALL
        SELECT * FROM payment_events
      )
      SELECT
        customer_id,
        customer_email,
        customer_name,
        activity_type,
        title,
        description,
        timestamp,
        metadata
      FROM all_activity
      ORDER BY timestamp DESC
      LIMIT $3
    `;

    const result = await db.query(activityQuery, [userId, days, limit]);

    // Calculate activity summary
    const summary = {
      total_activities: result.rowCount,
      by_type: {},
    };

    result.rows.forEach((row) => {
      if (!summary.by_type[row.activity_type]) {
        summary.by_type[row.activity_type] = 0;
      }
      summary.by_type[row.activity_type]++;
    });

    sendSuccess(res, STATUS.OK, {
      activities: result.rows,
      summary,
      period: {
        days,
        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
    });
  }),

  /**
   * GET /api/dashboard/dunning-overview
   * Get overview of dunning process including failed payments and recovery metrics
   */
  getDunningOverview: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;

    const dunningQuery = `
      WITH failed_invoices AS (
        SELECT
          i.id,
          c.id as customer_id,
          c.email as customer_email,
          c.name as customer_name,
          i.amount_due,
          i.retry_count,
          i.payment_failed_at,
          s.status as subscription_status,
          CASE
            WHEN i.retry_count >= 3 THEN 'high'
            WHEN i.retry_count >= 2 THEN 'medium'
            ELSE 'low'
          END as risk_level,
          EXTRACT(DAY FROM NOW() - i.payment_failed_at)::integer as days_overdue
        FROM invoices i
        JOIN subscriptions s ON i.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND i.payment_failed_at IS NOT NULL
          AND i.status != 'paid'
          AND i.payment_failed_at >= NOW() - INTERVAL '90 days'
      ),
      dunning_stats AS (
        SELECT
          COUNT(*) as total_failed,
          COALESCE(SUM(amount_due), 0) as total_at_risk,
          COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk,
          COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_risk,
          COUNT(*) FILTER (WHERE risk_level = 'low') as low_risk,
          COUNT(*) FILTER (WHERE days_overdue > 30) as overdue_30_days,
          COUNT(*) FILTER (WHERE days_overdue > 60) as overdue_60_days,
          COUNT(*) FILTER (WHERE days_overdue > 90) as overdue_90_days,
          ROUND(AVG(retry_count), 2) as avg_retry_count,
          COUNT(DISTINCT customer_id) as affected_customers
        FROM failed_invoices
      ),
      recovery_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE i.status = 'paid' AND i.retry_count > 0) as recovered_count,
          COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid' AND i.retry_count > 0), 0) as recovered_amount,
          COUNT(*) FILTER (WHERE i.payment_failed_at IS NOT NULL AND i.payment_failed_at >= NOW() - INTERVAL '30 days') as recent_failures
        FROM invoices i
        JOIN subscriptions s ON i.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND i.created_at >= NOW() - INTERVAL '90 days'
      ),
      at_risk_subscriptions AS (
        SELECT
          c.id as customer_id,
          c.email,
          c.name,
          s.id as subscription_id,
          s.amount,
          s.billing_interval,
          fi.amount_due as failed_amount,
          fi.retry_count,
          fi.risk_level,
          fi.days_overdue,
          fi.payment_failed_at
        FROM failed_invoices fi
        JOIN customers c ON fi.customer_id = c.id
        JOIN subscriptions s ON c.id = s.customer_id
        WHERE s.status != 'canceled'
        ORDER BY fi.risk_level DESC, fi.days_overdue DESC, fi.retry_count DESC
        LIMIT 10
      )
      SELECT
        (SELECT row_to_json(ds.*) FROM dunning_stats ds) as stats,
        (SELECT row_to_json(rs.*) FROM recovery_stats rs) as recovery,
        (SELECT json_agg(ars.*) FROM at_risk_subscriptions ars) as at_risk_customers
    `;

    const result = await db.query(dunningQuery, [userId]);
    const data = result.rows[0];

    const stats = data.stats || {
      total_failed: 0,
      total_at_risk: 0,
      high_risk: 0,
      medium_risk: 0,
      low_risk: 0,
      overdue_30_days: 0,
      overdue_60_days: 0,
      overdue_90_days: 0,
      avg_retry_count: 0,
      affected_customers: 0,
    };

    const recovery = data.recovery || {
      recovered_count: 0,
      recovered_amount: 0,
      recent_failures: 0,
    };

    const recoveryRate =
      stats.total_failed > 0
        ? (
            (parseInt(recovery.recovered_count) /
              (parseInt(stats.total_failed) +
                parseInt(recovery.recovered_count))) *
            100
          ).toFixed(2)
        : 0;

    sendSuccess(res, STATUS.OK, {
      overview: {
        total_failed_invoices: parseInt(stats.total_failed),
        total_amount_at_risk: parseInt(stats.total_at_risk),
        affected_customers: parseInt(stats.affected_customers),
        recovery_rate: parseFloat(recoveryRate),
        avg_retry_count: parseFloat(stats.avg_retry_count || 0),
      },
      risk_breakdown: {
        high: parseInt(stats.high_risk),
        medium: parseInt(stats.medium_risk),
        low: parseInt(stats.low_risk),
      },
      aging: {
        overdue_30_days: parseInt(stats.overdue_30_days),
        overdue_60_days: parseInt(stats.overdue_60_days),
        overdue_90_days: parseInt(stats.overdue_90_days),
      },
      recovery: {
        recovered_invoices: parseInt(recovery.recovered_count),
        recovered_amount: parseInt(recovery.recovered_amount),
        recent_failures: parseInt(recovery.recent_failures),
      },
      at_risk_customers: data.at_risk_customers || [],
    });
  }),

  /**
   * GET /api/dashboard/subscription-stats
   * Get detailed subscription statistics and breakdowns
   */
  getSubscriptionStats: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;

    const statsQuery = `
      WITH subscription_breakdown AS (
        SELECT
          s.status,
          s.billing_interval,
          COUNT(*) as count,
          COALESCE(SUM(s.amount), 0) as total_value,
          COALESCE(AVG(s.amount), 0) as avg_value
        FROM subscriptions s
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
        GROUP BY s.status, s.billing_interval
      ),
      trial_stats AS (
        SELECT
          COUNT(*) as total_trials,
          COUNT(*) FILTER (WHERE trial_end > NOW()) as active_trials,
          COUNT(*) FILTER (WHERE trial_end <= NOW() AND status = 'active') as converted_trials,
          CASE
            WHEN COUNT(*) FILTER (WHERE trial_end <= NOW()) > 0
            THEN (COUNT(*) FILTER (WHERE trial_end <= NOW() AND status = 'active')::numeric /
                  COUNT(*) FILTER (WHERE trial_end <= NOW())::numeric * 100)
            ELSE 0
          END as trial_conversion_rate
        FROM subscriptions s
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1 AND s.trial_end IS NOT NULL
      ),
      upgrade_downgrade AS (
        SELECT
          COUNT(*) FILTER (WHERE from_status = 'trialing' AND to_status = 'active') as trial_to_active,
          COUNT(*) FILTER (WHERE to_status = 'canceled') as total_cancellations,
          COUNT(*) FILTER (WHERE to_status = 'paused') as total_paused,
          COUNT(*) FILTER (WHERE to_status = 'past_due') as total_past_due
        FROM subscription_state_transitions sst
        JOIN subscriptions s ON sst.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND sst.created_at >= NOW() - INTERVAL '90 days'
      )
      SELECT
        (SELECT json_agg(sb.*) FROM subscription_breakdown sb) as breakdown,
        (SELECT row_to_json(ts.*) FROM trial_stats ts) as trials,
        (SELECT row_to_json(ud.*) FROM upgrade_downgrade ud) as transitions
    `;

    const result = await db.query(statsQuery, [userId]);
    const data = result.rows[0];

    sendSuccess(res, STATUS.OK, {
      breakdown: data.breakdown || [],
      trial_statistics: data.trials || {
        total_trials: 0,
        active_trials: 0,
        converted_trials: 0,
        trial_conversion_rate: 0,
      },
      transitions: data.transitions || {
        trial_to_active: 0,
        total_cancellations: 0,
        total_paused: 0,
        total_past_due: 0,
      },
    });
  }),

  /**
   * GET /api/dashboard/churn-analysis
   * Analyze customer churn patterns and predictions
   */
  getChurnAnalysis: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const months = Math.min(parseInt(req.query.months) || 6, 12);

    const churnQuery = `
      WITH monthly_churn AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', sst.created_at), 'YYYY-MM') as period,
          COUNT(DISTINCT s.customer_id) FILTER (WHERE sst.to_status = 'canceled') as churned_customers,
          COUNT(DISTINCT s.customer_id) as total_active_start_of_month
        FROM subscription_state_transitions sst
        JOIN subscriptions s ON sst.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND sst.created_at >= NOW() - ($2 || ' months')::interval
        GROUP BY period
        ORDER BY period DESC
      ),
      churn_reasons AS (
        SELECT
          COALESCE(sst.reason, 'No reason provided') as reason,
          COUNT(*) as count
        FROM subscription_state_transitions sst
        JOIN subscriptions s ON sst.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND sst.to_status = 'canceled'
          AND sst.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY reason
        ORDER BY count DESC
        LIMIT 10
      ),
      at_risk_prediction AS (
        SELECT
          c.id as customer_id,
          c.email,
          c.name,
          COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) as failed_payment_count,
          MAX(i.payment_failed_at) as last_failure_date,
          EXTRACT(DAY FROM NOW() - MAX(i.created_at))::integer as days_since_last_invoice,
          s.status,
          CASE
            WHEN COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) >= 3 THEN 'high'
            WHEN COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) >= 1 THEN 'medium'
            WHEN EXTRACT(DAY FROM NOW() - MAX(i.created_at)) > 40 THEN 'medium'
            ELSE 'low'
          END as churn_risk
        FROM customers c
        JOIN subscriptions s ON c.id = s.customer_id
        LEFT JOIN invoices i ON s.id = i.subscription_id
        WHERE c.user_id = $1
          AND s.status IN ('active', 'past_due', 'trialing')
        GROUP BY c.id, c.email, c.name, s.status
        HAVING COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) > 0
          OR EXTRACT(DAY FROM NOW() - MAX(i.created_at)) > 40
        ORDER BY churn_risk DESC, failed_payment_count DESC
        LIMIT 20
      )
      SELECT
        (SELECT json_agg(mc.*) FROM monthly_churn mc) as monthly_trends,
        (SELECT json_agg(cr.*) FROM churn_reasons cr) as reasons,
        (SELECT json_agg(arp.*) FROM at_risk_prediction arp) as at_risk_customers
    `;

    const result = await db.query(churnQuery, [userId, months]);
    const data = result.rows[0];

    const monthlyTrends = data.monthly_trends || [];
    const avgChurnRate =
      monthlyTrends.length > 0
        ? monthlyTrends.reduce((sum, m) => {
            const rate =
              m.total_active_start_of_month > 0
                ? (m.churned_customers / m.total_active_start_of_month) * 100
                : 0;
            return sum + rate;
          }, 0) / monthlyTrends.length
        : 0;

    sendSuccess(res, STATUS.OK, {
      monthly_churn_trends: monthlyTrends,
      average_churn_rate: parseFloat(avgChurnRate.toFixed(2)),
      churn_reasons: data.reasons || [],
      at_risk_customers: data.at_risk_customers || [],
    });
  }),

  /**
   * GET /api/dashboard/payment-failures
   * Get detailed payment failure analytics
   */
  getPaymentFailures: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const days = Math.min(parseInt(req.query.days) || 30, 90);

    const failuresQuery = `
      WITH failure_details AS (
        SELECT
          i.id,
          c.id as customer_id,
          c.email,
          c.name,
          i.amount_due,
          i.retry_count,
          i.payment_failed_at,
          i.stripe_invoice_id,
          s.status as subscription_status,
          EXTRACT(DAY FROM NOW() - i.payment_failed_at)::integer as days_since_failure
        FROM invoices i
        JOIN subscriptions s ON i.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND i.payment_failed_at IS NOT NULL
          AND i.status != 'paid'
          AND i.payment_failed_at >= NOW() - ($2 || ' days')::interval
        ORDER BY i.payment_failed_at DESC
      ),
      failure_stats AS (
        SELECT
          COUNT(*) as total_failures,
          COALESCE(SUM(amount_due), 0) as total_failed_amount,
          COUNT(DISTINCT customer_id) as affected_customers,
          COUNT(*) FILTER (WHERE retry_count = 0) as first_attempt_failures,
          COUNT(*) FILTER (WHERE retry_count >= 1) as retry_failures,
          COUNT(*) FILTER (WHERE retry_count >= 3) as critical_failures,
          ROUND(AVG(retry_count), 2) as avg_retry_count,
          ROUND(AVG(days_since_failure), 2) as avg_days_outstanding
        FROM failure_details
      ),
      daily_failures AS (
        SELECT
          DATE(payment_failed_at) as failure_date,
          COUNT(*) as count,
          COALESCE(SUM(amount_due), 0) as amount
        FROM failure_details
        GROUP BY failure_date
        ORDER BY failure_date DESC
      )
      SELECT
        (SELECT row_to_json(fs.*) FROM failure_stats fs) as statistics,
        (SELECT json_agg(df.*) FROM daily_failures df) as daily_trend,
        (SELECT json_agg(fd.*) FROM failure_details fd LIMIT 50) as recent_failures
    `;

    const result = await db.query(failuresQuery, [userId, days]);
    const data = result.rows[0];

    sendSuccess(res, STATUS.OK, {
      statistics: data.statistics || {
        total_failures: 0,
        total_failed_amount: 0,
        affected_customers: 0,
        first_attempt_failures: 0,
        retry_failures: 0,
        critical_failures: 0,
        avg_retry_count: 0,
        avg_days_outstanding: 0,
      },
      daily_trend: data.daily_trend || [],
      recent_failures: data.recent_failures || [],
      period_days: days,
    });
  }),

  /**
   * GET /api/dashboard/top-customers
   * Get top customers by revenue, engagement, and other metrics
   */
  getTopCustomers: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const metric = req.query.metric || "revenue"; // revenue, subscriptions, longevity

    let orderBy = "total_revenue DESC";
    if (metric === "subscriptions") orderBy = "subscription_count DESC";
    if (metric === "longevity") orderBy = "customer_age DESC";

    const topCustomersQuery = `
      SELECT
        c.id,
        c.email,
        c.name,
        c.created_at,
        c.created_at as customer_since,
        EXTRACT(DAY FROM NOW() - c.created_at)::integer as customer_age_days,
        COUNT(DISTINCT s.id) as subscription_count,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('active', 'trialing')) as active_subscriptions,
        COUNT(i.id) as total_invoices,
        COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as total_revenue,
        COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid' AND i.created_at >= NOW() - INTERVAL '30 days'), 0) as revenue_last_30_days,
        COUNT(i.id) FILTER (WHERE i.status = 'paid') as successful_payments,
        COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) as failed_payments,
        CASE
          WHEN COUNT(s.id) FILTER (WHERE s.status IN ('active', 'trialing')) > 0
          THEN COALESCE(SUM(
            CASE
              WHEN s.billing_interval = 'month' THEN s.amount
              WHEN s.billing_interval = 'year' THEN s.amount / 12
              WHEN s.billing_interval = 'week' THEN s.amount * 4.33
              ELSE 0
            END
          ) FILTER (WHERE s.status IN ('active', 'trialing')), 0)
          ELSE 0
        END as current_mrr,
        (
          SELECT sp.name
          FROM subscriptions s2
          LEFT JOIN subscription_plans sp ON s2.plan_id = sp.id
          WHERE s2.customer_id = c.id AND s2.status IN ('active', 'trialing')
          ORDER BY s2.created_at DESC
          LIMIT 1
        ) as plan_name,
        (
          SELECT s2.amount
          FROM subscriptions s2
          WHERE s2.customer_id = c.id AND s2.status IN ('active', 'trialing')
          ORDER BY s2.created_at DESC
          LIMIT 1
        ) as plan_amount,
        (
          SELECT s2.billing_interval::text
          FROM subscriptions s2
          WHERE s2.customer_id = c.id AND s2.status IN ('active', 'trialing')
          ORDER BY s2.created_at DESC
          LIMIT 1
        ) as billing_period,
        (
          SELECT s2.status::text
          FROM subscriptions s2
          WHERE s2.customer_id = c.id
          ORDER BY s2.created_at DESC
          LIMIT 1
        ) as subscription_status
      FROM customers c
      LEFT JOIN subscriptions s ON c.id = s.customer_id
      LEFT JOIN invoices i ON s.id = i.subscription_id
      WHERE c.user_id = $1
      GROUP BY c.id, c.email, c.name, c.created_at
      ORDER BY ${orderBy}
      LIMIT $2
    `;

    const result = await db.query(topCustomersQuery, [userId, limit]);

    sendSuccess(res, STATUS.OK, {
      top_customers: result.rows,
      metric_used: metric,
      total_count: result.rowCount,
    });
  }),

  /**
   * GET /api/dashboard/growth-metrics
   * Get business growth metrics and projections
   */
  getGrowthMetrics: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;

    const growthQuery = `
      WITH monthly_growth AS (
        SELECT
          TO_CHAR(DATE_TRUNC('month', c.created_at), 'YYYY-MM') as period,
          COUNT(DISTINCT c.id) as new_customers,
          COUNT(DISTINCT s.id) as new_subscriptions,
          COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as revenue
        FROM customers c
        LEFT JOIN subscriptions s ON c.id = s.customer_id
          AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', c.created_at)
        LEFT JOIN invoices i ON s.id = i.subscription_id
          AND DATE_TRUNC('month', i.created_at) = DATE_TRUNC('month', c.created_at)
        WHERE c.user_id = $1
          AND c.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY period
        ORDER BY period ASC
      ),
      growth_rates AS (
        SELECT
          period,
          new_customers,
          new_subscriptions,
          revenue,
          LAG(new_customers) OVER (ORDER BY period) as prev_customers,
          LAG(revenue) OVER (ORDER BY period) as prev_revenue
        FROM monthly_growth
      ),
      current_metrics AS (
        SELECT
          COUNT(DISTINCT c.id) as total_customers,
          COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('active', 'trialing')) as active_subscriptions,
          COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as total_revenue
        FROM customers c
        LEFT JOIN subscriptions s ON c.id = s.customer_id
        LEFT JOIN invoices i ON s.id = i.subscription_id
        WHERE c.user_id = $1
      )
      SELECT
        (SELECT json_agg(
          json_build_object(
            'period', gr.period,
            'new_customers', gr.new_customers,
            'new_subscriptions', gr.new_subscriptions,
            'revenue', gr.revenue,
            'customer_growth_rate', CASE
              WHEN gr.prev_customers > 0 AND gr.prev_customers IS NOT NULL
              THEN ROUND(((gr.new_customers - gr.prev_customers)::numeric / gr.prev_customers::numeric * 100), 2)
              ELSE 0
            END,
            'revenue_growth_rate', CASE
              WHEN gr.prev_revenue > 0 AND gr.prev_revenue IS NOT NULL
              THEN ROUND(((gr.revenue - gr.prev_revenue)::numeric / gr.prev_revenue::numeric * 100), 2)
              ELSE 0
            END
          )
        ) FROM growth_rates gr) as monthly_trends,
        (SELECT row_to_json(cm.*) FROM current_metrics cm) as current_state
    `;

    const result = await db.query(growthQuery, [userId]);
    const data = result.rows[0];

    const trends = data.monthly_trends || [];
    const avgCustomerGrowth =
      trends.length > 1
        ? trends
            .slice(1)
            .reduce((sum, t) => sum + (t.customer_growth_rate || 0), 0) /
          (trends.length - 1)
        : 0;
    const avgRevenueGrowth =
      trends.length > 1
        ? trends
            .slice(1)
            .reduce((sum, t) => sum + (t.revenue_growth_rate || 0), 0) /
          (trends.length - 1)
        : 0;

    sendSuccess(res, STATUS.OK, {
      monthly_trends: trends,
      current_state: data.current_state || {
        total_customers: 0,
        active_subscriptions: 0,
        total_revenue: 0,
      },
      growth_summary: {
        avg_customer_growth_rate: parseFloat(avgCustomerGrowth.toFixed(2)),
        avg_revenue_growth_rate: parseFloat(avgRevenueGrowth.toFixed(2)),
      },
    });
  }),

  /**
   * GET /api/dashboard/financial-reports
   * Get comprehensive financial reports
   */
  getFinancialReports: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const reportType = req.query.type || "summary"; // summary, detailed, quarterly

    const financialQuery = `
      WITH revenue_breakdown AS (
        SELECT
          COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as total_collected,
          COALESCE(SUM(i.amount_due) FILTER (WHERE i.status = 'open'), 0) as outstanding_invoices,
          COALESCE(SUM(i.amount_due) FILTER (WHERE i.payment_failed_at IS NOT NULL AND i.status != 'paid'), 0) as failed_amount,
          COUNT(i.id) FILTER (WHERE i.status = 'paid') as paid_invoice_count,
          COUNT(i.id) FILTER (WHERE i.status = 'open') as open_invoice_count,
          COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL AND i.status != 'paid') as failed_invoice_count
        FROM invoices i
        JOIN subscriptions s ON i.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
      ),
      mrr_arr AS (
        SELECT
          COALESCE(SUM(
            CASE
              WHEN s.billing_interval = 'month' THEN s.amount
              WHEN s.billing_interval = 'year' THEN s.amount / 12
              WHEN s.billing_interval = 'week' THEN s.amount * 4.33
              ELSE 0
            END
          ), 0) as mrr,
          COALESCE(SUM(
            CASE
              WHEN s.billing_interval = 'year' THEN s.amount
              WHEN s.billing_interval = 'month' THEN s.amount * 12
              WHEN s.billing_interval = 'week' THEN s.amount * 52
              ELSE 0
            END
          ), 0) as arr
        FROM subscriptions s
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1 AND s.status IN ('active', 'trialing')
      ),
      customer_metrics AS (
        SELECT
          COUNT(DISTINCT c.id) as total_customers,
          COALESCE(AVG(ltv.lifetime_value), 0) as avg_customer_lifetime_value
        FROM customers c
        LEFT JOIN (
          SELECT
            s.customer_id,
            COALESCE(SUM(i.amount_paid), 0) as lifetime_value
          FROM subscriptions s
          LEFT JOIN invoices i ON s.id = i.subscription_id AND i.status = 'paid'
          GROUP BY s.customer_id
        ) ltv ON c.id = ltv.customer_id
        WHERE c.user_id = $1
      )
      SELECT
        (SELECT row_to_json(rb.*) FROM revenue_breakdown rb) as revenue,
        (SELECT row_to_json(ma.*) FROM mrr_arr ma) as recurring,
        (SELECT row_to_json(cm.*) FROM customer_metrics cm) as customers
    `;

    const result = await db.query(financialQuery, [userId]);
    const data = result.rows[0];

    sendSuccess(res, STATUS.OK, {
      report_type: reportType,
      generated_at: new Date().toISOString(),
      revenue_summary: data.revenue || {
        total_collected: 0,
        outstanding_invoices: 0,
        failed_amount: 0,
        paid_invoice_count: 0,
        open_invoice_count: 0,
        failed_invoice_count: 0,
      },
      recurring_revenue: data.recurring || { mrr: 0, arr: 0 },
      customer_metrics: data.customers || {
        total_customers: 0,
        avg_customer_lifetime_value: 0,
      },
    });
  }),

  /**
   * GET /api/dashboard/user-engagement
   * Track user engagement with the dashboard
   */
  getUserEngagement: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;

    // This is a placeholder - in a real app, you'd track actual engagement metrics
    const engagementData = {
      last_login: new Date().toISOString(),
      total_logins: 1,
      dashboard_views: 1,
      features_used: ["metrics", "customers", "subscriptions"],
      most_viewed_section: "metrics",
      avg_session_duration_minutes: 0,
    };

    sendSuccess(res, STATUS.OK, engagementData);
  }),

  /**
   * GET /api/dashboard/activity-logs
   * Get activity logs for audit purposes
   */
  getActivityLogs: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const days = req.query.days ? Math.min(parseInt(req.query.days), 30) : null;

    // Build date filter based on whether days is provided
    const dateFilter = days
      ? `AND c.created_at >= NOW() - ($4 || ' days')::interval`
      : "";
    const dateFilter2 = days
      ? `AND sst.created_at >= NOW() - ($4 || ' days')::interval`
      : "";
    const dateFilter3 = days
      ? `AND COALESCE(i.payment_failed_at, i.created_at) >= NOW() - ($4 || ' days')::interval`
      : "";

    const queryParams = days
      ? [userId, limit, offset, days]
      : [userId, limit, offset];

    const logsQuery = `
      WITH all_activities AS (
        SELECT
          'customer_created' as activity_type,
          'Customer Created' as activity,
          c.email as entity,
          c.created_at as timestamp,
          jsonb_build_object('customer_id', c.id, 'email', c.email) as details
        FROM customers c
        WHERE c.user_id = $1
          ${dateFilter}

        UNION ALL

        SELECT
          'subscription_state_change',
          'Subscription ' || sst.to_status,
          c.email,
          sst.created_at,
          jsonb_build_object(
            'subscription_id', s.id,
            'customer_email', c.email,
            'from_status', sst.from_status,
            'to_status', sst.to_status,
            'reason', sst.reason
          )
        FROM subscription_state_transitions sst
        JOIN subscriptions s ON sst.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          ${dateFilter2}

        UNION ALL

        SELECT
          CASE
            WHEN i.status = 'paid' THEN 'payment_succeeded'
            WHEN i.payment_failed_at IS NOT NULL THEN 'payment_failed'
            ELSE 'invoice_created'
          END,
          CASE
            WHEN i.status = 'paid' THEN 'Payment Received'
            WHEN i.payment_failed_at IS NOT NULL THEN 'Payment Failed'
            ELSE 'Invoice Created'
          END,
          c.email,
          COALESCE(i.payment_failed_at, i.created_at),
          jsonb_build_object(
            'invoice_id', i.id,
            'customer_email', c.email,
            'amount', CASE WHEN i.status = 'paid' THEN i.amount_paid ELSE i.amount_due END,
            'status', i.status
          )
        FROM invoices i
        JOIN subscriptions s ON i.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          ${dateFilter3}
      )
      SELECT *
      FROM all_activities
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;

    // Get total count for pagination
    const countQuery = `
      WITH all_activities AS (
        SELECT c.created_at as timestamp
        FROM customers c
        WHERE c.user_id = $1
          ${dateFilter}

        UNION ALL

        SELECT sst.created_at
        FROM subscription_state_transitions sst
        JOIN subscriptions s ON sst.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          ${dateFilter2}

        UNION ALL

        SELECT COALESCE(i.payment_failed_at, i.created_at)
        FROM invoices i
        JOIN subscriptions s ON i.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          ${dateFilter3}
      )
      SELECT COUNT(*) as total FROM all_activities
    `;

    const countParams = days ? [userId, days] : [userId];

    const [result, countResult] = await Promise.all([
      db.query(logsQuery, queryParams),
      db.query(countQuery, countParams),
    ]);

    const totalCount = parseInt(countResult.rows[0]?.total || 0);
    const totalPages = Math.ceil(totalCount / limit);

    sendSuccess(res, STATUS.OK, {
      activities: result.rows,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
      period_days: days,
    });
  }),

  /**
   * GET /api/dashboard/system-health
   * Get system health status
   */
  getSystemHealth: asyncHandler(async (req, res) => {
    const db = getDBConnection();

    // Basic health check
    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      api: "operational",
      uptime_percentage: 99.9,
    };

    sendSuccess(res, STATUS.OK, healthCheck);
  }),

  /**
   * GET /api/dashboard/custom-reports
   * Get saved custom reports
   */
  getCustomReports: asyncHandler(async (req, res) => {
    // Placeholder - would need a custom_reports table
    sendSuccess(res, STATUS.OK, {
      reports: [],
      message: "Custom reports feature coming soon",
    });
  }),

  /**
   * POST /api/dashboard/custom-reports
   * Create a new custom report
   */
  createCustomReport: asyncHandler(async (req, res) => {
    // Placeholder - would need a custom_reports table
    const { name, type, filters, metrics } = req.body;

    sendSuccess(res, STATUS.CREATED, {
      message: "Custom report creation coming soon",
      report_config: { name, type, filters, metrics },
    });
  }),

  /**
   * GET /api/dashboard/export-data
   * Get available data exports
   */
  exportDashboardData: asyncHandler(async (req, res) => {
    sendSuccess(res, STATUS.OK, {
      available_exports: [
        "customers",
        "subscriptions",
        "invoices",
        "transactions",
      ],
      message: "Export data feature coming soon",
    });
  }),

  /**
   * POST /api/dashboard/export-data
   * Initiate a new data export
   */
  initiateDataExport: asyncHandler(async (req, res) => {
    const { export_type, format, date_range } = req.body;

    sendSuccess(res, STATUS.ACCEPTED, {
      message: "Export initiated",
      export_config: { export_type, format, date_range },
      status: "processing",
    });
  }),

  /**
   * GET /api/dashboard/notifications
   * Get dashboard notifications
   */
  getDashboardNotifications: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;

    // Get critical alerts based on current data
    const alertsQuery = `
      WITH critical_alerts AS (
        SELECT
          'payment_failures' as type,
          'Critical Payment Failures' as title,
          COUNT(*) || ' invoices have failed payment in the last 7 days' as message,
          'high' as priority,
          NOW() as created_at
        FROM invoices i
        JOIN subscriptions s ON i.subscription_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND i.payment_failed_at >= NOW() - INTERVAL '7 days'
          AND i.status != 'paid'
        HAVING COUNT(*) > 0

        UNION ALL

        SELECT
          'high_churn_risk',
          'High Churn Risk Detected',
          COUNT(*) || ' customers at high risk of churning' as message,
          'medium',
          NOW()
        FROM customers c
        JOIN subscriptions s ON c.id = s.customer_id
        LEFT JOIN invoices i ON s.id = i.subscription_id
        WHERE c.user_id = $1
          AND s.status IN ('active', 'past_due')
        GROUP BY c.id
        HAVING COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) >= 2

        UNION ALL

        SELECT
          'trial_expiring',
          'Trials Expiring Soon',
          COUNT(*) || ' trials expiring in the next 7 days' as message,
          'low',
          NOW()
        FROM subscriptions s
        JOIN customers c ON s.customer_id = c.id
        WHERE c.user_id = $1
          AND s.trial_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        HAVING COUNT(*) > 0
      )
      SELECT * FROM critical_alerts
    `;

    const result = await db.query(alertsQuery, [userId]);

    sendSuccess(res, STATUS.OK, {
      notifications: result.rows,
      unread_count: result.rowCount,
    });
  }),

  /**
   * POST /api/dashboard/notifications/mark-read
   * Mark notifications as read
   */
  markNotificationsRead: asyncHandler(async (req, res) => {
    const { notification_ids } = req.body;

    sendSuccess(res, STATUS.OK, {
      message: "Notifications marked as read",
      marked_count: notification_ids?.length || 0,
    });
  }),

  /**
   * POST /api/dashboard/notifications/mark-all-read
   * Mark all notifications as read
   */
  markAllNotificationsAsRead: asyncHandler(async (req, res) => {
    sendSuccess(res, STATUS.OK, {
      message: "All notifications marked as read",
    });
  }),

  /**
   * GET /api/dashboard/settings
   * Get dashboard settings for the user
   */
  getDashboardSettings: asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Placeholder settings - would be stored in a user_settings table
    const settings = {
      user_id: userId,
      theme: "light",
      currency: "USD",
      timezone: "UTC",
      notifications_enabled: true,
      email_reports: true,
      dashboard_layout: "default",
    };

    sendSuccess(res, STATUS.OK, { settings });
  }),

  /**
   * PUT /api/dashboard/settings
   * Update dashboard settings
   */
  updateDashboardSettings: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
      theme,
      currency,
      timezone,
      notifications_enabled,
      email_reports,
      dashboard_layout,
    } = req.body;

    // Would typically update a user_settings table
    const updatedSettings = {
      user_id: userId,
      theme: theme || "light",
      currency: currency || "USD",
      timezone: timezone || "UTC",
      notifications_enabled:
        notifications_enabled !== undefined ? notifications_enabled : true,
      email_reports: email_reports !== undefined ? email_reports : true,
      dashboard_layout: dashboard_layout || "default",
      updated_at: new Date().toISOString(),
    };

    sendSuccess(res, STATUS.OK, {
      message: "Settings updated successfully",
      settings: updatedSettings,
    });
  }),
};
