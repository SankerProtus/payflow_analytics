# Quick Deployment Guide

> 🚀 **Problem:** Frontend deployed on Vercel can't connect to backend running locally.
> ✅ **Solution:** Deploy backend to Railway and connect them.

---

## 📋 Prerequisites

- ✅ GitHub account with code pushed
- ✅ Railway account (https://railway.app)
- ✅ Vercel account (https://vercel.com)
- ✅ Stripe account (for payments)

---

## 🔧 Step 1: Deploy Backend to Railway

### 1.1 Install Railway CLI

```bash
npm i -g @railway/cli
```

### 1.2 Login and Deploy

```bash
cd PFA
railway login
railway init
```

Select your project or create new one.

### 1.3 Add PostgreSQL Database

- Go to [Railway Dashboard](https://railway.app/dashboard)
- Click your project
- Click "New" → "Database" → "Add PostgreSQL"

### 1.4 Configure Root Directory

**Important:** Railway needs to build from the `PFA/` folder!

- Click on your **service** (payflow_analytics)
- Go to **"Settings"** tab
- Find **"Root Directory"**
- Set to: `PFA`
- Save

### 1.5 Set Environment Variables

Click "Variables" tab → "RAW Editor" → Paste:

```
PG_HOST=${{Postgres.PGHOST}}
PG_USER=${{Postgres.PGUSER}}
PG_DATABASE=${{Postgres.PGDATABASE}}
PG_PASSWORD=${{Postgres.PGPASSWORD}}
PG_PORT=${{Postgres.PGPORT}}
PG_SSL=true
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secure-random-secret-minimum-32-chars
CORS_ORIGIN=https://pay-flow-tawny.vercel.app
ENABLE_MIGRATIONS=true
```

**Generate JWT Secret:**

```bash
openssl rand -base64 32
```

Click "Update Variables" - Railway will auto-deploy.

### 1.6 Get Your Backend URL

```bash
railway domain
```

Copy the URL (e.g., `https://payflowanalytics-production.up.railway.app`)

### 1.7 Run Database Migrations

```bash
curl -X POST https://your-railway-url.up.railway.app/api/migrations/run
```

### 1.8 Verify Backend

```bash
curl https://your-railway-url.up.railway.app/health
```

Should return: `{"status":"ok","message":"PayFlow API is running"}`

---

## 🌐 Step 2: Update Frontend on Vercel

### 2.1 Set Environment Variable

- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Select your project (pay-flow)
- **Settings** → **Environment Variables**
- Add:
  - **Name:** `VITE_API_URL`
  - **Value:** `https://your-railway-url.up.railway.app/api`
  - **Environments:** Check all (Production, Preview, Development)

### 2.2 Redeploy

```bash
vercel --prod
```

Or trigger redeploy from Vercel Dashboard → Deployments → Redeploy

---

## ✅ Step 3: Verify Everything Works

### 3.1 Test Backend

```bash
curl https://your-railway-url.up.railway.app/health
```

### 3.2 Check Migration Status

```bash
curl https://your-railway-url.up.railway.app/api/migrations/status
```

Should show list of database tables.

### 3.3 Test Frontend

1. Visit your Vercel URL: `https://pay-flow-tawny.vercel.app`
2. Try to **create an account**
3. Try to **log in**

---

## 🐛 Troubleshooting

### Backend won't start

**Check logs:** Railway Dashboard → Deployments → View Logs

**Common issues:**

- ❌ Root directory not set to `PFA`
- ❌ Missing environment variables
- ❌ Database not added

### Frontend can't connect to backend

**Check:**

- ✅ `VITE_API_URL` is set correctly in Vercel
- ✅ URL ends with `/api`
- ✅ `CORS_ORIGIN` in Railway matches Vercel URL exactly
- ✅ Frontend redeployed after env var change

### CORS errors

**Fix:** Update `CORS_ORIGIN` in Railway to match your Vercel URL:

```
CORS_ORIGIN=https://pay-flow-tawny.vercel.app
```

No trailing slash!

### Database connection errors

**Fix:**

1. Ensure PostgreSQL is added in Railway
2. Check that `PG_*` variables reference `${{Postgres.*}}`
3. Set `PG_SSL=true`

---

## 📱 Optional: Add Email & Stripe

### Email (Gmail SMTP)

Add to Railway variables:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-google-app-password
GOOGLE_EMAIL=your-email@gmail.com
```

### Stripe

Add to Railway variables:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Add to Vercel:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🎉 Done!

Your app should now be fully deployed and working!

- **Frontend:** https://pay-flow-tawny.vercel.app
- **Backend:** https://your-railway-url.up.railway.app
- **Health Check:** https://your-railway-url.up.railway.app/health

---

## 📚 More Documentation

- [Full Deployment Guide](DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [Environment Setup](ENV_SETUP.md) - Complete environment variables reference
- [Railway Setup](RAILWAY_ENV_SETUP.md) - Railway-specific configuration
