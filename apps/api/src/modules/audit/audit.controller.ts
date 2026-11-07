import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole } from '@trustvault/database';
import { verifyAuditLogChain } from './audit.service';
import { AuditLogQuerySchema } from '@trustvault/shared';

export class AuditController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = AuditLogQuerySchema.parse(req.query);
      const skip = (query.page - 1) * query.limit;

      const whereClause: any = {};

      if (query.action) whereClause.action = query.action;
      if (query.result) whereClause.result = query.result;
      if (query.actorId) whereClause.actorId = query.actorId;
      if (query.documentId) whereClause.documentId = query.documentId;

      if (query.dateFrom || query.dateTo) {
        whereClause.createdAt = {};
        if (query.dateFrom) whereClause.createdAt.gte = new Date(query.dateFrom);
        if (query.dateTo) whereClause.createdAt.lte = new Date(query.dateTo);
      }

      // If Document Owner, only allow viewing audit events related to their owned documents
      if (req.user!.role === UserRole.DOCUMENT_OWNER) {
        whereClause.OR = [
          { actorId: req.user!.id },
          { document: { ownerId: req.user!.id } },
        ];
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.findMany({
          where: whereClause,
          skip,
          take: query.limit,
          orderBy: { sequenceNumber: 'desc' },
          include: {
            actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
            targetUser: { select: { id: true, email: true, firstName: true, lastName: true } },
            document: { select: { id: true, title: true, originalFileName: true } },
          },
        }),
      ]);

      return res.json({
        success: true,
        data: logs.map((l) => ({
          ...l,
          sequenceNumber: l.sequenceNumber.toString(),
        })),
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
      const log = await prisma.auditLog.findUnique({
        where: { id: req.params.id },
        include: {
          actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
          targetUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          document: { select: { id: true, title: true, originalFileName: true } },
        },
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Audit event not found' },
        });
      }

      // If document owner, verify ownership boundary
      if (req.user!.role === UserRole.DOCUMENT_OWNER) {
        const isActor = log.actorId === req.user!.id;
        const isDocOwner = log.documentId && (await prisma.document.findFirst({ where: { id: log.documentId, ownerId: req.user!.id } }));
        if (!isActor && !isDocOwner) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Access denied to this audit record.' },
          });
        }
      }

      return res.json({
        success: true,
        data: {
          ...log,
          sequenceNumber: log.sequenceNumber.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyChain(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await verifyAuditLogChain();
      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static rejectTamperAttempt(_req: Request, res: Response) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUDIT_IMMUTABLE',
        message: 'Security Violation: Audit trail records are cryptographically sealed, append-only, and cannot be updated or deleted.',
      },
    });
  }
}
