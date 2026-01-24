import React from "react";
import { AlertCircle } from "lucide-react";
import { RefreshCcw } from "lucide-react";

const ErrorMessage = ({ message, onRetry }) => {
  if (!message) return null;

  return (
    <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-medium text-danger-800">Error</h3>
        <p className="text-sm text-danger-700 mt-1">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-md text-danger-700 underline mt-2 hover:text-danger-800 cursor-pointer"
          >
            <RefreshCcw className="inline-block h-5 w-5 mr-2" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
