/**
 * Billing Page
 * Complete billing management interface
 */

import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CreditCard, FileText, Package, Plus } from "lucide-react";
import Layout from "../components/layout/Layout";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import PaymentMethodForm from "../components/billing/PaymentMethodForm";
import PaymentMethodList from "../components/billing/PaymentMethodList";
import InvoiceList from "../components/billing/InvoiceList";
import SubscriptionCard from "../components/billing/SubscriptionCard";
import { paymentAPI } from "../api/payment.api";
import { useCustomerData } from "../hooks/useCustomerData";
import { useSubscriptions } from "../hooks/useSubscriptions";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Billing = () => {
  const [activeTab, setActiveTab] = useState("payment-methods");
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get customer data from hook
  const {
    customerId,
    loading: customerLoading,
    error: customerError,
    refetch,
  } = useCustomerData();

  // Get subscriptions for customer
  const {
    subscriptions,
    loading: subscriptionsLoading,
    error: subscriptionsError,
    refetch: refetchSubscriptions,
  } = useSubscriptions(customerId);

  const handlePaymentMethodAdded = async ({
    paymentMethodId,
    customerId,
    setAsDefault,
  }) => {
    await paymentAPI.attachPaymentMethod({
      customerId,
      paymentMethodId,
      setAsDefault,
    });
    setShowAddPaymentMethod(false);
    setRefreshKey((prev) => prev + 1); 
    alert("Payment method added successfully!");
  };

  const tabs = [
    { id: "payment-methods", label: "Payment Methods", icon: CreditCard },
    { id: "subscriptions", label: "Subscriptions", icon: Package },
    { id: "invoices", label: "Invoices", icon: FileText },
  ];

  // Show loading state while fetching customer
  if (customerLoading) {
    return (
      <Layout>
        <Loader text="Loading billing information..." />
      </Layout>
    );
  }

  // Show error if customer fetch failed
  if (customerError) {
    return (
      <Layout>
        <ErrorMessage message={customerError} onRetry={refetch} />
      </Layout>
    );
  }

  // Show message if no customer found
  if (!customerId) {
    return (
      <Layout>
        <Card>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No customer profile found</p>
            <p className="text-sm text-gray-500 mt-1">
              Please contact support to set up billing
            </p>
          </div>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Billing & Payments
          </h1>
          <p className="text-gray-600 text-lg mt-1">
            Manage your payment methods, subscriptions, and invoices
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Payment Methods Tab */}
          {activeTab === "payment-methods" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Payment Methods
                </h2>
                <Button
                  variant="primary"
                  onClick={() => setShowAddPaymentMethod(!showAddPaymentMethod)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Payment Method
                </Button>
              </div>

              {showAddPaymentMethod && (
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Add New Payment Method
                  </h3>
                  <Elements stripe={stripePromise}>
                    <PaymentMethodForm
                      customerId={customerId}
                      onSuccess={handlePaymentMethodAdded}
                      onError={(error) => console.error(error)}
                      setAsDefault={true}
                    />
                  </Elements>
                </Card>
              )}

              <PaymentMethodList
                key={refreshKey}
                customerId={customerId}
                onUpdate={() => setRefreshKey((prev) => prev + 1)}
              />
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === "subscriptions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Subscriptions
                </h2>
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-1" />
                  New Subscription
                </Button>
              </div>

              {subscriptionsLoading ? (
                <Loader text="Loading subscriptions..." />
              ) : subscriptionsError ? (
                <ErrorMessage
                  message={subscriptionsError}
                  onRetry={refetchSubscriptions}
                />
              ) : subscriptions.length === 0 ? (
                <Card>
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No active subscriptions</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Subscribe to a plan to get started
                    </p>
                  </div>
                </Card>
              ) : (
                subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onUpdate={() => {
                      refetchSubscriptions();
                      setRefreshKey((prev) => prev + 1);
                    }}
                    onNavigateToPaymentMethods={() => {
                      setActiveTab("payment-methods");
                      setShowAddPaymentMethod(true);
                    }}
                  />
                ))
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Billing History
              </h2>
              <InvoiceList customerId={customerId} limit={20} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Billing;
