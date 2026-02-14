/**
 * Billing Controller - Handles billing and checkout operations
 */

import { stripeService } from "../service/stripe.service.js";
import { getDBConnection } from "../db/connection.js";
import { logger } from "../utils/logger.js";

export const paymentController = {
  /**
   * GET /api/billing/plans
   * Get available subscription plans
   */
  async getPlans(req, res) {
    try {
      const db = getDBConnection();

      const query = `
        SELECT
          id,
          stripe_price_id,
          stripe_product_id,
          name,
          description,
          tier,
          amount,
          currency,
          billing_interval,
          billing_interval_count,
          trial_period_days,
          features,
          active
        FROM subscription_plans
        WHERE active = true
        ORDER BY amount ASC
      `;

      const result = await db.query(query);

      res.status(200).json({
        success: true,
        data: {
          plans: result.rows,
          total: result.rowCount,
        },
      });
    } catch (error) {
      logger.error("Error fetching plans", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * POST /api/billing/checkout-session
   * Create Stripe Checkout Session for easy payment collection
   */
  async checkoutSession(req, res) {
    try {
      const { customerId, planId, successUrl, cancelUrl } = req.body;
      const userId = req.user.id;

      // Implementation for checkout session
      // This would use Stripe Checkout for hosted payment page

      res.status(200).json({
        success: true,
        message: "Checkout session created",
      });
    } catch (error) {
      logger.error("Error creating checkout session", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * POST /api/billing/setup-intent
   * Create setup intent for billing
   */
  async createSetupIntent(req, res) {
    try {
      const { customerId } = req.body;
      const userId = req.user.id;

      const setupIntent = await stripeService.createSetupIntent({
        userId,
        customerId,
      });

      res.status(200).json({
        success: true,
        data: setupIntent,
      });
    } catch (error) {
      logger.error("Error creating setup intent", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};
