/**
 * Payment API Client
 * Handles all payment-related API calls
 */

import api from "./axios";

export const paymentAPI = {
  /**
   * Create Setup Intent for collecting payment method
   * @param {Object} data - { customerId, paymentMethodTypes }
   */
  createSetupIntent: (data) => {
    return api.post("/billing/setup-intent", data);
  },

  /**
   * Create Payment Intent for one-time payment
   * @param {Object} data - { customerId, amount, currency, paymentMethodId, description, metadata, confirmImmediately }
   */
  createPaymentIntent: (data) => {
    return api.post("/billing/payment-intent", data);
  },

  /**
   * Attach payment method to customer
   * @param {Object} data - { customerId, paymentMethodId, setAsDefault }
   */
  attachPaymentMethod: (data) => {
    return api.post("/billing/payment-methods/attach", data);
  },

  /**
   * Detach/remove payment method
   * @param {string} paymentMethodId - Payment method ID to remove
   */
  detachPaymentMethod: (paymentMethodId) => {
    return api.delete(`/billing/payment-methods/${paymentMethodId}`);
  },

  /**
   * List all payment methods for a customer
   * @param {string} customerId - Customer ID
   */
  listPaymentMethods: (customerId) => {
    return api.get(`/billing/payment-methods/customer/${customerId}`);
  },

  /**
   * Set default payment method
   * @param {Object} data - { customerId, paymentMethodId }
   */
  setDefaultPaymentMethod: (data) => {
    return api.post("/billing/payment-methods/set-default", data);
  },
};
