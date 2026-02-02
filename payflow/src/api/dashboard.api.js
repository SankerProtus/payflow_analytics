import api from "./axios";

export const dashboardAPI = {
  getMetrics: () => {
    return api.get("/dashboard/metrics");
  },

  getRecentTransactions: (limit = 10) => {
    return api.get(`/dashboard/recent-transactions?limit=${limit}`);
  },

  getRevenueTrends: (months = 6) => {
    return api.get(`/dashboard/revenue-trends?months=${months}`);
  },

  getCustomerActivity: (params = {}) => {
    const { limit = 20, days = 30 } = params;
    return api.get(`/dashboard/customer-activity?limit=${limit}&days=${days}`);
  },

  getDunningOverview: () => {
    return api.get("/dashboard/dunning-overview");
  },

  getPaymentFailures: (days = 30) => {
    return api.get(`/dashboard/payment-failures?days=${days}`);
  },

  getSubscriptionStats: () => {
    return api.get("/dashboard/subscription-stats");
  },

  getChurnAnalysis: (months = 6) => {
    return api.get(`/dashboard/churn-analysis?months=${months}`);
  },

  getTopCustomers: (params = {}) => {
    const { limit = 10, metric = "revenue" } = params;
    return api.get(`/dashboard/top-customers?limit=${limit}&metric=${metric}`);
  },

  getGrowthMetrics: () => {
    return api.get("/dashboard/growth-metrics");
  },

  getFinancialReports: (type = "summary") => {
    return api.get(`/dashboard/financial-reports?type=${type}`);
  },

  getUserEngagement: () => {
    return api.get("/dashboard/user-engagement");
  },

  getActivityLogs: (params = {}) => {
    const { limit = 50, days = 7 } = params;
    return api.get(`/dashboard/activity-logs?limit=${limit}&days=${days}`);
  },

  getActivityLog: (pagination = {}) => {
    const { page = 1, limit = 50 } = pagination;
    return api.get(`/dashboard/activity-logs?page=${page}&limit=${limit}`);
  },

  getSystemHealth: () => {
    return api.get("/dashboard/system-health");
  },

  getCustomReports: () => {
    return api.get("/dashboard/custom-reports");
  },

  createCustomReport: (reportData) => {
    return api.post("/dashboard/custom-reports", reportData);
  },

  exportDashboardData: () => {
    return api.get("/dashboard/export-data");
  },

  initiateDataExport: (exportConfig) => {
    return api.post("/dashboard/export-data", exportConfig);
  },

  getDashboardNotifications: () => {
    return api.get("/dashboard/notifications");
  },

  markNotificationsRead: (notificationIds) => {
    return api.post("/dashboard/notifications/mark-read", {
      notification_ids: notificationIds,
    });
  },

  getDashboardSettings: () => {
    return api.get("/dashboard/settings");
  },

  updateDashboardSettings: (settings) => {
    return api.put("/dashboard/settings", settings);
  },

  getNotifications: () => {
    return api.get("/dashboard/notifications");
  },

  markNotificationAsRead: (notificationId) => {
    return api.post("/dashboard/notifications/mark-read", {
      notification_id: notificationId,
    });
  },

  markAllNotificationsAsRead: () => {
    return api.post("/dashboard/notifications/mark-all-read");
  },

  deleteNotification: (notificationId) => {
    return api.delete(`/dashboard/notifications/${notificationId}`);
  },
};
