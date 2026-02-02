/**
 * Payment Controller - Handles payment-related API endpoints
 */

import { stripeService } from '../service/stripe.service.js';
import { logger } from '../utils/logger.js';

export const paymentController = {
    /**
     * POST /api/payments/setup-intent
     * Create a Setup Intent for collecting payment method
     */
    async createSetupIntent(req, res) {
        try {
            const { customerId, paymentMethodTypes } = req.body;
            const userId = req.user.id;

            const setupIntent = await stripeService.createSetupIntent({
                userId,
                customerId,
                paymentMethodTypes
            });

            res.status(200).json({
                success: true,
                data: setupIntent
            });
        } catch (error) {
            logger.error('Error creating setup intent', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * POST /api/payments/payment-intent
     * Create a Payment Intent for one-time payment
     */
    async createPaymentIntent(req, res) {
        try {
            const {
                customerId,
                amount,
                currency,
                paymentMethodId,
                description,
                metadata,
                confirmImmediately
            } = req.body;
            const userId = req.user.id;

            const paymentIntent = await stripeService.createPaymentIntent({
                userId,
                customerId,
                amount,
                currency,
                paymentMethodId,
                description,
                metadata,
                confirmImmediately
            });

            res.status(200).json({
                success: true,
                data: paymentIntent
            });
        } catch (error) {
            logger.error('Error creating payment intent', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * POST /api/payment-methods/attach
     * Attach payment method to customer
     */
    async attachPaymentMethod(req, res) {
        try {
            const { customerId, paymentMethodId, setAsDefault } = req.body;
            const userId = req.user.id;

            const result = await stripeService.attachPaymentMethod({
                userId,
                customerId,
                paymentMethodId,
                setAsDefault
            });

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error attaching payment method', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * DELETE /api/payment-methods/:id
     * Detach payment method
     */
    async detachPaymentMethod(req, res) {
        try {
            const { id: paymentMethodId } = req.params;
            const userId = req.user.id;

            await stripeService.detachPaymentMethod({
                userId,
                paymentMethodId
            });

            res.status(200).json({
                success: true,
                message: 'Payment method removed successfully'
            });
        } catch (error) {
            logger.error('Error detaching payment method', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * GET /api/payment-methods/customer/:customerId
     * List all payment methods for a customer
     */
    async listPaymentMethods(req, res) {
        try {
            const { customerId } = req.params;
            const userId = req.user.id;

            const paymentMethods = await stripeService.listPaymentMethods({
                userId,
                customerId
            });

            res.status(200).json({
                success: true,
                data: paymentMethods
            });
        } catch (error) {
            logger.error('Error listing payment methods', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};
