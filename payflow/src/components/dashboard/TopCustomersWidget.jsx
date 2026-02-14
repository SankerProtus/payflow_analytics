import { useState, useEffect } from "react";
import { Trophy, Crown, TrendingUp } from "lucide-react";
import { dashboardAPI } from "../../api/dashboard.api";
import { formatCurrency } from "../../utils/formatCurrency";

const TopCustomersWidget = () => {
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopCustomers();
  }, []);

  const fetchTopCustomers = async () => {
    try {
      const response = await dashboardAPI.getTopCustomers({ limit: 5 });
      setTopCustomers(response.data.top_customers || []);
    } catch (err) {
      console.error("Failed to load top customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index) => {
    if (index === 0) return Crown;
    if (index === 1) return Trophy;
    return TrendingUp;
  };

  const getRankColor = (index) => {
    if (index === 0) return "text-yellow-500";
    if (index === 1) return "text-gray-400";
    if (index === 2) return "text-orange-500";
    return "text-blue-500";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Customers
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
        <Trophy className="h-5 w-5 text-primary-600" />
        Top Customers
      </h3>
      {topCustomers.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No customer data available
        </p>
      ) : (
        <div className="space-y-3">
          {topCustomers.map((customer, index) => {
            const RankIcon = getRankIcon(index);
            return (
              <div
                key={customer.customer_id}
                className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <RankIcon
                    className={`h-5 w-5 flex-shrink-0 ${getRankColor(index)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {customer.customer_name || customer.email || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {customer.email}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(customer.total_revenue)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {customer.subscription_count || 0} sub
                    {customer.subscription_count !== 1 ? "s" : ""}
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

export default TopCustomersWidget;
