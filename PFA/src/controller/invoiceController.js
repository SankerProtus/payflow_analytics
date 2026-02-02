// Invoice Controller.
// Handles invoice retrieval, payment retries, and PDF downloads.
import { stripeService } from "../service/stripe.service.js";
import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";
const db = getDBConnection();

export const invoiceController = {
//  GET /api/invoices/:invoiceId
// Get invoice details
  async getInvoice(req, res) {
    try {
      const { invoiceId } = req.params;
      const userId = req.user.id;

      const invoice = await stripeService.getInvoice({
        userId,
        invoiceId,
      });

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      logger.error("Error retrieving invoice", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * POST /api/invoices/:invoiceId/pay
   * Retry failed invoice payment
   */
  async retryPayment(req, res) {
    try {
      const { invoiceId } = req.params;
      const { paymentMethodId } = req.body;
      const userId = req.user.id;

      const invoice = await stripeService.retryInvoicePayment({
        userId,
        invoiceId,
        paymentMethodId,
      });

      res.status(200).json({
        success: true,
        data: invoice,
        message: "Payment retry initiated successfully",
      });
    } catch (error) {
      logger.error("Error retrying invoice payment", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * GET /api/invoices/customer/:customerId
   * List all invoices for a customer
   */
  async listInvoices(req, res) {
    try {
      const { customerId } = req.params;
      const { limit = 50, status } = req.query;
      const userId = req.user.id;

      let query = `
                SELECT i.*, s.stripe_subscription_id
                FROM invoices i
                LEFT JOIN subscriptions s ON i.subscription_id = s.id
                JOIN customers c ON i.customer_id = c.id
                WHERE c.id = $1 AND c.user_id = $2
            `;

      const params = [customerId, userId];

      if (status) {
        query += ` AND i.status = $3`;
        params.push(status);
      }

      query += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await db.query(query, params);

      res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error("Error listing invoices", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * GET /api/invoices/:invoiceId/pdf
   * Download invoice PDF
   */
  async downloadInvoicePDF(req, res) {
    try {
      const { invoiceId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT i.invoice_pdf, i.invoice_number
                 FROM invoices i
                 JOIN customers c ON i.customer_id = c.id
                 WHERE i.id = $1 AND c.user_id = $2`,
        [invoiceId, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Invoice not found",
        });
      }

      const { invoice_pdf, invoice_number } = result.rows[0];

      if (!invoice_pdf) {
        return res.status(404).json({
          success: false,
          error: "PDF not available for this invoice",
        });
      }

      // Redirect to Stripe-hosted PDF
      res.redirect(invoice_pdf);
    } catch (error) {
      logger.error("Error downloading invoice PDF", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Legacy method for compatibility
  async getInvoices(req, res) {
    return this.listInvoices(req, res);
  },

  // Legacy method for compatibility
  async retryInvoicePayment(req, res) {
    return this.retryPayment(req, res);
  },
};
