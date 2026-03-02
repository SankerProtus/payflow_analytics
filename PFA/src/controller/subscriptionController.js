import { stripeService } from "../service/stripe.service.js";
import { logger } from "../utils/logger.js";
import { getDBConnection } from "../db/connection.js";

export const subscriptionController = {
  /**
   * POST /api/billing/subscriptions/create
   * Create a new subscription with full validation
   */
  async createSubscription(req, res) {
    const startTime = Date.now();
    const db = getDBConnection();

    try {
      const {
        customerId,
        planId,
        paymentMethodId,
        trialPeriodDays,
        couponId,
        metadata = {},
      } = req.body;
      const userId = req.user.id;

      if (!customerId || !planId || !paymentMethodId) {
        logger.warn("Subscription creation validation failed", {
          userId,
          customerId,
          planId,
          paymentMethodId,
        });

        return res.status(400).json({
          success: false,
          error: "Missing required fields: customerId, planId, and paymentMethodId are required",
          code: "VALIDATION_ERROR",
        });
      }

      // Validate trial period
      if (trialPeriodDays !== null && trialPeriodDays !== undefined) {
        const days = parseInt(trialPeriodDays);
        if (isNaN(days) || days < 0 || days > 365) {
          return res.status(400).json({
            success: false,
            error: "Trial period must be between 0 and 365 days",
            code: "INVALID_TRIAL_PERIOD",
          });
        }
      }

      // Validate customer exists and belongs to user
      const customerCheck = await db.query(
        "SELECT id FROM customers WHERE id = $1 AND user_id = $2",
        [customerId, userId]
      );

      if (customerCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Customer not found or does not belong to your account",
          code: "CUSTOMER_NOT_FOUND",
        });
      }

      // Validate plan exists and is active
      const planCheck = await db.query(
        "SELECT id, active FROM subscription_plans WHERE id = $1",
        [planId]
      );

      if (planCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Subscription plan not found",
          code: "PLAN_NOT_FOUND",
        });
      }

      if (planCheck.rows[0].active === false) {
        return res.status(400).json({
          success: false,
          error: "Selected plan is no longer active",
          code: "PLAN_INACTIVE",
        });
      }

      // Check for existing active subscription with same plan
      const existingSubCheck = await db.query(
        `SELECT id, stripe_subscription_id, status
         FROM subscriptions
         WHERE customer_id = $1
         AND plan_id = $2
         AND status IN ('active', 'trialing')
         LIMIT 1`,
        [customerId, planId]
      );

      if (existingSubCheck.rows.length > 0) {
        logger.warn("Duplicate subscription attempt", {
          userId,
          customerId,
          planId,
          existingSubscriptionId: existingSubCheck.rows[0].stripe_subscription_id,
        });

        return res.status(409).json({
          success: false,
          error: "An active subscription with this plan already exists for this customer",
          code: "DUPLICATE_SUBSCRIPTION",
          data: {
            existingSubscriptionId: existingSubCheck.rows[0].stripe_subscription_id,
          },
        });
      }

      logger.info("Creating subscription", {
        userId,
        customerId,
        planId,
        paymentMethodId,
        trialPeriodDays,
        hasCoupon: !!couponId,
      });

      const subscription = await stripeService.createSubscription({
        userId,
        customerId,
        planId,
        paymentMethodId,
        trialPeriodDays,
        couponId,
        metadata: {
          ...metadata,
          created_via: "api",
          created_by_user: userId,
        },
      });

      const duration = Date.now() - startTime;

      logger.info("Subscription created successfully", {
        subscriptionId: subscription.subscriptionId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: subscription.status,
        durationMs: duration,
      });

      res.status(201).json({
        success: true,
        data: subscription,
        message: "Subscription created successfully",
        meta: {
          createdAt: new Date().toISOString(),
          processingTimeMs: duration,
        },
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error("Error creating subscription", {
        error: error.message,
        stack: error.stack,
        userId: req.user.id,
        body: req.body,
        durationMs: duration,
        errorType: error.type,
        errorCode: error.code,
      });

      // Handle specific Stripe errors
      let statusCode = 500;
      let errorMessage = "Failed to create subscription";
      let errorCode = "SUBSCRIPTION_CREATE_FAILED";

      if (error.type === "StripeCardError") {
        statusCode = 402;
        errorMessage = error.message || "Card declined. Please use a different payment method.";
        errorCode = "PAYMENT_FAILED";
      } else if (error.type === "StripeInvalidRequestError") {
        statusCode = 400;
        errorMessage = "Invalid subscription parameters. Please check your input.";
        errorCode = "INVALID_REQUEST";
      } else if (error.type === "StripeAPIError") {
        statusCode = 503;
        errorMessage = "Payment service temporarily unavailable. Please try again.";
        errorCode = "SERVICE_UNAVAILABLE";
      } else if (error.statusCode) {
        statusCode = error.statusCode;
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        meta: {
          timestamp: new Date().toISOString(),
          processingTimeMs: duration,
        },
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
        message: "Subscription cancelled successfully",
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
