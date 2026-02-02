import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "../common/Card";

const RevenueChart = ({ data, loading }) => {
  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Revenue Trend
        </h3>
        <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Monthly Recurring Revenue
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#6b7280" }}
            tickLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fill: "#6b7280" }}
            tickLine={{ stroke: "#e5e7eb" }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "0.75rem",
            }}
            formatter={(value) => [`$${value}`, "MRR"]}
          />
          <Line
            type="monotone"
            dataKey="mrr"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default RevenueChart;
