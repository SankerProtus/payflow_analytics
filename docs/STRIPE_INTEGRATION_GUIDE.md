# Stripe Integration Guide

## ✅ Good News: Your Stripe Account is Already Connected!

Your PayFlow application is already configured with **Stripe Test Mode** API keys. You can start using it right away!

## 📋 Current Configuration

### Backend (PFA/.env)

```env
STRIPE_PUBLISHABLE_KEY=pk_test_51SqB0sGnDk8OwYw5...
STRIPE_SECRET_KEY=sk_test_51SqB0sGnDk8OwYw5...
```

### Frontend (payflow/.env)

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SqB0sGnDk8OwYw5...
```

## 🎯 How to Create Real Customers in Your App

### Method 1: Through PayFlow Application (Easiest!)

1. Start your application: `npm run dev` in both `/payflow` and `/PFA` directories
2. Navigate to **Customers** page
3. Click the "**Add Customer**" button
4. Fill in customer details:
   - **Name:** Customer's full name (optional)
   - **Email:** Customer's email address (required)
5. Click "**Add Customer**" to save
6. **The customer is created IMMEDIATELY in both:**
   - ✅ Your PayFlow database
   - ✅ Your Stripe account (test mode)

You can verify by checking [Stripe Dashboard → Customers](https://dashboard.stripe.com/test/customers)

**Note:** If Stripe API is temporarily unavailable, the customer will be created in your database with a "pending" status and can be synced to Stripe later.

### Method 2: Through Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/customers)
2. Click "**+ Add customer**"
3. Fill in customer details (name, email, payment method)
4. **Note:** The customer exists in Stripe but won't automatically appear in PayFlow database unless you manually import them or use webhooks

### Method 3: Through API (Advanced)

Customers are automatically created in Stripe when you:

- Create subscriptions
- Process payments
- Add payment methods

## 🧪 Testing with Stripe Test Mode

### Test Credit Cards

Use these cards in **Test Mode** (they won't charge real money):

| Card Number           | Type | Scenario                             |
| --------------------- | ---- | ------------------------------------ |
| `4242 4242 4242 4242` | Visa | ✅ Successful payment                |
| `4000 0000 0000 9995` | Visa | ❌ Declined (insufficient funds)     |
| `4000 0000 0000 0069` | Visa | ❌ Declined (expired card)           |
| `4000 0025 0000 3155` | Visa | ✅ Requires 3D Secure authentication |

**Test Details:**

- **CVC:** Any 3 digits (e.g., `123`)
- **Expiry:** Any future date (e.g., `12/28`)
- **ZIP:** Any 5 digits (e.g., `12345`)

More test cards: [Stripe Testing Docs](https://stripe.com/docs/testing)

## 🔄 Replace Demo Data with Real Stripe Customers

### Step 1: Clear Demo Data (Optional)

If you want to remove the sample customers:

```sql
-- Connect to your database
psql -U postgres -d payflow_analytics

-- Delete sample data
DELETE FROM invoices;
DELETE FROM subscriptions;
DELETE FROM customers WHERE stripe_customer_id LIKE 'cus_tech_%'
   OR stripe_customer_id LIKE 'cus_edu_%'
   OR stripe_customer_id LIKE 'cus_fit_%';
```

### Step 2: Sync Stripe Customers to Your Database

Create a sync script or use the Stripe API to import existing customers:

```javascript
// Example: Sync existing Stripe customers to your database
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

async function syncStripeCustomers() {
  const customers = await stripe.customers.list({ limit: 100 });

  for (const customer of customers.data) {
    // Insert into your database
    await db.query(
      `
      INSERT INTO customers (user_id, stripe_customer_id, email, name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (stripe_customer_id) DO UPDATE
      SET email = $3, name = $4, updated_at = NOW()
    `,
      [userId, customer.id, customer.email, customer.name],
    );
  }
}
```

## 📊 Using Stripe Webhooks

Webhooks keep your database in sync with Stripe events:

### Step 1: Set Up Webhook Endpoint

Your app already has a webhook handler at:

```
POST http://localhost:5000/api/webhooks
```

### Step 2: Configure in Stripe Dashboard

1. Go to [Stripe Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "**+ Add endpoint**"
3. Enter your webhook URL:
   - **Test Mode:** `http://localhost:5000/api/webhooks` (use ngrok for local testing)
   - **Production:** `https://your-domain.com/api/webhooks`
