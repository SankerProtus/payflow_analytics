import React, { useState } from "react";
import { useDebounce } from "use-debounce";
import CustomerRow from "./CustomerRow";
import EmptyState from "../common/EmptyState";
import { Users } from "lucide-react";

const CustomerTable = ({ customers, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [value] = useDebounce(searchTerm, 1000);
  const [statusFilter, setStatusFilter] = useState("all");

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 animate-pulse rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(value.toLowerCase()) ||
      customer.email?.toLowerCase().includes(value.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || customer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No customers yet"
        message="Customers will appear here when they subscribe to your service."
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none touch-manipulation"
          style={{ fontSize: "16px" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none touch-manipulation"
          style={{ fontSize: "16px" }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {/* Table */}
      {filteredCustomers.length === 0 ? (
        <div className="p-8">
          <EmptyState
            title="No customers found"
            message="Try adjusting your search or filter criteria."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MRR
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Since
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs sm:text-sm text-gray-600">
          Showing {filteredCustomers.length} of {customers.length} customers
        </p>
      </div>
    </div>
  );
};

export default CustomerTable;
