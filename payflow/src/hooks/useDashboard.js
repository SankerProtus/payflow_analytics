import { useState, useEffect } from "react";
import { dashboardAPI } from "../api/dashboard.api";

export const useDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsRes, transactionsRes, revenueRes] = await Promise.all([
        dashboardAPI.getMetrics(),
        dashboardAPI.getRecentTransactions(),
        dashboardAPI.getRevenueTrends(),
      ]);

      // Backend returns { metrics: {...}, period_start, period_end }
      setMetrics(metricsRes.data.metrics || metricsRes.data);
      // Backend returns { transactions: [...], total }
      setRecentTransactions(
        transactionsRes.data.transactions || transactionsRes.data || [],
      );
      // Backend returns { trends: [...], summary }
      setRevenueTrends(revenueRes.data.trends || revenueRes.data || []);
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
    loading,
    error,
    refetch: fetchDashboardData,
  };
};
