import { describe, it, expect } from 'vitest';
import { calculateAuditHash, calculateFileHash } from '../src/utils/hash';

describe('Cryptographic Audit Trail Engine Unit Tests', () => {
  it('calculateFileHash computes deterministic SHA-256 fingerprint', () => {
    const payload = Buffer.from('Confidential board presentation v1', 'utf-8');
    const hash1 = calculateFileHash(payload);
    const hash2 = calculateFileHash(payload);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string length
  });

  it('calculateAuditHash links sequence, previous hash, action, and timestamp into tamper-evident block', () => {
    const timestamp = new Date('2026-11-07T12:00:00.000Z');
    const prevHash = 'GENESIS_HASH_000000000000000000000000000000000000000000000000000000000000';

    const blockHash1 = calculateAuditHash({
      sequenceNumber: 1,
      previousHash: prevHash,
      action: 'DOCUMENT_UPLOADED',
      result: 'SUCCESS',
      actorId: 'user-uuid-1',
      documentId: 'doc-uuid-1',
      timestamp,
    });

    const blockHash2 = calculateAuditHash({
      sequenceNumber: 1,
      previousHash: prevHash,
      action: 'DOCUMENT_UPLOADED',
      result: 'SUCCESS',
      actorId: 'user-uuid-1',
      documentId: 'doc-uuid-1',
      timestamp,
    });

    // Parity and determinism
    expect(blockHash1).toBe(blockHash2);
    expect(blockHash1.length).toBe(64);

    // Any alteration in payload changes hash (Avalanche effect)
    const tamperedHash = calculateAuditHash({
      sequenceNumber: 1,
      previousHash: prevHash,
      action: 'DOCUMENT_DELETED', // altered action
      result: 'SUCCESS',
      actorId: 'user-uuid-1',
      documentId: 'doc-uuid-1',
      timestamp,
    });

    expect(tamperedHash).not.toBe(blockHash1);
  });
});
