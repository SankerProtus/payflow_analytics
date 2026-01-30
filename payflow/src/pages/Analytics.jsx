import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  DollarSign,
  Activity,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { dashboardAPI } from "../api/dashboard.api";
import { formatCurrency } from "../utils/formatCurrency";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [churnData, setChurnData] = useState(null);
  const [growthData, setGrowthData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(6);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [churnRes, growthRes, financialRes] = await Promise.all([
        dashboardAPI.getChurnAnalysis(selectedPeriod),
        dashboardAPI.getGrowthMetrics(),
        dashboardAPI.getFinancialReports("summary"),
      ]);

      setChurnData(churnRes.data);
      setGrowthData(growthRes.data);
      setFinancialData(financialRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

    useEffect(() => {
      fetchAnalytics();
    }, [selectedPeriod, fetchAnalytics]);

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen text="Loading analytics..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} onRetry={fetchAnalytics} />
      </Layout>
    );
  }

  const avgChurnRate = churnData?.average_churn_rate || 0;
  const avgCustomerGrowth =
    growthData?.growth_summary?.avg_customer_growth_rate || 0;
  const avgRevenueGrowth =
    growthData?.growth_summary?.avg_revenue_growth_rate || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 text-lg mt-1">
              Deep insights into your business performance
            </p>
          </div>
          <div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Average Churn Rate
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {avgChurnRate.toFixed(2)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Last {selectedPeriod} months
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${avgChurnRate < 5 ? "bg-green-100" : avgChurnRate < 10 ? "bg-yellow-100" : "bg-red-100"}`}
              >
                <TrendingDown
                  className={`h-6 w-6 ${avgChurnRate < 5 ? "text-green-600" : avgChurnRate < 10 ? "text-yellow-600" : "text-red-600"}`}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Customer Growth Rate
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {avgCustomerGrowth > 0 ? "+" : ""}
                  {avgCustomerGrowth.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Average monthly</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Revenue Growth Rate
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {avgRevenueGrowth > 0 ? "+" : ""}
                  {avgRevenueGrowth.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Average monthly</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Financial Overview */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Financial Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Monthly Recurring Revenue
              </p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(financialData?.recurring_revenue?.mrr || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Annual Recurring Revenue
              </p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(financialData?.recurring_revenue?.arr || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  financialData?.revenue_summary?.total_collected || 0,
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Outstanding Invoices</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(
                  financialData?.revenue_summary?.outstanding_invoices || 0,
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* Churn Analysis */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Churn Analysis
          </h2>

          {/* At Risk Customers */}
          {churnData?.at_risk_customers?.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Customers at Risk ({churnData.at_risk_customers.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Failed Payments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {churnData.at_risk_customers
                      .slice(0, 10)
                      .map((customer) => (
                        <tr
                          key={customer.customer_id}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {customer.name || customer.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${
                              customer.churn_risk === "high"
                                ? "bg-red-100 text-red-800"
                                : customer.churn_risk === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                            >
                              {customer.churn_risk}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {customer.failed_payment_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.status}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No customers at risk of churning
            </p>
          )}

          {/* Churn Reasons */}
          {churnData?.churn_reasons?.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Top Churn Reasons
              </h3>
              <div className="space-y-3">
                {churnData.churn_reasons.map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">
                      {reason.reason}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {reason.count} customers
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Growth Trends */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Monthly Growth Trends
          </h2>
          {growthData?.monthly_trends?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Customers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Growth
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue Growth
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {growthData.monthly_trends
                    .slice(-6)
                    .reverse()
                    .map((trend, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {trend.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trend.new_customers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={
                              trend.customer_growth_rate >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {trend.customer_growth_rate > 0 ? "+" : ""}
                            {trend.customer_growth_rate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(trend.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={
                              trend.revenue_growth_rate >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {trend.revenue_growth_rate > 0 ? "+" : ""}
                            {trend.revenue_growth_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No growth data available
            </p>
          )}
        </Card>

        {/* Customer Lifetime Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Customer Metrics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Total Customers</span>
                <span className="text-xl font-bold text-gray-900">
                  {financialData?.customer_metrics?.total_customers || 0}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Avg. Customer LTV</span>
                <span className="text-xl font-bold text-primary-600">
                  {formatCurrency(
                    financialData?.customer_metrics
                      ?.avg_customer_lifetime_value || 0,
                  )}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Current State
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Active Subscriptions</span>
                <span className="text-xl font-bold text-gray-900">
                  {growthData?.current_state?.active_subscriptions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Total Revenue</span>
                <span className="text-xl font-bold text-primary-600">
                  {formatCurrency(
                    growthData?.current_state?.total_revenue || 0,
                  )}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
