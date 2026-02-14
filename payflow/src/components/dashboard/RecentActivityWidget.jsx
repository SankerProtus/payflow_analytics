import { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { dashboardAPI } from "../../api/dashboard.api";
import { formatDate } from "../../utils/formatDate";

const RecentActivityWidget = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await dashboardAPI.getActivityLogs({
        limit: 6,
        days: 7,
      });
      setActivities(response.data.activities || []);
    } catch (err) {
      console.error("Failed to load activities:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "payment_succeeded":
        return { Icon: CheckCircle, color: "text-green-500" };
      case "payment_failed":
        return { Icon: XCircle, color: "text-red-500" };
      case "customer_created":
        return { Icon: UserPlus, color: "text-blue-500" };
      case "subscription_state_change":
        return { Icon: TrendingUp, color: "text-purple-500" };
      default:
        return { Icon: Activity, color: "text-gray-500" };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </h3>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary-600" />
        Recent Activity
      </h3>
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No recent activity
        </p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => {
            const { Icon, color } = getActivityIcon(activity.activity_type);
            return (
              <div
                key={index}
                className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0"
              >
                <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.activity}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {activity.entity}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(activity.timestamp, { includeTime: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentActivityWidget;
