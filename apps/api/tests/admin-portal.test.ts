import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma, UserRole, PermissionType, AuditActionType, AuditResult } from '@trustvault/database';
import { verifyAuditLogChain } from '../src/modules/audit/audit.service';

describe('TrustVault Admin Portal Comprehensive Security & Functional Verification', () => {
  let adminUser: any;
  let ownerUser: any;
  let viewerUser: any;
  let testDocument: any;
  let testCategory: any;

  beforeAll(async () => {
    // 1. Provision seeded accounts
    adminUser = await prisma.user.upsert({
      where: { email: 'admin.portal@trustvault.test' },
      update: { role: UserRole.ADMIN, isActive: true },
      create: {
        clerkId: 'test_admin_portal_clerk_id',
        email: 'admin.portal@trustvault.test',
        firstName: 'Master',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    ownerUser = await prisma.user.upsert({
      where: { email: 'owner.portal@trustvault.test' },
      update: { role: UserRole.DOCUMENT_OWNER, isActive: true },
      create: {
        clerkId: 'test_owner_portal_clerk_id',
        email: 'owner.portal@trustvault.test',
        firstName: 'David',
        lastName: 'Owner',
        role: UserRole.DOCUMENT_OWNER,
        isActive: true,
      },
    });

    viewerUser = await prisma.user.upsert({
      where: { email: 'viewer.portal@trustvault.test' },
      update: { role: UserRole.VIEWER, isActive: true },
      create: {
        clerkId: 'test_viewer_portal_clerk_id',
        email: 'viewer.portal@trustvault.test',
        firstName: 'Alice',
        lastName: 'Viewer',
        role: UserRole.VIEWER,
        isActive: true,
      },
    });

    // 2. Provision test category
    testCategory = await prisma.category.upsert({
      where: { name: 'Admin Test Legal Category' },
      update: { color: '#0284c7' },
      create: {
        name: 'Admin Test Legal Category',
        description: 'Category for testing admin data integrity',
        color: '#0284c7',
      },
    });

    // 3. Upload test document by ownerUser
    const uploadRes = await request(app)
      .post('/api/v1/documents')
      .set('x-test-user-id', ownerUser.id)
      .field('title', 'Admin Governance Policy v1')
      .field('categoryId', testCategory.id)
      .attach('file', Buffer.from('%PDF-1.5 test binary confidential board document', 'utf-8'), 'gov_policy.pdf');

    expect(uploadRes.status).toBe(201);
    testDocument = uploadRes.body.data;
  });

  afterAll(async () => {
    // Soft-delete test document to maintain audit trail referential integrity
    if (ownerUser?.id) {
      await prisma.document.updateMany({
        where: { ownerId: ownerUser.id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }
  });

  // 1. Non-admin cannot access Admin dashboard API
  it('1. Non-admin (Viewer and Owner) cannot access Admin dashboard API (returns 403)', async () => {
    const viewerRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('x-test-user-id', viewerUser.id);
    expect(viewerRes.status).toBe(403);

    const ownerRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('x-test-user-id', ownerUser.id);
    expect(ownerRes.status).toBe(403);
  });

  // 2. Viewer cannot access User Management API
  it('2. Viewer cannot access User Management modification API (returns 403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${viewerUser.id}/status`)
      .set('x-test-user-id', viewerUser.id)
      .send({ isActive: false });
    expect(res.status).toBe(403);
  });

  // 3. Document Owner cannot access Admin document inventory
  it('3. Document Owner cannot access Admin global document inventory (returns 403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/documents')
      .set('x-test-user-id', ownerUser.id);
    expect(res.status).toBe(403);
  });

  // 4. Admin can view permitted document metadata
  it('4. Admin can view global document metadata inventory with telemetry (returns 200)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/documents')
      .set('x-test-user-id', adminUser.id);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const doc = res.body.data.find((d: any) => d.id === testDocument.id);
    expect(doc).toBeDefined();
    expect(doc.title).toBe('Admin Governance Policy v1');
    expect(doc.versionCount).toBeGreaterThanOrEqual(1);
  });

  // 5. Admin cannot download confidential document content without explicit authorization
  it('5. Admin cannot download confidential document content without explicit ACL grant (Least Privilege)', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${testDocument.id}/download`)
      .set('x-test-user-id', adminUser.id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 6. Admin can activate and deactivate permitted accounts
  it('6. Admin can deactivate and reactivate permitted accounts', async () => {
    // Deactivate viewer
    const deactRes = await request(app)
      .patch(`/api/v1/users/${viewerUser.id}/status`)
      .set('x-test-user-id', adminUser.id)
      .send({ isActive: false });

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.isActive).toBe(false);

    // Reactivate viewer
    const reactRes = await request(app)
      .patch(`/api/v1/users/${viewerUser.id}/status`)
      .set('x-test-user-id', adminUser.id)
      .send({ isActive: true });

    expect(reactRes.status).toBe(200);
    expect(reactRes.body.data.isActive).toBe(true);
  });

  // 7. Admin can change roles according to authorization policy
  it('7. Admin can update user role according to policy', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${viewerUser.id}/role`)
      .set('x-test-user-id', adminUser.id)
      .send({ role: UserRole.DOCUMENT_OWNER });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe(UserRole.DOCUMENT_OWNER);

    // Revert back to VIEWER
    await request(app)
      .patch(`/api/v1/users/${viewerUser.id}/role`)
      .set('x-test-user-id', adminUser.id)
      .send({ role: UserRole.VIEWER });
  });

  // 8. Last active Admin cannot be deactivated
  it('8. Last active Admin cannot be deactivated or self-deactivated', async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${adminUser.id}/status`)
      .set('x-test-user-id', adminUser.id)
      .send({ isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OPERATION');
  });

  // 9. Admin cannot modify historical audit logs
  it('9. Admin cannot update or delete historical audit records (AUDIT_IMMUTABLE)', async () => {
    const sampleAudit = await prisma.auditLog.findFirst({ orderBy: { sequenceNumber: 'desc' } });
    expect(sampleAudit).toBeDefined();

    const patchRes = await request(app)
      .patch(`/api/v1/audit-logs/${sampleAudit!.id}`)
      .set('x-test-user-id', adminUser.id)
      .send({ action: AuditActionType.DOCUMENT_DELETED });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body.error.code).toBe('AUDIT_IMMUTABLE');

    const deleteRes = await request(app)
      .delete(`/api/v1/audit-logs/${sampleAudit!.id}`)
      .set('x-test-user-id', adminUser.id);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.error.code).toBe('AUDIT_IMMUTABLE');
  });

  // 10. Admin can verify the audit chain
  it('10. Admin can verify the cryptographic audit hash chain', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs/verify')
      .set('x-test-user-id', adminUser.id);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isValid).toBe(true);
    expect(res.body.data.totalVerified).toBeGreaterThan(0);
  });

  // 11. Admin cannot expose secret credentials
  it('11. System settings API displays safe telemetry and does not leak secrets', async () => {
    const res = await request(app)
      .get('/api/v1/admin/settings')
      .set('x-test-user-id', adminUser.id);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const settings = res.body.data;

    // Must show environment and bucket
    expect(settings.server.environment).toBeDefined();
    expect(settings.storage.bucket).toBeDefined();

    // Must NEVER leak secret keys or passwords
    const str = JSON.stringify(settings);
    expect(str).not.toContain('CLERK_SECRET_KEY');
    expect(str).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(str).not.toContain('DATABASE_URL');
    expect(str).not.toContain('postgres://');
  });

  // 12. Unauthorized users cannot access Admin routes
  it('12. Unauthenticated request to Admin routes is rejected with 401', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
  });

  // 13. Security monitoring uses real audit records
  it('13. Security monitoring endpoint returns real telemetry and access denial history', async () => {
    const res = await request(app)
      .get('/api/v1/admin/security')
      .set('x-test-user-id', adminUser.id);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.chainIntegrity).toBe(true);
    expect(Array.isArray(res.body.data.recentDenials)).toBe(true);
    expect(Array.isArray(res.body.data.privilegeEscalations)).toBe(true);
  });

  // 14. Category management enforces data integrity
  it('14. Category management prevents deletion of categories referenced by active documents', async () => {
    // Attempt deleting testCategory which is linked to testDocument
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/categories/${testCategory.id}`)
      .set('x-test-user-id', adminUser.id);

    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.error.code).toBe('CATEGORY_IN_USE');

    // Category must still exist in DB
    const cat = await prisma.category.findUnique({ where: { id: testCategory.id } });
    expect(cat).toBeDefined();
  });
});
