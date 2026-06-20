import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { AppError } from '../auth/auth.service';

export const tenantRoutes = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
}

/** GET /api/tenant — list current user's tenants */
tenantRoutes.get('/', requireAuth, asyncHandler(async (req, res) => {
  const memberships = await prisma.tenantMember.findMany({
    where: { userId: req.user!.userId },
    include: {
      tenant: { select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(memberships.map(m => ({ ...m.tenant, role: m.role, permissions: JSON.parse(m.permissions || '[]') })));
}));

/** POST /api/tenant — create new tenant */
tenantRoutes.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { name, slug } = req.body;
  if (!name) throw new AppError('VALIDATION', 'name is required', 400);

  const tenantSlug = slug || name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  const existing = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (existing) throw new AppError('SLUG_TAKEN', 'Tenant slug already taken', 409);

  // Check plan limits
  const currentTenants = await prisma.tenantMember.count({ where: { userId: req.user!.userId } });
  const subscription = await prisma.subscription.findUnique({ where: { userId: req.user!.userId } });
  const planLimits: Record<string, number> = { free: 1, starter: 3, pro: 999, enterprise: 999 };
  const limit = planLimits[subscription?.plan || 'free'] || 1;
  if (currentTenants >= limit) {
    throw new AppError('PLAN_LIMIT', `Your plan allows max ${limit} tenant(s)`, 403);
  }

  const tenant = await prisma.tenant.create({ data: { name, slug: tenantSlug } });
  await prisma.tenantMember.create({
    data: {
      tenantId: tenant.id,
      userId: req.user!.userId,
      role: 'owner',
      permissions: JSON.stringify(['*']),
    },
  });

  res.status(201).json(tenant);
}));

/** PUT /api/tenant/:id — update tenant settings */
tenantRoutes.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const membership = await prisma.tenantMember.findFirst({
    where: { tenantId: req.params.id, userId: req.user!.userId },
  });
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new AppError('FORBIDDEN', 'Insufficient tenant permissions', 403);
  }

  const { name, settings } = req.body;
  const updateData: any = {};
  if (name) updateData.name = name;
  if (settings) updateData.settings = typeof settings === 'string' ? settings : JSON.stringify(settings);

  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: updateData,
  });
  res.json(tenant);
}));

/** DELETE /api/tenant/:id — delete tenant (owner only) */
tenantRoutes.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const membership = await prisma.tenantMember.findFirst({
    where: { tenantId: req.params.id, userId: req.user!.userId },
  });
  if (!membership || membership.role !== 'owner') {
    throw new AppError('FORBIDDEN', 'Only the tenant owner can delete a tenant', 403);
  }

  await prisma.tenant.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

/** GET /api/tenant/:id/members — list tenant members */
tenantRoutes.get('/:id/members', requireAuth, asyncHandler(async (req, res) => {
  const membership = await prisma.tenantMember.findFirst({
    where: { tenantId: req.params.id, userId: req.user!.userId },
  });
  if (!membership) throw new AppError('FORBIDDEN', 'Not a tenant member', 403);

  const members = await prisma.tenantMember.findMany({
    where: { tenantId: req.params.id },
    include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
  });
  res.json(members);
}));

/** POST /api/tenant/:id/invite — invite user to tenant */
tenantRoutes.post('/:id/invite', requireAuth, asyncHandler(async (req, res) => {
  const membership = await prisma.tenantMember.findFirst({
    where: { tenantId: req.params.id, userId: req.user!.userId },
  });
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new AppError('FORBIDDEN', 'Insufficient tenant permissions', 403);
  }

  const { email, role } = req.body;
  if (!email) throw new AppError('VALIDATION', 'email is required', 400);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('NOT_FOUND', 'User not found. They must register first.', 404);

  const existing = await prisma.tenantMember.findFirst({
    where: { tenantId: req.params.id, userId: user.id },
  });
  if (existing) throw new AppError('ALREADY_MEMBER', 'User is already a member', 409);

  await prisma.tenantMember.create({
    data: {
      tenantId: req.params.id,
      userId: user.id,
      role: role || 'member',
      permissions: JSON.stringify(role === 'admin' ? ['manage_members', 'manage_content'] : []),
    },
  });
  res.status(201).json({ success: true });
}));

/** DELETE /api/tenant/:id/members/:userId — remove member */
tenantRoutes.delete('/:id/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const membership = await prisma.tenantMember.findFirst({
    where: { tenantId: req.params.id, userId: req.user!.userId },
  });
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new AppError('FORBIDDEN', 'Insufficient tenant permissions', 403);
  }

  const target = await prisma.tenantMember.findFirst({
    where: { tenantId: req.params.id, userId: req.params.userId },
  });
  if (target?.role === 'owner') throw new AppError('FORBIDDEN', 'Cannot remove the tenant owner', 403);

  await prisma.tenantMember.deleteMany({
    where: { tenantId: req.params.id, userId: req.params.userId },
  });
  res.json({ success: true });
}));

// ─── Admin Routes ────────────────────────────────────────────────

/** GET /api/tenant/admin/all — superadmin: list all tenants */
tenantRoutes.get('/admin/all', requireAuth, requireRole('superadmin'), asyncHandler(async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { members: true, products: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tenants);
}));

/** PUT /api/tenant/admin/:id — superadmin: manage tenant status */
tenantRoutes.put('/admin/:id', requireAuth, requireRole('superadmin'), asyncHandler(async (req, res) => {
  const { status, plan } = req.body;
  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { ...(status && { status }), ...(plan && { plan }) },
  });
  res.json(tenant);
}));
