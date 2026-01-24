import { getDBConnection } from "../db/connection.js";
import { sendSuccess, STATUS, asyncHandler } from "../utils/errorHandler.js";

export const dashboardController = {

    /**
     * GET /api/dashboard
     * Legacy endpoint - redirects to metrics
     */
    getDashboard: (req, res) => {
        res.redirect('/api/dashboard/metrics');
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
                        WHEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') > 0
                        THEN (COUNT(*) FILTER (WHERE to_status = 'canceled' AND created_at >= NOW() - INTERVAL '30 days')::numeric /
                              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days')::numeric * 100)
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
                    value: parseInt(data.current_revenue),
                    change: parseFloat(data.revenue_change.toFixed(2)),
                    period: 'month',
                },
                active_customers: {
                    value: parseInt(data.current_customers),
                    change: parseFloat(data.customers_change.toFixed(2)),
                    period: 'month',
                },
                active_subscriptions: {
                    value: parseInt(data.current_subscriptions),
                    change: parseFloat(data.subscriptions_change.toFixed(2)),
                    period: 'month',
                },
                mrr: {
                    value: parseInt(data.current_mrr),
                    change: 0, // Would need historical MRR to calculate
                    period: 'month',
                },
                churn_rate: {
                    value: parseFloat(data.churn_rate.toFixed(2)),
                    change: 0, // Would need historical churn to calculate
                    period: 'month',
                },
                failed_payments: {
                    value: parseInt(data.current_failed),
                    change: parseFloat(data.failed_change.toFixed(2)),
                    period: 'month',
                },
            },
            period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
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
                    ELSE i.status
                END as status,
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
        const totalRevenue = result.rows.reduce((sum, row) => sum + parseInt(row.revenue), 0);
        const avgRevenue = Math.round(totalRevenue / months);

        const firstMonth = result.rows[0]?.revenue || 0;
        const lastMonth = result.rows[result.rows.length - 1]?.revenue || 0;
        const growthRate = firstMonth > 0
            ? ((lastMonth - firstMonth) / firstMonth * 100)
            : 0;

        sendSuccess(res, STATUS.OK, {
            trends: result.rows,
            summary: {
                total_revenue: totalRevenue,
                average_revenue_per_month: avgRevenue,
                growth_rate: parseFloat(growthRate.toFixed(2)),
            },
        });
    }),
};


