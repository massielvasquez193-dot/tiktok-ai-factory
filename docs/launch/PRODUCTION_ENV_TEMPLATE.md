# Production Environment Template

> Copy this to `.env` and fill in the marked values.

```env
# ═══════════════════════════════════════════
# TikTok AI Factory — Production .env
# ═══════════════════════════════════════════

# Database (Docker-managed, do not change)
DB_USER=tiktok
DB_PASSWORD=changeme123
DB_NAME=tiktok_video_factory

# ═══════════════════════════════════════════
# Launch Mode
# ═══════════════════════════════════════════
SAAS_MODE=false          # Set to "true" for public launch

# ═══════════════════════════════════════════
# Security
# ═══════════════════════════════════════════
# Generated: openssl rand -hex 32
JWT_SECRET=<YOUR_JWT_SECRET_HERE>

# ═══════════════════════════════════════════
# Email (Resend)
# ═══════════════════════════════════════════
EMAIL_MODE=mock          # Change to "resend" for production
RESEND_API_KEY=          # Get from https://resend.com/api-keys
EMAIL_FROM=noreply@ttvideoai.com
APP_URL=https://ttvideoai.com

# ═══════════════════════════════════════════
# Billing (Stripe)
# ═══════════════════════════════════════════
STRIPE_MODE=mock         # "mock" | "test" | "live"
STRIPE_SECRET_KEY=       # sk_test_... or sk_live_...
STRIPE_PUBLIC_KEY=       # pk_test_... or pk_live_...
STRIPE_WEBHOOK_SECRET=   # whsec_...

# Stripe Price IDs (set in plans table after Stripe configured)
# Plan      | Monthly Price ID          | Yearly Price ID
# ----------|---------------------------|--------------------
# Starter   | price_starter_monthly     | price_starter_yearly
# Pro       | price_pro_monthly         | price_pro_yearly
# Business  | price_business_monthly    | price_business_yearly

# Alternative: LemonSqueezy (MoR for global sellers)
LEMONSQUEEZY_API_KEY=

# ═══════════════════════════════════════════
# AI Providers
# ═══════════════════════════════════════════
LLM_MODE=real
SEEDANCE_MODE=real

# DeepSeek
DEEPSEEK_API_KEY=<YOUR_DEEPSEEK_KEY>

# Seedance (Volcengine)
SEEDANCE_API_KEY=<YOUR_SEEDANCE_KEY>

# OpenAI (optional)
OPENAI_API_KEY=

# Anthropic / Claude (optional)
ANTHROPIC_API_KEY=

# ═══════════════════════════════════════════
# TTS Providers
# ═══════════════════════════════════════════
TTS_ENGINE=azure
TTS_API_KEY=
TTS_REGION=southeastasia

# ═══════════════════════════════════════════
# TikTok API (optional)
# ═══════════════════════════════════════════
TIKTOK_APP_KEY=
TIKTOK_APP_SECRET=
TIKTOK_ACCESS_TOKEN=
TIKTOK_SHOP_ID=
```
