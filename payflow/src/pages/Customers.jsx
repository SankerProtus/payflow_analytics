import Layout from "../components/layout/Layout";
import CustomerTable from "../components/customers/CustomerTable";
import { useCustomers } from "../hooks/useCustomers";
import ErrorMessage from "../components/common/ErrorMessage";
import { Handshake } from "lucide-react";

const Customers = () => {
  const { customers, loading, error, refetch } = useCustomers();

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
          <div className="text-sm sm:text-md text-gray-600">
            {!loading && `${customers.length} total customers`}
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        <CustomerTable customers={customers} loading={loading} />
      </div>
    </Layout>
  );
};

export default Customers;