4. Select events to listen to:
   - `customer.created`
   - `customer.updated`
   - `customer.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.deleted`

### Step 3: Update Webhook Secret

Copy the webhook signing secret and add to `PFA/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 🔐 Moving to Production (Live Mode)

### When You're Ready for Real Payments:

1. **Activate Your Stripe Account**
   - Complete business verification in Stripe Dashboard
   - Add bank account for payouts
   - Review compliance requirements

2. **Get Live API Keys**
   - Go to Developers → API keys
   - Switch from "Test mode" to "Live mode"
   - Copy your **live keys**:
     - `pk_live_...` (Publishable)
     - `sk_live_...` (Secret)

3. **Update Environment Variables**

   **Backend (PFA/.env):**

   ```env
   NODE_ENV=production
   STRIPE_SECRET_KEY=sk_live_your_actual_live_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_key
   ```

   **Frontend (payflow/.env):**

   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_key
   ```

4. **Update Webhook Endpoint**
   - Create new webhook for live mode
   - Use production URL
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook secret

5. **Restart Your Application**

   ```bash
   # Backend
   cd PFA
   npm run start

   # Frontend
   cd payflow
   npm run build
   npm run preview
   ```

## 🚀 Quick Start: Testing Your Integration

### 1. Start Your Application

```bash
# Terminal 1 - Backend
cd PFA
npm run dev

# Terminal 2 - Frontend
cd payflow
npm run dev
```

### 2. Access the Application

Open: http://localhost:5173

### 3. Create a Test Customer

- Go to Customers page
- Add a new customer
- Add a payment method using test card: `4242 4242 4242 4242`

### 4. Verify in Stripe Dashboard

- Go to [Stripe Dashboard → Customers](https://dashboard.stripe.com/test/customers)
- You should see your newly created customer!

## 🔍 Checking Your Integration

### Verify Backend Connection

```bash
cd PFA
node -e "const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); stripe.customers.list().then(c => console.log('✅ Connected! Customers:', c.data.length)).catch(e => console.log('❌ Error:', e.message))"
```

### Check Frontend Configuration

Open browser console on `http://localhost:5173` and run:

```javascript
console.log("Stripe Key:", import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
// Should show: pk_test_51SqB0sGnDk8OwYw5...
```

## 📱 Common Integration Patterns

### Creating a Customer with Subscription

```javascript
// Backend API call
POST /api/customers
{
  "email": "customer@example.com",
  "name": "John Doe",
  "subscriptionPlanId": "price_xxxxx",
  "paymentMethodId": "pm_xxxxx"
}
```

### Adding Payment Method

```javascript
// Frontend - Billing page
// User adds card → Stripe.js creates payment method → Attach to customer
```

### Processing Payments

```javascript
// Backend automatically processes through Stripe
// Webhooks update invoice status in database
```

## 🛠️ Troubleshooting

### Issue: "No such customer" error

**Cause:** Trying to view demo customers in Stripe
**Solution:** Demo customers (cus*tech*_, cus*edu*_) are fake IDs for testing. Create real customers through the app or Stripe dashboard.

### Issue: Stripe webhook not receiving events

**Cause:** Local development without public URL
**Solution:** Use [ngrok](https://ngrok.com) to expose localhost:

```bash
ngrok http 5000
# Update webhook URL to: https://xxxx.ngrok.io/api/webhooks
```

### Issue: Invalid API key error

**Cause:** Missing or incorrect API keys
**Solution:** Double-check keys in `.env` files and restart servers

## 📚 Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [PayFlow Documentation](../README.md)

## ✅ Checklist: Production Deployment

- [ ] Stripe account fully activated
- [ ] Live API keys configured
- [ ] Webhook endpoints set up for production
- [ ] SSL certificate installed (https://)
- [ ] Payment flows tested end-to-end
- [ ] Error handling and logging configured
- [ ] Customer support process established
- [ ] Compliance requirements met (PCI, GDPR, etc.)
- [ ] Backup and disaster recovery plan ready

---

## 🎉 You're All Set!

Your PayFlow application is ready to use with Stripe. Start in **Test Mode**, and when you're confident, switch to **Live Mode** for real payments!

**Questions?** Check the [Stripe Support](https://support.stripe.com) or PayFlow documentation.
