import { getDBConnection } from "../db/connection.js";
import { ErrorResponses, sendSuccess, STATUS, asyncHandler } from "../utils/errorHandler.js";

export const customerController = {
    
    /**
     * GET /api/customers
     * Get all customers for the authenticated user
     */
    getCustomers: asyncHandler(async (req, res) => {
        const db = getDBConnection();
        const userId = req.user.id;

        const query = `
            SELECT 
                c.id,
                c.stripe_customer_id,
                c.email,
                c.name,
                c.created_at,
                COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('active', 'trialing')) as active_subscriptions,
                COALESCE(SUM(i.amount_paid), 0) as total_revenue,
                CASE 
                    WHEN COUNT(s.id) FILTER (WHERE s.status = 'past_due') > 0 THEN 'past_due'
                    WHEN COUNT(s.id) FILTER (WHERE s.status = 'active') > 0 THEN 'active'
                    WHEN COUNT(s.id) FILTER (WHERE s.status = 'trialing') > 0 THEN 'trialing'
                    WHEN COUNT(s.id) FILTER (WHERE s.status = 'canceled') > 0 THEN 'canceled'
                    WHEN COUNT(s.id) FILTER (WHERE s.status = 'paused') > 0 THEN 'paused'
                    ELSE 'inactive'
                END as status
            FROM customers c
            LEFT JOIN subscriptions s ON c.id = s.customer_id
            LEFT JOIN invoices i ON s.id = i.subscription_id AND i.status = 'paid'
            WHERE c.user_id = $1
            GROUP BY c.id, c.stripe_customer_id, c.email, c.name, c.created_at
            ORDER BY c.created_at DESC
        `;

        const result = await db.query(query, [userId]);

        sendSuccess(res, STATUS.OK, {
            customers: result.rows,
            total: result.rowCount,
        });
    }),

    /**
     * GET /api/customers/:id
     * Get detailed customer information including subscriptions
     */
    getById: asyncHandler(async (req, res) => {
        const db = getDBConnection();
        const userId = req.user.id;
        const customerId = req.params.id;

        // Get customer details
        const customerQuery = `
            SELECT 
                c.id,
                c.stripe_customer_id,
                c.email,
                c.name,
                c.created_at,
                COALESCE(SUM(i.amount_paid), 0) as total_revenue
            FROM customers c
            LEFT JOIN subscriptions s ON c.id = s.customer_id
            LEFT JOIN invoices i ON s.id = i.subscription_id AND i.status = 'paid'
            WHERE c.id = $1 AND c.user_id = $2
            GROUP BY c.id, c.stripe_customer_id, c.email, c.name, c.created_at
        `;

        const customerResult = await db.query(customerQuery, [customerId, userId]);

        if (customerResult.rowCount === 0) {
            return ErrorResponses.customerNotFound(res);
        }

        const customer = customerResult.rows[0];

        // Get subscriptions for this customer
        const subscriptionsQuery = `
            SELECT 
                id,
                stripe_subscription_id,
                status,
                amount,
                currency,
                billing_interval,
                current_period_start,
                current_period_end,
                trial_end,
                ended_at
            FROM subscriptions
            WHERE customer_id = $1
            ORDER BY created_at DESC
        `;

        const subscriptionsResult = await db.query(subscriptionsQuery, [customerId]);

        // Calculate lifetime value (total + active recurring)
        const lifetimeValue = customer.total_revenue;

        sendSuccess(res, STATUS.OK, {
            customer: {
                ...customer,
                subscriptions: subscriptionsResult.rows,
                lifetime_value: lifetimeValue,
            },
        });
    }),

    /**
     * GET /api/customers/:id/timeline
     * Get activity timeline for a customer
     */
    getTimeline: asyncHandler(async (req, res) => {
        const db = getDBConnection();
        const userId = req.user.id;
        const customerId = req.params.id;

        // Verify the customer belongs to user
        const ownershipCheck = await db.query(
            'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
            [customerId, userId]
        );

        if (ownershipCheck.rowCount === 0) {
            return ErrorResponses.customerNotFound(res);
        }

        // Get timeline events from subscription state transitions and invoices
        const timelineQuery = `
            SELECT 
                sst.id,
                'subscription_' || 
                CASE 
                    WHEN sst.to_status = 'active' AND sst.from_status IS NULL THEN 'created'
                    WHEN sst.to_status = 'canceled' THEN 'canceled'
                    ELSE 'updated'
                END as type,
                'Subscription ' || 
                CASE 
                    WHEN sst.to_status = 'active' AND sst.from_status IS NULL THEN 'created'
                    WHEN sst.to_status = 'canceled' THEN 'canceled'
                    ELSE 'status changed to ' || sst.to_status
                END as title,
                COALESCE(sst.reason, 'Status changed from ' || COALESCE(sst.from_status::text, 'new') || ' to ' || sst.to_status) as description,
                sst.created_at as timestamp,
                jsonb_build_object(
                    'status', sst.to_status,
                    'from_status', sst.from_status
                ) as metadata
            FROM subscription_state_transitions sst
            JOIN subscriptions s ON sst.subscription_id = s.id
            WHERE s.customer_id = $1
            
            UNION ALL
            
            SELECT 
                i.id,
                CASE 
                    WHEN i.status = 'paid' THEN 'invoice_paid'
                    WHEN i.payment_failed_at IS NOT NULL THEN 'invoice_failed'
                    ELSE 'invoice_created'
                END as type,
                CASE 
                    WHEN i.status = 'paid' THEN 'Payment successful'
                    WHEN i.payment_failed_at IS NOT NULL THEN 'Payment failed'
                    ELSE 'Invoice created'
                END as title,
                CASE 
                    WHEN i.status = 'paid' THEN 'Invoice paid for $' || (i.amount_paid / 100.0)::numeric(10,2)
                    WHEN i.payment_failed_at IS NOT NULL THEN 'Payment failed for $' || (i.amount_due / 100.0)::numeric(10,2) || ' (Retry #' || i.retry_count || ')'
                    ELSE 'Invoice created for $' || (i.amount_due / 100.0)::numeric(10,2)
                END as description,
                COALESCE(i.payment_failed_at, i.created_at) as timestamp,
                jsonb_build_object(
                    'amount', i.amount_due,
                    'status', i.status,
                    'retry_count', i.retry_count
                ) as metadata
            FROM invoices i
            JOIN subscriptions s ON i.subscription_id = s.id
            WHERE s.customer_id = $1
            
            ORDER BY timestamp DESC
            LIMIT 100
        `;

        const timelineResult = await db.query(timelineQuery, [customerId]);

        sendSuccess(res, STATUS.OK, {
            timeline: timelineResult.rows,
        });
    }),

    /**
     * GET /api/customers/:id/statistics
     * Get statistical summary for a customer
     */
    getStatistics: asyncHandler(async (req, res) => {
        const db = getDBConnection();
        const userId = req.user.id;
        const customerId = req.params.id;

        const statsQuery = `
            SELECT 
                c.id,
                c.created_at,
                COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as total_revenue,
                COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0) as lifetime_value,
                COUNT(DISTINCT s.id) as total_subscriptions,
                COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('active', 'trialing')) as active_subscriptions,
                COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL) as failed_payments,
                COUNT(i.id) FILTER (WHERE i.status = 'paid') as successful_payments,
                CASE 
                    WHEN COUNT(i.id) FILTER (WHERE i.status = 'paid') > 0 
                    THEN (SUM(i.amount_paid) FILTER (WHERE i.status = 'paid') / COUNT(i.id) FILTER (WHERE i.status = 'paid'))::integer
                    ELSE 0
                END as average_invoice_amount,
                CASE 
                    WHEN COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL AND i.payment_failed_at > NOW() - INTERVAL '30 days') >= 3 THEN 'high'
                    WHEN COUNT(i.id) FILTER (WHERE i.payment_failed_at IS NOT NULL AND i.payment_failed_at > NOW() - INTERVAL '30 days') >= 1 THEN 'medium'
                    WHEN COUNT(s.id) FILTER (WHERE s.status = 'active') = 0 THEN 'high'
                    ELSE 'low'
                END as churn_risk,
                EXTRACT(DAY FROM NOW() - c.created_at)::integer as days_since_signup
            FROM customers c
            LEFT JOIN subscriptions s ON c.id = s.customer_id
            LEFT JOIN invoices i ON s.id = i.subscription_id
            WHERE c.id = $1 AND c.user_id = $2
            GROUP BY c.id, c.created_at
        `;

        const statsResult = await db.query(statsQuery, [customerId, userId]);

        if (statsResult.rowCount === 0) {
            return ErrorResponses.customerNotFound(res);
        }

        const stats = statsResult.rows[0];
        const { id, created_at, ...statistics } = stats;

        sendSuccess(res, STATUS.OK, { statistics });
    }),

    /**
     * POST /api/customers
     * Create a new customer
     */
    create: asyncHandler(async (req, res) => {
        const db = getDBConnection();
        const userId = req.user.id;
        const { email, name, stripe_customer_id } = req.body;

        // Validate required fields
        if (!email) {
            return ErrorResponses.requiredField(res, 'email');
        }

        // Check if the customer already exists
        const existingQuery = stripe_customer_id
            ? 'SELECT id FROM customers WHERE (email = $1 OR stripe_customer_id = $2) AND user_id = $3'
            : 'SELECT id FROM customers WHERE email = $1 AND user_id = $2';

        const existingParams = stripe_customer_id 
            ? [email, stripe_customer_id, userId]
            : [email, userId];

        const existing = await db.query(existingQuery, existingParams);

        if (existing.rowCount > 0) {
            return ErrorResponses.customerExists(res);
        }

        // Create customer
        const insertQuery = `
            INSERT INTO customers (user_id, stripe_customer_id, email, name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, stripe_customer_id, email, name, created_at
        `;

        const insertParams = [
            userId,
            stripe_customer_id || `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email,
            name || null,
        ];

        const result = await db.query(insertQuery, insertParams);

        sendSuccess(res, STATUS.CREATED, {
            customer: result.rows[0],
            message: 'Customer created successfully',
        });
    }),
};

