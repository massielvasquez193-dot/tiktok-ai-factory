import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '../index';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { AppError } from '../auth/auth.service';
import { cancelPendingVideoTasks, CreditsService } from '../credits/credits.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-05-27.dahlia',
});

export const paymentRoutes = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
}

// ─── Plan definitions ──────────────────────────────────────────────

const PLANS = [
  { id: 'free',     name: 'Free',         price: 0,   credits: 50,   tenants: 1,
    features: ['50 AI credits/mo', '1 tenant', 'Basic AI models'] },
  { id: 'starter',  name: 'Starter',      price: 29,  credits: 200,  tenants: 3,
    features: ['200 AI credits/mo', '3 tenants', 'All AI models', 'Bulk generation'] },
  { id: 'pro',      name: 'Professional',  price: 99,  credits: 1000, tenants: 999,
    features: ['1,000 AI credits/mo', 'Unlimited tenants', 'Priority queue', 'API access', 'Custom branding'] },
  { id: 'enterprise', name: 'Enterprise',  price: 299, credits: 5000, tenants: 999,
    features: ['5,000 AI credits/mo', 'Dedicated infrastructure', 'Custom models', 'White-label', 'SLA'] },
];

const PLAN_PRICES: Record<string, string | undefined> = {
  starter:    process.env.STRIPE_PRICE_STARTER,
  pro:        process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

// Event dedup cache (simple in-memory Set; in production, use Redis SET with TTL)
const processedEvents = new Set<string>();
setInterval(() => {
  if (processedEvents.size > 5000) processedEvents.clear();
}, 3600_000);

function isDuplicateEvent(eventId: string): boolean {
  if (processedEvents.has(eventId)) return true;
  processedEvents.add(eventId);
  return false;
}

// ─── ═══════════════════════════════════════════════════════
// 1. CHECKOUT
// ═══════════════════════════════════════════════════════════

/** GET /api/payments/plans — list subscription plans (no auth needed) */
paymentRoutes.get('/plans', (_req, res) => {
  const enriched = PLANS.map(p => ({
    ...p,
    stripePriceId: PLAN_PRICES[p.id] || null,
  }));
  res.json(enriched);
});

/** POST /api/payments/create-checkout — subscription checkout */
paymentRoutes.post('/create-checkout', requireAuth, asyncHandler(async (req, res) => {
  const { planId, successUrl, cancelUrl } = req.body;
  if (!planId) throw new AppError('VALIDATION', 'planId is required', 400);

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) throw new AppError('INVALID_PLAN', 'Unknown plan', 400);

  // Free plan — activate directly, no Stripe needed
  if (planId === 'free') {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { plan: 'free', status: 'active' },
      create: { userId: user.id, plan: 'free', status: 'active' },
    });

    // Grant free credits if first time
    const wallet = await prisma.creditWallet.findUnique({ where: { userId: user.id } });
    if (!wallet || wallet.lifetime === 0) {
      await CreditsService.add(user.id, 50, 'subscription', 'free_signup', 'Free plan credits');
    }

    res.json({ url: null, plan: 'free', message: 'Free plan activated' });
    return;
  }

  const priceId = PLAN_PRICES[planId];
  if (!priceId) throw new AppError('CONFIG', 'Stripe price not configured for this plan', 500);

  let user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { subscription: true },
  });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { stripeCustomerId: customerId },
      create: { userId: user.id, stripeCustomerId: customerId, plan: 'free' },
    });
  }

  const idempotencyKey = `sub_${user.id}_${planId}_${Date.now()}`;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl || `${process.env.APP_URL || 'http://localhost:3000'}/settings?checkout=success&session={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:3000'}/settings?checkout=cancelled`,
    metadata: { userId: user.id, plan: planId },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  }, { idempotencyKey });

  res.json({ url: session.url, plan: planId });
}));

