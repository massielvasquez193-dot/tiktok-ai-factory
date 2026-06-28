/**
 * Subscription Routes — Sprint 3 Phase 1
 *
 * GET    /api/plans                    — List available plans
 * GET    /api/plans/:id                — Plan detail
 * GET    /api/workspaces/:id/subscription — Current subscription
 * POST   /api/workspaces/:id/subscription — Assign/change plan
 * POST   /api/workspaces/:id/subscription/cancel — Cancel
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SAAS_MODE } from '../middleware/auth';
import { AppError } from '../middleware/error';
import * as authService from '../services/auth.service';
import * as subService from '../services/subscription.service';

export const planRoutes = Router();
export const subscriptionRoutes = Router({ mergeParams: true });

// ── Helpers ────────────────────────────────────────────────────────────────

function s(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!SAAS_MODE) { res.status(503).json({ message: 'SaaS mode disabled' }); return; }
    try { await handler(req, res); } catch (e) { next(e); }
  };
}

async function getUserId(req: Request): Promise<string> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AppError(401, 'Authentication required');
  const user = await authService.verifyToken(token);
  if (!user) throw new AppError(401, 'Invalid token');
  return user.id;
}

// ── GET /api/plans ───────────────────────────────────────────────────────

planRoutes.get('/', s(async (req, res) => {
  const plans = await subService.listPlans();
  res.json({ success: true, data: plans });
}));

planRoutes.get('/:id', s(async (req, res) => {
  const plan = await subService.getPlan(req.params.id);
  if (!plan) throw new AppError(404, 'Plan not found');
  res.json({ success: true, data: plan });
}));

// ── GET /api/workspaces/:id/subscription ─────────────────────────────────

subscriptionRoutes.get('/', s(async (req, res) => {
  const userId = await getUserId(req);
  const sub = await subService.getSubscription(req.params.id);
  if (!sub) throw new AppError(404, 'No active subscription');
  const plan = await subService.getWorkspacePlan(req.params.id);
  res.json({ success: true, data: { subscription: sub, plan } });
}));

subscriptionRoutes.post('/', s(async (req, res) => {
  const userId = await getUserId(req);
  const { planName, billingPeriod } = req.body;
  if (!planName) throw new AppError(400, 'planName is required');
  // Only owner/admin can change plan
  const { checkPermission } = await import('../services/rbac.service');
  if (!(await checkPermission(userId, req.params.id, 'subscription', 'create'))) {
    throw new AppError(403, 'Insufficient permissions');
  }
  const sub = await subService.assignPlan(req.params.id, planName, billingPeriod || 'monthly');
  res.json({ success: true, data: sub });
}));

// POST checkout
subscriptionRoutes.post('/checkout', s(async (req, res) => {
  const userId = await getUserId(req);
  const { checkPermission } = await import('../services/rbac.service');
  if (!(await checkPermission(userId, req.params.id, 'subscription', 'create'))) {
    throw new AppError(403, 'Insufficient permissions');
  }
  const { planName, billingPeriod, successUrl, cancelUrl } = req.body;
  if (!planName) throw new AppError(400, 'planName required');
  const { createCheckout, getCheckoutConfig } = await import('../services/billing.service');
  // Get plan
  const { getPlan } = await import('../services/subscription.service');
  const plan = await getPlan(planName);
  if (!plan) throw new AppError(404, `Plan ${planName} not found`);

  const result = await createCheckout({
    workspaceId: req.params.id, planId: plan.id,
    billingPeriod: billingPeriod || 'monthly',
    successUrl: successUrl || '/settings/billing?success=1',
    cancelUrl: cancelUrl || '/pricing?canceled=1',
  });
  res.json({ success: true, data: { ...result, config: getCheckoutConfig() } });
}));

subscriptionRoutes.post('/cancel', s(async (req, res) => {
  const userId = await getUserId(req);
  const { checkPermission } = await import('../services/rbac.service');
  if (!(await checkPermission(userId, req.params.id, 'subscription', 'cancel'))) {
    throw new AppError(403, 'Insufficient permissions');
  }
  const sub = await subService.cancelSubscription(req.params.id);
  res.json({ success: true, data: sub });
}));
