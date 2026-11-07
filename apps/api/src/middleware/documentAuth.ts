import { Request, Response, NextFunction } from 'express';
import { prisma, Document, PermissionType, AuditActionType, AuditResult } from '@trustvault/database';
import { logAuditEvent } from '../modules/audit/audit.service';

declare global {
  namespace Express {
    interface Request {
      targetDocument?: Document;
    }
  }
}

export type DocumentOperation = 'READ' | 'EDIT' | 'OWNER' | 'DOWNLOAD';

/**
 * Real-time Document Authorization Middleware
 * Enforces ownership or active, non-revoked document permissions on every request
 * Implements RISE Zero Trust & Least Privilege specifications
 */
export function requireDocumentPermission(operation: DocumentOperation) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const documentId = req.params.id || req.params.documentId;
      if (!documentId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Document identifier required' },
        });
      }

      // 1. Fetch document from database
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document || document.isDeleted) {
        // Log denial without leaking document existence to unauthorized requester
        await logAuditEvent({
          action: AuditActionType.ACCESS_DENIED,
          result: AuditResult.DENIED,
          actor: req.user,
          documentId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId: (req.headers['x-correlation-id'] as string) || req.id,
          failureReason: 'Attempted access on non-existent or deleted document',
        });

        return res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found or is no longer accessible.',
          },
        });
      }

      // 2. Owner has full permissions across all operations
      if (document.ownerId === req.user.id) {
        req.targetDocument = document;
        return next();
      }

      // 3. System Administrator: Monitoring privileges ONLY.
      // Admins do NOT have automatic access to confidential document contents or downloads
      if (req.user.role === 'ADMIN') {
        if (operation === 'READ' && req.query.metadataOnly === 'true') {
          req.targetDocument = document;
          return next();
        }

        // Check if Admin was explicitly granted permission by the owner
        const adminGrant = await prisma.documentPermission.findFirst({
          where: {
            documentId: document.id,
            userId: req.user.id,
            isRevoked: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });

        if (adminGrant) {
          if (operation === 'DOWNLOAD' && !adminGrant.canDownload) {
            await logAuditEvent({
              action: AuditActionType.ACCESS_DENIED,
              result: AuditResult.DENIED,
              actor: req.user,
              documentId: document.id,
              failureReason: 'Administrator denied download: download permission not granted',
            });
            return res.status(403).json({
              success: false,
              error: {
                code: 'DOWNLOAD_FORBIDDEN',
                message: 'Download permission has not been granted for this document.',
              },
            });
          }
          req.targetDocument = document;
          return next();
        }

        // Administrative content access denied under Least Privilege
        await logAuditEvent({
          action: AuditActionType.ACCESS_DENIED,
          result: AuditResult.DENIED,
          actor: req.user,
          documentId: document.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId: (req.headers['x-correlation-id'] as string) || req.id,
          failureReason: 'Administrator denied content access: Least Privilege principle enforced',
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Administrative privileges do not grant automatic access to confidential document contents without an explicit grant.',
          },
        });
      }

      // 4. Operations requiring OWNER role (sharing, revocation, deletion)
      if (operation === 'OWNER') {
        await logAuditEvent({
          action: AuditActionType.ACCESS_DENIED,
          result: AuditResult.DENIED,
          actor: req.user,
          documentId: document.id,
          failureReason: 'Non-owner attempted owner-restricted operation',
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only the document owner can perform this operation.',
          },
        });
      }

      // 5. Query active, non-revoked permission in real time
      // (Guarantees instant access revocation: previously issued links/sessions fail immediately)
      const activePermission = await prisma.documentPermission.findFirst({
        where: {
          documentId: document.id,
          userId: req.user.id,
          isRevoked: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (!activePermission) {
        await logAuditEvent({
          action: AuditActionType.ACCESS_DENIED,
          result: AuditResult.DENIED,
          actor: req.user,
          documentId: document.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId: (req.headers['x-correlation-id'] as string) || req.id,
          failureReason: 'No active permission found (revoked, expired, or never granted)',
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. You do not have permission to view or download this document.',
          },
        });
      }

      // 6. Verify operation-specific capabilities
      if (operation === 'EDIT' && activePermission.permission !== PermissionType.EDIT) {
        await logAuditEvent({
          action: AuditActionType.ACCESS_DENIED,
          result: AuditResult.DENIED,
          actor: req.user,
          documentId: document.id,
          failureReason: 'Read-only viewer attempted to edit document',
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Edit permission required. You have Read-only access to this document.',
          },
        });
      }

      if (operation === 'DOWNLOAD' && !activePermission.canDownload) {
        await logAuditEvent({
          action: AuditActionType.ACCESS_DENIED,
          result: AuditResult.DENIED,
          actor: req.user,
          documentId: document.id,
          failureReason: 'Download prohibited by document access policy',
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'DOWNLOAD_FORBIDDEN',
            message: 'Download permission has not been granted for this document.',
          },
        });
      }

      req.targetDocument = document;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
