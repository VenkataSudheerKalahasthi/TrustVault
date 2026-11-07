import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma, UserRole, PermissionType, AuditActionType, AuditResult } from '@trustvault/database';
import { verifyAuditLogChain } from '../src/modules/audit/audit.service';

describe('TrustVault Mandatory 10 Adversarial Security Scenarios', () => {
  let adminUser: any;
  let ownerA: any;
  let viewerB: any;
  let attackerC: any;
  let testDocA: any;

  beforeAll(async () => {
    // Seed isolated test users
    adminUser = await prisma.user.upsert({
      where: { email: 'admin.adversarial@trustvault.test' },
      update: { role: UserRole.ADMIN, isActive: true },
      create: {
        clerkId: 'test_admin_clerk_id',
        email: 'admin.adversarial@trustvault.test',
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    ownerA = await prisma.user.upsert({
      where: { email: 'owner.a@trustvault.test' },
      update: { role: UserRole.DOCUMENT_OWNER, isActive: true },
      create: {
        clerkId: 'test_owner_a_clerk_id',
        email: 'owner.a@trustvault.test',
        firstName: 'Priya',
        lastName: 'Owner',
        role: UserRole.DOCUMENT_OWNER,
        isActive: true,
      },
    });

    viewerB = await prisma.user.upsert({
      where: { email: 'viewer.b@trustvault.test' },
      update: { role: UserRole.VIEWER, isActive: true },
      create: {
        clerkId: 'test_viewer_b_clerk_id',
        email: 'viewer.b@trustvault.test',
        firstName: 'Sam',
        lastName: 'Viewer',
        role: UserRole.VIEWER,
        isActive: true,
      },
    });

    attackerC = await prisma.user.upsert({
      where: { email: 'attacker.c@trustvault.test' },
      update: { role: UserRole.VIEWER, isActive: true },
      create: {
        clerkId: 'test_attacker_c_clerk_id',
        email: 'attacker.c@trustvault.test',
        firstName: 'Eve',
        lastName: 'Attacker',
        role: UserRole.VIEWER,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.aISuggestion.deleteMany({ where: { targetUserId: { in: [ownerA.id, viewerB.id, attackerC.id] } } });
    await prisma.downloadRecord.deleteMany({ where: { userId: { in: [ownerA.id, viewerB.id, attackerC.id] } } });
    await prisma.documentPermission.deleteMany({ where: { userId: { in: [ownerA.id, viewerB.id, attackerC.id] } } });
    await prisma.documentVersion.deleteMany({ where: { uploadedById: { in: [ownerA.id, viewerB.id, attackerC.id] } } });
    await prisma.document.deleteMany({ where: { ownerId: { in: [ownerA.id, viewerB.id, attackerC.id] } } });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Owner A uploads document; Viewer B without permission is blocked
  // ---------------------------------------------------------------------------
  it('SCENARIO 1: Owner A uploads confidential document. Viewer B with no grant cannot preview or download it.', async () => {
    // 1. Owner A uploads a valid PDF document
    const uploadRes = await request(app)
      .post('/api/v1/documents')
      .set('x-test-user-id', ownerA.id)
      .field('title', 'Project Titan Confidential Financials')
      .field('description', 'Q4 restricted board projections')
      .attach('file', Buffer.from('%PDF-1.5 test binary confidential content', 'utf-8'), 'titan_q4.pdf');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    testDocA = uploadRes.body.data;
    expect(testDocA.id).toBeDefined();

    // 2. Viewer B (no grant) attempts to preview content
    const previewRes = await request(app)
      .get(`/api/v1/documents/${testDocA.id}/content`)
      .set('x-test-user-id', viewerB.id);

    expect(previewRes.status).toBe(403);
    expect(previewRes.body.error.code).toBe('FORBIDDEN');

    // 3. Viewer B attempts to download
    const downloadRes = await request(app)
      .get(`/api/v1/documents/${testDocA.id}/download`)
      .set('x-test-user-id', viewerB.id);

    expect(downloadRes.status).toBe(403);
    expect(downloadRes.body.error.code).toBe('FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Owner A grants Read permission; Viewer B can read but cannot edit/delete
  // ---------------------------------------------------------------------------
  it('SCENARIO 2: Owner A grants Read permission to Viewer B. Viewer B can read but cannot edit or delete.', async () => {
    // 1. Owner A grants Read permission
    const shareRes = await request(app)
      .post(`/api/v1/documents/${testDocA.id}/permissions`)
      .set('x-test-user-id', ownerA.id)
      .send({
        targetUserId: viewerB.id,
        permission: PermissionType.READ,
        canDownload: true,
      });

    expect(shareRes.status).toBe(201);
    expect(shareRes.body.data.permission).toBe(PermissionType.READ);

    // 2. Viewer B now CAN read/preview
    const previewRes = await request(app)
      .get(`/api/v1/documents/${testDocA.id}/content`)
      .set('x-test-user-id', viewerB.id);

    expect(previewRes.status).toBe(200);

    // 3. Viewer B CANNOT edit metadata
    const editRes = await request(app)
      .patch(`/api/v1/documents/${testDocA.id}`)
      .set('x-test-user-id', viewerB.id)
      .send({ title: 'Tampered Title by Viewer' });

    expect(editRes.status).toBe(403);
    expect(editRes.body.error.code).toBe('FORBIDDEN');

    // 4. Viewer B CANNOT delete document
    const deleteRes = await request(app)
      .delete(`/api/v1/documents/${testDocA.id}`)
      .set('x-test-user-id', viewerB.id);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.error.code).toBe('FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Instant Revocation - Owner A revokes Viewer B's access
  // ---------------------------------------------------------------------------
  it('SCENARIO 3: Owner A revokes Viewer B access. Viewer B immediately loses access to UI, API, and streaming links.', async () => {
    // 1. List active permission ID
    const permsRes = await request(app)
      .get(`/api/v1/documents/${testDocA.id}/permissions`)
      .set('x-test-user-id', ownerA.id);

    const activePerm = permsRes.body.data.find((p: any) => p.userId === viewerB.id && !p.isRevoked);
    expect(activePerm).toBeDefined();

    // 2. Owner A revokes access
    const revokeRes = await request(app)
      .delete(`/api/v1/documents/${testDocA.id}/permissions/${activePerm.id}`)
      .set('x-test-user-id', ownerA.id)
      .send({ reason: 'Contract period completed' });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.isRevoked).toBe(true);

    // 3. Immediate check: Viewer B must fail content preview instantly
    const previewRes = await request(app)
      .get(`/api/v1/documents/${testDocA.id}/content`)
      .set('x-test-user-id', viewerB.id);

    expect(previewRes.status).toBe(403);
    expect(previewRes.body.error.code).toBe('FORBIDDEN');

    // 4. Immediate check: Viewer B must fail download instantly
    const downloadRes = await request(app)
      .get(`/api/v1/documents/${testDocA.id}/download`)
      .set('x-test-user-id', viewerB.id);

    expect(downloadRes.status).toBe(403);
    expect(downloadRes.body.error.code).toBe('FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: IDOR Attack Prevention
  // ---------------------------------------------------------------------------
  it('SCENARIO 4: Viewer B alters document UUID in API request. Backend rejects access to Owner A private document.', async () => {
    const ungrantedRandomUuid = '00000000-0000-0000-0000-000000000000';

    const idorRes = await request(app)
      .get(`/api/v1/documents/${ungrantedRandomUuid}/content`)
      .set('x-test-user-id', attackerC.id);

    expect(idorRes.status).toBe(404);
    expect(idorRes.body.error.code).toBe('DOCUMENT_NOT_FOUND');

    // Attempting IDOR on testDocA without permission
    const idorDocARes = await request(app)
      .get(`/api/v1/documents/${testDocA.id}/content`)
      .set('x-test-user-id', attackerC.id);

    expect(idorDocARes.status).toBe(403);
    expect(idorDocARes.body.error.code).toBe('FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Unauthorized download attempt logged in audit trail
  // ---------------------------------------------------------------------------
  it('SCENARIO 5: Unauthorized user attempts to download document. Backend denies request and records denied attempt.', async () => {
    const deniedRes = await request(app)
      .get(`/api/v1/documents/${testDocA.id}/download`)
      .set('x-test-user-id', attackerC.id);

    expect(deniedRes.status).toBe(403);

    // Verify denied audit log entry was recorded
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        actorId: attackerC.id,
        documentId: testDocA.id,
        action: AuditActionType.ACCESS_DENIED,
        result: AuditResult.DENIED,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditRecord).toBeDefined();
    expect(auditRecord?.result).toBe(AuditResult.DENIED);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Privilege escalation / role self-modification rejected
  // ---------------------------------------------------------------------------
  it('SCENARIO 6: Non-admin user attempts to change their role to ADMIN. Backend rejects request with 403.', async () => {
    const escalationRes = await request(app)
      .patch(`/api/v1/users/${viewerB.id}/role`)
      .set('x-test-user-id', viewerB.id)
      .send({ role: UserRole.ADMIN });

    expect(escalationRes.status).toBe(403);
    expect(escalationRes.body.error.code).toBe('FORBIDDEN');

    // Confirm role in database was NOT changed
    const dbUser = await prisma.user.findUnique({ where: { id: viewerB.id } });
    expect(dbUser?.role).toBe(UserRole.VIEWER);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Audit history immutability / Admin tampering rejection
  // ---------------------------------------------------------------------------
  it('SCENARIO 7: Administrator attempts to update or delete historical audit records. Request is rejected.', async () => {
    const sampleAudit = await prisma.auditLog.findFirst({ orderBy: { sequenceNumber: 'desc' } });
    expect(sampleAudit).toBeDefined();

    // Attempt PUT/PATCH on audit record
    const updateRes = await request(app)
      .patch(`/api/v1/audit-logs/${sampleAudit!.id}`)
      .set('x-test-user-id', adminUser.id)
      .send({ action: AuditActionType.DOCUMENT_VIEWED });

    expect(updateRes.status).toBe(403);
    expect(updateRes.body.error.code).toBe('AUDIT_IMMUTABLE');

    // Attempt DELETE on audit record
    const deleteRes = await request(app)
      .delete(`/api/v1/audit-logs/${sampleAudit!.id}`)
      .set('x-test-user-id', adminUser.id);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.error.code).toBe('AUDIT_IMMUTABLE');

    // Verify cryptographic audit hash chain is intact
    const verification = await verifyAuditLogChain();
    expect(verification.isValid).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Misleading file extension / invalid signature rejection
  // ---------------------------------------------------------------------------
  it('SCENARIO 8: File has misleading .pdf extension but fake text content. Validation rejects upload.', async () => {
    // Malicious payload with .pdf extension but plain text payload
    const fakePdfRes = await request(app)
      .post('/api/v1/documents')
      .set('x-test-user-id', ownerA.id)
      .field('title', 'Spoofed Executable')
      .attach('file', Buffer.from('FAKE_PAYLOAD_NOT_A_REAL_PDF_HEADER', 'utf-8'), 'malicious.pdf');

    expect(fakePdfRes.status).toBe(500); // Throws file validation error
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Deactivated user access rejection
  // ---------------------------------------------------------------------------
  it('SCENARIO 9: User account is deactivated. Future protected requests are immediately denied with 403.', async () => {
    // 1. Deactivate attacker account
    await prisma.user.update({
      where: { id: attackerC.id },
      data: { isActive: false },
    });

    // 2. Attacker attempts to list documents
    const accessRes = await request(app)
      .get('/api/v1/documents')
      .set('x-test-user-id', attackerC.id);

    expect(accessRes.status).toBe(403);
    expect(accessRes.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Concurrent permission operations safety
  // ---------------------------------------------------------------------------
  it('SCENARIO 10: Two concurrent permission updates execute. Database state and audit history remain consistent.', async () => {
    // Execute two concurrent grants for viewerB on testDocA
    const grantPromise1 = request(app)
      .post(`/api/v1/documents/${testDocA.id}/permissions`)
      .set('x-test-user-id', ownerA.id)
      .send({ targetUserId: viewerB.id, permission: PermissionType.READ, canDownload: false });

    const grantPromise2 = request(app)
      .post(`/api/v1/documents/${testDocA.id}/permissions`)
      .set('x-test-user-id', ownerA.id)
      .send({ targetUserId: viewerB.id, permission: PermissionType.EDIT, canDownload: true });

    const [res1, res2] = await Promise.all([grantPromise1, grantPromise2]);

    expect([201, 200]).toContain(res1.status);
    expect([201, 200]).toContain(res2.status);

    // Verify there is exactly ONE active permission for viewerB on testDocA
    const activePerms = await prisma.documentPermission.findMany({
      where: {
        documentId: testDocA.id,
        userId: viewerB.id,
        isRevoked: false,
      },
    });

    expect(activePerms.length).toBe(1);

    // Verify cryptographic audit chain remains fully verified
    const chainStatus = await verifyAuditLogChain();
    expect(chainStatus.isValid).toBe(true);
  });
});

