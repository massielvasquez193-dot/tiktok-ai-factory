/**
 * Billing Service — Sprint 3 Phase 3
 *
 * Stripe integration stub. Real implementation requires STRIPE_SECRET_KEY.
 * LemonSqueezy support added for global coverage.
 */

export interface CheckoutOptions {
  workspaceId: string;
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface BillingProvider {
  name: 'stripe' | 'lemonsqueezy';
  isConfigured: boolean;
}

/**
 * Check if Stripe is configured.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Check if LemonSqueezy is configured.
 */
export function isLemonSqueezyConfigured(): boolean {
  return !!process.env.LEMONSQUEEZY_API_KEY;
}

/**
 * Get available billing providers.
 */
export function getAvailableProviders(): BillingProvider[] {
  return [
    { name: 'stripe', isConfigured: isStripeConfigured() },
    { name: 'lemonsqueezy', isConfigured: isLemonSqueezyConfigured() },
  ];
}

/**
 * Create a checkout session. Stub — returns mock URL when no Stripe key.
 */
export async function createCheckout(opts: CheckoutOptions): Promise<{ url: string; sessionId: string }> {
  if (isStripeConfigured()) {
    // Real Stripe integration would go here:
    // const session = await stripe.checkout.sessions.create({...})
    // return { url: session.url!, sessionId: session.id };
    throw new Error('Stripe real integration requires STRIPE_SECRET_KEY. Set it in .env');
  }

  // Mock checkout for development
  const sessionId = `cs_test_${Date.now()}`;
  const url = `${opts.successUrl}?session_id=${sessionId}`;
  return { url, sessionId };
}

/**
 * Process webhook event. Stub.
 */
export async function handleWebhook(event: any): Promise<{ received: boolean; type: string }> {
  const type = event?.type || 'unknown';
  // Real: switch(type) { case 'checkout.session.completed': ... }
  console.log(`[Billing] Webhook received: ${type}`);
  return { received: true, type };
}

/**
 * Build checkout URL components for frontend.
 */
export function getCheckoutConfig() {
  return {
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY || '',
    isConfigured: isStripeConfigured(),
    availableProviders: getAvailableProviders(),
  };
}
