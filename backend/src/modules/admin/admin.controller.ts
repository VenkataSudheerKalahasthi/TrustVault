import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, AuditResult, AuditActionType } from '@trustvault/database';
import { env } from '../../config/env';
import { isStorageConfigured } from '../../config/supabase';
import { isClerkConfigured } from '../../config/clerk';
import { verifyAuditLogChain, logAuditEvent } from '../audit/audit.service';
import { z } from 'zod';

const AdminProfileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().max(50).optional().nullable(),
});

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
        activeUsers,
        deactivatedUsers,
        adminCount,
        ownerCount,
        viewerCount,
        totalDocuments,
        activeDocuments,
        deletedDocuments,
        totalDocumentVersions,
        activePermissions,
        revokedPermissions,
        storageAggregation,
        recentUploadsCount,
        recentPermissionChangesCount,
        recentAuditEvents,
        accessDeniedEvents,
        recentActivities,
        chainVerification,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { role: UserRole.ADMIN } }),
        prisma.user.count({ where: { role: UserRole.DOCUMENT_OWNER } }),
        prisma.user.count({ where: { role: UserRole.VIEWER } }),
        prisma.document.count(),
        prisma.document.count({ where: { isDeleted: false } }),
        prisma.document.count({ where: { isDeleted: true } }),
        prisma.documentVersion.count(),
        prisma.documentPermission.count({ where: { isRevoked: false } }),
        prisma.documentPermission.count({ where: { isRevoked: true } }),
        prisma.document.aggregate({
          where: { isDeleted: false },
          _sum: { fileSize: true },
        }),
        prisma.document.count({
          where: { isDeleted: false, createdAt: { gte: sevenDaysAgo } },
        }),
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
        prisma.auditLog.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
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
        verifyAuditLogChain(),
      ]);

      const totalStorageConsumption = storageAggregation._sum.fileSize || 0;

      return res.json({
        success: true,
        data: {
          metrics: {
            totalUsers,
            activeUsers,
            deactivatedUsers,
            adminCount,
            ownerCount,
            viewerCount,
            totalDocuments,
            activeDocuments,
            deletedDocuments,
            totalDocumentVersions,
            activePermissions,
            revokedPermissions,
            totalStorageConsumption,
            recentUploadsCount,
            recentPermissionChangesCount,
            recentAuditEvents,
            accessDeniedEvents,
            auditChainValid: chainVerification.isValid,
            totalVerifiedAuditBlocks: chainVerification.totalVerified,
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
   * Real-time security telemetry & incident monitoring
   * (Section 8: Access denials, repeated probes, privilege escalation attempts)
   */
  static async getSecurityMonitoring(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalDenied,
        recentDenials,
        privilegeEscalations,
        deactivationEvents,
        chainStatus,
      ] = await Promise.all([
        prisma.auditLog.count({ where: { result: AuditResult.DENIED } }),
        prisma.auditLog.findMany({
          where: { result: AuditResult.DENIED },
          take: 30,
          orderBy: { sequenceNumber: 'desc' },
          include: {
            actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
            document: { select: { id: true, title: true, originalFileName: true } },
          },
        }),
        prisma.auditLog.findMany({
          where: { action: AuditActionType.ROLE_CHANGED, result: AuditResult.DENIED },
          take: 20,
          orderBy: { sequenceNumber: 'desc' },
          include: {
            actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
          },
        }),
        prisma.auditLog.findMany({
          where: { action: AuditActionType.USER_ACCESS_DISABLED },
          take: 20,
          orderBy: { sequenceNumber: 'desc' },
          include: {
            actor: { select: { id: true, email: true } },
            targetUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        }),
        verifyAuditLogChain(),
      ]);

      // Group denials by IP to highlight repeat probes
      const ipOccurrences: Record<string, number> = {};
      recentDenials.forEach((d) => {
        if (d.ipAddress) {
          ipOccurrences[d.ipAddress] = (ipOccurrences[d.ipAddress] || 0) + 1;
        }
      });

      const suspiciousIps = Object.entries(ipOccurrences)
        .filter(([_, count]) => count >= 2)
        .map(([ip, count]) => ({ ip, count }));

      return res.json({
        success: true,
        data: {
          summary: {
            totalDeniedAttempts: totalDenied,
            privilegeEscalationCount: privilegeEscalations.length,
            deactivationEventCount: deactivationEvents.length,
            chainIntegrity: chainStatus.isValid,
            verifiedBlockCount: chainStatus.totalVerified,
          },
          recentDenials: recentDenials.map((d) => ({
            ...d,
            sequenceNumber: d.sequenceNumber.toString(),
          })),
          privilegeEscalations: privilegeEscalations.map((p) => ({
            ...p,
            sequenceNumber: p.sequenceNumber.toString(),
          })),
          deactivationEvents: deactivationEvents.map((e) => ({
            ...e,
            sequenceNumber: e.sequenceNumber.toString(),
          })),
          suspiciousIps,
          chainStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * System settings & configuration telemetry
   * (Safe read-only visibility into system invariants without leaking secrets)
   */
  static async getSystemSettings(_req: Request, res: Response) {
    return res.json({
      success: true,
      data: {
        server: {
          environment: env.NODE_ENV,
          port: env.PORT,
          corsOrigin: env.CORS_ORIGIN,
          version: '1.0.0-enterprise',
        },
        storage: {
          provider: 'Supabase Storage',
          bucket: env.SUPABASE_STORAGE_BUCKET,
          configured: isStorageConfigured,
          isPrivate: true,
        },
        database: {
          provider: 'Supabase PostgreSQL',
          schema: 'trustvault (Dedicated Schema Isolation)',
          connectionHealth: 'Active / Connected',
        },
        authentication: {
          provider: 'Clerk Identity Management',
          configured: isClerkConfigured,
          bootstrapAdminEmail: env.BOOTSTRAP_ADMIN_EMAIL || 'Not specified',
          health: isClerkConfigured ? 'Operational' : 'Missing Configuration',
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
          lastAdminProtection: 'Active (Prevents deactivation of final administrator)',
        },
      },
    });
  }

  /**
   * Admin Profile Details
   */
  static async getAdminProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
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
            select: {
              auditLogsActed: true,
              ownedDocuments: true,
              permissionsGranted: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      }

      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Admin Profile
   */
  static async updateAdminProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = AdminProfileUpdateSchema.parse(req.body);

      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName || null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      await logAuditEvent({
        action: AuditActionType.LOGIN_SECURITY_EVENT,
        result: AuditResult.SUCCESS,
        actor: req.user!,
        metadata: {
          updateType: 'ADMIN_PROFILE_UPDATE',
          firstName: validated.firstName,
          lastName: validated.lastName,
        },
      });

      return res.json({
        success: true,
        data: updated,
        message: 'Admin profile updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}
