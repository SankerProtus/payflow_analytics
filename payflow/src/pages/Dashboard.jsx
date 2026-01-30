import React from "react";
import { DollarSign, Users, TrendingDown, Clock } from "lucide-react";
import Layout from "../components/layout/Layout";
import MetricCard from "../components/dashboard/MetricCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import AlertBanner from "../components/dashboard/AlertBanner";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import { useDashboard } from "../hooks/useDashboard";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { formatCurrency } from "../utils/formatCurrency";
import { LayoutDashboard } from "lucide-react";

const Dashboard = () => {
  const { metrics, revenueTrends, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen text="Loading dashboard..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} onRetry={refetch} />
      </Layout>
    );
  }

  // Calculate derived metrics - handle nested response structure
  const mrrValue = metrics?.mrr?.value ?? metrics?.mrr ?? 0;
  const mrrChange = metrics?.mrr?.change ?? metrics?.mrrChange ?? 12.3;

  const customerCount =
    metrics?.active_customers?.value ?? metrics?.customerCount ?? 0;
  const customerChange =
    metrics?.active_customers?.change ?? metrics?.customerChange ?? 5;

  const churnRate = metrics?.churn_rate?.value ?? metrics?.churnRate ?? 0;
  const churnChange =
    metrics?.churn_rate?.change ?? metrics?.churnChange ?? -0.5;

  const failedPayments =
    metrics?.failed_payments?.value ?? metrics?.failedPaymentsCount ?? 0;
  const trialChange = metrics?.trialChange ?? 3;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
              <LayoutDashboard className="h-8 w-8 text-primary-600" />
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Track your subscription metrics and revenue growth
            </p>
          </div>
          <div className="text-sm text-gray-600">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Alert Banner */}
        <AlertBanner failedPaymentsCount={failedPayments} />

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(mrrValue)}
            change={mrrChange > 0 ? `+${mrrChange}%` : `${mrrChange}%`}
            changeType={mrrChange > 0 ? "positive" : "negative"}
            icon={DollarSign}
            loading={loading}
          />
          <MetricCard
            title="Active Customers"
            value={customerCount}
            change={
              customerChange > 0 ? `+${customerChange}` : `${customerChange}`
            }
            changeType={customerChange > 0 ? "positive" : "negative"}
            icon={Users}
            loading={loading}
          />
          <MetricCard
            title="Churn Rate"
            value={`${churnRate}%`}
            change={churnChange > 0 ? `+${churnChange}%` : `${churnChange}%`}
            changeType={churnChange < 0 ? "positive" : "negative"}
            icon={TrendingDown}
            loading={loading}
          />
          <MetricCard
            title="Active Trials"
            value={metrics?.trialCount ?? 0}
            change={trialChange > 0 ? `+${trialChange}` : `${trialChange}`}
            changeType={trialChange > 0 ? "positive" : "neutral"}
            icon={Clock}
            loading={loading}
          />
        </div>

        {/* Revenue Chart */}
        <RevenueChart data={revenueTrends} loading={loading} />

        {/* Two Column Layout for Stats and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">New MRR (This Month)</span>
                <span className="font-semibold text-success-600">
                  +{formatCurrency(metrics?.newMrr || 1240)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Churned MRR</span>
                <span className="font-semibold text-danger-600">
                  -{formatCurrency(metrics?.churnedMrr || 380)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Expansion MRR</span>
                <span className="font-semibold text-primary-600">
                  +{formatCurrency(metrics?.expansionMrr || 520)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-900 font-medium">Net New MRR</span>
                <span className="font-bold text-primary-600 text-lg">
                  +{formatCurrency(metrics?.netNewMrr || 1380)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <ActivityFeed />
        </div>

        {/* Customer Health & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Health
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Average Lifetime Value</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(metrics?.avgLtv || 1584)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">ARPU</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(metrics?.arpu || 132)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Avg. Customer Lifetime</span>
                <span className="font-semibold text-gray-900">
                  {metrics?.avgLifetime || 12} months
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Customer Acquisition Cost</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(metrics?.cac || 245)}
                </span>
              </div>
            </div>
          </div>

          {/* Month-to-Date Stats */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Month-to-Date Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">New Customers</span>
                <span className="font-semibold text-success-600">
                  +{metrics?.newCustomersMtd || 12}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Cancellations</span>
                <span className="font-semibold text-danger-600">
                  {metrics?.cancellationsMtd || 5}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600">Upgrades</span>
                <span className="font-semibold text-primary-600">
                  {metrics?.upgradesMtd || 8}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Recovery Rate</span>
                <span className="font-semibold text-gray-900">
                  {metrics?.recoveryRate || 68}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
