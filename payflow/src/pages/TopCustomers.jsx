import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Crown,
  TrendingUp,
  DollarSign,
  Star,
  Award,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import Card from "../components/common/Card";
import { CircleUser } from "lucide-react";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { dashboardAPI } from "../api/dashboard.api";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";

const TopCustomers = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [limit, setLimit] = useState(10);

  const metrics = [
    { value: "revenue", label: "Revenue", icon: DollarSign },
    { value: "loyalty", label: "Loyalty", icon: Award },
    { value: "activity", label: "Activity", icon: TrendingUp },
  ];

  const fetchTopCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardAPI.getTopCustomers({ limit });
      setTopCustomers(response.data.top_customers || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load top customers");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTopCustomers();
  }, [fetchTopCustomers]);

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-100" };
      case 2:
        return { icon: Trophy, color: "text-gray-400", bg: "bg-gray-100" };
      case 3:
        return { icon: Award, color: "text-orange-500", bg: "bg-orange-100" };
      default:
        return { icon: Star, color: "text-blue-500", bg: "bg-blue-100" };
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen text="Loading top customers..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} onRetry={fetchTopCustomers} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
              <Trophy className="h-8 w-8" />
              Top Customers Leaderboard
            </h1>
            <p className="text-gray-600 mt-1">
              Recognize and reward your most valuable customers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isSelected = selectedMetric === metric.value;
            return (
              <button
                key={metric.value}
                onClick={() => setSelectedMetric(metric.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <Icon
                  className={`h-6 w-6 mx-auto mb-2 ${isSelected ? "text-primary-600" : "text-gray-400"}`}
                />
                <p
                  className={`text-sm font-medium text-center ${isSelected ? "text-primary-600" : "text-gray-700"}`}
                >
                  {metric.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Podium - Top 3 */}
        {topCustomers.length >= 3 && (
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* 2nd Place */}
            <Card className="mt-8">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <CircleUser
                    name={topCustomers[1]?.name || topCustomers[1]?.email}
                    size={48}
                  />
                  <div className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-2">
                    <Trophy className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="font-semibold text-gray-900">
                  {topCustomers[1]?.name || "N/A"}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  {topCustomers[1]?.email}
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(topCustomers[1]?.total_revenue || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total Revenue</p>
                </div>
                <div className="mt-4 text-6xl font-bold text-gray-300">2</div>
              </div>
            </Card>

            {/* 1st Place */}
            <Card className="border-4 border-yellow-400 shadow-xl">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <CircleUser
                    name={topCustomers[0]?.name || topCustomers[0]?.email}
                    size={48}
                    className="ring-4 ring-yellow-400"
                  />
                  <div className="absolute -top-2 -right-2 bg-yellow-100 rounded-full p-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
                <p className="font-bold text-xl text-gray-900">
                  {topCustomers[0]?.name || "N/A"}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  {topCustomers[0]?.email}
                </p>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-yellow-600">
                    {formatCurrency(topCustomers[0]?.total_revenue || 0)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Total Revenue</p>
                </div>
                <div className="mt-4 text-6xl font-bold text-yellow-400">1</div>
              </div>
            </Card>

            {/* 3rd Place */}
            <Card className="mt-8">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <CircleUser
                    name={topCustomers[2]?.name || topCustomers[2]?.email}
                    size={48}
                  />
                  <div className="absolute -top-2 -right-2 bg-orange-100 rounded-full p-2">
                    <Award className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
                <p className="font-semibold text-gray-900">
                  {topCustomers[2]?.name || "N/A"}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  {topCustomers[2]?.email}
                </p>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(topCustomers[2]?.total_revenue || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total Revenue</p>
                </div>
                <div className="mt-4 text-6xl font-bold text-orange-300">3</div>
              </div>
            </Card>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Complete Leaderboard
          </h2>
          {topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Since
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topCustomers.map((customer, index) => {
                    const rank = index + 1;
                    const badge = getRankBadge(rank);
                    const Icon = badge.icon;

                    return (
                      <tr
                        key={customer.customer_id || `customer-${index}`}
                        className={`hover:bg-gray-50 ${rank <= 3 ? "bg-yellow-50/30" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full ${badge.bg}`}>
                              <Icon className={`h-4 w-4 ${badge.color}`} />
                            </div>
                            <span className="text-lg font-bold text-gray-700">
                              #{rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <CircleUser
                              name={customer.name || customer.email}
                              size={48}
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {customer.name || "N/A"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-primary-600">
                            {formatCurrency(customer.total_revenue || 0)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {customer.total_invoices || 0} invoices
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {customer.plan_name || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(customer.plan_amount || 0)}/
                            {customer.billing_period || "month"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(customer.customer_since)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${
                              customer.subscription_status === "active"
                                ? "bg-green-100 text-green-800"
                                : customer.subscription_status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {customer.subscription_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No customer data available
            </p>
          )}
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Top {limit} Total Revenue
            </h3>
            <p className="text-2xl font-bold text-primary-600 break-words">
              {formatCurrency(
                topCustomers.reduce(
                  (sum, c) => sum + (c.total_revenue || 0),
                  0,
                ),
              )}
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Average Revenue per Customer
            </h3>
            <p className="text-2xl font-bold text-primary-600 break-words">
              {formatCurrency(
                topCustomers.reduce(
                  (sum, c) => sum + (c.total_revenue || 0),
                  0,
                ) / topCustomers.length || 0,
              )}
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Total Invoices
            </h3>
            <p className="text-2xl font-bold text-gray-900 break-words">
              {topCustomers.reduce(
                (sum, c) => sum + (c.total_invoices || 0),
                0,
              )}
            </p>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default TopCustomers;
