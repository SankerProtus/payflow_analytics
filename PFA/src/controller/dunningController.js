import { getDBConnection } from "../db/connection.js";
import {
  ErrorResponses,
  sendSuccess,
  STATUS,
  asyncHandler,
} from "../utils/errorHandler.js";

export const dunningController = {
  /**
   * GET /api/dunning
   * Get dunning cases (failed payments requiring action)
   * Query params: status (open|resolved|all), page, limit
   */
  getDunning: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;

    // Parse query parameters
    const status = req.query.status || "open";
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Validate status parameter
    if (!["open", "resolved", "all"].includes(status)) {
      return ErrorResponses.badRequest(
        res,
        "Invalid status. Must be one of: open, resolved, all",
      );
    }

    // Build status filter
    let statusFilter = "";
    if (status === "open") {
      statusFilter =
        "AND i.payment_failed_at IS NOT NULL AND i.status != 'paid'";
    } else if (status === "resolved") {
      statusFilter =
        "AND i.status = 'paid' AND i.payment_failed_at IS NOT NULL";
    }

    // Get dunning cases
    const dunningQuery = `
            SELECT
                i.id,
                c.id as customer_id,
                c.email as customer_email,
                c.name as customer_name,
                s.id as subscription_id,
                s.status as subscription_status,
                i.id as invoice_id,
                i.stripe_invoice_id,
                i.amount_due,
                i.amount_paid,
                i.retry_count,
                i.payment_failed_at as last_retry_at,
                EXTRACT(DAY FROM NOW() - i.payment_failed_at)::integer as days_overdue,
                -- Calculate risk level based on days overdue
                CASE
                    WHEN EXTRACT(DAY FROM NOW() - i.payment_failed_at) > 7 THEN 'high'
                    WHEN EXTRACT(DAY FROM NOW() - i.payment_failed_at) >= 3 THEN 'medium'
                    ELSE 'low'
                END as risk_level,
                -- Estimate next retry (typically 3, 5, 7 days after failure)
                CASE
                    WHEN i.retry_count = 0 THEN i.payment_failed_at + INTERVAL '3 days'
                    WHEN i.retry_count = 1 THEN i.payment_failed_at + INTERVAL '5 days'
                    WHEN i.retry_count = 2 THEN i.payment_failed_at + INTERVAL '7 days'
                    ELSE NULL
                END as next_retry_at,
                CASE
                    WHEN i.status = 'paid' THEN 'resolved'
                    WHEN i.retry_count >= 4 THEN 'abandoned'
                    ELSE 'open'
                END as status,
                CASE
                    WHEN i.status = 'paid' THEN 'paid'
                    WHEN s.status = 'canceled' THEN 'cancelled'
                    ELSE NULL
                END as resolution,
                i.payment_failed_at as failed_at,
                CASE
                    WHEN i.status = 'paid' THEN
                        (SELECT created_at FROM stripe_events
                         WHERE payload->>'invoice' = i.stripe_invoice_id
                         AND type = 'invoice.payment_succeeded'
                         ORDER BY created_at DESC LIMIT 1)
                    ELSE NULL
                END as resolved_at,
                i.created_at
            FROM invoices i
            JOIN subscriptions s ON i.subscription_id = s.id
            JOIN customers c ON s.customer_id = c.id
            WHERE c.user_id = $1
            ${statusFilter}
            ORDER BY i.payment_failed_at DESC NULLS LAST
            LIMIT $2 OFFSET $3
        `;

    const dunningResult = await db.query(dunningQuery, [userId, limit, offset]);

    // Get total count for pagination
    const countQuery = `
            SELECT COUNT(*) as total
            FROM invoices i
            JOIN subscriptions s ON i.subscription_id = s.id
            JOIN customers c ON s.customer_id = c.id
            WHERE c.user_id = $1
            ${statusFilter}
        `;

    const countResult = await db.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);

    // Get summary statistics
    const summaryQuery = `
            SELECT
                COUNT(*) FILTER (
                    WHERE i.payment_failed_at IS NOT NULL
                    AND i.status != 'paid'
                ) as total_open,
                COALESCE(SUM(i.amount_due) FILTER (
                    WHERE i.payment_failed_at IS NOT NULL
                    AND i.status != 'paid'
                ), 0) as total_amount_at_risk,
                COALESCE(AVG(i.retry_count) FILTER (
                    WHERE i.payment_failed_at IS NOT NULL
                ), 0) as avg_retry_count
            FROM invoices i
            JOIN subscriptions s ON i.subscription_id = s.id
            JOIN customers c ON s.customer_id = c.id
            WHERE c.user_id = $1
        `;

    const summaryResult = await db.query(summaryQuery, [userId]);
    const summary = summaryResult.rows[0];

    // Transform dunning cases to camelCase format for frontend
    const transformedDunningCases = dunningResult.rows.map((row) => ({
      id: row.id,
      invoiceId: row.invoice_id,
      stripeInvoiceId: row.stripe_invoice_id,
      customer: {
        id: row.customer_id,
        email: row.customer_email,
        name: row.customer_name,
      },
      subscriptionId: row.subscription_id,
      subscriptionStatus: row.subscription_status,
      amountDue: row.amount_due,
      amountPaid: row.amount_paid,
      retryCount: row.retry_count,
      daysOverdue: row.days_overdue,
      riskLevel: row.risk_level,
      lastRetryAt: row.last_retry_at,
      nextRetryAt: row.next_retry_at,
      status: row.status,
      resolution: row.resolution,
      failedAt: row.failed_at,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
    }));

    sendSuccess(res, STATUS.OK, {
      dunning_cases: transformedDunningCases,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      summary: {
        total_open: parseInt(summary.total_open) || 0,
        total_amount_at_risk: parseInt(summary.total_amount_at_risk) || 0,
        avg_retry_count: parseFloat(
          (summary.avg_retry_count || 0).toFixed
            ? (summary.avg_retry_count || 0).toFixed(2)
            : summary.avg_retry_count || 0,
        ),
      },
    });
  }),
};
