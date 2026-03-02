import { useState, useEffect, useRef } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import {
  X,
  Package,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Info,
  DollarSign,
  Users,
} from "lucide-react";
import { subscriptionAPI } from "../../api/subscription.api";
import { customerAPI } from "../../api/customer.api";
import { paymentAPI } from "../../api/payment.api";
import { billingAPI } from "../../api/billing.api";
import PaymentMethodForm from "./PaymentMethodForm";

const STEPS = [
  { id: 1, name: "Customer", icon: Users },
  { id: 2, name: "Plan", icon: Package },
  { id: 3, name: "Payment", icon: CreditCard },
  { id: 4, name: "Confirm", icon: CheckCircle2 },
];

const CreateSubscriptionWizard = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedCustomerId = null,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerId: preSelectedCustomerId || "",
    planId: "",
    paymentMethodId: "",
    trialPeriodDays: 14,
    metadata: {},
  });

  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const abortControllerRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetWizard();
      loadInitialData();
    } else {
      abortControllerRef.current?.abort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (formData.customerId && isOpen) {
      loadPaymentMethods(formData.customerId);
      const customer = customers.find((c) => c.id === formData.customerId);
      setSelectedCustomer(customer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.customerId, isOpen, customers]);

  const loadInitialData = async () => {
    setDataLoading(true);
    setError("");

    try {
      abortControllerRef.current = new AbortController();

      const [customersRes, plansRes] = await Promise.all([
        customerAPI.getAll(),
        billingAPI.getPlans(),
      ]);

      if (!isMounted.current) return;

      const fetchedCustomers = customersRes.data.customers || [];
      setCustomers(fetchedCustomers);

      const planData = plansRes.data.data || plansRes.data;
      const planList = planData.plans || planData || [];
      const activePlans = Array.isArray(planList)
        ? planList.filter((p) => p.active !== false)
        : [];
      setPlans(activePlans);

      if (preSelectedCustomerId) {
        await loadPaymentMethods(preSelectedCustomerId);
        const customer = fetchedCustomers.find(
          (c) => c.id === preSelectedCustomerId,
        );
        setSelectedCustomer(customer);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Error loading initial data:", err);
      setError("Failed to load subscription data. Please try again.");
    } finally {
      if (isMounted.current) {
        setDataLoading(false);
      }
    }
  };

  const loadPaymentMethods = async (customerId) => {
    try {
      const response = await paymentAPI.listPaymentMethods(customerId);
      const methods = response.data.data || [];
      const validMethods = Array.isArray(methods) ? methods : [];

      if (!isMounted.current) return;

      setPaymentMethods(validMethods);

      const defaultMethod = validMethods.find((m) => m.is_default);
      if (defaultMethod && !formData.paymentMethodId) {
        setFormData((prev) => ({
          ...prev,
          paymentMethodId: defaultMethod.stripe_payment_method_id,
        }));
      }
    } catch (err) {
      console.error("Error loading payment methods:", err);
      setPaymentMethods([]);
    }
  };

  const validateStep = (stepNumber) => {
    const errors = {};

    switch (stepNumber) {
      case 1:
        if (!formData.customerId) {
          errors.customerId = "Please select a customer";
        }
        break;

      case 2:
        if (!formData.planId) {
          errors.planId = "Please select a subscription plan";
        } else {
          const plan = plans.find((p) => p.id === formData.planId);
          if (!plan) {
            errors.planId = "Selected plan is no longer available";
          } else if (plan.active === false) {
            errors.planId = "This plan is no longer active";
          }
        }
        break;

      case 3:
        if (!formData.paymentMethodId) {
          errors.paymentMethodId = "Please select or add a payment method";
        } else {
          const pm = paymentMethods.find(
            (m) => m.stripe_payment_method_id === formData.paymentMethodId,
          );
          if (!pm) {
            errors.paymentMethodId = "Selected payment method is invalid";
          }
        }

        if (
          formData.trialPeriodDays !== null &&
          (formData.trialPeriodDays < 0 || formData.trialPeriodDays > 365)
        ) {
          errors.trialPeriodDays =
            "Trial period must be between 0 and 365 days";
        }
        break;

      case 4:
        if (
          !formData.customerId ||
          !formData.planId ||
          !formData.paymentMethodId
        ) {
          errors.form = "Please complete all required fields";
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      const errorMessages = Object.values(validationErrors).join(", ");
      setError(errorMessages);
      return;
    }

    setError("");
    setValidationErrors({});
    setStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setError("");
    setValidationErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCustomerSelect = (customerId) => {
    setFormData((prev) => ({ ...prev, customerId }));
    setError("");
    setValidationErrors({});
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setFormData((prev) => ({
      ...prev,
      planId: plan.id,
      trialPeriodDays: plan.trial_period_days || 0,
    }));
    setError("");
    setValidationErrors({});
  };

  const handlePaymentMethodSelect = (paymentMethodId) => {
    setFormData((prev) => ({ ...prev, paymentMethodId }));
    setError("");
    setValidationErrors({});
  };

  const handleTrialPeriodChange = (days) => {
    const normalizedDays = Math.max(0, Math.min(365, parseInt(days) || 0));
    setFormData((prev) => ({ ...prev, trialPeriodDays: normalizedDays }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateStep(4)) {
      setError("Please complete all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await subscriptionAPI.create({
        customerId: formData.customerId,
        planId: formData.planId,
        paymentMethodId: formData.paymentMethodId,
        trialPeriodDays: formData.trialPeriodDays,
        metadata: {
          created_from: "wizard",
          customer_name: selectedCustomer?.name,
          plan_name: selectedPlan?.name,
        },
      });

      setSuccessMessage("Subscription created successfully!");

      if (onSuccess) {
        await onSuccess(response.data);
      }

      setTimeout(() => {
        if (isMounted.current) {
          handleClose();
        }
      }, 1500);
    } catch (err) {
      console.error("[Subscription] Creation failed:", err);

      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to create subscription. Please try again.";

      setError(errorMessage);

      if (errorMessage.includes("payment method")) {
        setStep(3);
      } else if (errorMessage.includes("plan")) {
        setStep(2);
      } else if (errorMessage.includes("customer")) {
        setStep(1);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleAddPaymentMethodSuccess = async (data) => {
    await loadPaymentMethods(formData.customerId);
    setFormData((prev) => ({
      ...prev,
      paymentMethodId: data.paymentMethodId,
    }));
    setSuccessMessage("Payment method added successfully!");
    setTimeout(() => {
      setSuccessMessage("");
      setShowAddPaymentMethod(false);
    }, 1500);
  };

  const handleShowAddPaymentMethod = () => {
    setShowAddPaymentMethod(true);
  };

  const handleHideAddPaymentMethod = () => {
    setShowAddPaymentMethod(false);
  };

  const resetWizard = () => {
    setStep(1);
    setFormData({
      customerId: preSelectedCustomerId || "",
      planId: "",
      paymentMethodId: "",
      trialPeriodDays: 14,
      metadata: {},
    });
    setSelectedPlan(null);
    setSelectedCustomer(null);
    setShowAddPaymentMethod(false);
    setError("");
    setValidationErrors({});
    setSuccessMessage("");
  };

  const handleClose = () => {
    if (!loading) {
      resetWizard();
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

  // Render Functions
  const renderProgressBar = () => (
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;

          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all ${
                    isCompleted
                      ? "bg-green-600 text-white"
                      : isActive
                        ? "bg-primary-600 text-white ring-4 ring-primary-100"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline transition-colors ${
                    isActive ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {s.name}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    isCompleted ? "bg-green-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStepContent = () => {
    if (dataLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading subscription data...</p>
        </div>
      );
    }

    return (
      <>
        {/* Render steps but hide inactive ones - this prevents CardElement unmounting during navigation */}
        <div style={{ display: step === 1 ? "block" : "none" }}>
          {renderCustomerStep()}
        </div>
        <div style={{ display: step === 2 ? "block" : "none" }}>
          {renderPlanStep()}
        </div>
        {/* Payment step stays mounted after first render to preserve CardElement */}
        <div style={{ display: step === 3 ? "block" : "none" }}>
          {renderPaymentStep()}
        </div>
        <div style={{ display: step === 4 ? "block" : "none" }}>
          {step === 4 && renderConfirmationStep()}
        </div>
      </>
    );
  };

  const renderCustomerStep = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Select Customer
        </h3>
        <p className="text-sm text-gray-600">
          Choose the customer for this subscription
        </p>
      </div>

      {preSelectedCustomerId ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Pre-selected Customer
              </p>
              <p className="text-sm text-blue-700 mt-1">
                {selectedCustomer?.name || selectedCustomer?.email}
              </p>
              {selectedCustomer?.email && (
                <p className="text-xs text-blue-600 mt-0.5">
                  {selectedCustomer.email}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No customers found</p>
              <p className="text-sm text-gray-500 mt-1">
                Create a customer first to add subscriptions
              </p>
            </div>
          ) : (
            <select
              value={formData.customerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                validationErrors.customerId
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              required
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                  disabled={customer.status === "inactive"}
                >
                  {customer.name} ({customer.email})
                  {customer.status === "inactive" ? " - Inactive" : ""}
                </option>
              ))}
            </select>
          )}
          {validationErrors.customerId && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {validationErrors.customerId}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderPlanStep = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Choose a Plan
        </h3>
        <p className="text-sm text-gray-600">
          Select the subscription plan for your customer
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No plans available</p>
          <p className="text-sm text-gray-500 mt-1">
            Contact your administrator to set up subscription plans
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => handlePlanSelect(plan)}
              className={`p-5 border-2 rounded-lg cursor-pointer transition-all text-left hover:shadow-md ${
                formData.planId === plan.id
                  ? "border-primary-600 bg-primary-50 ring-2 ring-primary-200"
                  : "border-gray-200 hover:border-primary-300"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">
                    {plan.name}
                  </h4>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 mt-1">
                    {plan.tier}
                  </span>
                </div>
                {formData.planId === plan.id && (
                  <CheckCircle2 className="h-6 w-6 text-primary-600" />
                )}
              </div>

              <div className="mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(plan.amount, plan.currency)}
                  </span>
                  <span className="text-sm font-normal text-gray-600">
                    /{plan.billing_interval}
                  </span>
                </div>
              </div>

              {plan.trial_period_days > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-2 py-1 rounded mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    {plan.trial_period_days} days free trial
                  </span>
                </div>
              )}

              {plan.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {plan.description}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
      {validationErrors.planId && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {validationErrors.planId}
        </p>
      )}
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Payment Method
        </h3>
        <p className="text-sm text-gray-600">
          Select or add a payment method for this subscription
        </p>
      </div>

      {/* Payment Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method
        </label>
        {paymentMethods.length > 0 ? (
          <div className="space-y-3">
            <select
              value={formData.paymentMethodId}
              onChange={(e) => handlePaymentMethodSelect(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                validationErrors.paymentMethodId
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              required
            >
              <option value="">Select payment method...</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.stripe_payment_method_id}>
                  {pm.card_brand?.toUpperCase()} •••• {pm.card_last4} (Exp:{" "}
                  {pm.card_exp_month}/{pm.card_exp_year})
                  {pm.is_default && " - Default"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleShowAddPaymentMethod}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add new payment method
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    No payment methods found
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Add a payment method below to continue
                  </p>
                </div>
              </div>
            </div>
            {!showAddPaymentMethod && (
              <button
                type="button"
                onClick={handleShowAddPaymentMethod}
                className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Payment Method
              </button>
            )}
          </div>
        )}
        {validationErrors.paymentMethodId && (
          <p className="text-sm text-red-600 flex items-center gap-1 mt-2">
            <AlertCircle className="h-4 w-4" />
            {validationErrors.paymentMethodId}
          </p>
        )}
      </div>

      {/* Add Payment Method Form */}
      {showAddPaymentMethod && (
        <div
          className={`p-5 bg-gray-50 border border-gray-200 rounded-lg transition-all ${
            showAddPaymentMethod ? "block" : "hidden"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary-600" />
              Add New Payment Method
            </h4>
            <button
              type="button"
              onClick={handleHideAddPaymentMethod}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {!stripe || !elements ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading Stripe...</p>
            </div>
          ) : (
            <PaymentMethodForm
              customerId={formData.customerId}
              inline={true}
              onSuccess={handleAddPaymentMethodSuccess}
              onError={(err) => setError(err.message || "Payment method error")}
              buttonText="Save Payment Method"
              showBillingDetails={false}
            />
          )}
        </div>
      )}

      {/* Trial Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trial Period (Days)
        </label>
        <input
          type="number"
          min="0"
          max="365"
          value={formData.trialPeriodDays}
          onChange={(e) => handleTrialPeriodChange(e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            validationErrors.trialPeriodDays
              ? "border-red-300 bg-red-50"
              : "border-gray-300"
          }`}
        />
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />
          Customer won't be charged during the trial period (0-365 days)
        </p>
        {validationErrors.trialPeriodDays && (
          <p className="text-sm text-red-600 flex items-center gap-1 mt-2">
            <AlertCircle className="h-4 w-4" />
            {validationErrors.trialPeriodDays}
          </p>
        )}
      </div>
    </div>
  );

  const renderConfirmationStep = () => {
    const selectedPaymentMethod = paymentMethods.find(
      (pm) => pm.stripe_payment_method_id === formData.paymentMethodId,
    );

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Confirm Subscription
          </h3>
          <p className="text-sm text-gray-600">
            Review the details before creating the subscription
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-linear-to-br from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary-600" />
            Subscription Summary
          </h4>

          <div className="space-y-3">
            {/* Customer */}
            <div className="flex items-start justify-between py-3 border-b border-primary-200">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Customer</span>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {selectedCustomer?.name}
                </p>
                <p className="text-xs text-gray-600">
                  {selectedCustomer?.email}
                </p>
              </div>
            </div>

            {/* Plan */}
            <div className="flex items-start justify-between py-3 border-b border-primary-200">
              <div className="flex items-center gap-2 text-gray-600">
                <Package className="h-4 w-4" />
                <span className="text-sm font-medium">Plan</span>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {selectedPlan?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedPlan &&
                    formatCurrency(selectedPlan.amount, selectedPlan.currency)}
                  /{selectedPlan?.billing_interval}
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-start justify-between py-3 border-b border-primary-200">
              <div className="flex items-center gap-2 text-gray-600">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Payment</span>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {selectedPaymentMethod?.card_brand?.toUpperCase()} ••••{" "}
                  {selectedPaymentMethod?.card_last4}
                </p>
                <p className="text-xs text-gray-600">
                  Expires {selectedPaymentMethod?.card_exp_month}/
                  {selectedPaymentMethod?.card_exp_year}
                </p>
              </div>
            </div>

            {/* Trial Period */}
            {formData.trialPeriodDays > 0 && (
              <div className="flex items-start justify-between py-3 border-b border-primary-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Trial Period</span>
                </div>
                <p className="font-medium text-green-600">
                  {formData.trialPeriodDays} days
                </p>
              </div>
            )}

            {/* Total */}
            <div className="flex items-start justify-between py-3 bg-white rounded-lg px-4">
              <div className="flex items-center gap-2 text-gray-900">
                <DollarSign className="h-5 w-5" />
                <span className="font-semibold">
                  {formData.trialPeriodDays > 0 ? "After Trial" : "Total Due"}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {selectedPlan &&
                  formatCurrency(selectedPlan.amount, selectedPlan.currency)}
                <span className="text-sm font-normal text-gray-600">
                  /{selectedPlan?.billing_interval}
                </span>
              </p>
            </div>
          </div>

          {formData.trialPeriodDays > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-800">
                  <strong>Trial Period Active:</strong> The first payment of{" "}
                  {selectedPlan &&
                    formatCurrency(
                      selectedPlan.amount,
                      selectedPlan.currency,
                    )}{" "}
                  will be charged after {formData.trialPeriodDays} days.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-linear-to-r from-primary-600 to-primary-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Create New Subscription
              </h2>
              <p className="text-sm text-primary-100">
                Set up a recurring subscription for your customer
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Success</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    {successMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step Content */}
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading || dataLoading}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || dataLoading}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Create Subscription
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSubscriptionWizard;
