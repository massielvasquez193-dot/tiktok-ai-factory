/**
 * Auth Routes — Phase 1
 *
 * POST /api/auth/register          — Create account
 * POST /api/auth/login             — Login
 * POST /api/auth/logout            — Invalidate session
 * GET  /api/auth/me                — Current user
 * PATCH /api/auth/me               — Update profile + change password
 * POST /api/auth/forgot-password   — Request reset
 * POST /api/auth/reset-password    — Reset with token
 * POST /api/auth/verify-email      — Send verification token
 * POST /api/auth/verify-email/confirm — Confirm email with token
 * GET  /api/auth/sessions          — List active sessions
 * DELETE /api/auth/sessions/:id    — Revoke session
 * POST /api/auth/avatar            — Upload avatar
 *
 * When SAAS_MODE=false, all endpoints return a "SaaS mode disabled" message.
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { SAAS_MODE } from '../middleware/auth';
import { AppError } from '../middleware/error';
import * as authService from '../services/auth.service';
import { v4 as uuid } from 'uuid';

export const authRoutes = Router();

// ── Avatar upload config ───────────────────────────────────────────────────

const AVATAR_DIR = path.resolve(process.cwd(), '..', '..', 'uploads', 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
    filename: (_req, file, cb) => cb(null, `avatar-${uuid()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(null, ok);
  },
});

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

// ── POST /api/auth/forgot-password ────────────────────────────────────────

authRoutes.post('/forgot-password', s(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError(400, 'Email is required');
  const result = await authService.requestPasswordReset(email);
  res.json({ success: true, data: result, message: 'If the email exists, a reset link has been sent' });
}));

// ── POST /api/auth/reset-password ─────────────────────────────────────────

authRoutes.post('/reset-password', s(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token) throw new AppError(400, 'Reset token is required');
  if (!newPassword) throw new AppError(400, 'New password is required');
  await authService.resetPassword(token, newPassword);
  res.json({ success: true, message: 'Password has been reset successfully' });
}));

// ── POST /api/auth/verify-email ───────────────────────────────────────────

authRoutes.post('/verify-email', s(async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AppError(401, 'Authentication required');
  const user = await authService.verifyToken(token);
  if (!user) throw new AppError(401, 'Invalid or expired token');
  const result = await authService.requestEmailVerification(user.id);
  res.json({ success: true, data: result });
}));

// ── POST /api/auth/verify-email/confirm ───────────────────────────────────

authRoutes.post('/verify-email/confirm', s(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError(400, 'Verification token is required');
  await authService.verifyEmail(token);
  res.json({ success: true, message: 'Email verified successfully' });
}));

// ── GET /api/auth/sessions ────────────────────────────────────────────────

authRoutes.get('/sessions', s(async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AppError(401, 'Authentication required');
  const user = await authService.verifyToken(token);
  if (!user) throw new AppError(401, 'Invalid or expired token');
  const sessions = await authService.listSessions(user.id);
  res.json({ success: true, data: sessions });
}));

// ── DELETE /api/auth/sessions/:id ─────────────────────────────────────────

authRoutes.delete('/sessions/:id', s(async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AppError(401, 'Authentication required');
  const user = await authService.verifyToken(token);
  if (!user) throw new AppError(401, 'Invalid or expired token');
  await authService.revokeSession(user.id, req.params.id);
  res.json({ success: true, message: 'Session revoked' });
}));

// ── POST /api/auth/avatar ─────────────────────────────────────────────────

authRoutes.post('/avatar', (req: Request, res: Response, next: NextFunction) => {
  if (!SAAS_MODE) {
    res.status(503).json({ message: 'Auth is disabled. Set SAAS_MODE=true to enable.' });
    return;
  }
  avatarUpload.single('avatar')(req, res, async (err: any) => {
    if (err) return next(err);
    try {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
      if (!token) throw new AppError(401, 'Authentication required');

      const authUser = await authService.verifyToken(token);
      if (!authUser) throw new AppError(401, 'Invalid or expired token');

      const file = (req as any).file;
      if (!file) throw new AppError(400, 'No avatar image uploaded');

      const avatarUrl = `/uploads/avatars/${file.filename}`;
      const user = await authService.updateAvatar(authUser.id, avatarUrl);
      res.json({ success: true, data: user });
    } catch (e: any) {
      next(e);
    }
  });
});
