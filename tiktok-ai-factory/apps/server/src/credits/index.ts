import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { CreditsService } from './credits.service';
import { AppError } from '../auth/auth.service';

export const creditRoutes = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
}

/** GET /api/credits/balance — current user's credit balance */
creditRoutes.get('/balance', requireAuth, asyncHandler(async (req, res) => {
  const balance = await CreditsService.getBalance(req.user!.userId);
  res.json(balance);
}));

/** GET /api/credits/ledger — user's credit transaction history */
creditRoutes.get('/ledger', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const result = await CreditsService.getLedger(req.user!.userId, page, pageSize);
  res.json(result);
}));

/** POST /api/credits/check — check if user has enough credits */
creditRoutes.post('/check', requireAuth, asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) throw new AppError('VALIDATION', 'amount is required', 400);
  const hasEnough = await CreditsService.hasEnoughCredits(req.user!.userId, amount);
  const balance = await CreditsService.getBalance(req.user!.userId);
  res.json({ hasEnough, required: amount, balance });
}));

// ─── Admin Routes ────────────────────────────────────────────────

/** GET /api/credits/admin/ledger/:userId — admin view of any user's ledger */
creditRoutes.get('/admin/ledger/:userId', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await CreditsService.getLedger(req.params.userId, page);
  res.json(result);
}));

/** POST /api/credits/admin/adjust — admin adjust any user's credits */
creditRoutes.post('/admin/adjust', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const { userId, amount, reason } = req.body;
  if (!userId || !amount) throw new AppError('VALIDATION', 'userId and amount are required', 400);
  const newBalance = await CreditsService.adminAdjust(req.user!.userId, userId, amount, reason || 'Admin adjustment');
  res.json({ success: true, userId, newBalance });
}));
