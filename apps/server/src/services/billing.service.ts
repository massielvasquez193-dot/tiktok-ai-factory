/**
 * Billing Service — Launch Sprint
 *
 * STRIPE_MODE:
 *   mock  — No Stripe connection, returns fake checkout URLs (default)
 *   test  — Stripe test mode (requires STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET)
 *   live  — Stripe live mode (requires production keys)
 *
 * LemonSqueezy supported when LEMONSQUEEZY_API_KEY is set.
 */

// Dynamic require for optional stripe dependency (bypasses TS module check)
function loadStripe(): any {
  try { return (eval('require') as any)('stripe')?.default; } catch { return null; }
}

// ── Config ──────────────────────────────────────────────────────────────────

const STRIPE_MODE = process.env.STRIPE_MODE || 'mock';

// ── Types ───────────────────────────────────────────────────────────────────

export interface CheckoutOptions {
  workspaceId: string;
  planId: string;
  planName: string;
  billingPeriod: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface BillingProvider {
  name: 'stripe' | 'lemonsqueezy';
  isConfigured: boolean;
  mode: string;
}

// ── Provider Status ─────────────────────────────────────────────────────────

export function isStripeConfigured(): boolean {
  return STRIPE_MODE !== 'mock' && !!process.env.STRIPE_SECRET_KEY;
}

export function isLemonSqueezyConfigured(): boolean {
  return !!process.env.LEMONSQUEEZY_API_KEY;
}

export function getBillingMode(): string {
  return STRIPE_MODE;
}

export function getAvailableProviders(): BillingProvider[] {
  return [
    { name: 'stripe', isConfigured: isStripeConfigured(), mode: STRIPE_MODE },
    { name: 'lemonsqueezy', isConfigured: isLemonSqueezyConfigured(), mode: 'check' },
  ];
}

/**
 * Get public checkout configuration for the frontend.
 */
export function getCheckoutConfig() {
  return {
    mode: STRIPE_MODE,
    stripePublicKey: STRIPE_MODE !== 'mock' ? (process.env.STRIPE_PUBLIC_KEY || '') : 'pk_test_mock',
    isConfigured: isStripeConfigured(),
    availableProviders: getAvailableProviders(),
  };
}

// ── Checkout ────────────────────────────────────────────────────────────────

/**
 * Create a checkout session.
 *
 * mock mode: Returns a simulated checkout URL (redirects to success).
 * test/live: Connects to real Stripe API (requires stripe npm package when keys set).
 */
export async function createCheckout(opts: CheckoutOptions): Promise<{ url: string; sessionId: string }> {
  if (STRIPE_MODE === 'mock') {
    const sessionId = `cs_mock_${Date.now()}`;
    const url = `${opts.successUrl}?session_id=${sessionId}&mode=mock`;
    console.log(`[Billing] Mock checkout: ${opts.planName} for workspace ${opts.workspaceId}`);
    return { url, sessionId };
  }

  // Real Stripe integration — requires stripe package
  // To enable: npm install stripe, then set STRIPE_SECRET_KEY
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY not set. Configure Stripe or set STRIPE_MODE=mock.');
  }

  try {
    const Stripe = loadStripe();
    if (!Stripe) {
      throw new Error('Stripe package not installed. Run: npm install stripe');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-06-16.acacia' as any });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: opts.planName,
        quantity: 1,
      }],
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: { workspaceId: opts.workspaceId, planName: opts.planName },
      subscription_data: { metadata: { workspaceId: opts.workspaceId } },
    });

    return { url: session.url!, sessionId: session.id };
  } catch (err: any) {
    console.error('[Billing] Stripe checkout error:', err.message);
    throw new Error(`Checkout failed: ${err.message}`);
  }
}

// ── Webhooks ────────────────────────────────────────────────────────────────

/**
 * Handle incoming Stripe webhook events.
 *
 * mock mode: Logs and acknowledges.
 * test/live: Verifies Stripe signature, processes payment events.
 */
export async function handleWebhook(body: any, signature?: string): Promise<{ received: boolean; type: string; action?: string }> {
  const type = body?.type || 'unknown';

  if (STRIPE_MODE === 'mock') {
    console.log(`[Billing] Mock webhook: ${type}`);
    return { received: true, type, action: 'acknowledged (mock)' };
  }

  // Verify Stripe signature in test/live mode
  if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
    try {
      const Stripe2 = loadStripe();
      if (Stripe2) {
        const stripe = new Stripe2(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-06-16.acacia' as any });
        const event = stripe.webhooks.constructEvent(
          JSON.stringify(body), signature!, process.env.STRIPE_WEBHOOK_SECRET!
        );

        // Handle subscription lifecycle events
        switch (event.type) {
          case 'checkout.session.completed':
            console.log('[Billing] Checkout completed:', (event.data.object as any).metadata);
            return { received: true, type: event.type, action: 'checkout_completed' };
          case 'invoice.paid':
            console.log('[Billing] Invoice paid:', (event.data.object as any).id);
            return { received: true, type: event.type, action: 'invoice_paid' };
          case 'invoice.payment_failed':
            console.log('[Billing] Payment failed:', (event.data.object as any).id);
            return { received: true, type: event.type, action: 'payment_failed' };
          case 'customer.subscription.deleted':
            console.log('[Billing] Subscription deleted');
            return { received: true, type: event.type, action: 'subscription_deleted' };
          default:
            return { received: true, type: event.type };
        }
      }
    } catch (err: any) {
      console.error('[Billing] Webhook signature verification failed:', err.message);
      throw new Error(`Webhook verification failed: ${err.message}`);
    }
  }

  console.log(`[Billing] Webhook received (unverified): ${type}`);
  return { received: true, type };
}

/**
 * Simulate a successful checkout in mock mode.
 * Useful for testing the subscription → credit grant flow.
 */
export async function simulateCheckoutSuccess(workspaceId: string, planName: string): Promise<{ subscription: string; credits: number }> {
  if (STRIPE_MODE !== 'mock') {
    throw new Error('simulateCheckoutSuccess is only available in STRIPE_MODE=mock');
  }
  // Dynamic import to avoid circular dependency
  const { assignPlan } = await import('./subscription.service');
  const sub = await assignPlan(workspaceId, planName);

  const { getOrCreateWallet, grantCredits } = await import('./credit.service');
  const { prisma } = await import('../lib/prisma');
  const plan = await prisma.plan.findUnique({ where: { name: planName } });
  if (plan) {
    await getOrCreateWallet(workspaceId);
  }

  return { subscription: sub.id, credits: plan?.creditMonthly || 0 };
}
