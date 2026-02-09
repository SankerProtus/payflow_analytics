# PayFlow Backend (PFA)

Node.js/Express backend API for PayFlow payment analytics platform.

## Stack
- Node.js 18
- Express 5
- PostgreSQL 14+
- Passport.js (Authentication)
- Stripe API
- Winston (Logging)

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Stripe account

### Install Dependencies
```bash
npm install
```

### Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your configuration (see `.env.example` for all variables).

### Database Setup
```bash
# Run migrations
npm run migrate
```

### Run Development Server
```bash
npm run dev
```

Server runs on: http://localhost:5000

## Database

### Run Migrations
```bash
npm run migrate
```

### Migrations via API
When deployed, you can run migrations via HTTP:
```bash
curl -X POST http://localhost:5000/api/migrations/run
curl http://localhost:5000/api/migrations/status
```

## Deployment

### Railway

1. **Install CLI:**
```bash
npm i -g @railway/cli
```

2. **Deploy:**
```bash
railway login
railway init
railway up
```

3. **Configure:**
- Set Root Directory to `PFA` in Railway Settings
- Add PostgreSQL database
- Set environment variables (see `.env.example`)

4. **Run Migrations:**
```bash
curl -X POST https://your-app.railway.app/api/migrations/run
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer

### Subscriptions
- `GET /api/subscriptions` - List subscriptions
- `GET /api/subscriptions/:id` - Get subscription
- `POST /api/subscriptions` - Create subscription
- `PUT /api/subscriptions/:id` - Update subscription

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/revenue` - Revenue metrics
- `GET /api/dashboard/mrr-trend` - MRR trends

### Billing
- `GET /api/billing/invoices` - List invoices
- `POST /api/billing/invoices/:id/pay` - Pay invoice

### Dunning
- `GET /api/dunning/failed-payments` - Failed payments
- `POST /api/dunning/retry/:id` - Retry payment

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhooks

### Admin
- `GET /health` - Health check
- `POST /api/migrations/run` - Run migrations (if ENABLE_MIGRATIONS=true)
- `GET /api/migrations/status` - Migration status

## Project Structure

```
src/
├── configs/          # Configuration files
├── controller/       # Route controllers
├── db/              # Database
│   ├── migrations/  # SQL migration files
│   ├── schema.sql   # Database schema
│   └── connection.js
├── mail/            # Email service
├── middlewares/     # Express middlewares
├── models/          # Database models
├── routes/          # API routes
├── service/         # Business logic services
└── utils/           # Utility functions
```

## Environment Variables

See `.env.example` for complete list.

**Required:**
- `PG_*` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Frontend URL
- `STRIPE_SECRET_KEY` - Stripe API key

**Optional:**
- `EMAIL_*` - Email configuration
- `GOOGLE_*` - Google OAuth (optional)
- `REDIS_*` - Redis (optional)

## Logging

Logs are stored in `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

## Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Input validation
- SQL injection protection (parameterized queries)
