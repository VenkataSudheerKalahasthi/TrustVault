import { prisma, AuditActionType, AuditResult, User, AuditLog } from '@trustvault/database';
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
export async function logAuditEvent(params: AuditLogParams): Promise<AuditLog> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Fetch latest audit record to establish cryptographic hash link
      const lastAudit = await tx.auditLog.findFirst({
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
        actorId: params.actor?.id || null,
        documentId: params.documentId || null,
        timestamp,
      });

      return await tx.auditLog.create({
        data: {
          action: params.action,
          result: params.result || AuditResult.SUCCESS,
          actorId: params.actor?.id || null,
          actorClerkId: params.actor?.clerkId || null,
          actorEmail: params.actor?.email || null,
          actorRole: params.actor?.role || null,
          targetUserId: params.targetUserId || null,
          documentId: params.documentId || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          correlationId: params.correlationId || null,
          failureReason: params.failureReason || null,
          metadata: params.metadata || {},
          sequenceNumber: BigInt(nextSequence),
          previousHash: prevHash,
          currentHash,
          createdAt: timestamp,
        },
      });
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
