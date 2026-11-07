import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, AuditResult, AuditActionType } from '@trustvault/database';

export class AdminController {
  /**
   * Real database-backed administrative dashboard metrics
   * (Zero fake numbers or mock statistics)
   */
  static async getDashboardStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        adminCount,
        ownerCount,
        viewerCount,
        totalDocuments,
        recentUploadsCount,
        activePermissionsCount,
        recentPermissionChangesCount,
        successfulOperationsCount,
        deniedAccessAttemptsCount,
        recentActivities,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: UserRole.ADMIN } }),
        prisma.user.count({ where: { role: UserRole.DOCUMENT_OWNER } }),
        prisma.user.count({ where: { role: UserRole.VIEWER } }),
        prisma.document.count({ where: { isDeleted: false } }),
        prisma.document.count({
          where: { isDeleted: false, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.documentPermission.count({ where: { isRevoked: false } }),
        prisma.auditLog.count({
          where: {
            action: {
              in: [
                AuditActionType.DOCUMENT_PERMISSION_GRANTED,
                AuditActionType.DOCUMENT_PERMISSION_REVOKED,
              ],
            },
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.auditLog.count({ where: { result: AuditResult.SUCCESS } }),
        prisma.auditLog.count({ where: { result: AuditResult.DENIED } }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { sequenceNumber: 'desc' },
          include: {
            actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
            targetUser: { select: { id: true, email: true } },
            document: { select: { id: true, title: true, originalFileName: true } },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          metrics: {
            totalUsers,
            adminCount,
            ownerCount,
            viewerCount,
            totalDocuments,
            recentUploadsCount,
            activePermissionsCount,
            recentPermissionChangesCount,
            successfulOperationsCount,
            deniedAccessAttemptsCount,
          },
          recentActivities: recentActivities.map((a) => ({
            ...a,
            sequenceNumber: a.sequenceNumber.toString(),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getActivityMonitoring(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, activities] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.findMany({
          skip,
          take: limit,
          orderBy: { sequenceNumber: 'desc' },
          include: {
            actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
            document: { select: { id: true, title: true, originalFileName: true } },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: activities.map((a) => ({ ...a, sequenceNumber: a.sequenceNumber.toString() })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
}
