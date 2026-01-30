import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Activity,
  FileText,
  Package,
  Trophy,
  Bell,
} from "lucide-react";

const Sidebar = () => {
  const links = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/analytics", icon: Activity, label: "Analytics" },
    { to: "/customers", icon: Users, label: "Customers" },
    { to: "/subscriptions", icon: Package, label: "Subscriptions" },
    { to: "/dunning", icon: AlertTriangle, label: "Dunning" },
    { to: "/reports", icon: FileText, label: "Reports" },
    { to: "/top-customers", icon: Trophy, label: "Top Customers" },
    { to: "/activity", icon: Activity, label: "Activity Log" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`
            }
          >
            <link.icon className="h-5 w-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
