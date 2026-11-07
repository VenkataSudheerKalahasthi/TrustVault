import { Request, Response, NextFunction } from 'express';
import { PermissionsService } from './permissions.service';
import { GrantPermissionSchema, RevokePermissionSchema } from '@trustvault/shared';

export class PermissionsController {
  static async grant(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = GrantPermissionSchema.parse(req.body);
      const permission = await PermissionsService.grantPermission({
        documentId: req.params.id,
        targetUserId: validated.targetUserId,
        permission: validated.permission,
        canDownload: validated.canDownload,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        grantor: req.user!,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: (req.headers['x-correlation-id'] as string) || req.id,
      });

      return res.status(201).json({
        success: true,
        data: permission,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await PermissionsService.listDocumentPermissions(req.params.id);
      return res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }

  static async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = RevokePermissionSchema.parse(req.body);
      const revoked = await PermissionsService.revokePermission({
        documentId: req.params.id,
        permissionId: req.params.permissionId,
        revoker: req.user!,
        reason: validated.reason,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: (req.headers['x-correlation-id'] as string) || req.id,
      });

      return res.json({
        success: true,
        data: revoked,
        message: 'Permission revoked immediately. Access has been terminated.',
      });
    } catch (error) {
      next(error);
    }
  }
}
