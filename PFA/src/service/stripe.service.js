/**
 * This service handles all interactions with the Stripe API which includes:
 * - Customer management
 * - Payment method handling
 * - Subscription lifecycle
 * - Invoice operations
 * - Payment intents
 * - Refunds and disputes
 */

import Stripe from "stripe";
import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";
import { logPaymentEvent } from "./paymentEvents.service.js";
const db = getDBConnection();

function getStripeClient(apiKey) {
  return new Stripe(apiKey, {
    apiVersion: "2024-11-20.acacia",
    maxNetworkRetries: 3,
    timeout: 30000,
    telemetry: false,
  });
}

// Decrypt user's Stripe API key from database
async function getUserStripeKey(userId) {
  const result = await db.query(
    "SELECT pgp_sym_decrypt(stripe_secret_key, $1) as api_key FROM users WHERE id = $2",
    [process.env.DB_ENCRYPTION_KEY, userId],
  );

  if (!result.rows[0]?.api_key) {
    throw new Error("Stripe API key not found for user");
  }

  return result.rows[0].api_key;
}

export const stripeService = {
  //   Create or retrieve a Stripe customer
  async createCustomer({ userId, email, name, metadata = {} }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      // Check if customer already exists in our database
      const existingCustomer = await db.query(
        "SELECT stripe_customer_id FROM customers WHERE user_id = $1 AND email = $2",
        [userId, email],
      );

      if (existingCustomer.rows.length > 0) {
        logger.info("Customer already exists", {
          customerId: existingCustomer.rows[0].stripe_customer_id,
        });
        return existingCustomer.rows[0];
      }

      // Create customer in Stripe if customer does not exist
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          internal_user_id: userId,
        },
      });

      // Save customer to database
      const result = await db.query(
        `INSERT INTO customers (user_id, stripe_customer_id, email, name)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, stripe_customer_id`,
        [userId, customer.id, email, name],
      );

      await logPaymentEvent({
        eventType: "customer.created",
        customerId: result.rows[0].id,
        userId,
        eventData: { stripeCustomerId: customer.id },
        severity: "info",
        source: "api",
      });

      logger.info("Customer created successfully", {
        customerId: customer.id,
      });

      return result.rows[0];
    } catch (error) {
      logger.error("Error creating customer", { error: error.message });
      throw error;
    }
  },

  //    Update customer details
  async updateCustomer({ userId, customerId, updates }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const customer = await db.query(
        "SELECT stripe_customer_id FROM customers WHERE id = $1 AND user_id = $2",
        [customerId, userId],
      );

      if (customer.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const stripeCustomerId = customer.rows[0].stripe_customer_id;
      const updatedCustomer = await stripe.customers.update(
        stripeCustomerId,
        updates,
      );

      // Update local database
      if (updates.email || updates.name) {
        await db.query(
          `UPDATE customers SET
                        email = COALESCE($1, email),
                        name = COALESCE($2, name)
                     WHERE id = $3`,
          [updates.email, updates.name, customerId],
        );
      }

      return updatedCustomer;
    } catch (error) {
      logger.error("Error updating customer", { error: error.message });
      throw error;
    }
  },

  //   PAYMENT METHODS
  // Create a Setup Intent for collecting payment method
  async createSetupIntent({
    userId,
    customerId,
    paymentMethodTypes = ["card"],
  }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const customer = await db.query(
        "SELECT stripe_customer_id FROM customers WHERE id = $1",
        [customerId],
      );

      if (customer.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customer.rows[0].stripe_customer_id,
        payment_method_types: paymentMethodTypes,
        usage: "off_session",
        metadata: {
          customer_id: customerId,
        },
      });

      await logPaymentEvent({
        eventType: "setup_intent.created",
        customerId,
        userId,
        eventData: { setupIntentId: setupIntent.id },
        severity: "info",
        source: "api",
      });

      return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      logger.error("Error creating setup intent", { error: error.message });
      throw error;
    }
  },

  // Attach payment method to customer and save to database
  async attachPaymentMethod({
    userId,
    customerId,
    paymentMethodId,
    setAsDefault = false,
  }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const customer = await db.query(
        "SELECT stripe_customer_id FROM customers WHERE id = $1",
        [customerId],
      );

      if (customer.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const stripeCustomerId = customer.rows[0].stripe_customer_id;

      // Attach payment method to customer
      const paymentMethod = await stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: stripeCustomerId,
        },
      );

      // Extract payment method details
      const pmData = this._extractPaymentMethodData(paymentMethod);

      // Save to database
      const result = await db.query(
        `INSERT INTO payment_methods (
                    customer_id, stripe_payment_method_id, type,
                    card_brand, card_last4, card_exp_month, card_exp_year, card_fingerprint,
                    bank_name, bank_last4, bank_account_type,
                    is_default, billing_name, billing_email, billing_address,
                    requires_3ds, verified_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING id`,
        [
          customerId,
          paymentMethodId,
          pmData.type,
          pmData.card_brand,
          pmData.card_last4,
          pmData.card_exp_month,
          pmData.card_exp_year,
          pmData.card_fingerprint,
          pmData.bank_name,
          pmData.bank_last4,
          pmData.bank_account_type,
          setAsDefault,
          pmData.billing_name,
          pmData.billing_email,
          JSON.stringify(pmData.billing_address),
          pmData.requires_3ds,
          new Date(),
        ],
      );

      // Set as default if requested
      if (setAsDefault) {
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      await logPaymentEvent({
        eventType: "payment_method.attached",
        customerId,
        userId,
        paymentMethodId: result.rows[0].id,
        eventData: {
          stripePaymentMethodId: paymentMethodId,
          type: pmData.type,
          isDefault: setAsDefault,
        },
        severity: "info",
        source: "api",
      });

      return result.rows[0];
    } catch (error) {
      logger.error("Error attaching payment method", { error: error.message });
      throw error;
    }
  },

  // Detach payment method from customer
  async detachPaymentMethod({ userId, paymentMethodId }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const pmRecord = await db.query(
        "SELECT id, customer_id, stripe_payment_method_id FROM payment_methods WHERE id = $1",
        [paymentMethodId],
      );

      if (pmRecord.rows.length === 0) {
        throw new Error("Payment method not found");
      }

      const { stripe_payment_method_id, customer_id } = pmRecord.rows[0];

      // Detach from Stripe
      await stripe.paymentMethods.detach(stripe_payment_method_id);

      // Soft delete in database
      await db.query(
        "UPDATE payment_methods SET deleted_at = NOW() WHERE id = $1",
        [paymentMethodId],
      );

      await logPaymentEvent({
        eventType: "payment_method.detached",
        customerId: customer_id,
        userId,
        paymentMethodId,
        eventData: { stripePaymentMethodId: stripe_payment_method_id },
        severity: "info",
        source: "api",
      });

      return { success: true };
    } catch (error) {
      logger.error("Error detaching payment method", { error: error.message });
      throw error;
    }
  },

  // List all payment methods for a customer
  async listPaymentMethods({ userId, customerId, includeDeleted = false }) {
    try {
      const query = includeDeleted
        ? "SELECT * FROM payment_methods WHERE customer_id = $1 ORDER BY created_at DESC"
        : "SELECT * FROM payment_methods WHERE customer_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC";

      const result = await db.query(query, [customerId]);
      return result.rows;
    } catch (error) {
      logger.error("Error listing payment methods", { error: error.message });
      throw error;
    }
  },

  //   PAYMENT INTENTS
  //    Create a Payment Intent for one-time payment
  async createPaymentIntent({
    userId,
    customerId,
    amount,
    currency = "usd",
    paymentMethodId = null,
    description = "",
    metadata = {},
    confirmImmediately = false,
  }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const customer = await db.query(
        "SELECT stripe_customer_id FROM customers WHERE id = $1",
        [customerId],
      );

      if (customer.rows.length === 0) {
        throw new Error("Customer not found");
      }

      const intentParams = {
        amount,
        currency,
        customer: customer.rows[0].stripe_customer_id,
        description,
        metadata: {
          ...metadata,
          internal_customer_id: customerId,
        },
        setup_future_usage: "off_session",
      };

      if (paymentMethodId) {
        intentParams.payment_method = paymentMethodId;
        if (confirmImmediately) {
          intentParams.confirm = true;
          intentParams.return_url = process.env.PAYMENT_RETURN_URL;
        }
      }

      const paymentIntent = await stripe.paymentIntents.create(intentParams);

      // Log transaction
      await db.query(
        `INSERT INTO transactions (
                    customer_id, stripe_payment_intent_id, type, status,
                    amount, currency, description, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          customerId,
          paymentIntent.id,
          "payment",
          paymentIntent.status,
          amount,
          currency,
          description,
          JSON.stringify(metadata),
        ],
      );

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error("Error creating payment intent", { error: error.message });
      throw error;
    }
  },

  //    Confirm a payment intent
  async confirmPaymentIntent({
    userId,
    paymentIntentId,
    paymentMethodId = null,
  }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const confirmParams = {};
      if (paymentMethodId) {
        confirmParams.payment_method = paymentMethodId;
      }

      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams,
      );

      // Update transaction status
      await db.query(
        "UPDATE transactions SET status = $1, succeeded_at = CASE WHEN $1 = $2 THEN NOW() END WHERE stripe_payment_intent_id = $3",
        [paymentIntent.status, "succeeded", paymentIntentId],
      );

      return paymentIntent;
    } catch (error) {
      logger.error("Error confirming payment intent", { error: error.message });
      throw error;
    }
  },

  //  SUBSCRIPTIONS

  //    Create a subscription
  async createSubscription({
    userId,
    customerId,
    planId,
    paymentMethodId = null,
    trialPeriodDays = null,
    couponId = null,
    metadata = {},
    prorationBehavior = "create_prorations",
  }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      // Get customer and plan details
      const [customerData, planData] = await Promise.all([
        db.query("SELECT stripe_customer_id FROM customers WHERE id = $1", [
          customerId,
        ]),
        db.query(
          "SELECT stripe_price_id, trial_period_days FROM subscription_plans WHERE id = $1",
          [planId],
        ),
      ]);

      if (customerData.rows.length === 0) throw new Error("Customer not found");
      if (planData.rows.length === 0) throw new Error("Plan not found");

      const stripeCustomerId = customerData.rows[0].stripe_customer_id;
      const stripePriceId = planData.rows[0].stripe_price_id;
      const defaultTrial = planData.rows[0].trial_period_days;

      const subscriptionParams = {
        customer: stripeCustomerId,
        items: [{ price: stripePriceId }],
        metadata: {
          ...metadata,
          internal_customer_id: customerId,
          internal_plan_id: planId,
        },
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
      };

      // Set trial period
      if (trialPeriodDays !== null) {
        subscriptionParams.trial_period_days = trialPeriodDays;
      } else if (defaultTrial) {
        subscriptionParams.trial_period_days = defaultTrial;
      }

      // Set payment method if provided
      if (paymentMethodId) {
        subscriptionParams.default_payment_method = paymentMethodId;
      }

      // Apply coupon if provided
      if (couponId) {
        subscriptionParams.coupon = couponId;
      }

      const subscription =
        await stripe.subscriptions.create(subscriptionParams);

      // Save subscription to database
      const subResult = await db.query(
        `INSERT INTO subscriptions (
                    customer_id, stripe_subscription_id, status, amount, currency,
                    billing_interval, current_period_start, current_period_end,
                    trial_end, plan_id, default_payment_method_id, last_event_timestamp,
                    metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id`,
        [
          customerId,
          subscription.id,
          subscription.status,
          subscription.items.data[0].price.unit_amount,
          subscription.currency,
          subscription.items.data[0].price.recurring.interval,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
          subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
          planId,
          paymentMethodId,
          Date.now(),
          JSON.stringify(metadata),
        ],
      );

      const subscriptionId = subResult.rows[0].id;

      // Create subscription item record
      await db.query(
        `INSERT INTO subscription_items (subscription_id, plan_id, stripe_subscription_item_id)
                 VALUES ($1, $2, $3)`,
        [subscriptionId, planId, subscription.items.data[0].id],
      );

      // Log event
      await logPaymentEvent({
        eventType: "subscription.created",
        customerId,
        subscriptionId,
        userId,
        eventData: {
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          amount: subscription.items.data[0].price.unit_amount,
        },
        severity: "info",
        source: "api",
      });

      return {
        subscriptionId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        clientSecret:
          subscription.latest_invoice?.payment_intent?.client_secret,
      };
    } catch (error) {
      logger.error("Error creating subscription", { error: error.message });
      throw error;
    }
  },

  //    Update subscription (change plan, quantity, etc.)
  async updateSubscription({
    userId,
    subscriptionId,
    newPlanId = null,
    quantity = null,
    prorationBehavior = "create_prorations",
    billingCycleAnchor = "unchanged",
  }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const subData = await db.query(
        "SELECT stripe_subscription_id, customer_id FROM subscriptions WHERE id = $1",
        [subscriptionId],
      );

      if (subData.rows.length === 0) throw new Error("Subscription not found");

      const stripeSubId = subData.rows[0].stripe_subscription_id;
      const subscription = await stripe.subscriptions.retrieve(stripeSubId);

      const updateParams = {
        proration_behavior: prorationBehavior,
        billing_cycle_anchor: billingCycleAnchor,
      };

      // Change plan
      if (newPlanId) {
        const planData = await db.query(
          "SELECT stripe_price_id FROM subscription_plans WHERE id = $1",
          [newPlanId],
        );

        if (planData.rows.length === 0) throw new Error("Plan not found");

        updateParams.items = [
          {
            id: subscription.items.data[0].id,
            price: planData.rows[0].stripe_price_id,
          },
        ];
      }

      // Change quantity
      if (quantity !== null) {
        updateParams.items = updateParams.items || [
          {
            id: subscription.items.data[0].id,
          },
        ];
        updateParams.items[0].quantity = quantity;
      }

      const updatedSub = await stripe.subscriptions.update(
        stripeSubId,
        updateParams,
      );

      // Update database
      await db.query(
        `UPDATE subscriptions SET
                    status = $1,
                    amount = $2,
                    current_period_start = $3,
                    current_period_end = $4,
                    plan_id = COALESCE($5, plan_id),
                    last_event_timestamp = $6
                 WHERE id = $7`,
        [
          updatedSub.status,
          updatedSub.items.data[0].price.unit_amount,
          new Date(updatedSub.current_period_start * 1000),
          new Date(updatedSub.current_period_end * 1000),
          newPlanId,
          Date.now(),
          subscriptionId,
        ],
      );

      await logPaymentEvent({
        eventType: "subscription.updated",
        subscriptionId,
        customerId: subData.rows[0].customer_id,
        userId,
        eventData: { changes: { newPlanId, quantity } },
        severity: "info",
        source: "api",
      });

      return updatedSub;
    } catch (error) {
      logger.error("Error updating subscription", { error: error.message });
      throw error;
    }
  },

  //   Cancel subscription
  async cancelSubscription({
    userId,
    subscriptionId,
    cancelAtPeriodEnd = true,
    cancellationReason = null,
  }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const subData = await db.query(
        "SELECT stripe_subscription_id, customer_id FROM subscriptions WHERE id = $1",
        [subscriptionId],
      );

      if (subData.rows.length === 0) throw new Error("Subscription not found");

      const stripeSubId = subData.rows[0].stripe_subscription_id;

      let canceledSub;
      if (cancelAtPeriodEnd) {
        canceledSub = await stripe.subscriptions.update(stripeSubId, {
          cancel_at_period_end: true,
          cancellation_details: {
            comment: cancellationReason,
          },
        });
      } else {
        canceledSub = await stripe.subscriptions.cancel(stripeSubId);
      }

      // Update database
      await db.query(
        `UPDATE subscriptions SET
                    status = $1,
                    cancel_at_period_end = $2,
                    canceled_at = $3,
                    cancellation_reason = $4,
                    ended_at = $5,
                    last_event_timestamp = $6
                 WHERE id = $7`,
        [
          canceledSub.status,
          cancelAtPeriodEnd,
          new Date(),
          cancellationReason,
          cancelAtPeriodEnd ? null : new Date(),
          Date.now(),
          subscriptionId,
        ],
      );

      // Log state transition
      await db.query(
        `INSERT INTO subscription_state_transitions (subscription_id, from_status, to_status, reason)
                 VALUES ($1, (SELECT status FROM subscriptions WHERE id = $1), $2, $3)`,
        [subscriptionId, canceledSub.status, cancellationReason],
      );

      await logPaymentEvent({
        eventType: "subscription.canceled",
        subscriptionId,
        customerId: subData.rows[0].customer_id,
        userId,
        eventData: {
          cancelAtPeriodEnd,
          reason: cancellationReason,
        },
        severity: "info",
        source: "api",
      });

      return canceledSub;
    } catch (error) {
      logger.error("Error canceling subscription", { error: error.message });
      throw error;
    }
  },

  //   Pause subscription
  async pauseSubscription({ userId, subscriptionId, resumeAt = null }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const subData = await db.query(
        "SELECT stripe_subscription_id FROM subscriptions WHERE id = $1",
        [subscriptionId],
      );

      if (subData.rows.length === 0) throw new Error("Subscription not found");

      const pauseConfig = {
        behavior: "mark_uncollectible",
      };

      if (resumeAt) {
        pauseConfig.resumes_at = Math.floor(
          new Date(resumeAt).getTime() / 1000,
        );
      }

      const pausedSub = await stripe.subscriptions.update(
        subData.rows[0].stripe_subscription_id,
        { pause_collection: pauseConfig },
      );

      await db.query(
        `UPDATE subscriptions SET
                    status = $1,
                    pause_collection = $2,
                    last_event_timestamp = $3
                 WHERE id = $4`,
        [
          pausedSub.status,
          JSON.stringify(pauseConfig),
          Date.now(),
          subscriptionId,
        ],
      );

      return pausedSub;
    } catch (error) {
      logger.error("Error pausing subscription", { error: error.message });
      throw error;
    }
  },

  //   Resume paused subscription
  async resumeSubscription({ userId, subscriptionId }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const subData = await db.query(
        "SELECT stripe_subscription_id FROM subscriptions WHERE id = $1",
        [subscriptionId],
      );

      if (subData.rows.length === 0) throw new Error("Subscription not found");

      const resumedSub = await stripe.subscriptions.update(
        subData.rows[0].stripe_subscription_id,
        { pause_collection: null },
      );

      await db.query(
        `UPDATE subscriptions SET
                    status = $1,
                    pause_collection = NULL,
                    last_event_timestamp = $2
                 WHERE id = $3`,
        [resumedSub.status, Date.now(), subscriptionId],
      );

      return resumedSub;
    } catch (error) {
      logger.error("Error resuming subscription", { error: error.message });
      throw error;
    }
  },

  //   INVOICES
  //   Retrieve an invoice details
  async getInvoice({ userId, invoiceId }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const invoiceData = await db.query(
        "SELECT stripe_invoice_id FROM invoices WHERE id = $1",
        [invoiceId],
      );

      if (invoiceData.rows.length === 0) throw new Error("Invoice not found");

      const invoice = await stripe.invoices.retrieve(
        invoiceData.rows[0].stripe_invoice_id,
        { expand: ["payment_intent", "subscription"] },
      );

      return invoice;
    } catch (error) {
      logger.error("Error retrieving invoice", { error: error.message });
      throw error;
    }
  },

  //   Retry failed invoice payment
  async retryInvoicePayment({ userId, invoiceId, paymentMethodId = null }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const invoiceData = await db.query(
        "SELECT stripe_invoice_id, customer_id FROM invoices WHERE id = $1",
        [invoiceId],
      );

      if (invoiceData.rows.length === 0) throw new Error("Invoice not found");

      const stripeInvoiceId = invoiceData.rows[0].stripe_invoice_id;

      // Update payment method if provided
      if (paymentMethodId) {
        const customerData = await db.query(
          "SELECT stripe_customer_id FROM customers WHERE id = $1",
          [invoiceData.rows[0].customer_id],
        );

        await stripe.customers.update(customerData.rows[0].stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Pay the invoice
      const invoice = await stripe.invoices.pay(stripeInvoiceId);

      // Update retry count
      await db.query(
        "UPDATE invoices SET retry_count = retry_count + 1 WHERE id = $1",
        [invoiceId],
      );

      return invoice;
    } catch (error) {
      logger.error("Error retrying invoice payment", { error: error.message });

      // Log failure
      await db.query(
        `UPDATE invoices SET
                    payment_failed_at = NOW(),
                    last_finalization_error = $1
                 WHERE id = $2`,
        [error.message, invoiceId],
      );

      throw error;
    }
  },

  // REFUNDS
  //   Process refund
  async createRefund({
    userId,
    transactionId,
    amount = null,
    reason = "requested_by_customer",
    metadata = {},
  }) {
    try {
      const apiKey = await getUserStripeKey(userId);
      const stripe = getStripeClient(apiKey);

      const txnData = await db.query(
        `SELECT stripe_payment_intent_id, stripe_charge_id, amount as original_amount,
                        customer_id, invoice_id
                 FROM transactions WHERE id = $1`,
        [transactionId],
      );

      if (txnData.rows.length === 0) throw new Error("Transaction not found");

      const { stripe_charge_id, original_amount, customer_id, invoice_id } =
        txnData.rows[0];
      const refundAmount = amount || original_amount;

      const refund = await stripe.refunds.create({
        charge: stripe_charge_id,
        amount: refundAmount,
        reason,
        metadata,
      });

      // Record refund
      await db.query(
        `INSERT INTO refunds (
                    transaction_id, invoice_id, customer_id, stripe_refund_id,
                    amount, currency, reason, status, requested_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          transactionId,
          invoice_id,
          customer_id,
          refund.id,
          refundAmount,
          refund.currency,
          reason,
          refund.status,
          userId,
        ],
      );

      // Update transaction
      await db.query(
        "UPDATE transactions SET amount_refunded = amount_refunded + $1 WHERE id = $2",
        [refundAmount, transactionId],
      );

      await logPaymentEvent({
        eventType: "refund.created",
        transactionId,
        customerId: customer_id,
        userId,
        eventData: { refundId: refund.id, amount: refundAmount, reason },
        severity: "info",
        source: "api",
      });

      return refund;
    } catch (error) {
      logger.error("Error creating refund", { error: error.message });
      throw error;
    }
  },

  // UTILITY FUNCTIONS
  //    Extract payment method data from Stripe PM object
  _extractPaymentMethodData(paymentMethod) {
    const data = {
      type: paymentMethod.type,
      billing_name: paymentMethod.billing_details?.name,
      billing_email: paymentMethod.billing_details?.email,
      billing_address: paymentMethod.billing_details?.address,
      requires_3ds: false,
    };

    if (paymentMethod.type === "card") {
      const card = paymentMethod.card;
      data.card_brand = card.brand;
      data.card_last4 = card.last4;
      data.card_exp_month = card.exp_month;
      data.card_exp_year = card.exp_year;
      data.card_fingerprint = card.fingerprint;
      data.requires_3ds = card.three_d_secure_usage?.supported || false;
    } else if (paymentMethod.type === "ach_debit") {
      const ach = paymentMethod.us_bank_account;
      data.bank_name = ach.bank_name;
      data.bank_last4 = ach.last4;
      data.bank_account_type = ach.account_type;
    }

    return data;
  },
};
