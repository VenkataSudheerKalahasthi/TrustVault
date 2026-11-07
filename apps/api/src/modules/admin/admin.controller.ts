import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, AuditResult, AuditActionType } from '@trustvault/database';
import { env } from '../../config/env';
import { isStorageConfigured } from '../../config/supabase';
import { isClerkConfigured } from '../../config/clerk';

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

  /**
   * Real-time activity feed monitoring
   */
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

  /**
   * Global document metadata monitoring
   * (Allows Admin to monitor inventory without giving automatic content access)
   */
  static async getDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, documents] = await Promise.all([
        prisma.document.count(),
        prisma.document.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            owner: { select: { id: true, email: true, firstName: true, lastName: true } },
            category: true,
            _count: {
              select: {
                permissions: { where: { isRevoked: false } },
                versions: true,
                downloads: true,
                auditLogs: true,
              },
            },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: documents.map((d) => ({
          ...d,
          activePermissionCount: d._count.permissions,
          versionCount: d._count.versions,
          downloadCount: d._count.downloads,
          auditCount: d._count.auditLogs,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Global permissions monitoring (All grants and revocations)
   */
  static async getPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [total, permissions] = await Promise.all([
        prisma.documentPermission.count(),
        prisma.documentPermission.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            grantedBy: { select: { id: true, email: true } },
            revokedBy: { select: { id: true, email: true } },
            document: { select: { id: true, title: true, originalFileName: true } },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: permissions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * System settings & configuration telemetry
   */
  static async getSystemSettings(_req: Request, res: Response) {
    return res.json({
      success: true,
      data: {
        server: {
          environment: env.NODE_ENV,
          port: env.PORT,
          corsOrigin: env.CORS_ORIGIN,
        },
        storage: {
          provider: 'Supabase Storage',
          bucket: env.SUPABASE_STORAGE_BUCKET,
          configured: isStorageConfigured,
        },
        authentication: {
          provider: 'Clerk Identity Management',
          configured: isClerkConfigured,
          bootstrapAdminEmail: env.BOOTSTRAP_ADMIN_EMAIL || 'Not specified',
        },
        aiAssistance: {
          configured: Boolean(env.AI_API_KEY),
          model: env.AI_API_KEY ? 'Active (Gemini Context Model)' : 'Context-heuristic baseline',
        },
        securityGuards: {
          rateLimiting: 'Active (300 req/15min, 30 sensitive ops/5min)',
          auditIntegrity: 'SHA-256 Hash Chaining Active',
          instantRevocation: 'Zero Signed URLs / Authenticated Backend Streaming',
          leastPrivilege: 'Enforced (Admins have zero automatic content access)',
        },
      },
    });
  }
}
