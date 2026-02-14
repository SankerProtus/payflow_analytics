# PayFlow Frontend

React-based frontend for the PayFlow payment analytics platform.

## Stack

- React 19
- Vite
- TailwindCSS 4
- React Router 7
- Recharts
- Stripe React Components

## Development

### Install Dependencies

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and set:

- `VITE_API_URL` - Your backend API URL
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### Run Development Server

```bash
npm run dev
```

Visit: http://localhost:5173

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Deployment

### Vercel

```bash
vercel
```

Set environment variables in Vercel Dashboard:

- `VITE_API_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Then deploy:

```bash
vercel --prod
```

## Project Structure

```
src/
├── api/              # API client and endpoints
├── assets/           # Static assets
├── components/       # React components
│   ├── billing/
│   ├── common/
│   ├── customers/
│   ├── dashboard/
│   ├── dunning/
│   └── layout/
├── context/          # React context providers
├── hooks/            # Custom React hooks
├── pages/            # Page components
└── utils/            # Utility functions
```

## Available Pages

- `/` - Login
- `/signup` - Create account
- `/dashboard` - Analytics dashboard
- `/customers` - Customer management
- `/subscriptions` - Subscription management
- `/billing` - Billing and invoices
- `/dunning` - Failed payment management
- `/analytics` - Advanced analytics
- `/reports` - Custom reports

## Features

- Responsive design
- Real-time data visualization
- Stripe integration
- Dark mode support
- Protected routes
- Error boundaries
- Form validation
