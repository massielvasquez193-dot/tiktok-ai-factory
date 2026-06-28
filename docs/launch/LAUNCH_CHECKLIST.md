# Production Launch Checklist

> **Platform**: TikTok AI Factory v1.1 SaaS
> **Date**: 2026-06-28
> **Status**: READY — 3 manual steps remaining

---

## Pre-Launch Checklist

### Infrastructure (All ✅)

- [x] Docker: 5/5 containers healthy
- [x] PostgreSQL 16: 54 tables, 11MB, 1 active connection
- [x] Redis 7: 2MB, 14 keys, healthy
- [x] Nginx 1.31: config valid, HTTPS enabled
- [x] SSL: valid until Sep 6 2026 (Let's Encrypt)
- [x] Disk: 45% used, 26GB free
- [x] Memory: 534MB available
- [x] Backup script: functional, tested today

### Security (All ✅)

- [x] JWT_SECRET: 64-char hex, generated
- [x] Password hashing: bcryptjs, 12 rounds
- [x] Session invalidation: logout deletes session
- [x] HSTS: max-age=31536000
- [x] CSP: strict self-only
- [x] XSS protection: enabled
- [x] Rate limiting: 10 req/s, burst 20
- [x] RBAC: 5-tier enforced

### API & Frontend (All ✅)

- [x] API health: 200
- [x] 12 legacy endpoints: all 200
- [x] Frontend: 7 pages verified 200
- [x] SAAS_MODE=false: production safe
- [x] SAAS_MODE=true: auth flows verified
- [x] Plans: 5 plans, public endpoint
- [x] Templates: public marketplace accessible

### Commercial Features (All ✅)

- [x] Subscription: Free→Enterprise, auto-assign
- [x] Credits: atomic wallet, consume/grant/refund
- [x] Checkout: mock mode functional
- [x] Webhooks: mock mode functional
- [x] Publishing: multi-platform API verified
- [x] AI Workspace: projects, prompts, chat

---

## Manual Actions (3 Required)

### 1. Configure Stripe
```bash
# Add to .env:
STRIPE_MODE=test          # Start with test mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
**Source**: https://dashboard.stripe.com/apikeys
**Test**: Create a $0 test subscription via checkout flow.

### 2. Configure Email (Resend)
```bash
# Add to .env:
EMAIL_MODE=resend
RESEND_API_KEY=re_...
```
**Source**: https://resend.com/api-keys
**Test**: Send password reset email to yourself.

### 3. Enable Public Registration
```bash
# Add to .env:
SAAS_MODE=true
```
**Then**: `docker compose up -d server`
**Test**: Visit https://ttvideoai.com/register — should work.

---

## Soft Launch Sequence

1. Enable SAAS_MODE=true (keep Stripe in test mode)
2. Create admin account via `/register`
3. Verify email (mock mode: check server logs for token)
4. Invite 3-5 beta users
5. Monitor server logs for 48 hours
6. Verify: register → workspace → AI generate → credits

## Hard Launch Sequence

1. After 48-hour soft launch with 0 errors:
2. Switch STRIPE_MODE from `test` to `live`
3. Update Stripe price IDs in `plans` table
4. Switch EMAIL_MODE from `mock` to `resend`
5. Announce at https://ttvideoai.com

## Rollback Plan

```bash
# Instant rollback (any time):
SAAS_MODE=false
docker compose up -d server

# Full rollback:
git checkout v1.0.1
docker compose up -d
```