/** POST /api/payments/create-credit-checkout — one-time credit pack purchase */
paymentRoutes.post('/create-credit-checkout', requireAuth, asyncHandler(async (req, res) => {
  const { packId, successUrl, cancelUrl, quantity } = req.body;
  if (!packId) throw new AppError('VALIDATION', 'packId is required', 400);

  const pack = await prisma.creditPack.findUnique({ where: { id: packId } });
  if (!pack || !pack.isActive) throw new AppError('NOT_FOUND', 'Credit pack not found', 404);

  const qty = Math.max(1, Math.min(quantity || 1, 100));
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { subscription: true },
  });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { stripeCustomerId: customerId },
      create: { userId: user.id, stripeCustomerId: customerId, plan: 'free' },
    });
  }

  const idempotencyKey = `credit_${user.id}_${packId}_${Date.now()}`;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: pack.currency,
        product_data: { name: `${pack.name}${qty > 1 ? ` (x${qty})` : ''}` },
        unit_amount: Math.round(pack.price * 100),
      },
      quantity: qty,
    }],
    success_url: successUrl || `${process.env.APP_URL || 'http://localhost:3000'}/settings?credit=success&session={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:3000'}/settings?credit=cancelled`,
    metadata: {
      userId: user.id,
      packId: pack.id,
      credits: (pack.credits * qty).toString(),
    },
  }, { idempotencyKey });

  res.json({ url: session.url, pack: pack.name, quantity: qty, credits: pack.credits * qty });
}));

// ─── ═══════════════════════════════════════════════════════
// 2. SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════════════════════════

/** GET /api/payments/subscription — current user's subscription detail */
paymentRoutes.get('/subscription', requireAuth, asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user!.userId },
    include: {
      payments: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!sub) {
    res.json({ plan: 'free', status: 'inactive', payments: [] });
    return;
  }

  const planMeta = PLANS.find(p => p.id === sub.plan);
  res.json({
    id: sub.id,
    plan: sub.plan,
    status: sub.status,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelledAt: sub.cancelledAt,
    stripeCustomerId: sub.stripeCustomerId,
    planDetails: planMeta || null,
    recentPayments: sub.payments,
  });
}));

/** POST /api/payments/subscription/cancel — cancel at period end */
paymentRoutes.post('/subscription/cancel', requireAuth, asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!sub || sub.plan === 'free') {
    throw new AppError('NOT_FOUND', 'No active paid subscription', 404);
  }

  if (sub.stripeSubId) {
    try {
      await stripe.subscriptions.update(sub.stripeSubId, {
        cancel_at_period_end: true,
      });
    } catch (err: any) {
      // If Stripe call fails, still mark in our DB
      console.warn('[Stripe] cancel subscription error:', err.message);
    }
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });

  res.json({ success: true, message: 'Subscription will be cancelled at period end' });
}));

/** POST /api/payments/subscription/resume — resume a cancelled subscription */
paymentRoutes.post('/subscription/resume', requireAuth, asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!sub || !sub.cancelAtPeriodEnd) {
    throw new AppError('NOT_FOUND', 'No subscription pending cancellation', 404);
  }

  if (sub.stripeSubId) {
    try {
      await stripe.subscriptions.update(sub.stripeSubId, {
        cancel_at_period_end: false,
      });
    } catch (err: any) {
      console.warn('[Stripe] resume subscription error:', err.message);
    }
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: false },
  });

  res.json({ success: true, message: 'Subscription resumed' });
}));

/** POST /api/payments/subscription/upgrade — change plan (proration handled by Stripe) */
paymentRoutes.post('/subscription/upgrade', requireAuth, asyncHandler(async (req, res) => {
  const { planId } = req.body;
  if (!planId || planId === 'free') throw new AppError('VALIDATION', 'Valid paid planId is required', 400);

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) throw new AppError('INVALID_PLAN', 'Unknown plan', 400);

  const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.userId } });
  if (!sub?.stripeSubId) throw new AppError('NOT_FOUND', 'No active Stripe subscription', 404);

  const priceId = PLAN_PRICES[planId];
  if (!priceId) throw new AppError('CONFIG', 'Stripe price not configured', 500);

  try {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubId);
    const itemId = stripeSub.items.data[0]?.id;
    if (!itemId) throw new AppError('STRIPE_ERROR', 'No subscription item found', 500);

    await stripe.subscriptions.update(sub.stripeSubId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'always_invoice',
      metadata: { plan: planId },
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { plan: planId },
    });

    res.json({ success: true, plan: planId, message: 'Plan upgraded' });
  } catch (err: any) {
    throw new AppError('STRIPE_ERROR', `Failed to upgrade: ${err.message}`, 500);
  }
}));

