/**
 * Subscription API Client
 * Handles all subscription lifecycle operations
 */

import api from "./axios";

export const subscriptionAPI = {
  /**
   * Create a new subscription
   * @param {Object} data - { customerId, planId, paymentMethodId, trialPeriodDays, couponId, metadata }
   */
  create: (data) => {
    return api.post("/billing/subscriptions/create", data);
  },

  /**
   * Get subscription details
   * @param {string} subscriptionId - Subscription ID
   */
  get: (subscriptionId) => {
    return api.get(`/billing/subscriptions/${subscriptionId}`);
  },

  /**
   * List all subscriptions for a customer
   * @param {string} customerId - Customer ID
   */
  listByCustomer: (customerId) => {
    return api.get(`/billing/subscriptions/customer/${customerId}`);
  },

  /**
   * Update subscription (change plan, quantity)
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} data - { newPlanId, quantity, prorationBehavior, billingCycleAnchor }
   */
  update: (subscriptionId, data) => {
    return api.patch(`/billing/subscriptions/${subscriptionId}/update`, data);
  },

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} data - { cancelAtPeriodEnd, cancellationReason }
   */
  cancel: (subscriptionId, data = {}) => {
    return api.post(`/billing/subscriptions/${subscriptionId}/cancel`, data);
  },

  /**
   * Pause subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} data - { resumeAt }
   */
  pause: (subscriptionId, data = {}) => {
    return api.post(`/billing/subscriptions/${subscriptionId}/pause`, data);
  },

  /**
   * Resume paused subscription
   * @param {string} subscriptionId - Subscription ID
   */
  resume: (subscriptionId) => {
    return api.post(`/billing/subscriptions/${subscriptionId}/resume`);
  },

  /**
   * Preview subscription change (for upgrades/downgrades)
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} data - { newPlanId, quantity }
   */
  previewChange: (subscriptionId, data) => {
    return api.post(`/billing/subscriptions/${subscriptionId}/preview`, data);
  },
};
