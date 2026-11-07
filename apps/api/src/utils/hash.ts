import crypto from 'crypto';

/**
 * Calculates SHA-256 fingerprint for a binary file buffer
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculates SHA-256 hash for an append-only AuditLog record
 * Linking current record to previousHash for cryptographic tamper-evidence
 */
export function calculateAuditHash(params: {
  sequenceNumber: number | bigint;
  previousHash: string | null;
  action: string;
  result: string;
  actorId?: string | null;
  documentId?: string | null;
  timestamp: Date | string;
}): string {
  const content = [
    params.sequenceNumber.toString(),
    params.previousHash || 'GENESIS_HASH_000000000000000000000000000000000000000000000000000000000000',
    params.action,
    params.result,
    params.actorId || 'SYSTEM',
    params.documentId || 'NONE',
    new Date(params.timestamp).toISOString(),
  ].join('|');

  return crypto.createHash('sha256').update(content).digest('hex');
}

