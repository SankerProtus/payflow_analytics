import api from "./axios";

export const dashboardAPI = {
  getMetrics: () => {
    return api.get("/dashboard/metrics");
  },

  getRecentTransactions: () => {
    return api.get("/dashboard/recent-transactions");
  },

  getRevenueTrends: (months = 6) => {
    return api.get(`/dashboard/revenue-trends?months=${months}`);
  },
};
