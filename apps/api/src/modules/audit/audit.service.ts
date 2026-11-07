import { prisma, Prisma, AuditActionType, AuditResult, User, AuditLog } from '@trustvault/database';
import { calculateAuditHash } from '../../utils/hash';

export interface AuditLogParams {
  action: AuditActionType;
  result?: AuditResult;
  actor?: User | null;
  targetUserId?: string | null;
  documentId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
}

/**
 * Append-only verifiable audit event logging with SHA-256 hash chaining
 */
export async function logAuditEvent(
  params: AuditLogParams,
  tx?: Prisma.TransactionClient
): Promise<AuditLog> {
  const client = tx || prisma;
  try {
    // 1. Verify foreign key constraints gracefully before inserting
    let verifiedDocumentId: string | null = null;
    if (params.documentId) {
      try {
        const docExists = await client.document.findUnique({
          where: { id: params.documentId },
          select: { id: true },
        });
        if (docExists) {
          verifiedDocumentId = docExists.id;
        }
      } catch {
        verifiedDocumentId = null;
      }
    }

    let verifiedTargetUserId: string | null = null;
    if (params.targetUserId) {
      try {
        const userExists = await client.user.findUnique({
          where: { id: params.targetUserId },
          select: { id: true },
        });
        if (userExists) {
          verifiedTargetUserId = userExists.id;
        }
      } catch {
        verifiedTargetUserId = null;
      }
    }

    let verifiedActorId: string | null = null;
    if (params.actor?.id) {
      try {
        const actorExists = await client.user.findUnique({
          where: { id: params.actor.id },
          select: { id: true },
        });
        if (actorExists) {
          verifiedActorId = actorExists.id;
        }
      } catch {
        verifiedActorId = null;
      }
    }

    // Fetch latest audit record to establish cryptographic hash link
    const lastAudit = await client.auditLog.findFirst({
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true, currentHash: true },
    });

    const nextSequence = lastAudit ? Number(lastAudit.sequenceNumber) + 1 : 1;
    const prevHash = lastAudit ? lastAudit.currentHash : null;
    const timestamp = new Date();

    const currentHash = calculateAuditHash({
      sequenceNumber: nextSequence,
      previousHash: prevHash,
      action: params.action,
      result: params.result || AuditResult.SUCCESS,
      actorId: verifiedActorId,
      documentId: verifiedDocumentId,
      timestamp,
    });

    const metadata = {
      ...(params.metadata || {}),
      ...(params.documentId && !verifiedDocumentId ? { attemptedDocumentId: params.documentId } : {}),
      ...(params.targetUserId && !verifiedTargetUserId ? { attemptedTargetUserId: params.targetUserId } : {}),
    };

    return await client.auditLog.create({
      data: {
        action: params.action,
        result: params.result || AuditResult.SUCCESS,
        actorId: verifiedActorId,
        actorClerkId: params.actor?.clerkId || null,
        actorEmail: params.actor?.email || null,
        actorRole: params.actor?.role || null,
        targetUserId: verifiedTargetUserId,
        documentId: verifiedDocumentId,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        correlationId: params.correlationId || null,
        failureReason: params.failureReason || null,
        metadata,
        sequenceNumber: BigInt(nextSequence),
        previousHash: prevHash,
        currentHash,
        createdAt: timestamp,
      },
    });
  } catch (error) {
    console.error('CRITICAL: Failed to write audit event:', error);
    // In strict enterprise mode, rethrow or return fallback to ensure audit non-repudiation
    throw error;
  }
}

/**
 * Verifies the integrity of the audit trail from genesis through the latest block
 */
export async function verifyAuditLogChain(): Promise<{
  isValid: boolean;
  totalVerified: number;
  brokenAtSequence?: number;
  reason?: string;
}> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { sequenceNumber: 'asc' },
  });

  if (logs.length === 0) {
    return { isValid: true, totalVerified: 0 };
  }

  let expectedPrevHash: string | null = null;

  for (let i = 0; i < logs.length; i++) {
    const record = logs[i];
    const seq = Number(record.sequenceNumber);

    // 1. Verify sequence order
    if (seq !== i + 1) {
      return {
        isValid: false,
        totalVerified: i,
        brokenAtSequence: seq,
        reason: `Sequence gap detected: expected ${i + 1}, found ${seq}`,
      };
    }

    // 2. Verify link to previous block
    if (record.previousHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalVerified: i,
        brokenAtSequence: seq,
        reason: `Hash pointer mismatch at sequence ${seq}: expected previous hash ${expectedPrevHash}, found ${record.previousHash}`,
      };
    }

    // 3. Recalculate and verify cryptographic hash
    const recalculatedHash = calculateAuditHash({
      sequenceNumber: seq,
      previousHash: expectedPrevHash,
      action: record.action,
      result: record.result,
      actorId: record.actorId,
      documentId: record.documentId,
      timestamp: record.createdAt,
    });

    if (recalculatedHash !== record.currentHash) {
      return {
        isValid: false,
        totalVerified: i,
        brokenAtSequence: seq,
        reason: `Data tampering detected at sequence ${seq}: payload does not match cryptographic hash`,
      };
    }

    expectedPrevHash = record.currentHash;
  }

  return { isValid: true, totalVerified: logs.length };
}

