import { useState, useEffect } from "react";
import {
  X,
  Package,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { subscriptionAPI } from "../../api/subscription.api";
import { customerAPI } from "../../api/customer.api";
import { paymentAPI } from "../../api/payment.api";
import { billingAPI } from "../../api/billing.api";
import PaymentMethodForm from "./PaymentMethodForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CreateSubscriptionModal = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedCustomerId = null,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerId: preSelectedCustomerId || "",
    planId: "",
    paymentMethodId: "",
    trialPeriodDays: 14,
  });

  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadPlans();
      if (preSelectedCustomerId) {
        setFormData((prev) => ({ ...prev, customerId: preSelectedCustomerId }));
        loadPaymentMethods(preSelectedCustomerId);
      }
    }
  }, [isOpen, preSelectedCustomerId]);

  useEffect(() => {
    if (
      formData.customerId &&
      formData.customerId !== preSelectedCustomerId &&
      isOpen
    ) {
      loadPaymentMethods(formData.customerId);
    }
  }, [formData.customerId, isOpen, preSelectedCustomerId]);

  const loadCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error("Error loading customers:", err);
      setError("Failed to load customers");
    }
  };

  const loadPlans = async () => {
    try {
      const response = await billingAPI.getPlans();
      const planData = response.data.data || response.data;
      const planList = planData.plans || planData || [];
      setPlans(Array.isArray(planList) ? planList : []);
    } catch (err) {
      console.error("Error loading plans:", err);
      setError("Failed to load subscription plans");
    }
  };

  const loadPaymentMethods = async (customerId) => {
    try {
      const response = await paymentAPI.listPaymentMethods(customerId);
      const methods = response.data.data || [];
      setPaymentMethods(Array.isArray(methods) ? methods : []);
    } catch (err) {
      console.error("Error loading payment methods:", err);
      setPaymentMethods([]);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setFormData((prev) => ({
      ...prev,
      planId: plan.id,
      trialPeriodDays: plan.trial_period_days || 0,
    }));
  };

  const handleNext = () => {
    setError("");

    if (step === 1 && !formData.customerId) {
      setError("Please select a customer");
      return;
    }

    if (step === 2 && !formData.planId) {
      setError("Please select a subscription plan");
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.paymentMethodId) {
      setError("Please select a payment method");
      return;
    }

    setLoading(true);

    try {
      const response = await subscriptionAPI.create({
        customerId: formData.customerId,
        planId: formData.planId,
        paymentMethodId: formData.paymentMethodId,
        trialPeriodDays: formData.trialPeriodDays,
      });

      setSuccessMessage("Subscription created successfully!");

      setTimeout(() => {
        resetForm();
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error creating subscription:", err);

      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create subscription. Please try again.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      customerId: preSelectedCustomerId || "",
      planId: "",
      paymentMethodId: "",
      trialPeriodDays: 14,
    });
    setSelectedPlan(null);
    setError("");
    setSuccessMessage("");
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const formatCurrency = (amount, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (!isOpen) return null;

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);

  return (
    <Elements stripe={stripePromise}>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Subscription
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: "Customer" },
                { num: 2, label: "Plan" },
                { num: 3, label: "Payment" },
              ].map((item, idx) => (
                <div key={item.num} className="flex items-center flex-1">
                  <div
                    className={`flex items-center gap-2 ${idx < 2 ? "flex-1" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        step >= item.num
                          ? "bg-primary-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {step > item.num ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        item.num
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium hidden sm:inline ${
                        step >= item.num ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        step > item.num ? "bg-primary-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            {/* Step 1: Select Customer */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Customer
                  </label>
                  {preSelectedCustomerId ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Pre-selected:</strong>{" "}
                        {selectedCustomer?.name || selectedCustomer?.email}
                      </p>
                    </div>
                  ) : (
                    <select
                      value={formData.customerId}
                      onChange={(e) =>
                        handleChange("customerId", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="">Choose a customer...</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.email}) - Status:{" "}
                          {customer.status}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Select Plan */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Choose a Plan
                </h3>
                {plans.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      No subscription plans available
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Contact your administrator to set up plans
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => handlePlanSelect(plan)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.planId === plan.id
                            ? "border-primary-600 bg-primary-50"
                            : "border-gray-200 hover:border-primary-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {plan.name}
                            </h4>
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 mt-1">
                              {plan.tier}
                            </span>
                          </div>
                          {formData.planId === plan.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary-600" />
                          )}
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">
                          {formatCurrency(plan.amount, plan.currency)}
                          <span className="text-sm font-normal text-gray-600">
                            /{plan.billing_interval}
                          </span>
                        </p>
                        {plan.trial_period_days > 0 && (
                          <p className="text-sm text-green-600 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {plan.trial_period_days} days free trial
                          </p>
                        )}
                        {plan.description && (
                          <p className="text-sm text-gray-600 mt-2">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Payment Method & Confirmation */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  {paymentMethods.length > 0 ? (
                    <div className="space-y-3">
                      <select
                        value={formData.paymentMethodId}
                        onChange={(e) =>
                          handleChange("paymentMethodId", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select payment method...</option>
                        {paymentMethods.map((pm) => (
                          <option
                            key={pm.id}
                            value={pm.stripe_payment_method_id}
                          >
                            {pm.card_brand?.toUpperCase()} •••• {pm.card_last4}{" "}
                            (Exp: {pm.card_exp_month}/{pm.card_exp_year})
                            {pm.is_default && " - Default"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddPaymentMethod(true)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add new payment method
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 font-medium mb-2">
                          No payment methods found
                        </p>
                        <p className="text-xs text-amber-700">
                          Add a payment method below to continue with the
                          subscription.
                        </p>
                      </div>
                      {!showAddPaymentMethod && (
                        <button
                          type="button"
                          onClick={() => setShowAddPaymentMethod(true)}
                          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Payment Method
                        </button>
                      )}
                    </div>
                  )}

                  {/* Inline Payment Method Form */}
                  {showAddPaymentMethod && (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Add New Payment Method
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowAddPaymentMethod(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <PaymentMethodForm
                        key={`payment-form-${formData.customerId}`}
                        customerId={formData.customerId}
                        inline={true}
                        onSuccess={async (data) => {
                          await loadPaymentMethods(formData.customerId);
                          setFormData((prev) => ({
                            ...prev,
                            paymentMethodId: data.paymentMethodId,
                          }));
                          setShowAddPaymentMethod(false);
                          setSuccessMessage(
                            "Payment method added successfully!",
                          );
                          setTimeout(() => setSuccessMessage(""), 3000);
                        }}
                        onError={(err) => setError(err.message)}
                        buttonText="Save Payment Method"
                        showBillingDetails={false}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trial Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={formData.trialPeriodDays}
                    onChange={(e) =>
                      handleChange(
                        "trialPeriodDays",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Customer won't be charged during the trial period
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Subscription Summary
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">
                        {selectedCustomer?.name || selectedCustomer?.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-medium">{selectedPlan?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">
                        {selectedPlan &&
                          formatCurrency(
                            selectedPlan.amount,
                            selectedPlan.currency,
                          )}
                        /{selectedPlan?.billing_interval}
                      </span>
                    </div>
                    {formData.trialPeriodDays > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Trial Period:</span>
                        <span className="font-medium">
                          {formData.trialPeriodDays} days
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || paymentMethods.length === 0}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      Create Subscription
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Elements>
  );
};

export default CreateSubscriptionModal;
