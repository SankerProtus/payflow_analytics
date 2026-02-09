# Railway Environment Variables - Required Setup

Your app is crashing because Railway needs environment variables. Here are the **minimum required** variables to get started:

## 🚨 Set These First (Absolutely Required)

Go to Railway Dashboard → Your Project → Variables tab

### 1. Database (Auto-added if you add PostgreSQL service)
Railway adds these automatically when you add PostgreSQL:
- `PGHOST`
- `PGUSER` 
- `PGDATABASE`
- `PGPASSWORD`
- `PGPORT`

**BUT** your app uses different names, so add these references:
```
PG_HOST=${{PGHOST}}
PG_USER=${{PGUSER}}
PG_DATABASE=${{PGDATABASE}}
PG_PASSWORD=${{PGPASSWORD}}
PG_PORT=${{PGPORT}}
PG_SSL=true
```

### 2. Server Configuration
```
NODE_ENV=production
PORT=5000
```

### 3. Security
```
JWT_SECRET=your-random-secure-string-min-32-chars
```
Generate a secure string:
```bash
openssl rand -base64 32
```
Or just use: `payflow-jwt-secret-2026-secure-random-key-change-this`

### 4. CORS (Your Vercel Frontend URL)
```
CORS_ORIGIN=https://pay-flow-tawny.vercel.app
```

## ✅ These Are Optional (App Will Start Without Them)

### Email (Can add later)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-google-app-password
GOOGLE_EMAIL=your-email@gmail.com
```

### Stripe (Can add later for payments)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Google OAuth (Now optional - app works without it)
```
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URL=https://your-app.railway.app/api/auth/google/callback
```

---

## 📋 Quick Setup Steps

### 1. Add PostgreSQL Database
Railway Dashboard → New → Database → Add PostgreSQL

### 2. Add Environment Variables
Click "Variables" → "RAW Editor" → Paste:

```
PG_HOST=${{PGHOST}}
PG_USER=${{PGUSER}}
PG_DATABASE=${{PGDATABASE}}
PG_PASSWORD=${{PGPASSWORD}}
PG_PORT=${{PGPORT}}
PG_SSL=true
NODE_ENV=production
PORT=5000
JWT_SECRET=payflow-jwt-secret-2026-secure-random-key-CHANGE-THIS
CORS_ORIGIN=https://pay-flow-tawny.vercel.app
```

Click "Update Variables"

### 3. Redeploy
Railway will automatically redeploy with new variables.

Or manually trigger:
```bash
railway up
```

### 4. Run Migrations
Once deployed successfully:
```bash
railway run npm run migrate
```

### 5. Get Your URL
```bash
railway domain
```

### 6. Test Health Endpoint
```bash
curl https://your-app.railway.app/health
```

Should return: `{"status":"ok","message":"PayFlow API is running"}`

---

## 🔧 Troubleshooting

### "injecting env (0) from .env"
- This is normal - Railway uses its own env vars, not .env file
- Make sure variables are set in Railway dashboard

### Connection errors
- Verify PostgreSQL service is added and running
- Check that `PG_*` variables reference `${{PG*}}` correctly

### Still crashing?
Check logs:
```bash
railway logs
```

Or in Railway Dashboard → Deployments → Click latest → View logs
