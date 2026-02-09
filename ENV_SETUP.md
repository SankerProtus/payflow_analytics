# PayFlow - Environment Variables Setup

## Frontend (.env in payflow/)

Create `payflow/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

For production (Vercel), set in Vercel Dashboard:

- `VITE_API_URL` → Your Railway/Render backend URL + `/api`
- `VITE_STRIPE_PUBLISHABLE_KEY` → Your Stripe publishable key

## Backend (.env in PFA/)

Create `PFA/.env` (copy from `.env.example`):

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
CORS_ORIGIN=http://localhost:5173

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-google-app-password
GOOGLE_EMAIL=your-email@gmail.com

# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

For production (Railway/Render), set:

- `NODE_ENV=production`
- `PG_SSL=true`
- `CORS_ORIGIN=https://pay-flow-tawny.vercel.app`

## Quick Checks

### 1. Check if backend is running:

```bash
curl http://localhost:5000/health
```

### 2. Check if frontend can reach backend:

- Open browser console on http://localhost:5173
- Any CORS errors? → Check CORS_ORIGIN
- Network errors? → Check VITE_API_URL

### 3. Check database connection:

```bash
cd PFA
npm run migrate
```
