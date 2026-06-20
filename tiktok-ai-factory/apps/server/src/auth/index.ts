import { Router, Request, Response, NextFunction } from 'express';
import { AuthService, AppError } from './auth.service';
import { requireAuth, requireRole } from './auth.middleware';
import { prisma } from '../index';

export const authRoutes = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
}

/** POST /api/auth/register */
authRoutes.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    throw new AppError('VALIDATION', 'Email and password are required', 400);
  }
  if (password.length < 8) {
    throw new AppError('VALIDATION', 'Password must be at least 8 characters', 400);
  }
  const result = await AuthService.register(email, password, name);
  res.status(201).json(result);
}));

/** POST /api/auth/login */
authRoutes.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError('VALIDATION', 'Email and password are required', 400);
  }
  const result = await AuthService.login(email, password);
  res.json(result);
}));

/** POST /api/auth/refresh */
authRoutes.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError('VALIDATION', 'refreshToken is required', 400);
  }
  const result = await AuthService.refreshAccessToken(refreshToken);
  res.json(result);
}));

/** POST /api/auth/logout */
authRoutes.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await AuthService.logout(req.user!.userId);
  res.json({ success: true });
}));

/** GET /api/auth/me */
authRoutes.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const profile = await AuthService.getUserProfile(req.user!.userId);
  res.json(profile);
}));

/** POST /api/auth/verify-email */
authRoutes.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('VALIDATION', 'Token is required', 400);
  await AuthService.verifyEmail(token);
  res.json({ success: true, message: 'Email verified successfully' });
}));

/** POST /api/auth/send-verification */
authRoutes.post('/send-verification', requireAuth, asyncHandler(async (req, res) => {
  const token = await AuthService.createEmailVerificationToken(req.user!.userId);
  res.json({ success: true, token: process.env.NODE_ENV === 'production' ? undefined : token });
}));

// ─── Admin User Management Routes ──────────────────────────────

/** GET /api/auth/admin/users — list all users (admin only) */
authRoutes.get('/admin/users', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const search = req.query.search as string || '';
  const users = await prisma.user.findMany({
    where: search ? { email: { contains: search, mode: 'insensitive' } } : {},
    select: {
      id: true, email: true, name: true, role: true,
      emailVerified: true, avatarUrl: true, lastLoginAt: true, createdAt: true,
      _count: { select: { memberships: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(users);
}));

/** GET /api/auth/admin/users/:id — single user detail (admin only) */
authRoutes.get('/admin/users/:id', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, email: true, name: true, role: true,
      emailVerified: true, avatarUrl: true, lastLoginAt: true, createdAt: true,
      memberships: { include: { tenant: { select: { id: true, name: true, slug: true, plan: true } } } },
      creditWallet: { select: { balance: true, lifetime: true, frozen: true } },
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
    },
  });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  res.json(user);
}));

/** PUT /api/auth/admin/users/:id — update user role (admin only) */
authRoutes.put('/admin/users/:id', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
    throw new AppError('VALIDATION', 'Valid role is required', 400);
  }
  // Only superadmin can create superadmins
  if (role === 'superadmin' && req.user!.role !== 'superadmin') {
    throw new AppError('FORBIDDEN', 'Only superadmins can grant superadmin role', 403);
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json(user);
}));

export { requireAuth, optionalAuth, requireRole } from './auth.middleware';
export { AuthService, AppError } from './auth.service';
