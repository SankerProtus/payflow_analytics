import React, { useState, useCallback, useRef, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Lock } from "lucide-react";
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

  // Proper lifecycle management
  useEffect(() => {
    isMounted.current = true;

    // CRITICAL: Reset cardReady on mount to handle StrictMode double-mount
    setCardReady(false);
    setError(null);
    cardElementInstanceRef.current = null;

    return () => {
      // Cleanup on unmount
      isMounted.current = false;
      setCardReady(false);
      cardElementInstanceRef.current = null;
    };
  }, []);

  const handleCardReady = useCallback(() => {
    // CRITICAL: Store the actual element instance that just became ready
    // This prevents accessing a destroyed element instance
    if (isMounted.current && elementsRef.current) {
      // Verify we can actually get the element
      const cardElement = elementsRef.current.getElement(CardElement);

      if (cardElement) {
        cardElementInstanceRef.current = cardElement;
        setCardReady(true);
        setError(null);
      }
    }
  }, []);

  const handleCardChange = useCallback((event) => {
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // DEFENSE LAYER 1: Validate Stripe SDK is loaded
    if (!stripeRef.current || !elementsRef.current) {
      console.error("[Submit] ❌ Stripe/Elements not loaded");
      setError("Stripe is still loading. Please wait a moment and try again.");
      return;
    }

    // DEFENSE LAYER 2: Validate card element fired ready event
    if (!cardReady) {
      console.error("[Submit] ❌ Card not ready");
      setError("Card element is still loading. Please wait a moment.");
      return;
    }

    // DEFENSE LAYER 3: Validate we have the actual element instance
    if (!cardElementInstanceRef.current) {
      console.error("[Submit] ❌ No stored instance");
      setError("Card element is not ready. Please try again.");
      return;
    }

    // Prevent double submission
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // DEFENSE LAYER 4: Verify element still exists at submission time
      // Use fresh retrieval as final check (race condition protection)
      const cardElement = elementsRef.current.getElement(CardElement);

      if (!cardElement) {
        // Element was unmounted between ready and submit
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

      // Create payment method with Stripe using ref (prevents stale closure)
      const { error: stripeError, paymentMethod } =
        await stripeRef.current.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: showBillingDetails ? billingDetails : undefined,
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Attach payment method to customer
      await paymentAPI.attachPaymentMethod({
        customerId,
        paymentMethodId: paymentMethod.id,
        setAsDefault,
      });

      // Success callback
      if (onSuccess) {
        await onSuccess({
          paymentMethodId: paymentMethod.id,
          customerId,
          setAsDefault,
        });
      }

      // Clear the form
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
      console.error("PaymentMethodForm error:", err);
      const errorMessage =
        err.message || "An error occurred while adding the payment method";
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