// ─── ═══════════════════════════════════════════════════════
// 3. BILLING PORTAL
// ═══════════════════════════════════════════════════════════

/** POST /api/payments/billing-portal — Stripe Customer Portal */
paymentRoutes.post('/billing-portal', requireAuth, asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!sub?.stripeCustomerId) {
    throw new AppError('NOT_FOUND', 'No billing profile found', 404);
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: req.body.returnUrl || `${process.env.APP_URL || 'http://localhost:3000'}/settings`,
  });
  res.json({ url: portal.url });
}));

// ─── ═══════════════════════════════════════════════════════
// 4. PAYMENT HISTORY
// ═══════════════════════════════════════════════════════════

/** GET /api/payments/history — full payment history (subscription + credits) */
paymentRoutes.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const type = req.query.type as string || '';          // 'subscription' | 'credits' | ''
  const from = req.query.from as string || '';           // ISO date
  const to = req.query.to as string || '';

  const userId = req.user!.userId;

  // Subscription payments
  const subWhere: any = { userId };
  const [sub, creditItems, creditTotal] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        payments: {
          where: {
            ...(from ? { paidAt: { gte: new Date(from) } } : {}),
            ...(to ? { paidAt: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } } : {}),
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    // Credit purchases from ledger
    type !== 'subscription'
      ? prisma.creditLedger.findMany({
          where: {
            userId,
            type: { in: ['purchase', 'subscription', 'gift'] },
            ...(from || to ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            } : {}),
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        })
      : Promise.resolve([]),
    type !== 'subscription'
      ? prisma.creditLedger.count({
          where: {
            userId,
            type: { in: ['purchase', 'subscription', 'gift'] },
          },
        })
      : Promise.resolve(0),
  ]);

  // Merge and format
  const subscriptionItems = (sub?.payments || []).map(p => ({
    id: p.id,
    type: 'subscription_payment' as const,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    reason: p.billingReason,
    invoiceId: p.stripeInvoiceId,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  }));

  const creditItemsFormatted = creditItems.map(c => ({
    id: c.id,
    type: 'credit_purchase' as const,
    amount: c.amount,
    currency: 'usd',
    status: 'succeeded',
    reason: c.type,
    description: c.description,
    source: c.source,
    createdAt: c.createdAt,
  }));

  const allItems = [...subscriptionItems, ...creditItemsFormatted]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const paginated = allItems.slice((page - 1) * pageSize, page * pageSize);

  res.json({
    items: paginated,
    total: allItems.length,
    page,
    pageSize,
    totalPages: Math.ceil(allItems.length / pageSize),
    subscriptionTotal: subscriptionItems.length,
    creditTotal,
  });
}));

// ─── ═══════════════════════════════════════════════════════
// 5. WEBHOOK
// ═══════════════════════════════════════════════════════════

paymentRoutes.post('/webhook', asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    throw new AppError('WEBHOOK_ERROR', `Signature verification failed: ${err.message}`, 400);
  }

  // Dedup — prevent replay
  if (isDuplicateEvent(event.id)) {
    res.json({ received: true, deduplicated: true });
    return;
  }

  try {
    await handleWebhookEvent(event);
  } catch (err: any) {
    console.error(`[Stripe Webhook] ${event.type} error:`, err.message);
  }

  res.json({ received: true });
}));

