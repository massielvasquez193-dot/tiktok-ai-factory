# Third-Party Keys Required for Production

> **Last Updated**: 2026-06-28
> **Status**: 2 of 6 providers configured

---

## Currently Configured (Working)

| Provider | Key | Status |
|----------|-----|--------|
| DeepSeek | `DEEPSEEK_API_KEY` | ✅ Configured (35-char key) |
| Seedance | `SEEDANCE_API_KEY` | ✅ Configured (46-char key, Volcengine Ark) |

## Required Before Accepting Payments

| Provider | Key | Where to Get | Monthly Cost |
|----------|-----|-------------|-------------|
| **Stripe** | `STRIPE_SECRET_KEY` | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) | 2.9% + $0.30 per transaction |
| **Stripe** | `STRIPE_PUBLIC_KEY` | Same dashboard | Free |
| **Stripe** | `STRIPE_WEBHOOK_SECRET` | [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) | Free |

## Required Before Sending Emails

| Provider | Key | Where to Get | Monthly Cost |
|----------|-----|-------------|-------------|
| **Resend** | `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) | Free up to 100/day, then $20/mo |

## Optional (Enhancements)

| Provider | Key | Purpose |
|----------|-----|---------|
| OpenAI | `OPENAI_API_KEY` | Alternative LLM (GPT-4o) |
| Anthropic | `ANTHROPIC_API_KEY` | Alternative LLM (Claude) |
| LemonSqueezy | `LEMONSQUEEZY_API_KEY` | MoR for non-US sellers |
| ElevenLabs | `TTS_API_KEY` (set in providers UI) | Voice generation |
| Kling | `KLING_API_KEY` (set in providers UI) | Alternative video gen |
| Veo | `VEO_API_KEY` (set in providers UI) | Google video generation |

---

## Stripe Setup Steps

1. Create account at https://dashboard.stripe.com/register
2. Go to Developers → API keys
3. Copy `Publishable key` → `STRIPE_PUBLIC_KEY`
4. Copy `Secret key` → `STRIPE_SECRET_KEY`
5. Go to Webhooks → Add endpoint
   - URL: `https://ttvideoai.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
6. Copy `Signing secret` → `STRIPE_WEBHOOK_SECRET`

## Resend Setup Steps

1. Create account at https://resend.com
2. Go to API Keys → Create API Key
3. Copy key → `RESEND_API_KEY`
4. Verify domain: `ttvideoai.com` in Resend dashboard
5. Update DNS with Resend's DKIM/SPF records

## Stripe Plan Setup

After Stripe keys are configured:

1. In Stripe Dashboard → Products → Create Product
2. For each plan (Starter, Pro, Business), create:
   - Monthly price (USD)
   - Yearly price (USD — typically 2 months free)
3. Copy each Price ID into the `plans` database table:
```sql
UPDATE plans SET
  stripe_price_id_monthly = 'price_xxxxx',
  stripe_price_id_yearly = 'price_yyyyy'
WHERE name = 'starter';
```
