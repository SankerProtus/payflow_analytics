/**
 * SubscriptionCard Component
 * Display subscription details with management actions
 */

import { useState } from "react";
import {
  Package,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import { subscriptionAPI } from "../../api/subscription.api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";

const SubscriptionCard = ({
  subscription,
  onUpdate,
  onNavigateToPaymentMethods,
}) => {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      trialing: "bg-blue-100 text-blue-800",
      past_due: "bg-red-100 text-red-800",
      canceled: "bg-gray-100 text-gray-800",
      paused: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: CheckCircle,
      trialing: Clock,
      past_due: AlertCircle,
      canceled: XCircle,
      paused: Clock,
    };
    const Icon = icons[status] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this subscription?")) {
      return;
    }

    const cancelAtPeriodEnd = window.confirm(
      "Do you want to cancel at the end of the current billing period?\n\nClick OK to cancel at period end, or Cancel to cancel immediately.",
    );

    try {
      setLoading(true);
      setAction("cancel");
      await subscriptionAPI.cancel(subscription.id, {
        cancelAtPeriodEnd,
        cancellationReason: "Customer requested cancellation",
      });
      if (onUpdate) {
        await onUpdate();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to cancel subscription");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handlePause = async () => {
    if (!window.confirm("Are you sure you want to pause this subscription?")) {
      return;
    }

    try {
      setLoading(true);
      setAction("pause");
      await subscriptionAPI.pause(subscription.id);
      if (onUpdate) {
        await onUpdate();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to pause subscription");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      setAction("resume");
      await subscriptionAPI.resume(subscription.id);
      if (onUpdate) {
        await onUpdate();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to resume subscription");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {subscription.plan_name || "Subscription"}
              </h3>
              <p className="text-sm text-gray-600">
                {formatCurrency(subscription.amount, subscription.currency)} /{" "}
                {subscription.billing_interval}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}
          >
            {getStatusIcon(subscription.status)}
            <span className="capitalize">
              {subscription.status.replace("_", " ")}
            </span>
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-600">Current Period</p>
              <p className="font-medium text-gray-900">
                {formatDate(subscription.current_period_start)} -{" "}
                {formatDate(subscription.current_period_end)}
              </p>
            </div>
          </div>

          {subscription.trial_end &&
            new Date(subscription.trial_end) > new Date() && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-gray-600">Trial Ends</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(subscription.trial_end)}
                  </p>
                </div>
              </div>
            )}

          {subscription.cancel_at_period_end && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <p className="text-orange-600 font-medium">
                Cancels on {formatDate(subscription.current_period_end)}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
          {subscription.status === "active" &&
            !subscription.cancel_at_period_end && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePause}
                  disabled={loading}
                  loading={loading && action === "pause"}
                >
                  Pause
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={loading}
                  loading={loading && action === "cancel"}
                  className="text-red-600 hover:bg-red-50 border-red-200"
                >
                  Cancel
                </Button>
              </>
            )}

          {subscription.status === "paused" && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleResume}
              disabled={loading}
              loading={loading && action === "resume"}
            >
              Resume Subscription
            </Button>
          )}

          {subscription.status === "past_due" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onNavigateToPaymentMethods) {
                  onNavigateToPaymentMethods();
                }
              }}
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Update Payment Method
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SubscriptionCard;
