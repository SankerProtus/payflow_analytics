import { getDBConnection } from "../db/connection.js";
import {
  ErrorResponses,
  sendSuccess,
  STATUS,
  asyncHandler,
} from "../utils/errorHandler.js";

export const customerController = {
  // GET /api/customers
  // Get all customers for the authenticated user
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
                COALESCE(SUM(
                    CASE
                        WHEN s.status IN ('active', 'trialing') THEN
                            CASE
                                WHEN s.billing_interval = 'month' THEN s.amount
                                WHEN s.billing_interval = 'year' THEN s.amount / 12
                                WHEN s.billing_interval = 'week' THEN s.amount * 4.33
                                ELSE 0
                            END
                        ELSE 0
                    END
                ), 0) as mrr,
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

  // GET /api/customers/:id
  // Get detailed customer information including subscriptions
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
                COALESCE(SUM(i.amount_paid), 0) as total_revenue,
                COUNT(i.id) FILTER (WHERE i.status = 'paid') as payment_count,
                COALESCE(SUM(
                    CASE
                        WHEN s.status IN ('active', 'trialing') THEN
                            CASE
                                WHEN s.billing_interval = 'month' THEN s.amount
                                WHEN s.billing_interval = 'year' THEN s.amount / 12
                                WHEN s.billing_interval = 'week' THEN s.amount * 4.33
                                ELSE 0
                            END
                        ELSE 0
                    END
                ), 0) as mrr,
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

    const subscriptionsResult = await db.query(subscriptionsQuery, [
      customerId,
    ]);

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

  // GET /api/customers/:id/timeline
  // Get activity timeline for a customer
  getTimeline: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const customerId = req.params.id;

    // Verify the customer belongs to user
    const ownershipCheck = await db.query(
      "SELECT id FROM customers WHERE id = $1 AND user_id = $2",
      [customerId, userId],
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
   * Create a new customer (creates in both database and Stripe)
   */
  create: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const { email, name, createInStripe = true } = req.body;

    // Validate required fields
    if (!email) {
      return ErrorResponses.requiredField(res, "email");
    }

    // Check if the customer already exists
    const existing = await db.query(
      "SELECT id FROM customers WHERE email = $1 AND user_id = $2",
      [email, userId],
    );

    if (existing.rowCount > 0) {
      return ErrorResponses.customerExists(res);
    }

    let stripeCustomerId;

    // Create customer in Stripe if requested
    if (createInStripe) {
      try {
        // Import stripe at the top if not already
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const stripeCustomer = await stripe.customers.create({
          email,
          name: name || undefined,
          metadata: {
            internal_user_id: userId.toString(),
          },
        });

        stripeCustomerId = stripeCustomer.id;
      } catch (error) {
        logger.error("Error creating Stripe customer", {
          error: error.message,
        });
        // If Stripe fails, still create local customer with pending status
        stripeCustomerId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    } else {
      // Create placeholder ID if not creating in Stripe
      stripeCustomerId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create customer in database
    const insertQuery = `
            INSERT INTO customers (user_id, stripe_customer_id, email, name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, stripe_customer_id, email, name, created_at
        `;

    const result = await db.query(insertQuery, [
      userId,
      stripeCustomerId,
      email,
      name || null,
    ]);

    const customer = result.rows[0];

    sendSuccess(res, STATUS.CREATED, {
      customer: {
        ...customer,
        isStripeCustomer: stripeCustomerId.startsWith("cus_"),
        isPending: stripeCustomerId.startsWith("pending_"),
      },
      message: stripeCustomerId.startsWith("cus_")
        ? "Customer created in database and Stripe"
        : "Customer created in database (will be synced to Stripe on first payment)",
    });
  }),

  /**
   * PUT /api/customers/:id
   * Update customer information
   */
  update: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const customerId = req.params.id;
    const { email, name } = req.body;

    // Verify the customer belongs to user
    const ownershipCheck = await db.query(
      "SELECT id, email FROM customers WHERE id = $1 AND user_id = $2",
      [customerId, userId],
    );

    if (ownershipCheck.rowCount === 0) {
      return ErrorResponses.customerNotFound(res);
    }

    // Check if email is being changed and if it already exists
    if (email && email !== ownershipCheck.rows[0].email) {
      const emailCheck = await db.query(
        "SELECT id FROM customers WHERE email = $1 AND user_id = $2 AND id != $3",
        [email, userId, customerId],
      );

      if (emailCheck.rowCount > 0) {
        return ErrorResponses.customerExists(res);
      }
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (updates.length === 0) {
      return ErrorResponses.requiredField(res, "email or name");
    }

    // Add customer ID and user ID to values
    values.push(customerId);
    values.push(userId);

    const updateQuery = `
            UPDATE customers
            SET ${updates.join(", ")}
            WHERE id = $${paramCount++} AND user_id = $${paramCount++}
            RETURNING id, stripe_customer_id, email, name, created_at
        `;

    const result = await db.query(updateQuery, values);

    sendSuccess(res, STATUS.OK, {
      customer: result.rows[0],
      message: "Customer updated successfully",
    });
  }),

  /**
   * DELETE /api/customers/:id
   * Delete a customer and all associated data
   */
  deleteCustomer: asyncHandler(async (req, res) => {
    const db = getDBConnection();
    const userId = req.user.id;
    const customerId = req.params.id;

    // Verify the customer belongs to user
    const ownershipCheck = await db.query(
      "SELECT id, email, name FROM customers WHERE id = $1 AND user_id = $2",
      [customerId, userId],
    );

    if (ownershipCheck.rowCount === 0) {
      return ErrorResponses.customerNotFound(res);
    }

    const customerData = ownershipCheck.rows[0];

    // Delete customer (cascade will handle related records if configured)
    // If not using CASCADE, you may need to manually delete related records first
    const deleteQuery = `
            DELETE FROM customers
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;

    await db.query(deleteQuery, [customerId, userId]);

    sendSuccess(res, STATUS.OK, {
      message: "Customer deleted successfully",
      deletedCustomer: {
        id: customerData.id,
        email: customerData.email,
        name: customerData.name,
      },
    });
  }),
};
