import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, AuditActionType, AuditResult } from '@trustvault/database';
import { UserRoleUpdateSchema, UserStatusUpdateSchema, PaginationQuerySchema } from '@trustvault/shared';
import { logAuditEvent } from '../audit/audit.service';

export class UsersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = PaginationQuerySchema.parse(req.query);
      const skip = (query.page - 1) * query.limit;

      const whereClause: any = {};
      if (req.query.role && Object.values(UserRole).includes(req.query.role as UserRole)) {
        whereClause.role = req.query.role as UserRole;
      }
      if (query.search) {
        whereClause.OR = [
          { email: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [total, users] = await Promise.all([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
            role: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: { ownedDocuments: true, permissionsReceived: true },
            },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: users,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { ownedDocuments: true, permissionsReceived: true },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      return res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user application role
   * (Mandatory Adversarial Scenario 6: Unauthorized role escalation prevention)
   */
  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Strict authorization: only ADMIN can change roles
      if (req.user!.role !== UserRole.ADMIN) {
        await logAuditEvent({
          action: AuditActionType.ROLE_CHANGED,
          result: AuditResult.DENIED,
          actor: req.user!,
          targetUserId: req.params.id,
          failureReason: 'Unauthorized role modification attempt by non-administrator',
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Privilege escalation rejected: only administrators can modify user roles.',
          },
        });
      }

      const validated = UserRoleUpdateSchema.parse(req.body);

      // 2. Prevent self-demotion or self-modification to avoid accidental lockout
      if (req.user!.id === req.params.id && validated.role !== UserRole.ADMIN) {
        const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } });
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'LAST_ADMIN_PROTECTION',
              message: 'Cannot demote the last remaining administrator.',
            },
          });
        }
      }

      const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Target user not found' },
        });
      }

      const previousRole = targetUser.role;
      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: { role: validated.role },
      });

      await logAuditEvent({
        action: AuditActionType.ROLE_CHANGED,
        result: AuditResult.SUCCESS,
        actor: req.user!,
        targetUserId: targetUser.id,
        metadata: {
          previousRole,
          newRole: validated.role,
        },
      });

      return res.json({
        success: true,
        data: updated,
        message: `User role updated successfully to ${validated.role}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate or deactivate application access
   * (Mandatory Adversarial Scenario 9: Deactivated account access rejection)
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only administrators can activate/deactivate accounts.' },
        });
      }

      const validated = UserStatusUpdateSchema.parse(req.body);

      if (req.user!.id === req.params.id && !validated.isActive) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OPERATION', message: 'Administrators cannot deactivate their own account.' },
        });
      }

      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: validated.isActive },
      });

      await logAuditEvent({
        action: validated.isActive ? AuditActionType.LOGIN_SECURITY_EVENT : AuditActionType.USER_ACCESS_DISABLED,
        result: AuditResult.SUCCESS,
        actor: req.user!,
        targetUserId: updated.id,
        metadata: { isActive: validated.isActive },
      });

      return res.json({
        success: true,
        data: updated,
        message: `Account status updated to ${validated.isActive ? 'Active' : 'Deactivated'}`,
      });
    } catch (error) {
      next(error);
    }
  }
}
