# Public Beta Checklist

> **Platform**: TikTok AI Factory v1.1 SaaS
> **Release**: RC1 — Public Beta
> **Date**: 2026-06-28

---

## Beta Launch Status

| Section | Status | Notes |
|---------|--------|-------|
| Infrastructure | ✅ Ready | 5/5 Docker healthy, 45% disk, SSL valid |
| Auth System | ✅ Ready | JWT, bcrypt, sessions, 5-tier RBAC |
| Workspace | ✅ Ready | Multi-tenant, member invites |
| Subscription | ✅ Ready | 5 plans, auto-assign Free |
| Credits | ✅ Ready | Atomic wallet, consume/grant/refund |
| AI Pipeline | ✅ Ready | DeepSeek + Seedance keys configured |
| Publishing | ✅ Ready | Multi-platform API |
| Frontend | ✅ Ready | 67 pages, 13/13 200 |
| Landing Page | ✅ Ready | OG, JSON-LD, sitemap, robots.txt |
| Legal | ✅ Ready | Terms, Privacy, Cookies |
| Support | ✅ Ready | FAQ, Contact, Support Center |
| Docs | ✅ Ready | 6 launch docs, runbook |
| Payments | 🔴 Needs Keys | Stripe mock mode — keys needed |
| Email | 🔴 Needs Keys | Resend mock mode — key needed |

---

## Pre-Launch: Manual Actions

### Infrastructure (1 person, 30 min)
- [ ] Verify Docker: `docker ps` — 5 containers healthy
- [ ] Verify SSL: `openssl s_client -connect ttvideoai.com:443` — valid
- [ ] Verify backup: `./backup.sh` — creates fresh DB dump
- [ ] Verify disk: `df -h` — <80% used
- [ ] Verify DNS: `dig +short ttvideoai.com` — resolves to server IP

### Security (1 person, 10 min)
- [ ] JWT_SECRET: 64+ character random hex string
- [ ] Nginx HSTS: `max-age=31536000` header present
- [ ] CSP headers: present on all responses
- [ ] Rate limiting: 10 req/s configured in Nginx
- [ ] Database: no default passwords, port not exposed publicly

### Stripe Setup (1 person, 60 min)
- [ ] Create Stripe account at dashboard.stripe.com
- [ ] Get API keys: `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`
- [ ] Set webhook: `https://ttvideoai.com/api/webhooks/stripe`
- [ ] Subscribe to events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] Copy webhook secret: `STRIPE_WEBHOOK_SECRET`
- [ ] Create 3 products in Stripe dashboard (Starter, Pro, Business)
- [ ] Create monthly + yearly prices for each product
- [ ] Copy Price IDs into `plans` table:
  ```sql
  UPDATE plans SET stripe_price_id_monthly = 'price_XXX', stripe_price_id_yearly = 'price_YYY' WHERE name = 'starter';
  UPDATE plans SET stripe_price_id_monthly = 'price_XXX', stripe_price_id_yearly = 'price_YYY' WHERE name = 'pro';
  UPDATE plans SET stripe_price_id_monthly = 'price_XXX', stripe_price_id_yearly = 'price_YYY' WHERE name = 'business';
  ```
- [ ] Test checkout with Stripe test mode (`STRIPE_MODE=test`)
- [ ] Verify webhook delivery in Stripe dashboard
- [ ] Switch to live: `STRIPE_MODE=live`

### Resend Setup (1 person, 30 min)
- [ ] Create account at resend.com
- [ ] Get API key: `RESEND_API_KEY`
- [ ] Add domain: `ttvideoai.com` in Resend dashboard
- [ ] Add DNS records: DKIM, SPF (provided by Resend)
- [ ] Verify domain (check Resend dashboard — green checkmark)
- [ ] Switch mode: `EMAIL_MODE=resend`
- [ ] Send test email: password reset to yourself

### Launch Activation (1 person, 5 min)
- [ ] Set `SAAS_MODE=true` in `.env`
- [ ] `docker compose -f docker-compose.prod.yml up -d server`
- [ ] Verify: `curl https://ttvideoai.com/api/auth/register` returns success

### First Admin (1 person, 5 min)
- [ ] Register at https://ttvideoai.com/register
- [ ] Verify email
- [ ] Create admin workspace

### Go-Live (T+0)
- [ ] Announce launch publicly
- [ ] Monitor error logs continuously for 4 hours
- [ ] First signup → First workspace → First AI generation → First publish

---

## Post-Launch: First 24 Hours

### Hourly Checks
- [ ] Hour 1: Server health, new users, error count, disk
- [ ] Hour 2: Server health, new users, error count, disk
- [ ] Hour 4: Full system audit, credit consumption, publishing jobs
- [ ] Hour 8: Backup created, Stripe payments verified (if configured)
- [ ] Hour 24: Launch declared STABLE

### First Customer Metrics (targets)
| Metric | Target |
|--------|--------|
| Registrations (24h) | >10 |
| Workspaces created | >8 |
| Products added | >5 |
| AI scripts generated | >10 |
| Videos generated | >5 |
| Publishing jobs created | >3 |
| Support tickets | <3 |
| Server errors (>500) | 0 |
| Uptime | 100% |

---

## Known Limitations (Beta)

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| Stripe in mock mode | No real payments | Configure Stripe keys |
| Email in mock mode | No password reset emails | Configure Resend keys |
| No CDN | Slower load for non-APAC users | Add Cloudflare (Phase 2) |
| Single server | No horizontal scaling | OK for <500 users |
| No real-time WebSocket | Polling for video status | Acceptable for beta |

---

## Beta Exit Criteria (→ GA)

- [ ] 30 days with 0 critical incidents
- [ ] 99.9% uptime
- [ ] >100 registered users
- [ ] >10 paying customers
- [ ] >500 AI generations
- [ ] Stripe live mode active
- [ ] Email delivery working
- [ ] Customer feedback incorporated into roadmap
