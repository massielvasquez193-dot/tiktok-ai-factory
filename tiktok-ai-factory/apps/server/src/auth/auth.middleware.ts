import { Request, Response, NextFunction } from 'express';
import { AuthService, JwtPayload, AppError } from './auth.service';

/** Extend Express Request to carry authenticated user info */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

/**
 * Required authentication middleware.
 * Rejects the request with 401 if no valid Bearer token is present.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Missing authorization header', 401);
    }
    const token = header.slice(7);
    const payload = AuthService.verifyAccessToken(token);
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch (err: any) {
    if (err instanceof AppError) return next(err);
    next(new AppError('UNAUTHORIZED', err.message || 'Invalid token', 401));
  }
}

/**
 * Optional authentication middleware.
 * Populates req.user if a valid token is present, but does not reject.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.slice(7);
      const payload = AuthService.verifyAccessToken(token);
      req.user = payload;
      req.tenantId = payload.tenantId;
    }
  } catch {
    // silently ignore invalid tokens for optional auth
  }
  next();
}

/**
 * Role-based access control middleware factory.
 * Usage: app.use('/admin', requireAuth, requireRole('admin', 'superadmin'))
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 'Insufficient permissions', 403));
    }
    next();
  };
}
