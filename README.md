# PayFlow - Payment Analytics Platform

A comprehensive payment analytics and subscription management platform built with React, Node.js, Express, PostgreSQL, and Stripe.

## 📁 Project Structure

```
PayFlow/
├── payflow/          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/
│   │   └── ...
│   └── package.json
│
├── PFA/              # Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── db/
│   │   └── ...
│   └── package.json
│
└── docs/             # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Stripe Account
- Railway Account (for backend deployment)
- Vercel Account (for frontend deployment)

### Local Development

#### 1. Backend Setup

```bash
cd PFA
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run dev
```

#### 2. Frontend Setup

```bash
cd payflow
npm install
cp .env.example .env
# Edit .env with your backend URL
npm run dev
```

Visit: http://localhost:5173

## 🌐 Deployment

### Backend (Railway)

1. **Install Railway CLI:**

```bash
npm i -g @railway/cli
```

2. **Deploy:**

```bash
cd PFA
railway login
railway init
railway up
```

3. **Add PostgreSQL:**

- Railway Dashboard → New → Database → PostgreSQL

4. **Set Environment Variables:**

```bash
PG_HOST=${{Postgres.PGHOST}}
PG_USER=${{Postgres.PGUSER}}
PG_DATABASE=${{Postgres.PGDATABASE}}
PG_PASSWORD=${{Postgres.PGPASSWORD}}
PG_PORT=${{Postgres.PGPORT}}
PG_SSL=true
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secure-secret-here
CORS_ORIGIN=https://your-vercel-app.vercel.app
ENABLE_MIGRATIONS=true
```

5. **Configure Root Directory:**

- Railway Dashboard → Settings → Root Directory → `PFA`

6. **Run Migrations:**

```bash
curl -X POST https://your-app.railway.app/api/migrations/run
```

### Frontend (Vercel)

1. **Deploy:**

```bash
vercel
```

2. **Set Environment Variables:**

- Vercel Dashboard → Settings → Environment Variables
- `VITE_API_URL` = `https://your-railway-app.up.railway.app/api`

3. **Production Deploy:**

```bash
vercel --prod
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Payment System Guide](PAYMENT_SYSTEM_GUIDE.md) - Stripe integration details
- [Testing Guide](TESTING_GUIDE.md) - Testing strategies

## 🔑 Environment Variables

### Backend (PFA/.env)

See `PFA/.env.example` for all required variables

### Frontend (payflow/.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📊 Features

- **Dashboard Analytics** - Real-time revenue and subscription metrics
- **Customer Management** - Comprehensive customer profiles
- **Subscription Management** - Plans, billing, and lifecycle management
- **Payment Processing** - Stripe integration
- **Invoice Generation** - Automated billing
- **Dunning Management** - Failed payment recovery
- **Activity Logging** - Complete audit trail
- **Notifications** - Real-time alerts

## 🛠️ Tech Stack

**Frontend:**

- React 19
- Vite
- TailwindCSS
- React Router
- Recharts
- Stripe React Components

**Backend:**

- Node.js 18
- Express 5
- PostgreSQL 14+
- Passport.js (Auth)
- Stripe API
- Winston (Logging)

## 🔧 Development

### Run Migrations

```bash
cd PFA
npm run migrate
```

### Check API Health

```bash
curl http://localhost:5000/health
```

### Database Migrations via API

```bash
curl -X POST http://localhost:5000/api/migrations/run
curl http://localhost:5000/api/migrations/status
```

## 📝 License

ISC

## 👥 Support

For issues and questions, please open an issue on GitHub.
