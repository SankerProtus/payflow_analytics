import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Bell } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "../../hooks/useAuth";
import Button from "../common/Button";
import { CircleUser } from "lucide-react";
import { ChartNoAxesCombined } from "lucide-react";
import { dashboardAPI } from "../../api/dashboard.api";

const Navbar = () => {
  const context = useContext(AuthContext);
  const { user } = context || {};
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await dashboardAPI.getNotifications({
          unreadOnly: true,
        });
        setUnreadCount(response.data.notifications?.length || 0);
      } catch (err) {
        console.error("Failed to fetch unread notifications:", err);
      }
    };

    if (user) {
      fetchUnreadCount();
      // Refresh every minute
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
          <div className="flex items-center">
            <h1
              className="text-2xl font-bold text-primary-600 cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              <ChartNoAxesCombined className="inline-block h-10 w-10 mr-2" />
              PayFlow Analytics
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/notifications")}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div
              className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
              onClick={() => navigate("/profile")}
              title="View profile"
            >
              <CircleUser className="h-8 w-8 text-gray-400 text-primary-600" />
              <span className="font-medium">{getDisplayName()}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-5 w-5 hover:cursor-pointer" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
