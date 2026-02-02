/**
 * Billing Routes - Complete payment system endpoints
 */

import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { paymentController } from "../controller/billingController.js";
import { paymentController as pmController } from "../controller/paymentController.js";
import { subscriptionController } from "../controller/subscriptionController.js";
import { invoiceController } from "../controller/invoiceController.js";

export const billingRoutes = express.Router();

// Apply authentication middleware to all routes
billingRoutes.use(authMiddleware);

// ============================================================================
// PAYMENT INTENTS & SETUP INTENTS
// ============================================================================

// Create Setup Intent (for saving payment method for future use)
billingRoutes.post("/setup-intent", paymentController.createSetupIntent);

// Create Payment Intent (for one-time payments)
billingRoutes.post("/payment-intent", pmController.createPaymentIntent);

// Create Checkout Session (hosted Stripe Checkout page)
billingRoutes.post("/checkout-session", paymentController.checkoutSession);

// ============================================================================
// PAYMENT METHODS
// ============================================================================

// Attach payment method to customer
billingRoutes.post("/payment-methods/attach", pmController.attachPaymentMethod);

// Detach/remove payment method
billingRoutes.delete("/payment-methods/:id", pmController.detachPaymentMethod);

// List customer's payment methods
billingRoutes.get("/payment-methods/customer/:customerId", pmController.listPaymentMethods);

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

// Create subscription
billingRoutes.post("/subscriptions/create", subscriptionController.createSubscription);

// Update subscription (change plan, quantity)
billingRoutes.patch("/subscriptions/:subscriptionId/update", subscriptionController.modifySubscription);

// Cancel subscription
billingRoutes.post("/subscriptions/:subscriptionId/cancel", subscriptionController.cancelSubscription);

// Pause subscription
billingRoutes.post("/subscriptions/:subscriptionId/pause", subscriptionController.pauseSubscription);

// Resume subscription
billingRoutes.post("/subscriptions/:subscriptionId/resume", subscriptionController.resumeSubscription);

// ============================================================================
// INVOICES
// ============================================================================

// Get invoice details
billingRoutes.get("/invoices/:invoiceId", invoiceController.getInvoice);

// Retry failed invoice payment
billingRoutes.post("/invoices/:invoiceId/pay", invoiceController.retryPayment);

// List customer invoices
billingRoutes.get("/invoices/customer/:customerId", invoiceController.listInvoices);

// Download invoice PDF
billingRoutes.get("/invoices/:invoiceId/pdf", invoiceController.downloadInvoicePDF);
