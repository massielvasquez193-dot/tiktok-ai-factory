/**
 * Auth Middleware — Phase 1
 *
 * authenticate: Extracts JWT from Authorization header, verifies, sets req.user.
 * No-op when SAAS_MODE=false (production default until Phase 4).
 *
 * requirePermission / requireWorkspace stubs — implemented in Phase 3.
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

// ── requirePermission Stub (Phase 3) ───────────────────────────────────────

/**
 * RBAC middleware factory — checks user has required permission in current workspace.
 * STUB in Phase 1/2: always allows. Full implementation in Phase 3.
 */
export function requirePermission(_resource: string, _action: string) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (!SAAS_MODE) return next();
    // Phase 3 will implement actual permission check
    return next();
  };
}

// ── requireWorkspace Middleware (Phase 2) ───────────────────────────────────

/**
 * Extract workspaceId from x-workspace-id header or :workspaceId route param.
 * STUB in Phase 1: always allows. Full implementation in Phase 2.
 */
export function requireWorkspace(_req: Request, _res: Response, next: NextFunction): void {
  if (!SAAS_MODE) return next();
  // Phase 2 will extract and validate workspaceId
  return next();
}
