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
import CreateSubscriptionModal from "../components/billing/CreateSubscriptionModal";
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
  const [showCreateSubscription, setShowCreateSubscription] = useState(false);
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

  const handleSubscriptionCreated = () => {
    refetchSubscriptions();
    setRefreshKey((prev) => prev + 1);
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

  // Production-grade check: Allow admin tools but provide helpful guidance
  // This page shows billing overview for users managing their customers
  // Users without customers can still create subscriptions via the modal
  if (!customerId) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Subscriptions & Billing
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage customer subscriptions and billing
              </p>
            </div>
            <Button
              onClick={() => setShowCreateSubscription(true)}
              className="flex items-center gap-2 justify-center"
            >
              <Plus className="h-4 w-4" />
              New Subscription
            </Button>
          </div>

          {/* Getting Started Guide */}
          <Card>
            <div className="text-center py-12 px-4">
              <Package className="h-16 w-16 text-primary-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome to Subscription Management
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Create and manage subscriptions for your customers in just a few
                clicks.
              </p>

              {/* Quick Start Guide */}
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-left">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Quick Start: Create Your First Subscription
                  </h4>
                  <ol className="space-y-3 text-sm text-blue-800">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        1
                      </span>
                      <span>
                        Click the <strong>"New Subscription"</strong> button
                        above
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        2
                      </span>
                      <span>Select an existing customer or add a new one</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        3
                      </span>
                      <span>
                        Choose a subscription plan (Basic, Pro, or Enterprise)
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        4
                      </span>
                      <span>Add a payment method for the customer</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        5
                      </span>
                      <span>
                        Review and confirm - your subscription will be active
                        immediately!
                      </span>
                    </li>
                  </ol>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900">💡 Pro Tip:</strong> You
                    can also manage subscriptions from the{" "}
                    <strong className="text-gray-900">Customers</strong> page.
                    Click on any customer to view their details and add
                    subscriptions directly from their profile.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Create Subscription Modal */}
        <CreateSubscriptionModal
          isOpen={showCreateSubscription}
          onClose={() => setShowCreateSubscription(false)}
          onSuccess={handleSubscriptionCreated}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-primary-600 flex items-center gap-2">
            <Package className="h-8 w-8" />
            Subscriptions & Billing
          </h1>
          <p className="text-gray-600 text-lg mt-1">
            Manage your subscriptions, payment methods, and invoices
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
                      key={`payment-form-${customerId}`}
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
                <Button
                  variant="primary"
                  onClick={() => setShowCreateSubscription(true)}
                >
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

      {/* Modals */}
      <CreateSubscriptionModal
        isOpen={showCreateSubscription}
        onClose={() => setShowCreateSubscription(false)}
        onSuccess={handleSubscriptionCreated}
        preSelectedCustomerId={customerId}
      />
    </Layout>
  );
};

export default Billing;
