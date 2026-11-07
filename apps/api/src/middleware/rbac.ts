import { Request, Response, NextFunction } from 'express';
import { UserRole, AuditActionType, AuditResult } from '@trustvault/database';
import { logAuditEvent } from '../modules/audit/audit.service';

/**
 * Ensures user account is currently active in TrustVault database
 * (Mandatory Adversarial Scenario 9)
 */
export async function requireActiveUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  if (!req.user.isActive) {
    await logAuditEvent({
      action: AuditActionType.ACCESS_DENIED,
      result: AuditResult.DENIED,
      actor: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: (req.headers['x-correlation-id'] as string) || req.id,
      failureReason: 'Deactivated account attempted API access',
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Your account has been deactivated. Access is revoked. Please contact an administrator.',
      },
    });
  }

  next();
}

/**
 * Enforces centralized backend application role
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      await logAuditEvent({
        action: AuditActionType.ACCESS_DENIED,
        result: AuditResult.DENIED,
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: (req.headers['x-correlation-id'] as string) || req.id,
        failureReason: `Role ${req.user.role} insufficient for endpoint requiring [${allowedRoles.join(', ')}]`,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient administrative privileges to access this resource.',
        },
      });
    }

    next();
  };
}
