import { stripeService } from "../service/stripe.service.js";
import { logger } from "../utils/logger.js";

export const subscriptionController = {
  async createSubscription(req, res) {
    try {
      const {
        customerId,
        planId,
        paymentMethodId,
        trialPeriodDays,
        couponId,
        metadata,
      } = req.body;
      const userId = req.user.id;

      if (!customerId || !planId || !paymentMethodId) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: customerId, planId, and paymentMethodId are required",
        });
      }

      logger.info("Creating subscription", {
        userId,
        customerId,
        planId,
        paymentMethodId,
        trialPeriodDays,
      });

      const subscription = await stripeService.createSubscription({
        userId,
        customerId,
        planId,
        paymentMethodId,
        trialPeriodDays,
        couponId,
        metadata,
      });

      logger.info("Subscription created successfully", {
        subscriptionId: subscription.subscriptionId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      });

      res.status(201).json({
        success: true,
        data: subscription,
        message: "Subscription created successfully",
      });
    } catch (error) {
      logger.error("Error creating subscription", {
        error: error.message,
        stack: error.stack,
        userId: req.user.id,
      });

      const statusCode = error.statusCode || 500;
      const message =
        error.type === "StripeInvalidRequestError"
          ? "Invalid subscription parameters. Please check your payment method and plan selection."
          : error.message || "Failed to create subscription";

      res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  },

  /**
   * PATCH /api/subscriptions/:subscriptionId/update
   * Update subscription (change plan, quantity)
   */
  async modifySubscription(req, res) {
    try {
      const { subscriptionId } = req.params;
      const { newPlanId, quantity, prorationBehavior, billingCycleAnchor } =
        req.body;
      const userId = req.user.id;

      const subscription = await stripeService.updateSubscription({
        userId,
        subscriptionId,
        newPlanId,
        quantity,
        prorationBehavior,
        billingCycleAnchor,
      });

      res.status(200).json({
        success: true,
        data: subscription,
        message: "Subscription updated successfully",
      });
    } catch (error) {
      logger.error("Error updating subscription", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * POST /api/subscriptions/:subscriptionId/cancel
   * Cancel subscription
   */
  async cancelSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;
      const { cancelAtPeriodEnd, cancellationReason } = req.body;
      const userId = req.user.id;

      const subscription = await stripeService.cancelSubscription({
        userId,
        subscriptionId,
        cancelAtPeriodEnd,
        cancellationReason,
      });

      res.status(200).json({
        success: true,
        data: subscription,
        message: "Subscription canceled successfully",
      });
    } catch (error) {
      logger.error("Error canceling subscription", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * POST /api/subscriptions/:subscriptionId/pause
   * Pause subscription
   */
  async pauseSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;
      const { resumeAt } = req.body;
      const userId = req.user.id;

      const subscription = await stripeService.pauseSubscription({
        userId,
        subscriptionId,
        resumeAt,
      });

      res.status(200).json({
        success: true,
        data: subscription,
        message: "Subscription paused successfully",
      });
    } catch (error) {
      logger.error("Error pausing subscription", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  /**
   * POST /api/subscriptions/:subscriptionId/resume
   * Resume paused subscription
   */
  async resumeSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;
      const userId = req.user.id;

      const subscription = await stripeService.resumeSubscription({
        userId,
        subscriptionId,
      });

      res.status(200).json({
        success: true,
        data: subscription,
        message: "Subscription resumed successfully",
      });
    } catch (error) {
      logger.error("Error resuming subscription", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};
