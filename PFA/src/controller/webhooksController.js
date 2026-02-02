// Webhooks Controller
// Handles incoming Stripe webhook events

import Stripe from "stripe";
import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";
import {
  logPaymentEvent,
  addBillingHistoryEntry,
} from "../service/paymentEvents.service.js";
import { sendEmail } from "../mail/email.service.js";
import {
  subscriptionCreatedEmail,
  subscriptionCanceledEmail,
  trialEndingSoonEmail,
  invoicePaidEmail,
  invoicePaymentFailedEmail,
} from "../mail/emailTemplates.js";
const db = getDBConnection();

  // Get user's Stripe webhook secret
async function getWebhookSecret(userId = null) {
  // For global webhook endpoint
  return process.env.STRIPE_WEBHOOK_SECRET;
}

  // Verify Stripe webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    logger.error("Webhook signature verification failed", {
      error: error.message,
    });
    throw new Error("Invalid webhook signature");
  }
}

  // Check if event has already been processed (idempotency)
async function isEventProcessed(eventId) {
  const result = await db.query(
    "SELECT id FROM stripe_events WHERE stripe_event_id = $1 AND processed_at IS NOT NULL",
    [eventId],
  );
  return result.rows.length > 0;
}

  // Store incoming event in database
async function storeEvent(event) {
  const result = await db.query(
    `INSERT INTO stripe_events (stripe_event_id, type, api_version, payload)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (stripe_event_id) DO NOTHING
         RETURNING id`,
    [event.id, event.type, event.api_version, JSON.stringify(event)],
  );
  return result.rows[0]?.id;
}

  // Mark event as processed
async function markEventProcessed(eventId, error = null) {
  await db.query(
    "UPDATE stripe_events SET processed_at = NOW(), error = $1 WHERE stripe_event_id = $2",
    [error, eventId],
  );
}

// EVENT HANDLERS

  // Handle customer.subscription.created
