/**
 * Auth Routes — Phase 1
 *
 * POST /api/auth/register  — Create account
 * POST /api/auth/login     — Login
 * POST /api/auth/logout    — Invalidate session
 * GET  /api/auth/me        — Current user
 * PATCH /api/auth/me       — Update profile
 *
 * When SAAS_MODE=false, all endpoints return a "SaaS mode disabled" message.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SAAS_MODE } from '../middleware/auth';
import { AppError } from '../middleware/error';
import * as authService from '../services/auth.service';

export const authRoutes = Router();

// ── Helper: run handler or return "SaaS disabled" ──────────────────────────

function s(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!SAAS_MODE) {
      res.status(503).json({ message: 'Auth is disabled. Set SAAS_MODE=true to enable.' });
      return;
    }
    try {
      await handler(req, res);
    } catch (e) {
      next(e);
    }
  };
}

// ── POST /api/auth/register ────────────────────────────────────────────────

authRoutes.post('/register', s(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) throw new AppError(400, 'Email and password are required');
  const result = await authService.register(email, password, name);
  res.status(201).json({ success: true, data: result });
}));

// ── POST /api/auth/login ───────────────────────────────────────────────────

authRoutes.post('/login', s(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError(400, 'Email and password are required');
  const result = await authService.login(email, password);
  res.json({ success: true, data: result });
}));

// ── POST /api/auth/logout ──────────────────────────────────────────────────

authRoutes.post('/logout', s(async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) await authService.logout(token);
  res.json({ success: true, message: 'Logged out' });
}));

// ── GET /api/auth/me ───────────────────────────────────────────────────────

authRoutes.get('/me', s(async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AppError(401, 'Authentication required');

  const user = await authService.verifyToken(token);
  if (!user) throw new AppError(401, 'Invalid or expired token');

  res.json({ success: true, data: user });
}));

// ── PATCH /api/auth/me ─────────────────────────────────────────────────────

authRoutes.patch('/me', s(async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AppError(401, 'Authentication required');

  const authUser = await authService.verifyToken(token);
  if (!authUser) throw new AppError(401, 'Invalid or expired token');

  const { name, locale, timezone, currentPassword, newPassword } = req.body;

  if (newPassword) {
    if (!currentPassword) throw new AppError(400, 'Current password is required to change password');
    await authService.changePassword(authUser.id, currentPassword, newPassword);
  }

  const user = await authService.updateMe(authUser.id, { name, locale, timezone });
  res.json({ success: true, data: user });
}));
