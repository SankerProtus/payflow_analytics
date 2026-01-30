import api from "./axios";

export const dashboardAPI = {
  // Core Metrics
  getMetrics: () => {
    return api.get("/dashboard/metrics");
  },

  getRecentTransactions: (limit = 10) => {
    return api.get(`/dashboard/recent-transactions?limit=${limit}`);
  },

  getRevenueTrends: (months = 6) => {
    return api.get(`/dashboard/revenue-trends?months=${months}`);
  },

  // Customer Activity
  getCustomerActivity: (params = {}) => {
    const { limit = 20, days = 30 } = params;
    return api.get(`/dashboard/customer-activity?limit=${limit}&days=${days}`);
  },

  // Dunning & Payments
  getDunningOverview: () => {
    return api.get("/dashboard/dunning-overview");
  },

  getPaymentFailures: (days = 30) => {
    return api.get(`/dashboard/payment-failures?days=${days}`);
  },

  // Subscriptions
  getSubscriptionStats: () => {
    return api.get("/dashboard/subscription-stats");
  },

  // Churn Analysis
  getChurnAnalysis: (months = 6) => {
    return api.get(`/dashboard/churn-analysis?months=${months}`);
  },

  // Top Customers
  getTopCustomers: (params = {}) => {
    const { limit = 10, metric = "revenue" } = params;
    return api.get(`/dashboard/top-customers?limit=${limit}&metric=${metric}`);
  },

  // Growth Metrics
  getGrowthMetrics: () => {
    return api.get("/dashboard/growth-metrics");
  },

  // Financial Reports
  getFinancialReports: (type = "summary") => {
    return api.get(`/dashboard/financial-reports?type=${type}`);
  },

  // User Engagement
  getUserEngagement: () => {
    return api.get("/dashboard/user-engagement");
  },

  // Activity Logs
  getActivityLogs: (params = {}) => {
    const { limit = 50, days = 7 } = params;
    return api.get(`/dashboard/activity-logs?limit=${limit}&days=${days}`);
  },

  // System Health
  getSystemHealth: () => {
    return api.get("/dashboard/system-health");
  },

  // Custom Reports
  getCustomReports: () => {
    return api.get("/dashboard/custom-reports");
  },

  createCustomReport: (reportData) => {
    return api.post("/dashboard/custom-reports", reportData);
  },

  // Data Export
  exportDashboardData: () => {
    return api.get("/dashboard/export-data");
  },

  initiateDataExport: (exportConfig) => {
    return api.post("/dashboard/export-data", exportConfig);
  },

  // Notifications
  getDashboardNotifications: () => {
    return api.get("/dashboard/notifications");
  },

  markNotificationsRead: (notificationIds) => {
    return api.post("/dashboard/notifications/mark-read", {
      notification_ids: notificationIds,
    });
  },

  // Settings
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
};
