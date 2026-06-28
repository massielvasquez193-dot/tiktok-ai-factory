/**
 * Auth Middleware — Sprint 1
 *
 * authenticate: Extracts JWT from Authorization header, verifies, sets req.user.
 * No-op when SAAS_MODE=false (production default).
 *
 * requirePermission: RBAC check — verifies user's role has required permission.
 * requireWorkspace: Extracts workspaceId from header or route param.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken as verifyAuthToken, AuthUser } from '../services/auth.service';

// ── Feature Flag ────────────────────────────────────────────────────────────

export const SAAS_MODE = process.env.SAAS_MODE === 'true';

// ── Express Type Extension ──────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      workspaceId?: string;
      userRole?: string;
    }
  }
}

// ── authenticate Middleware ─────────────────────────────────────────────────

/**
 * Authenticate requests via JWT Bearer token.
 *
 * When SAAS_MODE=false: pass-through no-op (sets req.user = undefined).
 * When SAAS_MODE=true:  validates JWT, sets req.user, returns 401 on failure.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // No-op when SaaS mode is disabled
  if (!SAAS_MODE) {
    return next();
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  verifyAuthToken(token)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
      req.user = user;
      next();
    })
    .catch(() => {
      res.status(401).json({ error: 'Authentication failed' });
    });
}

// ── requirePermission Middleware ────────────────────────────────────────────

/**
 * RBAC middleware factory — checks user has required permission in workspace.
 * Requires authenticate middleware to run first (sets req.user).
 * When SAAS_MODE=false: always allows (no-op).
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!SAAS_MODE) return next();

    const user = req.user;
    const workspaceId = req.workspaceId || req.headers['x-workspace-id'] as string;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({ error: 'Workspace context required. Set x-workspace-id header.' });
      return;
    }

    // Dynamic import to avoid circular dependency (rbac.service imports prisma)
    const { checkPermission } = await import('../services/rbac.service');
    const allowed = await checkPermission(user.id, workspaceId, resource, action);

    if (!allowed) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: `${resource}:${action}`,
      });
      return;
    }

    next();
  };
}

// ── requireWorkspace Middleware ─────────────────────────────────────────────

/**
 * Extract workspaceId from x-workspace-id header or :workspaceId route param.
 */
export function requireWorkspace(req: Request, res: Response, next: NextFunction): void {
  if (!SAAS_MODE) return next();

  const fromHeader = req.headers['x-workspace-id'] as string;
  const fromParam = req.params?.workspaceId || req.params?.id;

  const workspaceId = fromHeader || fromParam;
  if (!workspaceId) {
    res.status(400).json({ error: 'Workspace context required' });
    return;
  }

  req.workspaceId = workspaceId;
  next();
}
