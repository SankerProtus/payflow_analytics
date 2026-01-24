import Layout from "../components/layout/Layout";
import CustomerTable from "../components/customers/CustomerTable";
import { useCustomers } from "../hooks/useCustomers";
import ErrorMessage from "../components/common/ErrorMessage";

const Customers = () => {
  const { customers, loading, error, refetch } = useCustomers();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-1">
              Manage and view all your customers
            </p>
          </div>
          <div className="text-sm text-gray-600">
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