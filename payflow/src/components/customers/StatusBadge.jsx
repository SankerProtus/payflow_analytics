import React from "react";

const StatusBadge = ({ status }) => {
  const variants = {
    active: "bg-success-100 text-success-700 border-success-200",
    trialing: "bg-primary-100 text-primary-700 border-primary-200",
    past_due: "bg-warning-100 text-warning-700 border-warning-200",
    canceled: "bg-gray-100 text-gray-700 border-gray-200",
    paused: "bg-gray-100 text-gray-600 border-gray-200",
    unpaid: "bg-danger-100 text-danger-700 border-danger-200",
  };

  const labels = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past Due",
    canceled: "Canceled",
    paused: "Paused",
    unpaid: "Unpaid",
  };

  const variant = variants[status] || variants.canceled;
  const label = labels[status] || status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variant}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
