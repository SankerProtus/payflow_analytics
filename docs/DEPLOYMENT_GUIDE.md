# PayFlow Backend Deployment Guide

## Deploy to Railway (Recommended)

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Initialize and Deploy

```bash
cd PFA
railway init
railway up
```

### 4. Add PostgreSQL Database

- Go to Railway dashboard
- Click "New" → "Database" → "PostgreSQL"
- Railway will automatically add database connection variables

### 5. Set Environment Variables

In Railway dashboard, add these variables:

```
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-here
CORS_ORIGIN=https://pay-flow-tawny.vercel.app

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

GOOGLE_EMAIL=your-email@gmail.com

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=your-railway-url/api/auth/google/callback
```

### 6. Run Migrations

After deployment:

```bash
railway run npm run migrate
```

### 7. Get Your Backend URL

```bash
railway domain
```

Copy the URL (e.g., `https://your-app.up.railway.app`)

---

## Update Frontend (Vercel)

### 1. Add Environment Variable in Vercel

- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add:
  - Name: `VITE_API_URL`
  - Value: `https://your-app.up.railway.app/api`
  - Environments: Production, Preview, Development

### 2. Redeploy Frontend

```bash
cd ../payflow
vercel --prod
```

---

## Alternative: Deploy Backend to Render

1. Go to https://render.com
2. Create New → Web Service
3. Connect your GitHub repository
4. Configure:
   - Build Command: `cd PFA && npm install`
   - Start Command: `cd PFA && npm start`
   - Add PostgreSQL database
   - Add environment variables

---

## Verification

1. Check backend health:

   ```bash
   curl https://your-backend-url/api/auth/health
   ```

2. Test login from frontend:
   - Visit https://pay-flow-tawny.vercel.app
   - Try to create an account or log in

---

## Troubleshooting

### CORS Errors

Ensure `CORS_ORIGIN` in backend matches your Vercel URL exactly.

### Database Connection Issues

Check that `PG_SSL=true` for production databases.

### Authentication Issues

- Verify JWT_SECRET is set
- Check cookies are being set with correct domain
