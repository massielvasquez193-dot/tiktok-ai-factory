# TikTok AI Factory — SaaS Deployment Guide

## Quick Start

```bash
# 1. Start Docker Desktop (run as Administrator)
# 2. Run the deployment script:
.\deploy-saas.ps1
```

## Manual Setup

### Prerequisites
- Node.js 18+
- Docker Desktop (with Linux containers)
- Stripe account (for payments)
- SendGrid/Resend (for emails)

### Step-by-Step

#### 1. Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Required
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<another-random-64-char-string>

# Stripe (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx

# AI Providers
OPENAI_API_KEY=sk-xxx
SEEDANCE_API_KEY=xxx
KLING_API_KEY=xxx
VEO_API_KEY=xxx
```

#### 2. Database Setup

```bash
npm install
npm run db:generate
docker compose up -d           # Start PostgreSQL + Redis
npm run db:push                # Push Prisma schema
```

#### 3. Start Development

```bash
npm run dev                    # Starts both server (:4000) and web (:3000)
```

#### 4. Create Admin User

```bash
# 1. Register at http://localhost:3000/register
# 2. Connect to the database and promote:
docker compose exec postgres psql -U tiktok -d tiktok_video_factory
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

#### 5. Stripe Webhook (Development)

```bash
stripe listen --forward-to localhost:4000/api/payments/webhook
```

## Production Deployment

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Services:
| Service | Port | URL |
|---|---|---|
| Web (Next.js) | 3000 | http://localhost:3000 |
| API (Express) | 4000 | http://localhost:4000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Nginx | 80/443 | http://localhost |

## Module Structure

### Backend (`apps/server/src/`)

```
auth/
  ├── auth.service.ts      # JWT, bcrypt, token management
  ├── auth.middleware.ts    # requireAuth, requireRole, optionalAuth
  └── index.ts             # Routes: /api/auth/*
payments/
  └── index.ts             # Stripe checkout, webhook, billing portal
credits/
  ├── credits.service.ts   # Balance, deduct, freeze, ledger
  └── index.ts             # Routes: /api/credits/*
tenant/
  └── index.ts             # Multi-tenant CRUD, member management
```

### Frontend (`apps/web/src/`)

```
context/AuthContext.tsx     # Auth state, login, register, refresh
app/login/page.tsx          # Login page
app/register/page.tsx       # Registration page
app/settings/page.tsx       # User settings, credits, billing
app/admin/
  ├── page.tsx              # Admin dashboard
  ├── users/page.tsx        # User management
  ├── tenants/page.tsx      # Tenant management
  ├── credits/page.tsx      # Credit management
  └── payments/page.tsx     # Payment management
```

## API Reference

### Auth
- `POST /api/auth/register` — Register with email/password
- `POST /api/auth/login` — Login, returns JWT tokens
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Revoke refresh token
- `GET /api/auth/me` — Get current user profile
- `POST /api/auth/verify-email` — Verify email with token

### Payments
- `GET /api/payments/plans` — List subscription plans
- `GET /api/payments/credit-packs` — List credit packs
- `POST /api/payments/create-checkout` — Start subscription (requires auth)
- `POST /api/payments/create-credit-checkout` — Buy credit pack (requires auth)
- `POST /api/payments/billing-portal` — Open Stripe portal (requires auth)
- `GET /api/payments/history` — Payment history (requires auth)
- `POST /api/payments/webhook` — Stripe webhook

### Credits
- `GET /api/credits/balance` — Get balance (requires auth)
- `GET /api/credits/ledger` — Transaction history (requires auth)
- `POST /api/credits/check` — Check if enough credits (requires auth)
- `GET /api/credits/admin/ledger/:userId` — Admin: view ledger
- `POST /api/credits/admin/adjust` — Admin: adjust credits

### Tenant
- `GET /api/tenant` — List user's tenants (requires auth)
- `POST /api/tenant` — Create tenant (requires auth)
- `PUT /api/tenant/:id` — Update tenant (requires auth)
- `DELETE /api/tenant/:id` — Delete tenant (requires auth)
- `GET /api/tenant/:id/members` — List members (requires auth)
- `POST /api/tenant/:id/invite` — Invite user (requires auth)
- `DELETE /api/tenant/:id/members/:userId` — Remove member (requires auth)
- `GET /api/tenant/admin/all` — Superadmin: all tenants

### Admin
- `GET /api/auth/admin/users` — List users (admin only)
- `GET /api/auth/admin/users/:id` — User detail (admin only)
- `PUT /api/auth/admin/users/:id` — Update user role (admin only)
