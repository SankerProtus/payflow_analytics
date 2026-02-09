# PayFlow Payment System - Implementation Guide

## Overview

This document provides comprehensive documentation for the production-grade payment system integrated into PayFlow Analytics. The system uses Stripe as the payment processor and implements industry best practices for security, compliance, and reliability.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Webhook Integration](#webhook-integration)
6. [Payment Flows](#payment-flows)
7. [Security & Compliance](#security--compliance)
8. [Testing](#testing)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- PostgreSQL 14+ database
- Node.js 18+ runtime
- Stripe account (test and production)
- SSL certificate for production webhooks

### Installation Steps

1. **Run Database Migration**

   ```bash
   psql -U your_user -d your_database -f PFA/src/db/migrations/001_payment_system_schema.sql
   ```

2. **Configure Environment Variables**

   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # Database Encryption
   DB_ENCRYPTION_KEY=your_strong_encryption_key

   # Frontend URL
   FRONTEND_URL=http://localhost:5173

   # Payment Configuration
   PAYMENT_RETURN_URL=http://localhost:5173/payment/confirm
   ```

3. **Start the Server**
   ```bash
   cd PFA
   npm install
   npm run dev
   ```

---

## Environment Setup

### Stripe Account Configuration

#### Test Mode Setup

1. Log in to Stripe Dashboard → Developers → API Keys
2. Copy **Publishable key** (starts with `pk_test_`)
3. Copy **Secret key** (starts with `sk_test_`)
4. Store in `.env` file

#### Webhook Configuration

1. Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for (or select "all events")
5. Copy **Signing secret** (starts with `whsec_`)

#### Production Mode

- Complete business verification
- Enable payment methods (cards, ACH, etc.)
- Configure tax settings
- Set up payout schedule
- Enable Radar (fraud detection)

### Security Best Practices

1. **API Key Storage**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly (quarterly recommended)
   - Store user-specific keys encrypted in database

2. **Webhook Security**
   - Always verify webhook signatures
   - Use HTTPS endpoints only
   - Implement replay attack protection (idempotency)
   - Rate limit webhook endpoints

3. **PCI Compliance**
   - Never store raw card numbers
   - Use Stripe's tokenization (Elements/Payment Intents)
   - Implement TLS 1.2+ for all connections
   - Regular security audits

---

## Database Schema

### Core Tables

#### `payment_methods`

Stores tokenized payment methods (cards, ACH).

**Key Columns:**

- `stripe_payment_method_id`: Stripe PM token
- `type`: card, ach_debit, etc.
- `card_last4`, `card_exp_month`, `card_exp_year`
- `is_default`: Default payment method flag
- `deleted_at`: Soft delete timestamp

#### `subscriptions`

Subscription lifecycle and status.

**Key Columns:**

- `stripe_subscription_id`: Stripe subscription ID
- `status`: trialing, active, past_due, canceled, paused
- `current_period_start/end`: Billing period
- `cancel_at_period_end`: Cancellation flag
- `plan_id`: Reference to subscription_plans

#### `invoices`

Generated invoices and payment history.

**Key Columns:**

- `stripe_invoice_id`: Stripe invoice ID
- `status`: draft, open, paid, void, uncollectible
- `amount_due`, `amount_paid`, `amount_remaining`
- `retry_count`: Failed payment retry attempts
- `next_retry_at`: Next scheduled retry

#### `transactions`

Complete payment audit trail.

**Key Columns:**

- `stripe_payment_intent_id`: Stripe PI ID
- `type`: payment, refund, dispute, adjustment
- `status`: pending, succeeded, failed
- `failure_code`, `failure_message`: Error details
- `risk_score`: Fraud risk (0-100)

#### `payment_events`

Detailed event log for debugging.

**Key Columns:**

- `event_type`: Descriptive event name
- `severity`: info, warning, error, critical
- `source`: api, webhook, system, admin
- `event_data`: JSONB with full context

### Views

#### `v_active_subscriptions`

All active/trialing subscriptions with customer details.

#### `v_failed_payments_dunning`

Failed payments requiring attention (dunning).

#### `v_revenue_metrics`

Monthly revenue aggregations for analytics.

---

## API Endpoints

### Payment Methods

#### Create Setup Intent

```http
POST /api/billing/setup-intent
Authorization: Bearer <token>

{
  "customerId": "uuid",
  "paymentMethodTypes": ["card", "ach_debit"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "clientSecret": "seti_xxx_secret_xxx",
    "setupIntentId": "seti_xxx"
  }
}
```

#### Attach Payment Method

```http
POST /api/billing/payment-methods/attach
Authorization: Bearer <token>

{
  "customerId": "uuid",
  "paymentMethodId": "pm_xxx",
  "setAsDefault": true
}
```

### Subscriptions

#### Create Subscription

```http
POST /api/billing/subscriptions/create
Authorization: Bearer <token>

{
  "customerId": "uuid",
  "planId": "uuid",
  "paymentMethodId": "pm_xxx",
  "trialPeriodDays": 14,
  "couponId": "DISCOUNT20",
  "metadata": {
    "source": "signup_form"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "subscriptionId": "uuid",
    "stripeSubscriptionId": "sub_xxx",
    "status": "trialing",
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

#### Update Subscription (Change Plan)

```http
PATCH /api/billing/subscriptions/:subscriptionId/update
Authorization: Bearer <token>

{
  "newPlanId": "uuid",
  "prorationBehavior": "create_prorations",
  "billingCycleAnchor": "unchanged"
}
```

#### Cancel Subscription

```http
POST /api/billing/subscriptions/:subscriptionId/cancel
Authorization: Bearer <token>

{
  "cancelAtPeriodEnd": true,
  "cancellationReason": "Too expensive"
}
```

#### Pause Subscription

```http
POST /api/billing/subscriptions/:subscriptionId/pause
Authorization: Bearer <token>

{
  "resumeAt": "2024-06-01T00:00:00Z"
}
```

### Invoices

#### Get Invoice

```http
GET /api/billing/invoices/:invoiceId
Authorization: Bearer <token>
```

#### Retry Failed Payment

```http
POST /api/billing/invoices/:invoiceId/pay
Authorization: Bearer <token>

{
  "paymentMethodId": "pm_xxx"  // Optional: use new payment method
}
```

#### List Customer Invoices

```http
GET /api/billing/invoices/customer/:customerId?limit=50&status=paid
Authorization: Bearer <token>
```

### One-Time Payments

#### Create Payment Intent

```http
POST /api/billing/payment-intent
Authorization: Bearer <token>

{
  "customerId": "uuid",
  "amount": 5000,  // Amount in cents
  "currency": "usd",
  "paymentMethodId": "pm_xxx",
  "description": "One-time charge for premium feature",
  "confirmImmediately": true
}
```

---

## Webhook Integration

### Supported Events

The system handles the following Stripe webhook events:

**Subscription Lifecycle:**

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`

**Payment Events:**

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.succeeded`
- `charge.failed`

**Invoice Events:**

- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`

**Dispute Events:**

- `charge.dispute.created`

### Webhook Endpoint

```http
POST /api/webhooks/stripe
Stripe-Signature: t=xxx,v1=xxx
Content-Type: application/json

{
  "id": "evt_xxx",
  "object": "event",
  "type": "invoice.payment_failed",
  "data": { ... }
}
```

### Webhook Processing Flow

1. **Signature Verification**: Validate using `STRIPE_WEBHOOK_SECRET`
2. **Idempotency Check**: Ensure event hasn't been processed
3. **Store Event**: Save to `stripe_events` table
4. **Process Asynchronously**: Handle event logic
5. **Mark Complete**: Update `processed_at` timestamp
6. **Quick Response**: Return 200 within 10 seconds

### Testing Webhooks Locally

Using Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger invoice.payment_failed
```

---

## Payment Flows

### 1. New Subscription Flow

```
User → Create Customer → Collect Payment Method → Create Subscription → Confirm Payment → Provision Service
```

**Implementation:**

```javascript
// 1. Create customer (if not exists)
const customer = await stripeService.createCustomer({
  userId,
  email: "user@example.com",
  name: "John Doe",
});

// 2. Create setup intent (frontend collects PM)
const setupIntent = await stripeService.createSetupIntent({
  userId,
  customerId: customer.id,
});

// 3. Frontend uses Stripe.js to confirm
// stripe.confirmCardSetup(clientSecret, {...})

// 4. Attach payment method
await stripeService.attachPaymentMethod({
  userId,
  customerId: customer.id,
  paymentMethodId: "pm_xxx",
  setAsDefault: true,
});

// 5. Create subscription
const subscription = await stripeService.createSubscription({
  userId,
  customerId: customer.id,
  planId: "plan-uuid",
  paymentMethodId: "pm_xxx",
  trialPeriodDays: 14,
});
```

### 2. Failed Payment Recovery (Dunning)

```
Payment Fails → Update Status → Send Email → Schedule Retry (3 days) → Retry Payment → Success/Fail
```

**Automatic Retry Schedule:**

- Attempt 1: Immediate
- Attempt 2: +3 days
- Attempt 3: +5 days (8 days total)
- Attempt 4: +7 days (15 days total)
- Attempt 5: +14 days (29 days total)
- Final: Suspend service

**Customer Communications:**

- Immediate email on first failure
- Reminder 1 day before each retry
- Grace period notification
- Final notice before suspension

### 3. Plan Upgrade/Downgrade

```
Select New Plan → Calculate Proration → Preview Invoice → Confirm Change → Apply Immediately or at Period End
```

**Proration Behavior:**

- **Upgrade**: Immediate, prorated charge for remaining period
- **Downgrade**: At period end (default), no immediate charge
- **Custom**: Can force immediate with proration

---

## Security & Compliance

### PCI DSS Compliance

✅ **Never store raw card data**

- Use Stripe Elements for card collection
- Stripe handles PCI compliance
- Only store tokenized payment method IDs

✅ **Secure transmission**

- TLS 1.2+ for all connections
- HTTPS required for webhooks
- Encrypted database fields

✅ **Access control**

- API authentication required
- User-scoped payment methods
- Admin approval for refunds

### GDPR Compliance

- **Right to Access**: Export customer payment data
- **Right to Deletion**: Soft delete payment methods, retain financial records
- **Data Minimization**: Only store necessary payment data
- **Consent**: Explicit consent for payment processing

### Fraud Prevention

- Stripe Radar integration
- Velocity limits (max transactions per period)
- 3D Secure for high-risk payments
- Device fingerprinting
- Suspicious activity monitoring

---

## Testing

### Test Cards

Use these cards in test mode:

| Card Number         | Description                   |
| ------------------- | ----------------------------- |
| 4242 4242 4242 4242 | Successful payment            |
| 4000 0025 0000 3155 | Requires 3D Secure            |
| 4000 0000 0000 9995 | Declined (insufficient funds) |
| 4000 0000 0000 9987 | Declined (lost card)          |
| 4000 0000 0000 0002 | Declined (generic)            |
| 4000 0082 6000 0000 | Dispute (fraudulent)          |

**Expiration:** Any future date (e.g., 12/25)
**CVC:** Any 3 digits (e.g., 123)
**ZIP:** Any 5 digits (e.g., 12345)

### Test Scenarios

1. **Successful Subscription**
   - Use 4242 4242 4242 4242
   - Verify subscription created
   - Check email received

2. **Failed Payment**
   - Use 4000 0000 0000 9995
   - Verify dunning scheduled
   - Check failure email sent

3. **3D Secure**
   - Use 4000 0025 0000 3155
   - Complete authentication flow
   - Verify payment succeeded

4. **Webhook Processing**
   - Trigger events using Stripe CLI
   - Verify database updates
   - Check event processed flag

---

## Monitoring & Logging

### Key Metrics to Track

**Payment Success Rate**

```sql
SELECT
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM transactions
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND type = 'payment';
```

**Failed Payments by Reason**

```sql
SELECT failure_code, COUNT(*) as count
FROM transactions
WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY failure_code
ORDER BY count DESC;
```

**Dunning Recovery Rate**

```sql
SELECT
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) * 100.0 / COUNT(*) as recovery_rate
FROM dunning_attempts
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### Alerts to Configure

- Failed payment rate > 5%
- Webhook processing errors
- Dispute created
- High-value payment failed
- Subscription churn spike

### Log Levels

- **INFO**: Successful operations
- **WARNING**: Retry attempts, minor issues
- **ERROR**: Payment failures, validation errors
- **CRITICAL**: Webhook verification failed, dispute created

---

## Troubleshooting

### Common Issues

**Problem**: Webhook signature verification failing

**Solution**:

- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check that request body is raw (not parsed)
- Ensure using correct webhook secret (test vs production)

**Problem**: Payments failing with "Customer not found"

**Solution**:

- Verify customer exists in both Stripe and database
- Check `stripe_customer_id` matches
- Ensure using correct API key (test vs production)

**Problem**: Subscription not updating after webhook

**Solution**:

- Check `stripe_events` table for processing errors
- Verify event contains `internal_customer_id` metadata
- Check database logs for constraint violations

**Problem**: Dunning emails not sending

**Solution**:

- Verify email service configured correctly
- Check `dunning_attempts` table for scheduled retries
- Review email service logs

### Debug Tools

**View recent payment events:**

```sql
SELECT * FROM payment_events
WHERE severity IN ('error', 'critical')
ORDER BY created_at DESC
LIMIT 50;
```

**Check unprocessed webhooks:**

```sql
SELECT * FROM stripe_events
WHERE processed_at IS NULL
ORDER BY created_at ASC;
```

**Find stuck subscriptions:**

```sql
SELECT s.*, c.email
FROM subscriptions s
JOIN customers c ON s.customer_id = c.id
WHERE s.status = 'past_due'
  AND s.updated_at < NOW() - INTERVAL '7 days';
```

---

## Production Checklist

Before going live:

- [ ] Switch to production Stripe keys
- [ ] Update webhook endpoint to production URL
- [ ] Enable HTTPS/SSL certificate
- [ ] Configure production database
- [ ] Set up monitoring and alerts
- [ ] Test all payment flows end-to-end
- [ ] Configure email service (production credentials)
- [ ] Review and adjust dunning schedule
- [ ] Set up automated backups
- [ ] Document incident response procedures
- [ ] Train support team on payment issues
- [ ] Prepare customer communication templates

---

## Support

For questions or issues:

- Check this documentation first
- Review Stripe Dashboard → Logs
- Check application logs
- Contact development team

## License

Proprietary - PayFlow Analytics
