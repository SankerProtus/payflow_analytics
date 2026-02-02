/**
 * Billing API Client
 * Handles checkout sessions and billing portal
 */

import api from "./axios";

export const billingAPI = {
  /**
   * Create Stripe Checkout Session
   * @param {Object} data - { customerId, planId, successUrl, cancelUrl }
   */
  createCheckoutSession: (data) => {
    return api.post("/billing/checkout-session", data);
  },

  /**
   * Get billing portal session (for customer self-service)
   * @param {string} customerId - Customer ID
   */
  createPortalSession: (customerId) => {
    return api.post("/billing/portal-session", { customerId });
  },

  /**
   * Get available subscription plans
   */
  getPlans: () => {
    return api.get("/billing/plans");
  },

  /**
   * Get billing history for customer
   * @param {string} customerId - Customer ID
   * @param {Object} params - { limit, offset }
   */
  getBillingHistory: (customerId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/billing/history/${customerId}?${queryString}`);
  },
};
