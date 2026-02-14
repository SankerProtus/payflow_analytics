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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardReady, setCardReady] = useState(false);
  const cardElementRef = useRef(null);
  const isReadyFired = useRef(false);
  const isMounted = useRef(true);
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

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      isReadyFired.current = false;
      cardElementRef.current = null;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("PaymentMethodForm: handleSubmit called", {
      stripe: !!stripe,
      elements: !!elements,
      cardReady,
    });

    if (!stripe || !elements) {
      setError("Stripe is still loading. Please wait a moment and try again.");
      return;
    }

    if (!cardReady) {
      setError("Card element is still loading. Please wait a moment.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the card element from the Elements context
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error(
          "Card element not found. Please refresh the page and try again.",
        );
      }

      console.log("Card element found, creating payment method...");

      // Add a small delay to ensure the element is fully ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: showBillingDetails ? billingDetails : undefined,
        });

      if (stripeError) {
        console.error("Stripe error:", stripeError);
        throw new Error(stripeError.message);
      }

      console.log("Payment method created:", paymentMethod.id);
      console.log("Attaching to customer:", customerId);

      await paymentAPI.attachPaymentMethod({
        customerId,
        paymentMethodId: paymentMethod.id,
        setAsDefault,
      });

      console.log("Payment method attached successfully");

      if (onSuccess) {
        await onSuccess({
          paymentMethodId: paymentMethod.id,
          customerId,
          setAsDefault,
        });
      }

      // Clear the card element
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
      setError(
        err.message || "An error occurred while adding the payment method",
      );
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
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

  // Memoized handlers to prevent unnecessary re-renders
  const handleCardReady = useCallback(() => {
    // Prevent multiple ready events from firing
    if (isReadyFired.current) {
      return;
    }

    isReadyFired.current = true;
    console.log("PaymentMethodForm: CardElement ready event fired");

    // Store the element reference when ready
    if (elements) {
      const cardElement = elements.getElement(CardElement);
      if (cardElement) {
        cardElementRef.current = cardElement;
        console.log("PaymentMethodForm: CardElement reference stored");
      }
    }

    // Delay to ensure DOM is fully updated and element is ready
    setTimeout(() => {
      if (isMounted.current) {
        setCardReady(true);
        setError(null);
      }
    }, 200);
  }, [elements]);

  const handleCardChange = useCallback((event) => {
    if (event.error) {
      setError(event.error.message);
    } else if (event.complete) {
      setError(null);
    }
  }, []);

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
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
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
