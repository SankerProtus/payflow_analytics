import React, { useState, useRef, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Lock, WifiOff } from "lucide-react";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage";
import { paymentAPI } from "../../api/payment.api";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      "::placeholder": {
        color: "#9ca3af",
      },
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
  },
  hidePostalCode: false,
};

const PaymentMethodForm = ({
  onSuccess,
  onError,
  customerId,
  setAsDefault = true,
  buttonText = "Add Payment Method",
  showBillingDetails = true,
  inline = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  // CRITICAL: Use refs to prevent stale closures in async handlers
  // Initialize with current values immediately to avoid race conditions
  const stripeRef = useRef(stripe);
  const elementsRef = useRef(elements);

  // CRITICAL: Update refs synchronously on every render
  // This ensures refs are always current, even before useEffect runs
  stripeRef.current = stripe;
  elementsRef.current = elements;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardReady, setCardReady] = useState(false);
  const isMounted = useRef(true);
  const cardElementInstanceRef = useRef(null);

  const [billingDetails, setBillingDetails] = useState({
    name: "",
    email: "",
    address: {
      line1: "",
      city: "",
      state: "",
      postal_code: "",
      country: "US",
    },
  });

  useEffect(() => {
    isMounted.current = true;

    // CRITICAL: Reset cardReady on mount to handle StrictMode double-mount
    setCardReady(false);
    setError(null);
    cardElementInstanceRef.current = null;

    return () => {
      isMounted.current = false;
      setCardReady(false);
      cardElementInstanceRef.current = null;
    };
  }, []);

  const handleCardReady = () => {
    // CRITICAL: Store the actual element instance that just became ready
    // This prevents accessing a destroyed element instance
    if (isMounted.current && elementsRef.current) {
      const cardElement = elementsRef.current.getElement(CardElement);

      if (cardElement) {
        cardElementInstanceRef.current = cardElement;
        setCardReady(true);
        setError(null);
      }
    }
  };

  const handleCardChange = (event) => {
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  const isNetworkError = (error) => {
    const errorMessage = error?.message?.toLowerCase() || "";
    const errorType = error?.type || "";

    return (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("internet") ||
      errorMessage.includes("disconnected") ||
      errorMessage.includes("connection") ||
      errorType === "validation_error" ||
      errorMessage.includes("could not retrieve data")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripeRef.current || !elementsRef.current) {
      setError("Stripe is still loading. Please wait a moment and try again.");
      return;
    }

    if (!cardReady) {
      setError("Card element is still loading. Please wait a moment.");
      return;
    }

    if (!cardElementInstanceRef.current) {
      setError("Card element is not ready. Please try again.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // DEFENSE LAYER 4: Verify element still exists at submission time
      // Use fresh retrieval as final check (race condition protection)
      const cardElement = elementsRef.current.getElement(CardElement);

      if (!cardElement) {
        throw new Error(
          "Card element is no longer available. Please try again.",
        );
      }

      // DEFENSE LAYER 5: Ensure we're using the same instance
      if (cardElement !== cardElementInstanceRef.current) {
        throw new Error(
          "Card element instance changed. Please refresh and try again.",
        );
      }

      const { error: stripeError, paymentMethod } =
        await stripeRef.current.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: showBillingDetails ? billingDetails : undefined,
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      await paymentAPI.attachPaymentMethod({
        customerId,
        paymentMethodId: paymentMethod.id,
        setAsDefault,
      });

      if (onSuccess) {
        await onSuccess({
          paymentMethodId: paymentMethod.id,
          customerId,
          setAsDefault,
        });
      }

      cardElement.clear();

      if (showBillingDetails) {
        setBillingDetails({
          name: "",
          email: "",
          address: {
            line1: "",
            city: "",
            state: "",
            postal_code: "",
            country: "US",
          },
        });
      }
    } catch (err) {
      let errorMessage =
        err.message || "An error occurred while adding the payment method";

      if (isNetworkError(err)) {
        errorMessage =
          "Unable to connect to Stripe's servers. Please check: (1) Your internet connection is stable, (2) Firewall/VPN isn't blocking r.stripe.com or js.stripe.com, (3) Ad blocker or security software isn't interfering with Stripe.";
      }

      setError(errorMessage);

      if (onError) {
        onError(err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleBillingChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setBillingDetails((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setBillingDetails((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const FormContent = () => (
    <>
      {showBillingDetails && (
        <div className="space-y-4">
          {!inline && (
            <h3 className="text-lg font-semibold text-gray-900">
              Billing Information
            </h3>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={billingDetails.name}
                onChange={(e) => handleBillingChange("name", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
                required={!inline}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={billingDetails.email}
                onChange={(e) => handleBillingChange("email", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@example.com"
                required={!inline}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={billingDetails.address.line1}
              onChange={(e) =>
                handleBillingChange("address.line1", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123 Main St"
              required={!inline}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={billingDetails.address.city}
                onChange={(e) =>
                  handleBillingChange("address.city", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="New York"
                required={!inline}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={billingDetails.address.state}
                onChange={(e) =>
                  handleBillingChange("address.state", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="NY"
                maxLength="2"
                required={!inline}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={billingDetails.address.postal_code}
                onChange={(e) =>
                  handleBillingChange("address.postal_code", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10001"
                required={!inline}
              />
            </div>
          </div>
        </div>
      )}

      {/* Network/Stripe loading warning */}
      {!stripe && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <WifiOff className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              Connecting to Stripe...
            </h3>
            <p className="text-xs text-amber-700 mt-1">
              If this takes too long, please check your internet connection or
              disable any VPN/ad blockers that might block Stripe services.
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <CreditCard className="h-4 w-4" />
          Card Information
        </label>
        <div className="p-4 border border-gray-300 rounded-lg bg-white">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onReady={handleCardReady}
            onChange={handleCardChange}
          />
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Lock className="h-4 w-4" />
        <span>Secured by Stripe. Your payment information is encrypted.</span>
      </div>

      <Button
        type={inline ? "button" : "submit"}
        onClick={inline ? handleSubmit : undefined}
        disabled={!stripe || !cardReady || loading}
        loading={loading}
        className="w-full"
      >
        {!stripe || !cardReady ? "Loading..." : buttonText}
      </Button>
    </>
  );

  const Wrapper = inline ? "div" : "form";

  return (
    <Wrapper
      {...(!inline && { onSubmit: handleSubmit })}
      className={inline ? "space-y-4" : "space-y-6"}
    >
      <FormContent />
    </Wrapper>
  );
};

export default PaymentMethodForm;
