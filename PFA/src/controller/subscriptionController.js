/**
 * Subscription Controller - Handles subscription lifecycle operations
 */

import { stripeService } from '../service/stripe.service.js';
import { logger } from '../utils/logger.js';

export const subscriptionController = {
    /**
     * POST /api/subscriptions/create
     * Create a new subscription
     */
    async createSubscription(req, res) {
        try {
            const {
                customerId,
                planId,
                paymentMethodId,
                trialPeriodDays,
                couponId,
                metadata
            } = req.body;
            const userId = req.user.id;

            const subscription = await stripeService.createSubscription({
                userId,
                customerId,
                planId,
                paymentMethodId,
                trialPeriodDays,
                couponId,
                metadata
            });

            res.status(201).json({
                success: true,
                data: subscription,
                message: 'Subscription created successfully'
            });
        } catch (error) {
            logger.error('Error creating subscription', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
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
            const { newPlanId, quantity, prorationBehavior, billingCycleAnchor } = req.body;
            const userId = req.user.id;

            const subscription = await stripeService.updateSubscription({
                userId,
                subscriptionId,
                newPlanId,
                quantity,
                prorationBehavior,
                billingCycleAnchor
            });

            res.status(200).json({
                success: true,
                data: subscription,
                message: 'Subscription updated successfully'
            });
        } catch (error) {
            logger.error('Error updating subscription', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
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
                cancellationReason
            });

            res.status(200).json({
                success: true,
                data: subscription,
                message: 'Subscription canceled successfully'
            });
        } catch (error) {
            logger.error('Error canceling subscription', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
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
                resumeAt
            });

            res.status(200).json({
                success: true,
                data: subscription,
                message: 'Subscription paused successfully'
            });
        } catch (error) {
            logger.error('Error pausing subscription', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
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
                subscriptionId
            });

            res.status(200).json({
                success: true,
                data: subscription,
                message: 'Subscription resumed successfully'
            });
        } catch (error) {
            logger.error('Error resuming subscription', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};
