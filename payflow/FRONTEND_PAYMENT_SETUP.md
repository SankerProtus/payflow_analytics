# Frontend Payment Integration - Setup Guide

## Installation

1. **Install Stripe.js dependencies:**
   ```bash
   cd payflow
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

2. **Add Stripe publishable key to environment variables:**

   Create/update `payflow/.env`:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   VITE_API_URL=http://localhost:5000/api
   ```

3. **Add Billing route to your app:**

   Update `payflow/src/App.jsx` to include the billing route:
   ```jsx
   import Billing from './pages/Billing';
   
   // Add to your routes:
   <Route path="/billing" element={<Billing />} />
   ```

4. **Update sidebar navigation:**

   Add billing link to `payflow/src/components/layout/Sidebar.jsx`:
   ```jsx
   import { CreditCard } from 'lucide-react';
   
   // Add to navigation items:
   { to: "/billing", icon: CreditCard, label: "Billing" },
   ```

## Components Created

### API Clients (`src/api/`)
- ✅ `payment.api.js` - Payment methods management
- ✅ `subscription.api.js` - Subscription lifecycle
- ✅ `invoice.api.js` - Invoice operations
- ✅ `billing.api.js` - Checkout and billing portal

### React Components (`src/components/billing/`)
- ✅ `PaymentMethodForm.jsx` - Stripe Elements card form
- ✅ `PaymentMethodList.jsx` - Display saved payment methods
- ✅ `SubscriptionCard.jsx` - Subscription details and actions
- ✅ `InvoiceList.jsx` - Invoice history with download/retry

### Pages (`src/pages/`)
- ✅ `Billing.jsx` - Complete billing management interface

## Usage Examples

### Add Payment Method
```jsx
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentMethodForm from './components/billing/PaymentMethodForm';

const stripePromise = loadStripe('pk_test_...');

function MyComponent() {
  const handleSuccess = async ({ paymentMethodId, customerId, setAsDefault }) => {
    await paymentAPI.attachPaymentMethod({
      customerId,
      paymentMethodId,
      setAsDefault
    });
  };

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodForm
        customerId="customer-id"
        onSuccess={handleSuccess}
        setAsDefault={true}
      />
    </Elements>
  );
}
```

### Create Subscription
```jsx
import { subscriptionAPI } from './api/subscription.api';

const createSubscription = async () => {
  const response = await subscriptionAPI.create({
    customerId: 'customer-id',
    planId: 'plan-id',
    paymentMethodId: 'pm_xxx',
    trialPeriodDays: 14
  });
  
  console.log('Subscription:', response.data);
};
```

### List Invoices
```jsx
import InvoiceList from './components/billing/InvoiceList';

function MyInvoices() {
  return (
    <InvoiceList 
      customerId="customer-id" 
      limit={20} 
    />
  );
}
```

## Testing

Use Stripe test cards:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 9995
- **3D Secure:** 4000 0025 0000 3155

## Next Steps

1. **Get customer ID**: Implement customer context/state management
2. **Fetch actual data**: Replace mock subscriptions with real API calls
3. **Add plan selector**: Create component to choose subscription plans
4. **Implement checkout flow**: Add complete subscription purchase flow
5. **Test payment flows**: Test card collection, subscription creation, invoice payment

## Security Notes

- ✅ Never log or store raw card numbers
- ✅ Stripe.js tokenizes cards before sending to backend
- ✅ PCI compliance handled by Stripe
- ✅ Always use HTTPS in production
- ✅ Validate all inputs
