import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Card from "../common/Card";

const MetricCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  loading,
}) => {
  const isPositive = changeType === "positive";
  const isNegative = changeType === "negative";

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 break-words mt-2 inline-block mt-4">
              {value}
            </p>
          )}
          {change && !loading && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive && (
                <TrendingUp className="h-4 w-4 text-success-600 flex-shrink-0" />
              )}
              {isNegative && (
                <TrendingDown className="h-4 w-4 text-danger-600 flex-shrink-0" />
              )}
              <span
                className={`text-xs sm:text-sm font-medium ${isPositive ? "text-success-600" : isNegative ? "text-danger-600" : "text-gray-600"}`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 sm:p-3 bg-primary-50 rounded-lg flex-shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default MetricCard;
