import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { dashboardController } from "../controller/dashboardController.js";

export const dashboardRoutes = express.Router();

// All routes require authentication
dashboardRoutes.use(authMiddleware);

// Dashboard routes
dashboardRoutes.get("/", dashboardController.getDashboard);
dashboardRoutes.get("/metrics", dashboardController.getDashboardMetrics);
dashboardRoutes.get("/metrices", dashboardController.getDashboardMetrics);
dashboardRoutes.get(
  "/recent-transactions",
  dashboardController.getRecentTransactions,
);
dashboardRoutes.get("/revenue-trends", dashboardController.getRevenueTrends);
dashboardRoutes.get(
  "/customer-activity",
  dashboardController.getCustomerActivity,
);
dashboardRoutes.get(
  "/dunning-overview",
  dashboardController.getDunningOverview,
);
dashboardRoutes.get(
  "/subscription-stats",
  dashboardController.getSubscriptionStats,
);
dashboardRoutes.get("/churn-analysis", dashboardController.getChurnAnalysis);
dashboardRoutes.get(
  "/payment-failures",
  dashboardController.getPaymentFailures,
);
dashboardRoutes.get("/top-customers", dashboardController.getTopCustomers);
dashboardRoutes.get("/growth-metrics", dashboardController.getGrowthMetrics);
dashboardRoutes.get(
  "/financial-reports",
  dashboardController.getFinancialReports,
);
dashboardRoutes.get("/user-engagement", dashboardController.getUserEngagement);
dashboardRoutes.get("/activity-logs", dashboardController.getActivityLogs);
dashboardRoutes.get("/system-health", dashboardController.getSystemHealth);
dashboardRoutes.get("/custom-reports", dashboardController.getCustomReports);
dashboardRoutes.post("/custom-reports", dashboardController.createCustomReport);
dashboardRoutes.get("/export-data", dashboardController.exportDashboardData);
dashboardRoutes.post("/export-data", dashboardController.initiateDataExport);
dashboardRoutes.get(
  "/notifications",
  dashboardController.getDashboardNotifications,
);
dashboardRoutes.post(
  "/notifications/mark-read",
  dashboardController.markNotificationsRead,
);
dashboardRoutes.post(
  "/notifications/mark-all-read",
  dashboardController.markAllNotificationsAsRead,
);
dashboardRoutes.get("/settings", dashboardController.getDashboardSettings);
dashboardRoutes.put("/settings", dashboardController.updateDashboardSettings);
