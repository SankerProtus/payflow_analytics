import React from "react";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";

const AlertBanner = ({ failedPaymentsCount }) => {
  const navigate = useNavigate();

  if (!failedPaymentsCount || failedPaymentsCount === 0) {
    return null;
  }

  return (
    <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-medium text-warning-800">
          {failedPaymentsCount} Failed Payment
          {failedPaymentsCount > 1 ? "s" : ""} Need Attention
        </h3>
        <p className="text-sm text-warning-700 mt-1">
          These customers have past-due invoices that require follow-up to
          prevent churn.
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dunning")}
        className="text-warning-700 hover:bg-warning-100"
      >
        View Details
      </Button>
    </div>
  );
};

export default AlertBanner;
