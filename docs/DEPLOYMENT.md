# PayFlow Deployment Guide

Complete guide to deploying PayFlow backend and frontend to production.

## Prerequisites

- ✅ GitHub account with code pushed
- ✅ Railway account (https://railway.app)
- ✅ Vercel account (https://vercel.com)
- ✅ Stripe account (for payments)
- ✅ Gmail account (for email notifications)

---

## Step 1: Deploy Backend to Railway

### 1.1 Install Railway CLI

```bash
npm install -g @railway/cli
```

### 1.2 Login and Initialize

```bash
cd PFA
railway login
railway init
```

Select your project or create a new one.

### 1.3 Add PostgreSQL Database

- Go to [Railway Dashboard](https://railway.app/dashboard)
- Click your project → "New" → "Database" → "Add PostgreSQL"
- Database variables (`PGHOST`, `PGUSER`, etc.) are added automatically

### 1.4 Configure Environment Variables

In Railway dashboard → Variables → RAW Editor, paste:

```env
# Database (references Railway's auto-added vars)
PG_HOST=${{PGHOST}}
PG_USER=${{PGUSER}}
PG_DATABASE=${{PGDATABASE}}
PG_PASSWORD=${{PGPASSWORD}}
PG_PORT=${{PGPORT}}
PG_SSL=true

# Server
NODE_ENV=production
PORT=5000

# Security
JWT_SECRET=generate-a-secure-random-string-min-32-chars

# CORS (your Vercel frontend URL)
CORS_ORIGIN=https://pay-flow-tawny.vercel.app

# Email (Gmail configuration)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-google-app-password
GOOGLE_EMAIL=your-email@gmail.com

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

**Gmail App Password:**
1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use that password (not your regular Gmail password)

### 1.5 Deploy

```bash
railway up
```

The app will automatically:
- Run database migrations
- Create all tables and schemas
- Start the server

### 1.6 Get Your Backend URL

```bash
railway domain
```

Copy the URL (e.g., `https://pfa-production.up.railway.app`)

### 1.7 Verify Deployment

Visit: `https://your-railway-url.up.railway.app/health`

Should see: `{"status":"ok","message":"PayFlow API is running"}`

---

## Step 2: Setup Stripe Products

### 2.1 Create Real Stripe Products

After first deployment, run:

```bash
railway run npm run setup-stripe
```

This creates:
- 3 products in Stripe (Basic, Pro, Enterprise)
- Monthly and yearly prices for each
- Updates database with real Stripe price IDs

### 2.2 Verify Products

```bash
railway run npm run check-plans
```

You should see real Stripe price IDs (starting with `price_`).

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Deploy

```bash
cd payflow
vercel
```

Follow prompts to link your project.

### 3.3 Set Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

**Add:**
- **Name:** `VITE_API_URL`
- **Value:** `https://your-railway-url.up.railway.app/api`
- **Environments:** Production, Preview, Development

**Add:**
- **Name:** `VITE_STRIPE_PUBLISHABLE_KEY`
- **Value:** `pk_test_your_publishable_key`
- **Environments:** Production, Preview, Development

### 3.4 Redeploy with Variables

```bash
vercel --prod
```

---

## Step 4: Configure Stripe Webhooks

### 4.1 Create Webhook in Stripe Dashboard

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set URL: `https://your-railway-url.up.railway.app/api/webhooks/stripe`

### 4.2 Select Events

Enable these events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_method.attached`
- `payment_method.detached`

### 4.3 Get Webhook Secret

Copy the webhook signing secret (starts with `whsec_`)

### 4.4 Update Railway

Add to Railway environment variables:
```
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

---

## Step 5: Test the Application

### 5.1 Test Backend Health

```bash
curl https://your-railway-url.up.railway.app/health
```

### 5.2 Test Frontend

1. Visit your Vercel URL
2. Create a new account
3. Check email for verification
4. Login and explore dashboard

### 5.3 Test Payment Flow

1. Add a customer
2. Add a payment method (use test card: `4242 4242 4242 4242`)
3. Create a subscription
4. Verify in Stripe dashboard

---

## Troubleshooting

### "Network Error" or CORS Issues

**Problem:** Frontend can't reach backend

**Solutions:**
1. Check `CORS_ORIGIN` in Railway matches your Vercel URL exactly
2. Check `VITE_API_URL` in Vercel ends with `/api`
3. Redeploy both after changing environment variables

### Database Connection Errors

**Problem:** Backend can't connect to PostgreSQL

**Solutions:**
1. Verify PostgreSQL service is running in Railway
2. Check database variables are correctly referenced
3. Ensure `PG_SSL=true` in production

### Email Not Sending

**Problem:** Verification emails not arriving

**Solutions:**
1. Verify Gmail app password is correct
2. Check spam folder
3. View Railway logs for email errors

### Migrations Not Running

**Problem:** Tables don't exist

**Solutions:**
1. Check `nixpacks.toml` has the migration command
2. Manually run: `railway run npm run migrate`
3. View Railway logs for migration errors

### View Logs

```bash
railway logs
```

Or view in Railway dashboard → Deployments → Logs

---

## Production Checklist

Before going live:

- [ ] Use production Stripe keys (instead of test keys)
- [ ] Change JWT_SECRET to a strong random value
- [ ] Enable HTTPS only (Railway does this automatically)
- [ ] Set up custom domain (optional)
- [ ] Configure email sending limits
- [ ] Set up database backups in Railway
- [ ] Test all payment flows with real test cards
- [ ] Review Stripe webhook events
- [ ] Set up monitoring/alerting
- [ ] Update CORS_ORIGIN to production frontend URL

---

## Updating Deployments

### Update Backend

```bash
cd PFA
git push  # Railway auto-deploys on push
```

Or manually:
```bash
railway up
```

### Update Frontend

```bash
cd payflow
vercel --prod
```

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs
