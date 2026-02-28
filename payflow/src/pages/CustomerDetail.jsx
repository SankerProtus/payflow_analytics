import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import Layout from "../components/layout/Layout";
import Timeline from "../components/customers/Timeline";
import StatusBadge from "../components/customers/StatusBadge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import CreateSubscriptionWizard from "../components/billing/CreateSubscriptionWizard";
import { useCustomerDetail } from "../hooks/useCustomers";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customer, timeline, loading, error, refetch } = useCustomerDetail(id);
  const [showCreateSubscription, setShowCreateSubscription] = useState(false);

  const handleSubscriptionCreated = () => {
    refetch();
  };

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen text="Loading customer details..." />
      </Layout>
    );
  }

  if (error || !customer) {
    return (
      <Layout>
        <ErrorMessage message={error || "Customer not found"} />
        <Button
          variant="ghost"
          onClick={() => navigate("/customers")}
          className="mt-4"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back to Customers
        </Button>
      </Layout>
    );
  }

  // ...existing code...

  return (
    <Layout>
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/customers")}
          className="flex items-center gap-1 hover:bg-gray-200 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.name || "Unknown Customer"}
              </h1>
              <p className="text-gray-600 mt-1">{customer.email}</p>
              <div className="flex items-center gap-3 mt-4">
                <StatusBadge status={customer.status} />
                <span className="text-sm text-gray-600">
                  Customer since {formatDate(customer.created_at)}
                </span>
              </div>
              {/* ...existing code... */}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowCreateSubscription(true)}
                disabled={isDemoCustomer}
                className="flex items-center gap-1 py-3"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Subscription
              </Button>
              {customer.stripe_customer_id && (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      window.open(
                        `https://dashboard.stripe.com/customers/${customer.stripe_customer_id}`,
                        "_blank",
                      );
                    }}
                    className={"flex items-center gap-1"}
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    View in Stripe
                  </Button>
                  {/* ...existing code... */}
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Current MRR
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(customer.mrr || 0)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Lifetime Value
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                customer.lifetime_value || customer.total_revenue || 0,
              )}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Total Payments
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {customer.payment_count || 0}
            </p>
          </Card>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Subscription Timeline
          </h2>
          <Timeline events={timeline} loading={loading} />
        </Card>
      </div>

      {/* Modals */}
      <CreateSubscriptionWizard
        isOpen={showCreateSubscription}
        onClose={() => setShowCreateSubscription(false)}
        onSuccess={handleSubscriptionCreated}
        preSelectedCustomerId={id}
      />
    </Layout>
  );
};

export default CustomerDetail;