async function handleSubscriptionCreated(event) {
  const subscription = event.data.object;
  const customerId = subscription.metadata?.internal_customer_id;

  if (!customerId) {
    logger.warn("Subscription created without internal customer ID", {
      subscriptionId: subscription.id,
    });
    return;
  }

  // Check if subscription already exists
  const existing = await db.query(
    "SELECT id FROM subscriptions WHERE stripe_subscription_id = $1",
    [subscription.id],
  );

  if (existing.rows.length > 0) {
    logger.info("Subscription already exists in database", {
      subscriptionId: subscription.id,
    });
    return;
  }

  // Get customer email for notifications
  const customerData = await db.query(
    "SELECT email, name, user_id FROM customers WHERE id = $1",
    [customerId],
  );

  if (customerData.rows.length === 0) return;

  const { email, name, user_id } = customerData.rows[0];

  // Send welcome email
  await sendEmail({
    to: email,
    subject: "Welcome to PayFlow - Subscription Activated",
    html: subscriptionCreatedEmail({
      customerName: name,
      planName: subscription.items.data[0].price.nickname || "Premium Plan",
      amount: subscription.items.data[0].price.unit_amount / 100,
      currency: subscription.currency.toUpperCase(),
      billingPeriod: subscription.items.data[0].price.recurring.interval,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    }),
  });

  await addBillingHistoryEntry({
    customerId,
    subscriptionId: existing.rows[0]?.id,
    action: "subscription_created",
    description: "Subscription successfully activated",
    amount: subscription.items.data[0].price.unit_amount,
    currency: subscription.currency,
    success: true,
  });

  logger.info("Subscription created event processed", {
    subscriptionId: subscription.id,
  });
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(event) {
  const subscription = event.data.object;

  const result = await db.query(
    "SELECT id, customer_id, status FROM subscriptions WHERE stripe_subscription_id = $1",
    [subscription.id],
  );

  if (result.rows.length === 0) {
    logger.warn("Subscription not found for update event", {
      subscriptionId: subscription.id,
    });
    return;
  }

  const {
    id: subscriptionId,
    customer_id: customerId,
    status: oldStatus,
  } = result.rows[0];
  const newStatus = subscription.status;

  // Update subscription in database
  await db.query(
    `UPDATE subscriptions SET
            status = $1,
            amount = $2,
            current_period_start = $3,
            current_period_end = $4,
            cancel_at_period_end = $5,
            last_event_timestamp = $6
         WHERE id = $7`,
    [
      newStatus,
      subscription.items.data[0].price.unit_amount,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end,
      Date.now(),
      subscriptionId,
    ],
  );

  // Log status transition if changed
  if (oldStatus !== newStatus) {
    await db.query(
      `INSERT INTO subscription_state_transitions (subscription_id, from_status, to_status)
             VALUES ($1, $2, $3)`,
      [subscriptionId, oldStatus, newStatus],
    );
  }

  await logPaymentEvent({
    eventType: "subscription.updated",
    customerId,
    subscriptionId,
    eventData: {
      oldStatus,
      newStatus,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    severity: "info",
    source: "webhook",
  });

  logger.info("Subscription updated event processed", {
    subscriptionId: subscription.id,
  });
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(event) {
  const subscription = event.data.object;

  const result = await db.query(
    "SELECT id, customer_id FROM subscriptions WHERE stripe_subscription_id = $1",
    [subscription.id],
  );

  if (result.rows.length === 0) return;

  const { id: subscriptionId, customer_id: customerId } = result.rows[0];

  // Update subscription status
  await db.query(
    `UPDATE subscriptions SET
            status = $1,
            ended_at = NOW(),
            last_event_timestamp = $2
         WHERE id = $3`,
    ["canceled", Date.now(), subscriptionId],
  );

  // Get customer for email
  const customerData = await db.query(
    "SELECT email, name FROM customers WHERE id = $1",
    [customerId],
  );

  if (customerData.rows.length > 0) {
    const { email, name } = customerData.rows[0];

    await sendEmail({
      to: email,
      subject: "Your PayFlow Subscription Has Been Canceled",
      html: subscriptionCanceledEmail({
        customerName: name,
        endDate: new Date(),
      }),
    });
  }

  await addBillingHistoryEntry({
    customerId,
    subscriptionId,
    action: "subscription_canceled",
    description: "Subscription has been canceled",
    success: true,
  });

  logger.info("Subscription deleted event processed", {
    subscriptionId: subscription.id,
  });
}

/**
 * Handle customer.subscription.trial_will_end (3 days before trial ends)
 */
async function handleTrialWillEnd(event) {
  const subscription = event.data.object;

  const result = await db.query(
    `SELECT s.id, c.email, c.name, c.id as customer_id
         FROM subscriptions s
         JOIN customers c ON s.customer_id = c.id
         WHERE s.stripe_subscription_id = $1`,
    [subscription.id],
  );

  if (result.rows.length === 0) return;

  const { email, name, customer_id: customerId } = result.rows[0];

  // Send reminder email
  await sendEmail({
    to: email,
    subject: "Your PayFlow Trial is Ending Soon",
    html: trialEndingSoonEmail({
      customerName: name,
      trialEndDate: new Date(subscription.trial_end * 1000),
      planName: subscription.items.data[0].price.nickname || "Premium Plan",
      amount: subscription.items.data[0].price.unit_amount / 100,
      currency: subscription.currency.toUpperCase(),
    }),
  });

  await logPaymentEvent({
    eventType: "subscription.trial_will_end",
    customerId,
    eventData: { trialEnd: new Date(subscription.trial_end * 1000) },
    severity: "info",
    source: "webhook",
  });

  logger.info("Trial will end event processed", {
    subscriptionId: subscription.id,
  });
}

/**
 * Handle invoice.paid
 */
async function handleInvoicePaid(event) {
  const invoice = event.data.object;

  // Update invoice in database
  const result = await db.query(
    `UPDATE invoices SET
            status = 'paid',
            amount_paid = $1,
            paid_at = NOW(),
            retry_count = 0,
            payment_failed_at = NULL
         WHERE stripe_invoice_id = $2
         RETURNING id, subscription_id, customer_id`,
    [invoice.amount_paid, invoice.id],
  );

  if (result.rows.length === 0) {
    logger.warn("Invoice not found for paid event", { invoiceId: invoice.id });
    return;
  }

  const {
    id: invoiceId,
    subscription_id: subscriptionId,
    customer_id: customerId,
  } = result.rows[0];

  // Get customer details
  const customerData = await db.query(
    "SELECT email, name FROM customers WHERE id = $1",
    [customerId],
  );

  if (customerData.rows.length > 0) {
    const { email, name } = customerData.rows[0];

    // Send receipt email
    await sendEmail({
      to: email,
      subject: "Payment Received - Invoice Receipt",
      html: invoicePaidEmail({
        customerName: name,
        invoiceNumber: invoice.number,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        paidDate: new Date(),
        invoiceUrl: invoice.hosted_invoice_url,
        pdfUrl: invoice.invoice_pdf,
      }),
    });
  }

  // Create successful transaction record
  await db.query(
    `INSERT INTO transactions (
            customer_id, subscription_id, invoice_id, stripe_payment_intent_id,
            stripe_charge_id, type, status, amount, currency, description, succeeded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      customerId,
      subscriptionId,
      invoiceId,
      invoice.payment_intent,
      invoice.charge,
      "payment",
      "succeeded",
      invoice.amount_paid,
      invoice.currency,
      "Invoice payment",
    ],
  );

  await addBillingHistoryEntry({
    customerId,
    subscriptionId,
    invoiceId,
    action: "payment_succeeded",
    description: `Payment of ${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()} received`,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    success: true,
  });

  await logPaymentEvent({
    eventType: "invoice.paid",
    customerId,
    subscriptionId,
    invoiceId,
    eventData: { amount: invoice.amount_paid, invoiceNumber: invoice.number },
    severity: "info",
    source: "webhook",
  });

  logger.info("Invoice paid event processed", { invoiceId: invoice.id });
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(event) {
  const invoice = event.data.object;

  // Update invoice in database
  const result = await db.query(
    `UPDATE invoices SET
            status = 'open',
            payment_failed_at = NOW(),
            retry_count = retry_count + 1,
            last_finalization_error = $1,
            next_retry_at = CASE
                WHEN retry_count < 4 THEN NOW() + INTERVAL '3 days'
                ELSE NULL
            END
         WHERE stripe_invoice_id = $2
         RETURNING id, subscription_id, customer_id, retry_count`,
    [invoice.last_finalization_error?.message, invoice.id],
  );

  if (result.rows.length === 0) {
    logger.warn("Invoice not found for payment failed event", {
      invoiceId: invoice.id,
    });
    return;
  }

  const {
    id: invoiceId,
    subscription_id: subscriptionId,
    customer_id: customerId,
    retry_count,
  } = result.rows[0];

  // Update subscription to past_due if applicable
  if (subscriptionId) {
    await db.query(
      `UPDATE subscriptions SET status = 'past_due' WHERE id = $1`,
      [subscriptionId],
    );
  }

  // Create failed transaction record
  await db.query(
    `INSERT INTO transactions (
            customer_id, subscription_id, invoice_id, stripe_payment_intent_id,
            type, status, amount, currency, failure_code, failure_message, failed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      customerId,
      subscriptionId,
      invoiceId,
      invoice.payment_intent,
      "payment",
      "failed",
      invoice.amount_due,
      invoice.currency,
      invoice.last_finalization_error?.code,
      invoice.last_finalization_error?.message,
    ],
  );

  // Get customer details
  const customerData = await db.query(
    "SELECT email, name FROM customers WHERE id = $1",
    [customerId],
  );

  if (customerData.rows.length > 0) {
    const { email, name } = customerData.rows[0];

    // Send payment failed notification
    await sendEmail({
      to: email,
      subject: "Payment Failed - Action Required",
      html: invoicePaymentFailedEmail({
        customerName: name,
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        failureReason:
          invoice.last_finalization_error?.message ||
          "Payment could not be processed",
        retryCount: retry_count,
        updatePaymentUrl: `${process.env.FRONTEND_URL}/billing/payment-methods`,
      }),
    });
  }

  // Schedule dunning attempt
  await db.query(
    `INSERT INTO dunning_attempts (
            invoice_id, subscription_id, customer_id, attempt_number,
            retry_at, status
        ) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '3 days', 'scheduled')`,
    [invoiceId, subscriptionId, customerId, retry_count],
  );

  await addBillingHistoryEntry({
    customerId,
    subscriptionId,
    invoiceId,
    action: "payment_failed",
    description: `Payment failed: ${invoice.last_finalization_error?.message || "Unknown error"}`,
    amount: invoice.amount_due,
    currency: invoice.currency,
    success: false,
  });

  await logPaymentEvent({
    eventType: "invoice.payment_failed",
    customerId,
    subscriptionId,
    invoiceId,
    eventData: {
      amount: invoice.amount_due,
      error: invoice.last_finalization_error?.message,
      retryCount: retry_count,
    },
    severity: "error",
    source: "webhook",
  });

  logger.error("Invoice payment failed", {
    invoiceId: invoice.id,
    error: invoice.last_finalization_error?.message,
  });
}

/**
 * Handle invoice.created
 */
async function handleInvoiceCreated(event) {
  const invoice = event.data.object;

  // Store invoice in database
  const subscriptionData = await db.query(
    "SELECT id, customer_id FROM subscriptions WHERE stripe_subscription_id = $1",
    [invoice.subscription],
  );

  if (subscriptionData.rows.length === 0) {
    logger.warn("Subscription not found for invoice", {
      invoiceId: invoice.id,
    });
    return;
  }

  const { id: subscriptionId, customer_id: customerId } =
    subscriptionData.rows[0];

  // Check if invoice already exists
  const existing = await db.query(
    "SELECT id FROM invoices WHERE stripe_invoice_id = $1",
    [invoice.id],
  );

  if (existing.rows.length > 0) {
    logger.info("Invoice already exists", { invoiceId: invoice.id });
    return;
  }

  const result = await db.query(
    `INSERT INTO invoices (
            subscription_id, customer_id, stripe_invoice_id, amount_due, amount_paid,
            subtotal, tax, total, amount_remaining, status, currency,
            hosted_invoice_url, invoice_pdf, due_date, collection_method,
            billing_reason, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id`,
    [
      subscriptionId,
      customerId,
      invoice.id,
      invoice.amount_due,
      invoice.amount_paid,
      invoice.subtotal,
      invoice.tax || 0,
      invoice.total,
      invoice.amount_remaining,
      invoice.status,
      invoice.currency,
      invoice.hosted_invoice_url,
      invoice.invoice_pdf,
      invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      invoice.collection_method,
      invoice.billing_reason,
      JSON.stringify(invoice.metadata),
    ],
  );

  const invoiceId = result.rows[0].id;

  // Store line items
  for (const item of invoice.lines.data) {
    await db.query(
      `INSERT INTO invoice_line_items (
                invoice_id, stripe_line_item_id, description, quantity,
                unit_amount, amount, currency, period_start, period_end
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        invoiceId,
        item.id,
        item.description,
        item.quantity,
        item.price.unit_amount,
        item.amount,
        invoice.currency,
        new Date(item.period.start * 1000),
        new Date(item.period.end * 1000),
      ],
    );
  }

  logger.info("Invoice created event processed", { invoiceId: invoice.id });
}

/**
 * Handle payment_intent.succeeded
 */
async function handlePaymentIntentSucceeded(event) {
  const paymentIntent = event.data.object;

  // Update transaction if exists
  await db.query(
    `UPDATE transactions SET
            status = 'succeeded',
            succeeded_at = NOW()
         WHERE stripe_payment_intent_id = $1`,
    [paymentIntent.id],
  );

  logger.info("Payment intent succeeded", {
    paymentIntentId: paymentIntent.id,
  });
}

/**
 * Handle payment_intent.payment_failed
 */
async function handlePaymentIntentFailed(event) {
  const paymentIntent = event.data.object;

  // Update transaction
  await db.query(
    `UPDATE transactions SET
            status = 'failed',
            failure_code = $1,
            failure_message = $2,
            failed_at = NOW()
         WHERE stripe_payment_intent_id = $3`,
    [
      paymentIntent.last_payment_error?.code,
      paymentIntent.last_payment_error?.message,
      paymentIntent.id,
    ],
  );

  logger.error("Payment intent failed", {
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  });
}

/**
 * Handle charge.dispute.created
 */
async function handleDisputeCreated(event) {
  const dispute = event.data.object;

  // Find the transaction
  const txnData = await db.query(
    "SELECT id, customer_id FROM transactions WHERE stripe_charge_id = $1",
    [dispute.charge],
  );

  if (txnData.rows.length === 0) {
    logger.warn("Transaction not found for dispute", { disputeId: dispute.id });
    return;
  }

  const { id: transactionId, customer_id: customerId } = txnData.rows[0];

  // Store dispute
  await db.query(
    `INSERT INTO disputes (
            transaction_id, customer_id, stripe_dispute_id, amount, currency,
            reason, status, evidence_due_by, is_charge_refundable
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      transactionId,
      customerId,
      dispute.id,
      dispute.amount,
      dispute.currency,
      dispute.reason,
      dispute.status,
      new Date(dispute.evidence_details.due_by * 1000),
      dispute.is_charge_refundable,
    ],
  );

  await logPaymentEvent({
    eventType: "dispute.created",
    customerId,
    transactionId,
    eventData: {
      disputeId: dispute.id,
      amount: dispute.amount,
      reason: dispute.reason,
    },
    severity: "critical",
    source: "webhook",
  });

  logger.error("Dispute created", {
    disputeId: dispute.id,
    reason: dispute.reason,
  });
}

// MAIN WEBHOOK CONTROLLER

export const webhooksController = {
  /**
   * Main Stripe webhook handler
   * Receives all Stripe events and routes to appropriate handlers
   */
  async stripeWebhookHandler(req, res) {
    const signature = req.headers["stripe-signature"];

    // Quick response to Stripe (must respond within 10 seconds)
    res.status(200).json({ received: true });

    try {
      // Verify webhook signature
      const secret = await getWebhookSecret();
      const event = verifyWebhookSignature(req.body, signature, secret);

      // Check idempotency - has this event been processed before?
      if (await isEventProcessed(event.id)) {
        logger.info("Duplicate event ignored", {
          eventId: event.id,
          type: event.type,
        });
        return;
      }

      // Store event
      const eventDbId = await storeEvent(event);

      logger.info("Processing webhook event", {
        eventId: event.id,
        type: event.type,
      });

      // Process event asynchronously
      try {
        // Route to appropriate handler
        switch (event.type) {
          // Subscription events
          case "customer.subscription.created":
            await handleSubscriptionCreated(event);
            break;
          case "customer.subscription.updated":
            await handleSubscriptionUpdated(event);
            break;
          case "customer.subscription.deleted":
            await handleSubscriptionDeleted(event);
            break;
          case "customer.subscription.trial_will_end":
            await handleTrialWillEnd(event);
            break;

          // Invoice events
          case "invoice.created":
            await handleInvoiceCreated(event);
            break;
          case "invoice.paid":
            await handleInvoicePaid(event);
            break;
          case "invoice.payment_failed":
            await handleInvoicePaymentFailed(event);
            break;

          // Payment intent events
          case "payment_intent.succeeded":
            await handlePaymentIntentSucceeded(event);
            break;
          case "payment_intent.payment_failed":
            await handlePaymentIntentFailed(event);
            break;

          // Dispute events
          case "charge.dispute.created":
            await handleDisputeCreated(event);
            break;

          default:
            logger.info("Unhandled event type", { type: event.type });
        }

        // Mark event as successfully processed
        await markEventProcessed(event.id);
        logger.info("Event processed successfully", {
          eventId: event.id,
          type: event.type,
        });
      } catch (processingError) {
        // Log error but don't fail the webhook
        logger.error("Error processing webhook event", {
          eventId: event.id,
          type: event.type,
          error: processingError.message,
          stack: processingError.stack,
        });

        // Mark event with error
        await markEventProcessed(event.id, processingError.message);
      }
    } catch (error) {
      logger.error("Webhook handler error", {
        error: error.message,
        stack: error.stack,
      });
    }
  },
};
