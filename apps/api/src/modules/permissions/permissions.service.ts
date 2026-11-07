import { prisma, User, PermissionType, AuditActionType, AuditResult } from '@trustvault/database';
import { logAuditEvent } from '../audit/audit.service';

export class PermissionsService {
  /**
   * Share document with a registered user (Grant Read or Edit)
   * (Mandatory Adversarial Scenario 2 & 10: ACID transactional integrity)
   */
  static async grantPermission(params: {
    documentId: string;
    targetUserId: string;
    permission: PermissionType;
    canDownload: boolean;
    expiresAt?: Date | null;
    grantor: User;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  }) {
    // 1. Verify target user
    if (params.targetUserId === params.grantor.id) {
      throw new Error('You cannot share a document with yourself.');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.targetUserId },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new Error('Target user does not exist or account is inactive.');
    }

    // 2. Transactional upsert to prevent race conditions or duplicate active grants
    const permissionRecord = await prisma.$transaction(async (tx) => {
      // Find existing active permission if any
      const existingActive = await tx.documentPermission.findFirst({
        where: {
          documentId: params.documentId,
          userId: params.targetUserId,
          isRevoked: false,
        },
      });

      if (existingActive) {
        // Update existing permission
        return await tx.documentPermission.update({
          where: { id: existingActive.id },
          data: {
            permission: params.permission,
            canDownload: params.canDownload,
            expiresAt: params.expiresAt || null,
            grantedById: params.grantor.id,
            grantedAt: new Date(),
          },
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            grantedBy: { select: { id: true, email: true } },
          },
        });
      }

      // Create new permission
      return await tx.documentPermission.create({
        data: {
          documentId: params.documentId,
          userId: params.targetUserId,
          permission: params.permission,
          canDownload: params.canDownload,
          expiresAt: params.expiresAt || null,
          grantedById: params.grantor.id,
          grantedAt: new Date(),
          isRevoked: false,
        },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          grantedBy: { select: { id: true, email: true } },
        },
      });
    }, { timeout: 15000, maxWait: 10000 });

    // 3. Record Audit Event
    await logAuditEvent({
      action: AuditActionType.DOCUMENT_PERMISSION_GRANTED,
      result: AuditResult.SUCCESS,
      actor: params.grantor,
      targetUserId: params.targetUserId,
      documentId: params.documentId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      correlationId: params.correlationId,
      metadata: {
        permission: params.permission,
        canDownload: params.canDownload,
        expiresAt: params.expiresAt,
      },
    });

    return permissionRecord;
  }

  /**
   * List all permission records for a document (including revocation history)
   */
  static async listDocumentPermissions(documentId: string) {
    return await prisma.documentPermission.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        grantedBy: { select: { id: true, email: true } },
        revokedBy: { select: { id: true, email: true } },
      },
    });
  }

  /**
   * Immediately revoke document access for a user
   * (Mandatory Adversarial Scenario 3: Instant Revocation across UI, API & Links)
   */
  static async revokePermission(params: {
    documentId: string;
    permissionId: string;
    revoker: User;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  }) {
    const permission = await prisma.documentPermission.findUnique({
      where: { id: params.permissionId },
    });

    if (!permission || permission.documentId !== params.documentId) {
      throw new Error('Permission record not found');
    }

    if (permission.isRevoked) {
      return permission; // Already revoked
    }

    // Mark revoked transactionally
    const revoked = await prisma.documentPermission.update({
      where: { id: params.permissionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedById: params.revoker.id,
        revocationReason: params.reason || 'Revoked by document owner',
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    // Record Audit Event
    await logAuditEvent({
      action: AuditActionType.DOCUMENT_PERMISSION_REVOKED,
      result: AuditResult.SUCCESS,
      actor: params.revoker,
      targetUserId: permission.userId,
      documentId: params.documentId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      correlationId: params.correlationId,
      metadata: {
        reason: params.reason,
        previouslyGrantedPermission: permission.permission,
      },
    });

    return revoked;
  }
}

