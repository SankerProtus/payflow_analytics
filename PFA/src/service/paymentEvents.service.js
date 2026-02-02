/**
 * Payment Events Service
 * Centralized logging for all payment-related activities
 */

import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";
const db = getDBConnection();

/**
 * Log a payment event to the database
 * @param {Object} params
 * @param {string} params.eventType - Type of event (e.g., 'payment.succeeded')
 * @param {string} params.userId - User ID
 * @param {string} params.customerId - Customer ID (optional)
 * @param {string} params.subscriptionId - Subscription ID (optional)
 * @param {string} params.invoiceId - Invoice ID (optional)
 * @param {string} params.transactionId - Transaction ID (optional)
 * @param {string} params.paymentMethodId - Payment Method ID (optional)
 * @param {Object} params.eventData - Event data object
 * @param {string} params.severity - Event severity (info, warning, error, critical)
 * @param {string} params.source - Source of event (api, webhook, system, admin)
 * @param {string} params.ipAddress - IP address (optional)
 * @param {string} params.userAgent - User agent (optional)
 */
export async function logPaymentEvent({
  eventType,
  userId = null,
  customerId = null,
  subscriptionId = null,
  invoiceId = null,
  transactionId = null,
  paymentMethodId = null,
  eventData,
  severity = "info",
  source = "system",
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await db.query(
      `INSERT INTO payment_events (
                event_type, user_id, customer_id, subscription_id, invoice_id,
                transaction_id, payment_method_id, event_data, severity, source,
                ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        eventType,
        userId,
        customerId,
        subscriptionId,
        invoiceId,
        transactionId,
        paymentMethodId,
        JSON.stringify(eventData),
        severity,
        source,
        ipAddress,
        userAgent,
      ],
    );

    // Also log to Winston for system monitoring
    logger[severity](`Payment Event: ${eventType}`, {
      customerId,
      subscriptionId,
      eventData,
    });
  } catch (error) {
    // Don't throw - logging failure shouldn't break payment flow
    logger.error("Failed to log payment event", { error: error.message });
  }
}

/**
 * Add entry to billing history
 * @param {Object} params
 */
export async function addBillingHistoryEntry({
  customerId,
  subscriptionId = null,
  invoiceId = null,
  action,
  description,
  amount = null,
  currency = "usd",
  success = true,
  metadata = {},
}) {
  try {
    await db.query(
      `INSERT INTO billing_history (
                customer_id, subscription_id, invoice_id, action, description,
                amount, currency, success, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        customerId,
        subscriptionId,
        invoiceId,
        action,
        description,
        amount,
        currency,
        success,
        JSON.stringify(metadata),
      ],
    );
  } catch (error) {
    logger.error("Failed to add billing history entry", {
      error: error.message,
    });
  }
}

/**
 * Get recent payment events for a customer
 */
export async function getCustomerPaymentEvents(customerId, limit = 50) {
  try {
    const result = await db.query(
      `SELECT * FROM payment_events
             WHERE customer_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
      [customerId, limit],
    );
    return result.rows;
  } catch (error) {
    logger.error("Error retrieving customer payment events", {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get critical payment events (errors and failures)
 */
export async function getCriticalPaymentEvents(userId, hours = 24) {
  try {
    const result = await db.query(
      `SELECT pe.*, c.email as customer_email, c.name as customer_name
             FROM payment_events pe
             LEFT JOIN customers c ON pe.customer_id = c.id
             WHERE pe.user_id = $1
             AND pe.severity IN ('error', 'critical')
             AND pe.created_at >= NOW() - INTERVAL '${hours} hours'
             ORDER BY pe.created_at DESC`,
      [userId],
    );
    return result.rows;
  } catch (error) {
    logger.error("Error retrieving critical payment events", {
      error: error.message,
    });
    throw error;
  }
}
