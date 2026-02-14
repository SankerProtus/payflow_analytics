import { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Bell,
  Menu,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "../../hooks/useAuth";
import Button from "../common/Button";
import { CircleUser } from "lucide-react";
import { ChartNoAxesCombined } from "lucide-react";
import { dashboardAPI } from "../../api/dashboard.api";

const Navbar = ({ onMenuClick }) => {
  const context = useContext(AuthContext);
  const { user } = context || {};
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await dashboardAPI.getNotifications();
        const notifs = response.data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(notifs.length);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    if (user) {
      fetchNotifications();
      // Refresh every minute
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "warning":
        return {
          Icon: AlertCircle,
          color: "text-yellow-600",
          bg: "bg-yellow-100",
        };
      case "error":
        return { Icon: XCircle, color: "text-red-600", bg: "bg-red-100" };
      case "success":
        return {
          Icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-100",
        };
      default:
        return { Icon: Info, color: "text-blue-600", bg: "bg-blue-100" };
    }
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email;
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger menu */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <h1
              className="text-xl sm:text-2xl font-bold text-primary-600 cursor-pointer flex items-center"
              onClick={() => navigate("/dashboard")}
            >
              <ChartNoAxesCombined className="inline-block h-8 w-8 sm:h-10 sm:w-10 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">PayFlow Analytics</span>
              <span className="sm:hidden">PayFlow</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                title="Notifications"
              >
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">
                      Notifications
                    </h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notif, index) => {
                        const { Icon, color, bg } = getNotificationIcon(
                          notif.type,
                        );
                        return (
                          <div
                            key={index}
                            className="p-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <div className="flex gap-3">
                              <div
                                className={`p-2 rounded-full ${bg} flex-shrink-0`}
                              >
                                <Icon className={`h-4 w-4 ${color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div
              className="hidden sm:flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors touch-manipulation"
              onClick={() => navigate("/profile")}
              title="View profile"
            >
              <CircleUser className="h-8 w-8 text-gray-400 text-primary-600" />
              <span className="font-medium hidden md:inline">
                {getDisplayName()}
              </span>
            </div>
            <button
              onClick={() => navigate("/profile")}
              className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              title="Profile"
            >
              <CircleUser className="h-6 w-6 text-primary-600" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2 touch-manipulation"
            >
              <LogOut className="h-5 w-5 hover:cursor-pointer" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
