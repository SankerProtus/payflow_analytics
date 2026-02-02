import React from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import Card from "../common/Card";

const ActivityFeed = ({ activities, loading }) => {
  // Default sample activities if none provided
  const now = new Date();
  const defaultActivities = [
    {
      type: "subscription_created",
      description: "Jane Smith subscribed to Pro plan ($99/mo)",
      // 2 hours ago
      timestamp: new Date(now - 2 * 60 * 60 * 1000),
    },
    {
      type: "payment_failed",
      description: "Bob Wilson's payment failed ($199)",
      // 5 hours ago
      timestamp: new Date(now - 5 * 60 * 60 * 1000),
    },
    {
      type: "upgrade",
      description: "Acme Corp upgraded to Enterprise plan ($499/mo)",
      // 1 day ago
      timestamp: new Date(now - 24 * 60 * 60 * 1000),
    },
    {
      type: "trial_ending",
      description: "Sarah Lee's trial ends tomorrow",
      // 3 hours ago
      timestamp: new Date(now - 3 * 60 * 60 * 1000),
    },
    {
      type: "subscription_canceled",
      description: "Tech Startup canceled subscription",
      // 2 days ago
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  const displayActivities = activities || defaultActivities;

  const getIcon = (type) => {
    switch (type) {
      case "subscription_created":
        return <UserPlus className="h-5 w-5 text-success-600" />;
      case "payment_succeeded":
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case "payment_failed":
        return <XCircle className="h-5 w-5 text-danger-600" />;
      case "subscription_canceled":
        return <AlertCircle className="h-5 w-5 text-danger-600" />;
      case "upgrade":
        return <TrendingUp className="h-5 w-5 text-primary-600" />;
      case "trial_ending":
        return <AlertCircle className="h-5 w-5 text-warning-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded mb-2"></div>
                <div className="h-3 w-1/4 bg-gray-200 animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h3>
        <p className="text-gray-500 text-sm">No recent activity</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {displayActivities.slice(0, 5).map((activity, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{getIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {timeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ActivityFeed;
