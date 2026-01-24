import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Timeline from '../components/customers/Timeline';
import StatusBadge from '../components/customers/StatusBadge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useCustomerDetail } from '../hooks/useCustomers';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customer, timeline, loading, error } = useCustomerDetail(id);

  if (loading) {
    return (
      <Layout>
        <Loader fullScreen text="Loading customer details..." />
      </Layout>
    );
  }

  if (error || !customer) {
    return (
      <Layout>
        <ErrorMessage message={error || 'Customer not found'} />
        <Button
          variant="ghost"
          onClick={() => navigate('/customers')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/customers')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>

        {/* Customer Header */}
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.name || 'Unknown Customer'}
              </h1>
              <p className="text-gray-600 mt-1">{customer.email}</p>
              <div className="flex items-center gap-3 mt-4">
                <StatusBadge status={customer.status} />
                <span className="text-sm text-gray-600">
                  Customer since {formatDate(customer.createdAt)}
                </span>
              </div>
            </div>
            {customer.stripeCustomerId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://dashboard.stripe.com/customers/${customer.stripeCustomerId}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Stripe
              </Button>
            )}
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">Current MRR</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(customer.mrr || 0)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">Lifetime Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(customer.ltv || 0)}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Payments</p>
            <p className="text-2xl font-bold text-gray-900">
              {customer.paymentCount || 0}
            </p>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Subscription Timeline
          </h2>
          <Timeline events={timeline} loading={loading} />
        </Card>
      </div>
    </Layout>
  );
};

export default CustomerDetail;