import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Check,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { dashboardAPI } from "../api/dashboard.api";
import { formatDate } from "../utils/formatDate";

const Notifications = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");

  const filterOptions = [
    { value: "all", label: "All Notifications" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
  ];

  const notificationTypes = {
    info: { icon: Info, color: "text-blue-600", bg: "bg-blue-100" },
    success: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
    warning: {
      icon: AlertCircle,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    error: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params =
        filter === "all" ? {} : { unreadOnly: filter === "unread" };
      const response = await dashboardAPI.getNotifications(params);
      setNotifications(response.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

    useEffect(() => {
      fetchNotifications();
    }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await dashboardAPI.markNotificationAsRead(notificationId);
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await dashboardAPI.markAllNotificationsAsRead();
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await dashboardAPI.deleteNotification(notificationId);
      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const getNotificationIcon = (type) => {
    const config =
      notificationTypes[type?.toLowerCase()] || notificationTypes.info;
    const Icon = config.icon;
    return { Icon, ...config };
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen text="Loading notifications..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorMessage message={error} onRetry={fetchNotifications} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notifications Center
              {unreadCount > 0 && (
                <span className="ml-2 px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-1">
              Stay updated with important system alerts and customer activities
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === option.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
              {option.value === "unread" && unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white text-primary-600 text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Notifications
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {notifications.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Unread</p>
                <p className="text-3xl font-bold text-red-600">{unreadCount}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Read</p>
                <p className="text-3xl font-bold text-green-600">
                  {notifications.length - unreadCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Notifications List */}
        <Card>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const { Icon, color, bg } = getNotificationIcon(
                  notification.type,
                );

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                      notification.is_read
                        ? "border-gray-200 bg-white"
                        : "border-primary-300 bg-primary-50"
                    }`}
                  >
                    <div className={`p-3 rounded-full ${bg} flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p
                            className={`text-sm font-semibold ${notification.is_read ? "text-gray-700" : "text-gray-900"}`}
                          >
                            {notification.title}
                          </p>
                          <p
                            className={`text-sm mt-1 ${notification.is_read ? "text-gray-500" : "text-gray-700"}`}
                          >
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${bg} ${color}`}
                        >
                          {notification.type}
                        </span>

                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleDeleteNotification(notification.id)
                            }
                            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No notifications</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
              </p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Notifications;
