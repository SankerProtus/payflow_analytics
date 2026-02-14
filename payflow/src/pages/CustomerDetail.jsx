import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import Layout from "../components/layout/Layout";
import Timeline from "../components/customers/Timeline";
import StatusBadge from "../components/customers/StatusBadge";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import CreateSubscriptionModal from "../components/billing/CreateSubscriptionModal";
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
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </Layout>
    );
  }

  // Check if this is a demo/sample customer (fake Stripe ID)
  const isDemoCustomer =
    customer.stripe_customer_id &&
    (customer.stripe_customer_id.startsWith("cus_tech_") ||
      customer.stripe_customer_id.startsWith("cus_edu_") ||
      customer.stripe_customer_id.startsWith("cus_fit_") ||
      customer.stripe_customer_id.match(/^cus_[a-z]+_\d+$/));

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/customers")}>
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
              {isDemoCustomer && (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  Demo Customer (Sample Data)
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateSubscription(true)}
                disabled={isDemoCustomer}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
              {customer.stripe_customer_id && (
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isDemoCustomer) {
                        alert(
                          "This is a demo customer with sample data. The Stripe customer ID doesn't exist in your actual Stripe account.\n\nTo view real customers in Stripe, create them through the Stripe Dashboard or API.",
                        );
                      } else {
                        window.open(
                          `https://dashboard.stripe.com/customers/${customer.stripe_customer_id}`,
                          "_blank",
                        );
                      }
                    }}
                    className={isDemoCustomer ? "opacity-75" : ""}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {isDemoCustomer ? "Demo Customer" : "View in Stripe"}
                  </Button>
                  {isDemoCustomer && (
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                      This is sample data. The customer doesn't exist in Stripe.
                    </div>
                  )}
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
      <CreateSubscriptionModal
        isOpen={showCreateSubscription}
        onClose={() => setShowCreateSubscription(false)}
        onSuccess={handleSubscriptionCreated}
        preSelectedCustomerId={id}
      />
    </Layout>
  );
};

export default CustomerDetail;