async function handleWebhookEvent(event: any) {
  switch (event.type) {

    // ── Checkout completed ──────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan, packId, credits } = session.metadata || {};

      // Credit pack purchase (one-time payment)
      if (session.mode === 'payment' && userId && packId && credits) {
        const amount = parseInt(credits, 10);
        const wallet = await prisma.creditWallet.upsert({
          where: { userId },
          update: { balance: { increment: amount }, lifetime: { increment: amount } },
          create: { userId, balance: amount, lifetime: amount },
        });

        await prisma.creditLedger.create({
          data: {
            userId,
            amount,
            balanceAfter: wallet.balance,
            type: 'purchase',
            source: session.id,
            description: `Credit pack purchased via Stripe`,
            metadata: JSON.stringify({ packId, sessionId: session.id }),
          },
        });

        console.log(`[Stripe] Credits: +${amount} for user ${userId} (pack ${packId})`);
      }

      // Subscription checkout
      if (session.mode === 'subscription' && userId && plan) {
        // Save subscription ID from Stripe
        if (session.subscription) {
          await prisma.subscription.updateMany({
            where: { userId },
            data: {
              stripeSubId: session.subscription as string,
              plan,
              status: 'active',
              cancelAtPeriodEnd: false,
            },
          });
        } else {
          await prisma.subscription.updateMany({
            where: { userId },
            data: { plan, status: 'active' },
          });
        }

        // Grant initial monthly credits
        const planCredits: Record<string, number> = { starter: 200, pro: 1000, enterprise: 5000 };
        const creditAmount = planCredits[plan] || 0;
        if (creditAmount > 0) {
          const wallet = await prisma.creditWallet.upsert({
            where: { userId },
            update: { balance: { increment: creditAmount }, lifetime: { increment: creditAmount } },
            create: { userId, balance: creditAmount, lifetime: creditAmount },
          });

          await prisma.creditLedger.create({
            data: {
              userId,
              amount: creditAmount,
              balanceAfter: wallet.balance,
              type: 'subscription',
              source: session.id,
              description: `Initial monthly credits for ${plan} plan`,
            },
          });
        }

        console.log(`[Stripe] Subscription: ${plan} for user ${userId}`);
      }
      break;
    }

    // ── Invoice paid (recurring) ────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (!invoice.subscription) break;

      const customerId = invoice.customer as string;
      const sub = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!sub) break;

      // Record payment
      await prisma.payment.create({
        data: {
          subscriptionId: sub.id,
          stripePaymentId: (invoice.payment_intent as string) || '',
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency || 'usd',
          status: 'succeeded',
          billingReason: invoice.billing_reason || 'subscription_cycle',
          paidAt: new Date(),
        },
      });

      // Grant monthly credits on each successful invoice
      const planCredits: Record<string, number> = { starter: 200, pro: 1000, enterprise: 5000 };
      const creditAmount = planCredits[sub.plan] || 0;
      if (creditAmount > 0) {
        const wallet = await prisma.creditWallet.upsert({
          where: { userId: sub.userId },
          update: { balance: { increment: creditAmount }, lifetime: { increment: creditAmount } },
          create: { userId: sub.userId, balance: creditAmount, lifetime: creditAmount },
        });

        await prisma.creditLedger.create({
          data: {
            userId: sub.userId,
            amount: creditAmount,
            balanceAfter: wallet.balance,
            type: 'subscription',
            source: invoice.id,
            description: `Monthly credits — ${sub.plan} (invoice ${invoice.id})`,
          },
        });
      }

      console.log(`[Stripe] Invoice paid: $${(invoice.amount_paid / 100).toFixed(2)} for ${sub.plan}`);
      break;
    }

    // ── Invoice payment failed ──────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (!invoice.subscription) break;

      const customerId = invoice.customer as string;
      const sub = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (!sub) break;

      // Mark subscription as past_due
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'past_due' },
      });

      // Notify user (in production: send email)
      console.warn(`[Stripe] Payment FAILED for user ${sub.userId} — subscription ${sub.plan}`);

      // Record failed payment attempt
      await prisma.payment.create({
        data: {
          subscriptionId: sub.id,
          stripePaymentId: (invoice.payment_intent as string) || invoice.id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due / 100,
          currency: invoice.currency || 'usd',
          status: 'failed',
          billingReason: invoice.billing_reason || 'subscription_cycle',
        },
      });
      break;
    }

    // ── Subscription updated ────────────────────────────
    case 'customer.subscription.updated': {
      const stripeSub = event.data.object;
      const customerId = stripeSub.customer as string;

      const updateData: any = {
        status: stripeSub.status,
        currentPeriodStart: stripeSub.current_period_start
          ? new Date(stripeSub.current_period_start * 1000) : undefined,
        currentPeriodEnd: stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000) : undefined,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
      };

      if (stripeSub.canceled_at) {
        updateData.cancelledAt = new Date(stripeSub.canceled_at * 1000);
      }

      // Sync plan name from metadata
      if (stripeSub.metadata?.plan) {
        updateData.plan = stripeSub.metadata.plan;
      }

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: updateData,
      });

      // If subscription was cancelled, clean up pending tasks
      if (stripeSub.status === 'canceled' || stripeSub.status === 'unpaid') {
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (sub) {
          await cancelPendingVideoTasks(sub.userId);
        }
      }

      console.log(`[Stripe] Subscription updated: ${stripeSub.id} -> ${stripeSub.status}`);
      break;
    }

    // ── Subscription deleted ────────────────────────────
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object;
      const customerId = stripeSub.customer as string;

      const sub = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (sub) {
        await Promise.all([
          prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: 'cancelled',
              cancelledAt: new Date(),
              plan: 'free',
              stripeSubId: '',
            },
          }),
          cancelPendingVideoTasks(sub.userId),
        ]);
      }

      console.log(`[Stripe] Subscription deleted: customer ${customerId}`);
      break;
    }

    // ── Subscription paused ─────────────────────────────
    case 'customer.subscription.paused': {
      const stripeSub = event.data.object;
      const customerId = stripeSub.customer as string;

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: { status: 'paused' },
      });

      console.log(`[Stripe] Subscription paused: customer ${customerId}`);
      break;
    }

    default:
      // Unhandled event type — log for visibility
      console.log(`[Stripe] Unhandled event: ${event.type}`);
  }
}

