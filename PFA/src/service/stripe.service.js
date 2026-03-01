import Stripe from "stripe";
import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = getDBConnection();

export const stripeService = {
  /**
   * Create a new subscription
   */
  async createSubscription({
    userId,
    customerId,
    planId,
    paymentMethodId,
    trialPeriodDays = null,
    couponId = null,
    metadata = {},
  }) {
    try {
      // Get customer's Stripe customer ID
      const customerResult = await db.query(
        "SELECT stripe_customer_id, id FROM customers WHERE id = $1 AND user_id = $2",
        [customerId, userId],
      );

      if (customerResult.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const { stripe_customer_id, id: dbCustomerId } = customerResult.rows[0];

      // Get plan details
      const planResult = await db.query(
        "SELECT stripe_price_id, stripe_product_id, name FROM plans WHERE id = $1",
        [planId],
      );

      if (planResult.rows.length === 0) {
        throw new Error("Plan not found");
      }

      const { stripe_price_id } = planResult.rows[0];

      // Create subscription in Stripe
      const subscriptionParams = {
        customer: stripe_customer_id,
        items: [{ price: stripe_price_id }],
        default_payment_method: paymentMethodId,
        metadata: {
          ...metadata,
          user_id: userId,
          customer_db_id: dbCustomerId,
        },
        expand: ["latest_invoice.payment_intent"],
      };

      if (trialPeriodDays) {
        subscriptionParams.trial_period_days = trialPeriodDays;
      }

      if (couponId) {
        subscriptionParams.coupon = couponId;
      }

      const stripeSubscription =
        await stripe.subscriptions.create(subscriptionParams);

      // Save subscription to database
      const insertResult = await db.query(
        `INSERT INTO subscriptions (
          customer_id, stripe_subscription_id, plan_id, status,
          amount, currency, current_period_start, current_period_end,
          cancel_at_period_end, trial_start, trial_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          dbCustomerId,
          stripeSubscription.id,
          planId,
          stripeSubscription.status,
          stripeSubscription.items.data[0].price.unit_amount,
          stripeSubscription.currency,
          new Date(stripeSubscription.current_period_start * 1000),
          new Date(stripeSubscription.current_period_end * 1000),
          stripeSubscription.cancel_at_period_end,
          stripeSubscription.trial_start
            ? new Date(stripeSubscription.trial_start * 1000)
            : null,
          stripeSubscription.trial_end
            ? new Date(stripeSubscription.trial_end * 1000)
            : null,
        ],
      );

      return {
        subscriptionId: insertResult.rows[0].id,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        ...insertResult.rows[0],
      };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Create subscription error", {
        error: error.message,
        userId,
        customerId,
      });
      throw error;
    }
  },

  /**
   * Update a subscription
   */
  async updateSubscription({ subscriptionId, userId, updates = {} }) {
    try {
      // Get subscription from database
      const subResult = await db.query(
        `SELECT s.*, c.stripe_customer_id
         FROM subscriptions s
         JOIN customers c ON s.customer_id = c.id
         WHERE s.id = $1 AND c.user_id = $2`,
        [subscriptionId, userId],
      );

      if (subResult.rows.length === 0) {
        throw new Error("Subscription not found");
      }

      const { stripe_subscription_id } = subResult.rows[0];

      // Update in Stripe
      const updateParams = {};
      if (updates.planId) {
        const planResult = await db.query(
          "SELECT stripe_price_id FROM plans WHERE id = $1",
          [updates.planId],
        );
        if (planResult.rows.length > 0) {
          updateParams.items = [{ price: planResult.rows[0].stripe_price_id }];
        }
      }

      const stripeSubscription = await stripe.subscriptions.update(
        stripe_subscription_id,
        updateParams,
      );

      // Update in database
      await db.query(
        `UPDATE subscriptions SET
         status = $1, amount = $2, updated_at = NOW()
         WHERE id = $3`,
        [
          stripeSubscription.status,
          stripeSubscription.items.data[0].price.unit_amount,
          subscriptionId,
        ],
      );

      return { success: true, subscription: stripeSubscription };
    } catch (error) {
      logger.error("[STRIPESERVICE] Update subscription error", {
        error: error.message,
        subscriptionId,
      });
      throw error;
    }
  },

  /**
   * Cancel a subscription
   */
  async cancelSubscription({ subscriptionId, userId, immediately = false }) {
    try {
      const subResult = await db.query(
        `SELECT s.stripe_subscription_id
         FROM subscriptions s
         JOIN customers c ON s.customer_id = c.id
         WHERE s.id = $1 AND c.user_id = $2`,
        [subscriptionId, userId],
      );

      if (subResult.rows.length === 0) {
        throw new Error("Subscription not found");
      }

      const { stripe_subscription_id } = subResult.rows[0];

      const stripeSubscription = immediately
        ? await stripe.subscriptions.cancel(stripe_subscription_id)
        : await stripe.subscriptions.update(stripe_subscription_id, {
            cancel_at_period_end: true,
          });

      await db.query(
        `UPDATE subscriptions SET
         cancel_at_period_end = $1, status = $2, updated_at = NOW()
         WHERE id = $3`,
        [
          stripeSubscription.cancel_at_period_end,
          stripeSubscription.status,
          subscriptionId,
        ],
      );

      return { success: true, subscription: stripeSubscription };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Cancel subscription error", {
        error: error.message,
        subscriptionId,
      });
      throw error;
    }
  },

  /**
   * Pause a subscription
   */
  async pauseSubscription({ subscriptionId, userId }) {
    try {
      const subResult = await db.query(
        `SELECT s.stripe_subscription_id
         FROM subscriptions s
         JOIN customers c ON s.customer_id = c.id
         WHERE s.id = $1 AND c.user_id = $2`,
        [subscriptionId, userId],
      );

      if (subResult.rows.length === 0) {
        throw new Error("Subscription not found");
      }

      const { stripe_subscription_id } = subResult.rows[0];

      const stripeSubscription = await stripe.subscriptions.update(
        stripe_subscription_id,
        {
          pause_collection: { behavior: "mark_uncollectible" },
        },
      );

      await db.query(
        "UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2",
        [stripeSubscription.status, subscriptionId],
      );

      return { success: true, subscription: stripeSubscription };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Pause subscription error", {
        error: error.message,
        subscriptionId,
      });
      throw error;
    }
  },

  /**
   * Resume a paused subscription
   */
  async resumeSubscription({ subscriptionId, userId }) {
    try {
      const subResult = await db.query(
        `SELECT s.stripe_subscription_id
         FROM subscriptions s
         JOIN customers c ON s.customer_id = c.id
         WHERE s.id = $1 AND c.user_id = $2`,
        [subscriptionId, userId],
      );

      if (subResult.rows.length === 0) {
        throw new Error("Subscription not found");
      }

      const { stripe_subscription_id } = subResult.rows[0];

      const stripeSubscription = await stripe.subscriptions.update(
        stripe_subscription_id,
        {
          pause_collection: null,
        },
      );

      await db.query(
        "UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2",
        [stripeSubscription.status, subscriptionId],
      );

      return { success: true, subscription: stripeSubscription };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Resume subscription error", {
        error: error.message,
        subscriptionId,
      });
      throw error;
    }
  },

  /**
   * Get invoice details
   */
  async getInvoice({ invoiceId, userId }) {
    try {
      const invoiceResult = await db.query(
        `SELECT i.*, c.stripe_customer_id
         FROM invoices i
         JOIN customers c ON i.customer_id = c.id
         WHERE i.id = $1 AND c.user_id = $2`,
        [invoiceId, userId],
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error("Invoice not found");
      }

      const { stripe_invoice_id } = invoiceResult.rows[0];
      const stripeInvoice = await stripe.invoices.retrieve(stripe_invoice_id);

      return {
        ...invoiceResult.rows[0],
        stripeInvoice,
      };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Get invoice error", {
        error: error.message,
        invoiceId,
      });
      throw error;
    }
  },

  /**
   * Retry invoice payment
   */
  async retryInvoicePayment({ invoiceId, userId }) {
    try {
      const invoiceResult = await db.query(
        `SELECT i.stripe_invoice_id
         FROM invoices i
         JOIN customers c ON i.customer_id = c.id
         WHERE i.id = $1 AND c.user_id = $2`,
        [invoiceId, userId],
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error("Invoice not found");
      }

      const { stripe_invoice_id } = invoiceResult.rows[0];
      const stripeInvoice = await stripe.invoices.pay(stripe_invoice_id);

      await db.query(
        "UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2",
        [stripeInvoice.status, invoiceId],
      );

      return { success: true, invoice: stripeInvoice };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Retry invoice payment error", {
        error: error.message,
        invoiceId,
      });
      throw error;
    }
  },

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent({ customerId, userId }) {
    try {
      const customerResult = await db.query(
        "SELECT stripe_customer_id FROM customers WHERE id = $1 AND user_id = $2",
        [customerId, userId],
      );

      if (customerResult.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const { stripe_customer_id } = customerResult.rows[0];

      const setupIntent = await stripe.setupIntents.create({
        customer: stripe_customer_id,
        payment_method_types: ["card"],
      });

      return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Create setup intent error", {
        error: error.message,
        customerId,
      });
      throw error;
    }
  },

  /**
   * Create a payment intent
   */
  async createPaymentIntent({
    customerId,
    userId,
    amount,
    currency = "usd",
    metadata = {},
  }) {
    try {
      const customerResult = await db.query(
        "SELECT stripe_customer_id FROM customers WHERE id = $1 AND user_id = $2",
        [customerId, userId],
      );

      if (customerResult.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const { stripe_customer_id } = customerResult.rows[0];

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: stripe_customer_id,
        metadata,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Create payment intent error", {
        error: error.message,
        customerId,
        amount,
      });
      throw error;
    }
  },

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod({
    customerId,
    userId,
    paymentMethodId,
    setAsDefault = false,
  }) {
    try {
      const customerResult = await db.query(
        "SELECT stripe_customer_id, id FROM customers WHERE id = $1 AND user_id = $2",
        [customerId, userId],
      );

      if (customerResult.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const { stripe_customer_id, id: dbCustomerId } = customerResult.rows[0];

      // Attach payment method to customer in Stripe
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripe_customer_id,
      });

      // Get payment method details
      const paymentMethod =
        await stripe.paymentMethods.retrieve(paymentMethodId);

      // Save to database
      const insertResult = await db.query(
        `INSERT INTO payment_methods (
          customer_id, stripe_payment_method_id, type, card_brand,
          card_last4, card_exp_month, card_exp_year, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          dbCustomerId,
          paymentMethodId,
          paymentMethod.type,
          paymentMethod.card?.brand,
          paymentMethod.card?.last4,
          paymentMethod.card?.exp_month,
          paymentMethod.card?.exp_year,
          setAsDefault,
        ],
      );

      if (setAsDefault) {
        // Update customer's default payment method
        await stripe.customers.update(stripe_customer_id, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });

        // Set all other payment methods to not default
        await db.query(
          "UPDATE payment_methods SET is_default = FALSE WHERE customer_id = $1 AND id != $2",
          [dbCustomerId, insertResult.rows[0].id],
        );
      }

      return { success: true, paymentMethod: insertResult.rows[0] };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Attach payment method error", {
        error: error.message,
        customerId,
        paymentMethodId,
      });
      throw error;
    }
  },

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod({ paymentMethodId, userId }) {
    try {
      // Verify ownership
      const pmResult = await db.query(
        `SELECT pm.stripe_payment_method_id, pm.id
         FROM payment_methods pm
         JOIN customers c ON pm.customer_id = c.id
         WHERE pm.id = $1 AND c.user_id = $2`,
        [paymentMethodId, userId],
      );

      if (pmResult.rows.length === 0) {
        throw new Error("Payment method not found");
      }

      const { stripe_payment_method_id, id: dbPmId } = pmResult.rows[0];

      // Detach from Stripe
      await stripe.paymentMethods.detach(stripe_payment_method_id);

      // Delete from database
      await db.query("DELETE FROM payment_methods WHERE id = $1", [dbPmId]);

      return { success: true };
    } catch (error) {
      logger.error("[STRIPE SERVICE] Detach payment method error", {
        error: error.message,
        paymentMethodId,
      });
      throw error;
    }
  },

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods({ customerId, userId }) {
    try {
      const customerResult = await db.query(
        "SELECT stripe_customer_id FROM customers WHERE id = $1 AND user_id = $2",
        [customerId, userId],
      );

      if (customerResult.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const { stripe_customer_id } = customerResult.rows[0];

      // Get from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripe_customer_id,
        type: "card",
      });

      // Also get from database
      const dbPaymentMethods = await db.query(
        "SELECT * FROM payment_methods WHERE customer_id = $1 ORDER BY created_at DESC",
        [customerId],
      );

      return {
        paymentMethods: paymentMethods.data,
        dbPaymentMethods: dbPaymentMethods.rows,
      };
    } catch (error) {
      logger.error("[STRIPE SERVICE] List payment methods error", {
        error: error.message,
        customerId,
      });
      throw error;
    }
  },
};
