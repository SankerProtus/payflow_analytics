import { useState, useEffect } from "react";
import { dashboardAPI } from "../api/dashboard.api";

export const useDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [customerActivity, setCustomerActivity] = useState([]);
  const [dunningOverview, setDunningOverview] = useState(null);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch core dashboard data
      const [
        metricsRes,
        transactionsRes,
        revenueRes,
        activityRes,
        dunningRes,
        subscriptionRes,
        notificationsRes,
      ] = await Promise.all([
        dashboardAPI.getMetrics(),
        dashboardAPI.getRecentTransactions(10),
        dashboardAPI.getRevenueTrends(6),
        dashboardAPI.getCustomerActivity({ limit: 10, days: 7 }),
        dashboardAPI.getDunningOverview(),
        dashboardAPI.getSubscriptionStats(),
        dashboardAPI.getDashboardNotifications(),
      ]);

      setMetrics(metricsRes.data.metrics || metricsRes.data);

      setRecentTransactions(
        transactionsRes.data.transactions || transactionsRes.data || [],
      );

      setRevenueTrends(revenueRes.data.trends || revenueRes.data || []);

      setCustomerActivity(
        activityRes.data.activities || activityRes.data || [],
      );

      setDunningOverview(dunningRes.data || null);

      setSubscriptionStats(subscriptionRes.data || null);

      setNotifications(
        notificationsRes.data.notifications || notificationsRes.data || [],
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    metrics,
    recentTransactions,
    revenueTrends,
    customerActivity,
    dunningOverview,
    subscriptionStats,
    notifications,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};

// Hook for fetching specific dashboard sections on demand
export const useDashboardSection = (section) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      let response;
      switch (section) {
        case "churn-analysis":
          response = await dashboardAPI.getChurnAnalysis(params.months);
          break;
        case "payment-failures":
          response = await dashboardAPI.getPaymentFailures(params.days);
          break;
        case "top-customers":
          response = await dashboardAPI.getTopCustomers(params);
          break;
        case "growth-metrics":
          response = await dashboardAPI.getGrowthMetrics();
          break;
        case "financial-reports":
          response = await dashboardAPI.getFinancialReports(params.type);
          break;
        case "activity-logs":
          response = await dashboardAPI.getActivityLogs(params);
          break;
        case "system-health":
          response = await dashboardAPI.getSystemHealth();
          break;
        default:
          throw new Error(`Unknown section: ${section}`);
      }

      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to fetch ${section}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetch: fetchData,
  };
};
