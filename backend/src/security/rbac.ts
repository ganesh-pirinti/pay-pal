import type { Request, Response, NextFunction } from 'express';
import { logger } from '../infrastructure/logging/logger.js';

export type UserRole = 'underwriter' | 'admin' | 'analyst' | 'auditor';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Enterprise Role-Based Access Control (RBAC) Middleware
 * Enforces least-privilege principles for sensitive fraud overrides and configuration inspection.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract role from header or session (defaults to 'underwriter' for seamless demo access)
    const headerRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    const role: UserRole = (headerRole && ['underwriter', 'admin', 'analyst', 'auditor'].includes(headerRole))
      ? (headerRole as UserRole)
      : 'underwriter';

    const userId = (req.headers['x-user-id'] as string) || 'SEC-USER-001';

    req.user = { userId, role };

    if (!allowedRoles.includes(role)) {
      logger.warn('RBAC Unauthorized Access Attempt', {
        userId,
        role,
        allowedRoles,
        path: req.path,
        method: req.method
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `User role '${role}' is not authorized to perform this operation. Required: [${allowedRoles.join(', ')}]`,
        requiredRoles: allowedRoles
      });
      return;
    }

    logger.audit('RBAC Authorization Granted', {
      userId,
      role,
      path: req.path,
      method: req.method
    });

    next();
  };
}
