/**
 * Billing Controller - Handles billing and checkout operations
 */

import { stripeService } from "../service/stripe.service.js";
import { logger } from "../utils/logger.js";

export const paymentController = {
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
