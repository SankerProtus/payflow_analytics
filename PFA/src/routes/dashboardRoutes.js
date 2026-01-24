import express from 'express';
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { dashboardController } from "../controller/dashboardController.js";

export const dashboardRoutes = express.Router();

// All routes require authentication
dashboardRoutes.use(authMiddleware);

// Dashboard routes
dashboardRoutes.get("/", dashboardController.getDashboard);
dashboardRoutes.get("/metrics", dashboardController.getDashboardMetrics);
dashboardRoutes.get("/metrices", dashboardController.getDashboardMetrics); // Support typo in frontend
dashboardRoutes.get("/recent-transactions", dashboardController.getRecentTransactions);
dashboardRoutes.get("/revenue-trends", dashboardController.getRevenueTrends);

