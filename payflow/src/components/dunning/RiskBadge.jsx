import React from "react";

const RiskBadge = ({ level }) => {
  const variants = {
    high: "bg-danger-100 text-danger-700 border-danger-200",
    medium: "bg-warning-100 text-warning-700 border-warning-200",
    low: "bg-success-100 text-success-700 border-success-200",
  };

  const labels = {
    high: "High Risk",
    medium: "Medium Risk",
    low: "Low Risk",
  };

  const variant = variants[level] || variants.low;
  const label = labels[level] || level;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variant}`}
    >
      {label}
    </span>
  );
};

export default RiskBadge;
