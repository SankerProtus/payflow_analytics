import { useState, useEffect, useCallback } from "react";
import { Activity, Filter, Search, Eye } from "lucide-react";
import Layout from "../components/layout/Layout";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { dashboardAPI } from "../api/dashboard.api";
import { formatDate } from "../utils/formatDate";

const ActivityLog = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
  });

  const activityTypes = [
    { value: "all", label: "All Activities" },
    { value: "subscription", label: "Subscriptions" },
    { value: "payment", label: "Payments" },
    { value: "customer", label: "Customers" },
    { value: "invoice", label: "Invoices" },
  ];

  const fetchActivityLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardAPI.getActivityLog(pagination);
      setActivities(response.data.activities || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load activity log");
    } finally {
      setLoading(false);
    }
  }, [pagination]);

    useEffect(() => {
      fetchActivityLog();
    }, [fetchActivityLog]);

  const filterActivities = useCallback(() => {
    let filtered = [...activities];

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((activity) =>
        activity.activity_type
          ?.toLowerCase()
          .includes(selectedType.toLowerCase()),
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (activity) =>
          activity.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          activity.customer_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          activity.customer_email
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredActivities(filtered);
  }, [activities, searchTerm, selectedType]);

      useEffect(() => {
        filterActivities();
      }, [filterActivities]);

  const getActivityIcon = (type) => {
    const iconClass = "h-5 w-5";
    switch (type?.toLowerCase()) {
      case "subscription":
        return <Activity className={iconClass} />;
      case "payment":
        return <Activity className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const getActivityColor = (type) => {
    switch (type?.toLowerCase()) {
      case "subscription":
        return "bg-blue-100 text-blue-600";
      case "payment":
        return "bg-green-100 text-green-600";
      case "customer":
        return "bg-purple-100 text-purple-600";
      case "invoice":
        return "bg-yellow-100 text-yellow-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading && activities.length === 0) {
    return (
      <Layout>
        <Loader fullScreen text="Loading activity log..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} onRetry={fetchActivityLog} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Activity & Audit Log
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor all system activities and customer interactions
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search activities, customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>
            <div className="flex gap-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:cursor-pointer"
              >
                {activityTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={fetchActivityLog}
                className="flex items-center hover:cursor-pointer"
              >
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-600 mb-1">Total Activities</p>
            <p className="text-2xl font-bold text-gray-900">
              {activities.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Filtered Results</p>
            <p className="text-2xl font-bold text-primary-600">
              {filteredActivities.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Subscription Events</p>
            <p className="text-2xl font-bold text-blue-600">
              {
                activities.filter((a) =>
                  a.activity_type?.toLowerCase().includes("subscription"),
                ).length
              }
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 mb-1">Payment Events</p>
            <p className="text-2xl font-bold text-green-600">
              {
                activities.filter((a) =>
                  a.activity_type?.toLowerCase().includes("payment"),
                ).length
              }
            </p>
          </Card>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Activity Timeline
          </h2>
          {filteredActivities.length > 0 ? (
            <div className="space-y-4">
              {filteredActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer"
                >
                  <div
                    className={`p-3 rounded-full ${getActivityColor(activity.activity_type)}`}
                  >
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {activity.description}
                        </p>
                        {activity.customer_name && (
                          <p className="text-sm text-gray-600 mt-1">
                            Customer: {activity.customer_name} (
                            {activity.customer_email})
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getActivityColor(activity.activity_type)}`}
                      >
                        {activity.activity_type}
                      </span>
                      {activity.metadata && (
                        <button className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No activities found matching your filters
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedType("all");
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Card>

        {filteredActivities.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() =>
                setPagination({ ...pagination, limit: pagination.limit + 50 })
              }
            >
              Load More Activities
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ActivityLog;
