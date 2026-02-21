# Environment Variables Setup Guide

Complete guide for setting up environment variables for PayFlow in development and production.

---

## Development Setup

### Backend (.env in PFA/)

Create `PFA/.env`:

```env
# Database
PG_HOST=localhost
PG_USER=postgres
PG_DATABASE=payflow
PG_PASSWORD=your_password
PG_PORT=5432
PG_SSL=false

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173

# JWT
JWT_SECRET=your-super-secret-key-minimum-32-characters-long

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-google-app-password
GOOGLE_EMAIL=your-email@gmail.com

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:5000/api/auth/google/callback
```

### Frontend (.env in payflow/)

Create `payflow/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

---

## Production Setup (Railway)

### Required Variables

These are **absolutely required** for the app to start:

```env
# Database (Railway auto-adds PGHOST, PGUSER, etc. when you add PostgreSQL)
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
JWT_SECRET=your-random-secure-string-min-32-chars

# CORS (your Vercel frontend URL)
CORS_ORIGIN=https://pay-flow-tawny.vercel.app
```

### Optional Variables

App will start without these, but features won't work:

```env
# Email (for verification emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-google-app-password
GOOGLE_EMAIL=your-email@gmail.com

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth (optional - app works without it)
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URL=https://your-app.railway.app/api/auth/google/callback
```

---

## Production Setup (Vercel Frontend)

In Vercel Dashboard → Settings → Environment Variables:

```env
VITE_API_URL=https://your-railway-url.up.railway.app/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

**Important:** Set for all environments (Production, Preview, Development)

---

## How to Get These Values

### JWT_SECRET

Generate a secure random string:

```bash
openssl rand -base64 32
```

Or use: `payflow-jwt-secret-2026-secure-random-key-CHANGE-THIS`

### Gmail App Password

1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use that 16-character password (spaces don't matter)

### Stripe Keys

**Test Mode (Development):**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy "Publishable key" (starts with `pk_test_`)
3. Copy "Secret key" (starts with `sk_test_`)

**Live Mode (Production):**
1. Go to https://dashboard.stripe.com/apikeys
2. Copy "Publishable key" (starts with `pk_live_`)
3. Copy "Secret key" (starts with `sk_live_`)

### Stripe Webhook Secret

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-backend-url/api/webhooks/stripe`
4. Select events (see DEPLOYMENT.md)
5. Copy the "Signing secret" (starts with `whsec_`)

### Google OAuth (Optional)

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-backend-url/api/auth/google/callback`

---

## Quick Setup Steps

### Railway Backend

1. **Add PostgreSQL Database**
   - Railway Dashboard → New → Database → Add PostgreSQL

2. **Add Environment Variables**
   - Click "Variables" → "RAW Editor"
   - Paste required variables (see above)
   - Click "Update Variables"

3. **Redeploy**
   - Railway automatically redeploys

### Vercel Frontend

1. **Add Variables**
   - Vercel Dashboard → Settings → Environment Variables
   - Add `VITE_API_URL` and `VITE_STRIPE_PUBLISHABLE_KEY`

2. **Redeploy**
   ```bash
   vercel --prod
   ```

---

## Verification

### Check Backend is Running

```bash
curl http://localhost:5000/health
# or
curl https://your-railway-url.up.railway.app/health
```

Expected response:
```json
{"status":"ok","message":"PayFlow API is running"}
```

### Check Frontend Can Reach Backend

1. Open browser console at http://localhost:5173 (or your Vercel URL)
2. Look for network requests to `/api`
3. Check for errors:
   - **CORS errors?** → Check `CORS_ORIGIN` in backend
   - **Network errors?** → Check `VITE_API_URL` in frontend

### Check Database Connection

```bash
cd PFA
npm run migrate
```

Should see: `✓ Schema created successfully`

---

## Common Issues

### "Database connection failed"

**Check:**
- PostgreSQL is running
- Database credentials are correct
- `PG_SSL=true` in production, `false` in development

### "CORS error"

**Check:**
- `CORS_ORIGIN` matches frontend URL exactly (no trailing slash)
- Frontend is using correct `VITE_API_URL`

### "Email not sending"

**Check:**
- Gmail app password is correct (not regular password)
- 2FA is enabled on Google account
- Check spam folder

### "Stripe error"

**Check:**
- Using test keys in development (`pk_test_`, `sk_test_`)
- Keys match (test with test, live with live)
- Stripe products are created (`npm run setup-stripe`)

---

## Environment File Templates

### Backend Template (PFA/.env.example)

```env
# This file is tracked in git - DO NOT put real values here
# Copy this to .env and fill in your values

# Database
PG_HOST=localhost
PG_USER=postgres
PG_DATABASE=payflow
PG_PASSWORD=
PG_PORT=5432
PG_SSL=false

# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Security
JWT_SECRET=

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASSWORD=
GOOGLE_EMAIL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Frontend Template (payflow/.env.example)

```env
# This file is tracked in git - DO NOT put real values here
# Copy this to .env and fill in your values

VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=
```

---

## Security Best Practices

- ✅ Never commit `.env` files to git
- ✅ Use different keys for development and production
- ✅ Rotate secrets regularly
- ✅ Use environment-specific keys (test vs live)
- ✅ Keep `.env.example` updated but with empty values
- 💡 Use a password manager to store production secrets
- 💡 Limit access to production environment variables
