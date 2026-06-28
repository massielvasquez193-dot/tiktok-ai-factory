/** Credit Routes — Sprint 3 Phase 2 */

import { Router, Request, Response, NextFunction } from 'express';
import { SAAS_MODE } from '../middleware/auth';
import { AppError } from '../middleware/error';
import * as authService from '../services/auth.service';
import * as creditService from '../services/credit.service';

export const creditRoutes = Router({ mergeParams: true });

function s(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!SAAS_MODE) { res.status(503).json({ message: 'SaaS mode disabled' }); return; }
    try { await handler(req, res); } catch (e) { next(e); }
  };
}

async function getUserId(req: Request): Promise<string> {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) throw new AppError(401, 'Auth required');
  const u = await authService.verifyToken(t);
  if (!u) throw new AppError(401, 'Invalid token');
  return u.id;
}

// GET /api/workspaces/:id/credits
creditRoutes.get('/', s(async (req, res) => {
  await getUserId(req);
  const wallet = await creditService.getOrCreateWallet(req.params.id);
  const history = await creditService.getTransactionHistory(req.params.id, { limit: 30 });
  res.json({ success: true, data: { wallet, transactions: history } });
}));

// GET /api/workspaces/:id/credits/transactions
creditRoutes.get('/transactions', s(async (req, res) => {
  await getUserId(req);
  const history = await creditService.getTransactionHistory(req.params.id, {
    limit: parseInt(req.query.limit as string) || 50,
    category: req.query.category as string | undefined,
    type: req.query.type as string | undefined,
  });
  res.json({ success: true, data: history });
}));

// POST /api/workspaces/:id/credits/consume
creditRoutes.post('/consume', s(async (req, res) => {
  const userId = await getUserId(req);
  const { amount, category, referenceType, referenceId } = req.body;
  if (!amount || !category) throw new AppError(400, 'amount and category required');
  const result = await creditService.consumeCredits(
    req.params.id, userId, amount, category, referenceType || '', referenceId || '',
  );
  res.json({ success: true, data: result });
}));

// POST /api/workspaces/:id/credits/grant (admin only)
creditRoutes.post('/grant', s(async (req, res) => {
  const userId = await getUserId(req);
  const { checkPermission } = await import('../services/rbac.service');
  if (!(await checkPermission(userId, req.params.id, 'credit', 'grant'))) {
    throw new AppError(403, 'Insufficient permissions');
  }
  const { amount, type, category } = req.body;
  if (!amount) throw new AppError(400, 'amount required');
  const result = await creditService.grantCredits(
    req.params.id, userId, amount, type || 'grant', category || 'admin',
  );
  res.json({ success: true, data: result });
}));
