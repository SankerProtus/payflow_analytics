/**
 * PaymentMethodForm Component
 * Stripe Elements integration for secure card collection
 */

import React, { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Lock } from "lucide-react";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage";

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
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);

      // Create payment method
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: showBillingDetails ? billingDetails : undefined,
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Call success callback with payment method
      if (onSuccess) {
        await onSuccess({
          paymentMethodId: paymentMethod.id,
          customerId,
          setAsDefault,
        });
      }

      // Clear form
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
      setError(err.message);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showBillingDetails && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Billing Information
          </h3>

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
                required
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
                required
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
              required
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
                required
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
                required
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
                required
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
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Lock className="h-4 w-4" />
        <span>Secured by Stripe. Your payment information is encrypted.</span>
      </div>

      <Button
        type="submit"
        disabled={!stripe || loading}
        loading={loading}
        className="w-full"
      >
        {buttonText}
      </Button>
    </form>
  );
};

export default PaymentMethodForm;