// ─── ═══════════════════════════════════════════════════════
// 5. CREDITS RECHARGE & ADMIN
// ═══════════════════════════════════════════════════════════

/** GET /api/payments/credit-packs — available credit packs */
paymentRoutes.get('/credit-packs', asyncHandler(async (_req, res) => {
  const packs = await prisma.creditPack.findMany({ where: { isActive: true } });
  res.json(packs);
}));

/** POST /api/payments/redeem-code — redeem a promo/gift code for credits */
paymentRoutes.post('/redeem-code', requireAuth, asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new AppError('VALIDATION', 'code is required', 400);

  // Find a valid, unused verification token with type 'credit_gift'
  const tokenRecord = await prisma.emailVerificationToken.findFirst({
    where: {
      token: code,
      type: 'credit_gift',
      usedAt: null,
      expiresAt: { gte: new Date() },
    },
  });

  if (!tokenRecord) throw new AppError('INVALID_CODE', 'Invalid or expired code', 400);

  const giftAmount = 50; // Default gift amount, could be stored in metadata
  const newBalance = await CreditsService.add(
    req.user!.userId,
    giftAmount,
    'gift',
    `code:${code}`,
    'Promo code redemption',
  );

  await prisma.emailVerificationToken.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  res.json({ success: true, creditsAdded: giftAmount, newBalance });
}));

// ─── Admin: Seed default credit packs ──────────────────────────────

/** POST /api/payments/admin/seed-credit-packs */
paymentRoutes.post('/admin/seed-credit-packs', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (_req, res) => {
  const defaults = [
    { name: 'Starter Pack',    credits: 100,  price: 9.99,  currency: 'usd' },
    { name: 'Growth Pack',     credits: 500,  price: 39.99, currency: 'usd' },
    { name: 'Professional Pack', credits: 1000, price: 69.99, currency: 'usd' },
    { name: 'Enterprise Pack', credits: 5000, price: 299.99, currency: 'usd' },
  ];

  const created = [];
  for (const def of defaults) {
    const existing = await prisma.creditPack.findFirst({ where: { name: def.name } });
    if (existing) continue;
    const pack = await prisma.creditPack.create({
      data: {
        ...def,
        stripePriceId: '',  // to be filled after creating Stripe prices
      },
    });
    created.push(pack);
  }

  res.json({ created: created.length, message: created.length > 0 ? 'Credit packs seeded' : 'No new packs needed' });
}));

/** GET /api/payments/admin/stats — payment stats for admin dashboard */
paymentRoutes.get('/admin/stats', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (_req, res) => {
  const [totalSubs, activeSubs, totalRevenue, totalCreditSales] = await Promise.all([
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'succeeded' } }),
    prisma.creditLedger.aggregate({
      _sum: { amount: true },
      where: { type: 'purchase', amount: { gt: 0 } },
    }),
  ]);

  res.json({
    totalSubscriptions: totalSubs,
    activeSubscriptions: activeSubs,
    totalRevenue: totalRevenue._sum.amount || 0,
    totalCreditSales: totalCreditSales._sum.amount || 0,
  });
}));

export { stripe };
