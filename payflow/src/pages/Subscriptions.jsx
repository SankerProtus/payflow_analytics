import React, { useState, useEffect } from "react";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { dashboardAPI } from "../api/dashboard.api";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";

const Subscriptions = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardAPI.getSubscriptionStats();
      setStats(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load subscription data",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen text="Loading subscriptions..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} onRetry={fetchSubscriptionData} />
      </Layout>
    );
  }

  const overallStats = stats?.overall_stats || {};
  const planBreakdown = stats?.plan_breakdown || [];
  const recentChanges = stats?.recent_changes || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
              <Package className="h-8 w-8" />
              Subscription Management
            </h1>
            <p className="text-gray-600 text-lg mt-1">
              Monitor and manage all active subscriptions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Subscriptions
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {overallStats.total_subscriptions || 0}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-900">
                  {overallStats.active_subscriptions || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {overallStats.total_subscriptions > 0
                    ? (
                        (overallStats.active_subscriptions /
                          overallStats.total_subscriptions) *
                        100
                      ).toFixed(1)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Pending
                </p>
                <p className="text-3xl font-bold text-yellow-900">
                  {overallStats.pending_subscriptions || 0}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Churned
                </p>
                <p className="text-3xl font-bold text-red-900">
                  {overallStats.churned_subscriptions || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {overallStats.total_subscriptions > 0
                    ? (
                        (overallStats.churned_subscriptions /
                          overallStats.total_subscriptions) *
                        100
                      ).toFixed(1)
                    : 0}
                  % churn rate
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Revenue Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total MRR</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(overallStats.total_mrr || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Average MRR per Customer
              </p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(overallStats.avg_mrr_per_customer || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated ARR</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency((overallStats.total_mrr || 0) * 12)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Subscription by Plan
          </h2>
          {planBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscribers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MRR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Total Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {planBreakdown.map((plan, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {plan.plan_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(plan.plan_amount)}/
                          {plan.billing_period}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {plan.subscriber_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {plan.active_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(plan.mrr)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{
                                width: `${plan.revenue_percentage || 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-900">
                            {plan.revenue_percentage || 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No subscription data available
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Recent Subscription Changes
          </h2>
          {recentChanges.length > 0 ? (
            <div className="space-y-3">
              {recentChanges.slice(0, 10).map((change, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        change.new_state === "active"
                          ? "bg-green-100"
                          : change.new_state === "cancelled" ||
                              change.new_state === "churned"
                            ? "bg-red-100"
                            : "bg-yellow-100"
                      }`}
                    >
                      {change.new_state === "active" ? (
                        <TrendingUp
                          className={`h-5 w-5 ${
                            change.new_state === "active"
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {change.customer_name || change.customer_email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {change.old_state} → {change.new_state}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{change.plan_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(change.transition_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent changes</p>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Subscriptions;
