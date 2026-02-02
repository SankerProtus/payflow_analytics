/**
 * InvoiceList Component
 * Display customer invoices with download and retry options
 */

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import Loader from "../common/Loader";
import ErrorMessage from "../common/ErrorMessage";
import { invoiceAPI } from "../../api/invoice.api";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";

const InvoiceList = ({ customerId, limit = 10 }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit };
      if (filter !== "all") {
        params.status = filter;
      }
      const response = await invoiceAPI.listByCustomer(customerId, params);
      setInvoices(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [customerId, filter, limit]);

  useEffect(() => {
    if (customerId) {
      fetchInvoices();
    }
  }, [customerId, fetchInvoices]);

  const handleRetry = async (invoiceId) => {
    try {
      setRetryingId(invoiceId);
      await invoiceAPI.retryPayment(invoiceId);
      await fetchInvoices();
      alert("Payment retry initiated successfully");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to retry payment");
    } finally {
      setRetryingId(null);
    }
  };

  const handleDownload = async (invoiceId) => {
    try {
      const response = await invoiceAPI.downloadPDF(invoiceId);
      // PDF download is handled by redirect in the API
      window.open(response.data, "_blank");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to download invoice");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        text: "Paid",
      },
      open: { color: "bg-blue-100 text-blue-800", icon: Clock, text: "Open" },
      draft: {
        color: "bg-gray-100 text-gray-800",
        icon: FileText,
        text: "Draft",
      },
      void: {
        color: "bg-gray-100 text-gray-800",
        icon: AlertCircle,
        text: "Void",
      },
      uncollectible: {
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
        text: "Uncollectible",
      },
    };
    const badge = badges[status] || badges.open;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
      >
        <Icon className="h-3 w-3" />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return <Loader text="Loading invoices..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchInvoices} />;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        {["all", "paid", "open", "draft"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filter === status
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No invoices found</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">
                        {invoice.invoice_number ||
                          `Invoice #${invoice.id.slice(0, 8)}`}
                      </p>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDate(invoice.created_at)}
                      {invoice.paid_at &&
                        ` • Paid ${formatDate(invoice.paid_at)}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(invoice.amount_due, invoice.currency)}
                    </p>
                    {invoice.amount_paid > 0 &&
                      invoice.amount_paid < invoice.amount_due && (
                        <p className="text-sm text-gray-600">
                          Paid:{" "}
                          {formatCurrency(
                            invoice.amount_paid,
                            invoice.currency,
                          )}
                        </p>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {invoice.invoice_pdf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(invoice.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}

                  {invoice.status === "open" && invoice.payment_failed_at && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRetry(invoice.id)}
                      disabled={retryingId === invoice.id}
                      loading={retryingId === invoice.id}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry Payment
                    </Button>
                  )}
                </div>
              </div>

              {invoice.payment_failed_at && (
                <div className="mt-3 pt-3 border-t border-red-200 bg-red-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      Payment failed{" "}
                      {invoice.retry_count > 0 &&
                        `(${invoice.retry_count} retries)`}
                      {invoice.last_finalization_error &&
                        `: ${invoice.last_finalization_error}`}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
