import React from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Clock,
} from "lucide-react";
import { formatDateTime } from "../../utils/formatDate";
import { centsToUSD } from "../../utils/formatCurrency";

const Timeline = ({ events, loading }) => {
  const getIcon = (type) => {
    if (type.includes("succeeded") || type.includes("active")) {
      return <CheckCircle className="h-5 w-5 text-success-600" />;
    }
    if (type.includes("failed")) {
      return <XCircle className="h-5 w-5 text-danger-600" />;
    }
    if (type.includes("past_due") || type.includes("warning")) {
      return <AlertCircle className="h-5 w-5 text-warning-600" />;
    }
    if (type.includes("payment") || type.includes("invoice")) {
      return <DollarSign className="h-5 w-5 text-primary-600" />;
    }
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getEventColor = (type) => {
    if (type.includes("succeeded") || type.includes("active")) {
      return "border-success-200 bg-success-50";
    }
    if (type.includes("failed")) {
      return "border-danger-200 bg-danger-50";
    }
    if (type.includes("past_due") || type.includes("warning")) {
      return "border-warning-200 bg-warning-50";
    }
    return "border-gray-200 bg-gray-50";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-3 w-1/4 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No events yet</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 && (
                <span
                  className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-start space-x-3">
                <div
                  className={`relative px-1 flex items-center justify-center h-10 w-10 rounded-full border-2 ${getEventColor(event.type)}`}
                >
                  {getIcon(event.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div>
                    <p className="text-sm text-gray-900">{event.description}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                  {event.metadata && (
                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
                      {event.metadata.amount && (
                        <p>Amount: {centsToUSD(event.metadata.amount)}</p>
                      )}
                      {event.metadata.reason && (
                        <p>Reason: {event.metadata.reason}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Timeline;
