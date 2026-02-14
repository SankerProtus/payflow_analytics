import { useState } from "react";
import Layout from "../components/layout/Layout";
import CustomerTable from "../components/customers/CustomerTable";
import AddCustomerModal from "../components/customers/AddCustomerModal";
import { useCustomers } from "../hooks/useCustomers";
import ErrorMessage from "../components/common/ErrorMessage";
import { Handshake, UserPlus } from "lucide-react";

const Customers = () => {
  const { customers, loading, error, refetch } = useCustomers();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddSuccess = () => {
    refetch(); // Refresh customer list
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-primary-600 flex items-center gap-2">
              <Handshake className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600 flex-shrink-0" />
              <span>Customers</span>
            </h1>
            <p className="text-gray-600 text-base sm:text-lg mt-1">
              Manage and view all your customers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm sm:text-md text-gray-600">
              {!loading && `${customers.length} total customers`}
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
            >
              <UserPlus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        <CustomerTable customers={customers} loading={loading} />
      </div>

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </Layout>
  );
};

export default Customers;
