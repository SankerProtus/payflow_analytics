/**
 * Invoice API Client
 * Handles all invoice-related operations
 */

import api from "./axios";

export const invoiceAPI = {
  /**
   * Get invoice details
   * @param {string} invoiceId - Invoice ID
   */
  get: (invoiceId) => {
    return api.get(`/billing/invoices/${invoiceId}`);
  },

  /**
   * List invoices for a customer
   * @param {string} customerId - Customer ID
   * @param {Object} params - { limit, status }
   */
  listByCustomer: (customerId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/billing/invoices/customer/${customerId}?${queryString}`);
  },

  /**
   * Retry failed invoice payment
   * @param {string} invoiceId - Invoice ID
   * @param {Object} data - { paymentMethodId }
   */
  retryPayment: (invoiceId, data = {}) => {
    return api.post(`/billing/invoices/${invoiceId}/pay`, data);
  },

  /**
   * Download invoice PDF
   * @param {string} invoiceId - Invoice ID
   */
  downloadPDF: (invoiceId) => {
    return api.get(`/billing/invoices/${invoiceId}/pdf`);
  },

  /**
   * Get upcoming invoice preview
   * @param {string} customerId - Customer ID
   */
  getUpcoming: (customerId) => {
    return api.get(`/billing/invoices/customer/${customerId}/upcoming`);
  },
};
