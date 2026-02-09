# Quick Fix: Deploy Backend

Your frontend is deployed on Vercel but can't reach the backend (still on localhost).

## Fastest Solution - Deploy to Railway

### 1. Install Railway CLI
```bash
npm i -g @railway/cli
```

### 2. Deploy Backend
```bash
cd PFA
railway login
railway init
railway up
```

### 3. Add PostgreSQL Database
- Go to [Railway Dashboard](https://railway.app/dashboard)
- Click your project → "New" → "Database" → "Add PostgreSQL"
- Database variables are added automatically

### 4. Set Environment Variables
In Railway dashboard, add these:

**Required:**
```
NODE_ENV=production
JWT_SECRET=your-secure-random-string-here
CORS_ORIGIN=https://pay-flow-tawny.vercel.app
```

**Email (use your Gmail):**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-google-app-password
GOOGLE_EMAIL=your-email@gmail.com
```

**Stripe:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 5. Run Migrations
```bash
railway run npm run migrate
```

### 6. Get Your Backend URL
```bash
railway domain
```
Copy the URL (e.g., `https://pfa-production.up.railway.app`)

---

## Update Vercel Environment Variable

### 1. Go to Vercel Dashboard
- https://vercel.com/dashboard
- Select "pay-flow" project
- Settings → Environment Variables

### 2. Add Variable
- **Name:** `VITE_API_URL`
- **Value:** `https://your-railway-url.up.railway.app/api` (your Railway URL + /api)
- **Environments:** Check all (Production, Preview, Development)
- Click "Save"

### 3. Redeploy Frontend
```bash
vercel --prod
```

---

## Test

1. Visit: `https://your-railway-url.up.railway.app/health`
   - Should see: `{"status":"ok","message":"PayFlow API is running"}`

2. Visit: `https://pay-flow-tawny.vercel.app`
   - Try to create account or login

---

## Troubleshooting

**"Network Error" or "Failed to fetch":**
- Check `VITE_API_URL` is set correctly in Vercel
- Make sure it ends with `/api`
- Redeploy frontend after changing env vars

**CORS Error:**
- Verify `CORS_ORIGIN` in Railway matches your Vercel URL exactly
- No trailing slash in URL

**Database Error:**
- Make sure PostgreSQL is added in Railway
- Run migrations: `railway run npm run migrate`
