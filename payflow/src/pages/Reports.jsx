import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { dashboardAPI } from "../api/dashboard.api";
import { formatCurrency } from "../utils/formatCurrency";

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState("revenue");
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const reportTypes = [
    {
      id: "revenue",
      name: "Revenue Report",
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      id: "subscriptions",
      name: "Subscription Report",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      id: "customers",
      name: "Customer Report",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      id: "summary",
      name: "Financial Summary",
      icon: FileText,
      color: "text-primary-600",
      bg: "bg-primary-100",
    },
  ];

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardAPI.getFinancialReports(selectedReport, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      setReportData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange]);

    useEffect(() => {
      fetchReport();
    }, [fetchReport]);

  const handleExport = async (format) => {
    try {
      const response = await dashboardAPI.exportDashboardData(format);

      // Create download link
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payflow-report-${selectedReport}-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export report");
    }
  };

  const renderRevenueReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-primary-600">
              {formatCurrency(reportData.revenue_summary?.total_revenue || 0)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Collected</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData.revenue_summary?.total_collected || 0)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatCurrency(
                reportData.revenue_summary?.outstanding_invoices || 0,
              )}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.revenue_summary?.failed_invoices || 0)}
            </p>
          </Card>
        </div>

        {/* Recurring Revenue */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recurring Revenue
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Monthly Recurring Revenue (MRR)
              </p>
              <p className="text-3xl font-bold text-primary-600">
                {formatCurrency(reportData.recurring_revenue?.mrr || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                Annual Recurring Revenue (ARR)
              </p>
              <p className="text-3xl font-bold text-primary-600">
                {formatCurrency(reportData.recurring_revenue?.arr || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderSubscriptionReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Subscriptions</p>
            <p className="text-2xl font-bold text-gray-900">
              {reportData.subscriptions?.total || 0}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {reportData.subscriptions?.active || 0}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Churned</p>
            <p className="text-2xl font-bold text-red-600">
              {reportData.subscriptions?.churned || 0}
            </p>
          </Card>
        </div>
      </div>
    );
  };

  const renderCustomerReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Customers</p>
            <p className="text-2xl font-bold text-gray-900">
              {reportData.customer_metrics?.total_customers || 0}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Average Lifetime Value</p>
            <p className="text-2xl font-bold text-primary-600">
              {formatCurrency(
                reportData.customer_metrics?.avg_customer_lifetime_value || 0,
              )}
            </p>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Reports Center
            </h1>
            <p className="text-gray-600 mt-1">
              Generate and export detailed business reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="flex items-center gap-1 hover:bg-gray-200 cursor-pointer"
              onClick={() => handleExport("csv")}
              disabled={loading}
            >
              <Download className="h-5 w-5 mr-2" />
              Export CSV
            </Button>
            <Button
              className="flex items-center gap-1 hover:bg-gray-200j cursor-pointer"
              variant="outline"
              onClick={() => handleExport("json")}
              disabled={loading}
            >
              <Download className="h-5 w-5 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedReport === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedReport(type.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full ${type.bg} flex items-center justify-center mx-auto mb-3`}
                >
                  <Icon className={`h-6 w-6 ${type.color}`} />
                </div>
                <p
                  className={`text-sm font-medium text-center ${isSelected ? "text-primary-600" : "text-gray-700"}`}
                >
                  {type.name}
                </p>
              </button>
            );
          })}
        </div>

        {/* Date Range Filter */}
        <Card>
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex items-center gap-3 flex-1">
              <div>
                <label className="text-sm text-gray-600 block mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <Button
                variant="outline"
                onClick={fetchReport}
                disabled={loading}
                className="flex items-center mt-4 hover:cursor-pointer"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply Filter
              </Button>
            </div>
          </div>
        </Card>

        {/* Report Content */}
        {loading ? (
          <Loader text="Generating report..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchReport} />
        ) : (
          <>
            {selectedReport === "revenue" && renderRevenueReport()}
            {selectedReport === "subscriptions" && renderSubscriptionReport()}
            {selectedReport === "customers" && renderCustomerReport()}
            {selectedReport === "summary" && renderRevenueReport()}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
