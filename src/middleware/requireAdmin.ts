import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, AdminTokenPayload } from '../services/auth';

export interface AuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
}

/**
 * Protects admin-only write routes. Expects `Authorization: Bearer <token>`,
 * issued by POST /api/auth/login. Any route behind this should only be callable
 * by the admin panel, never the public site.
 *
 * Also accepts `x-internal-api-key` matching INTERNAL_ADMIN_API_KEY as a second,
 * equally-trusted credential — used by the separate admin app's server-to-server
 * proxy routes, which authenticate the human via Firebase on their side before
 * forwarding here.
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const internalKey = req.headers['x-internal-api-key'];
  if (
    typeof internalKey === 'string' &&
    process.env.INTERNAL_ADMIN_API_KEY &&
    internalKey === process.env.INTERNAL_ADMIN_API_KEY
  ) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Restricts a route to SUPER_ADMIN only (e.g. managing other admin accounts). */
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.admin?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}
