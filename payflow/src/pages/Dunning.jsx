import React from "react";
import Layout from "../components/layout/Layout";
import DunningTable from "../components/dunning/DunningTable";
import Card from "../components/common/Card";
import { useDunning } from "../hooks/useDunning";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { formatCurrency } from "../utils/formatCurrency";
import { BanknoteX } from "lucide-react";

const Dunning = () => {
  const { dunningList, groupedByRisk, loading, error, refetch } = useDunning();

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen text="Loading failed payments..." />
      </Layout>
    );
  }

  const totalAtRisk = dunningList.reduce(
    (sum, item) => sum + item.amountDue,
    0,
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
            <BanknoteX className="h-10 w-10" />
            Failed Payments
          </h1>
          <p className="text-gray-600 text-lg mt-1">
            Manage customers with payment issues to reduce churn
          </p>
        </div>
        {/* Error */}
        {error && <ErrorMessage message={error} onRetry={refetch} />}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Total at Risk
            </p>
            <p className="text-2xl font-bold text-danger-600">
              {formatCurrency(totalAtRisk / 100)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">High Risk</p>
            <p className="text-2xl font-bold text-danger-600">
              {groupedByRisk.high.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Medium Risk
            </p>
            <p className="text-2xl font-bold text-warning-600">
              {groupedByRisk.medium.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">Low Risk</p>
            <p className="text-2xl font-bold text-success-600">
              {groupedByRisk.low.length}
            </p>
          </Card>
        </div>

        {/* High Risk */}
        {groupedByRisk.high.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🔴 High Risk ({">"}7 days overdue)
            </h2>
            <DunningTable
              items={groupedByRisk.high}
              title="High Risk"
              loading={loading}
            />
          </div>
        )}

        {/* Medium Risk */}
        {groupedByRisk.medium.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🟡 Medium Risk (3-7 days overdue)
            </h2>
            <DunningTable
              items={groupedByRisk.medium}
              title="Medium Risk"
              loading={loading}
            />
          </div>
        )}

        {/* Low Risk */}
        {groupedByRisk.low.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🟢 Low Risk ({"<"}3 days overdue)
            </h2>
            <DunningTable
              items={groupedByRisk.low}
              title="Low Risk"
              loading={loading}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dunning;
