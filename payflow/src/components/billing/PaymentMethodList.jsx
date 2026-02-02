/**
 * PaymentMethodList Component
 * Display and manage saved payment methods
 */

import React, { useState, useEffect } from "react";
import { CreditCard, Trash2, Check, AlertCircle } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import Loader from "../common/Loader";
import ErrorMessage from "../common/ErrorMessage";
import { paymentAPI } from "../../api/payment.api";

const PaymentMethodList = ({ customerId, onUpdate }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (customerId) {
      fetchPaymentMethods();
    }
  }, [customerId]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentAPI.listPaymentMethods(customerId);
      setPaymentMethods(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentMethodId) => {
    if (
      !window.confirm("Are you sure you want to remove this payment method?")
    ) {
      return;
    }

    try {
      setDeletingId(paymentMethodId);
      await paymentAPI.detachPaymentMethod(paymentMethodId);
      setPaymentMethods((prev) =>
        prev.filter((pm) => pm.id !== paymentMethodId),
      );
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove payment method");
    } finally {
      setDeletingId(null);
    }
  };

  const getCardBrandIcon = (brand) => {
    const brandLogos = {
      visa: "💳",
      mastercard: "💳",
      amex: "💳",
      discover: "💳",
    };
    return brandLogos[brand?.toLowerCase()] || "💳";
  };

  if (loading) {
    return <Loader text="Loading payment methods..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchPaymentMethods} />;
  }

  if (paymentMethods.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No payment methods saved</p>
          <p className="text-sm text-gray-500 mt-1">
            Add a payment method to get started
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {paymentMethods.map((pm) => (
        <Card key={pm.id} className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                  {pm.type === "card" ? getCardBrandIcon(pm.card_brand) : "🏦"}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 capitalize">
                    {pm.type === "card"
                      ? `${pm.card_brand || "Card"} ****${pm.card_last4}`
                      : `${pm.bank_name || "Bank"} ****${pm.bank_last4}`}
                  </p>
                  {pm.is_default && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      <Check className="h-3 w-3" />
                      Default
                    </span>
                  )}
                </div>

                {pm.type === "card" &&
                  pm.card_exp_month &&
                  pm.card_exp_year && (
                    <p className="text-sm text-gray-600">
                      Expires {pm.card_exp_month.toString().padStart(2, "0")}/
                      {pm.card_exp_year}
                    </p>
                  )}

                {pm.billing_name && (
                  <p className="text-sm text-gray-500">{pm.billing_name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pm.requires_3ds && (
                <span className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  3DS Required
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(pm.id)}
                disabled={deletingId === pm.id}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {deletingId === pm.id ? (
                  <Loader size="sm" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PaymentMethodList;
