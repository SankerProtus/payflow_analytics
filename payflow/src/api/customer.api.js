import api from "./axios";

export const customerAPI = {
  getAll: () => {
    return api.get("/customers");
  },

  getById: (customerId) => {
    return api.get(`/customers/${customerId}`);
  },

  getTimeline: (customerId) => {
    return api.get(`/customers/${customerId}/timeline`);
  },

  getStatistics: (customerId) => {
    return api.get(`/customers/${customerId}/statistics`);
  },

  create: (customerData) => {
    return api.post("/customers", customerData);
  },
};

