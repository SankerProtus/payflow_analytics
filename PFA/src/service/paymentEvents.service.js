import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";

const db = getDBConnection();

/**
 * Log a payment event to the database
 * @param {Object} params - Event parameters
 * @param {string} params.eventType - Type of event
 * @param {string} params.customerId - Customer UUID
 * @param {string} params.subscriptionId - Subscription UUID (optional)
 * @param {string} params.invoiceId - Invoice UUID (optional)
 * @param {string} params.transactionId - Transaction UUID (optional)
 * @param {string} params.paymentMethodId - Payment method UUID (optional)
 * @param {Object} params.eventData - Additional event data
 * @param {string} params.severity - Event severity: info, warning, error, critical
 * @param {string} params.source - Event source: api, webhook, system, admin
 * @param {string} params.ipAddress - IP address (optional)
 * @param {string} params.userAgent - User agent (optional)
 */
export const logPaymentEvent = async ({
  eventType,
  userId = null,
  customerId = null,
  subscriptionId = null,
  invoiceId = null,
  transactionId = null,
  paymentMethodId = null,
  eventData = {},
  severity = "info",
  source = "webhook",
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await db.query(
      `INSERT INTO payment_events (
        event_type, user_id, customer_id, subscription_id,
        invoice_id, transaction_id, payment_method_id,
        event_data, severity, source, ip_address, user_agent
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

    logger.debug("[PAYMENT EVENT LOGGED]", { eventType, customerId, severity });
  } catch (error) {
    logger.error("[LOG PAYMENT EVENT ERROR]", {
      error: error.message,
      eventType,
      customerId,
    });
    // Don't throw - logging should not break the main flow
  }
};

/**
 * Add an entry to billing history
 * @param {Object} params - Billing history parameters
 * @param {string} params.customerId - Customer UUID
 * @param {string} params.subscriptionId - Subscription UUID (optional)
 * @param {string} params.invoiceId - Invoice UUID (optional)
 * @param {string} params.action - Action performed
 * @param {string} params.description - Description of the action
 * @param {number} params.amount - Amount in cents (optional)
 * @param {string} params.currency - Currency code (optional)
 * @param {boolean} params.success - Whether the action was successful
 * @param {Object} params.metadata - Additional metadata (optional)
 */
export const addBillingHistoryEntry = async ({
  customerId,
  subscriptionId = null,
  invoiceId = null,
  action,
  description,
  amount = null,
  currency = null,
  success = true,
  metadata = {},
}) => {
  try {
    await db.query(
      `INSERT INTO billing_history (
        customer_id, subscription_id, invoice_id,
        action, description, amount, currency, success, metadata
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

    logger.debug("[BILLING HISTORY ADDED]", { action, customerId, success });
  } catch (error) {
    logger.error("[ADD BILLING HISTORY ERROR]", {
      error: error.message,
      action,
      customerId,
    });
    // Don't throw - history logging should not break the main flow
  }
};
