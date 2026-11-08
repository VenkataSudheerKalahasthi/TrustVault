import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma, UserRole } from '@trustvault/database';
import { getAdminEmailAllowlist } from '../src/config/env';

describe('TrustVault Authentication, Allowlist & Role Assignment Verification', () => {
  let allowlistedAdminUser: any;
  let standardViewerUser: any;
  let documentOwnerUser: any;

  beforeAll(async () => {
    // 1. Seed or retrieve test users
    allowlistedAdminUser = await prisma.user.upsert({
      where: { email: 'sudheercse510@gmail.com' },
      update: { role: UserRole.ADMIN, isActive: true },
      create: {
        clerkId: 'test_allowlisted_admin_clerk_id',
        email: 'sudheercse510@gmail.com',
        firstName: 'Allowlisted',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    standardViewerUser = await prisma.user.upsert({
      where: { email: 'standard.viewer.auth@trustvault.test' },
      update: { role: UserRole.VIEWER, isActive: true },
      create: {
        clerkId: 'test_standard_viewer_auth_clerk_id',
        email: 'standard.viewer.auth@trustvault.test',
        firstName: 'Standard',
        lastName: 'Viewer',
        role: UserRole.VIEWER,
        isActive: true,
      },
    });

    documentOwnerUser = await prisma.user.upsert({
      where: { email: 'doc.owner.auth@trustvault.test' },
      update: { role: UserRole.DOCUMENT_OWNER, isActive: true },
      create: {
        clerkId: 'test_doc_owner_auth_clerk_id',
        email: 'doc.owner.auth@trustvault.test',
        firstName: 'Document',
        lastName: 'Owner',
        role: UserRole.DOCUMENT_OWNER,
        isActive: true,
      },
    });
  });

  it('1. Admin Email Allowlist helper properly parses and normalizes allowed administrator emails', () => {
    const allowlist = getAdminEmailAllowlist();
    expect(Array.isArray(allowlist)).toBe(true);
    expect(allowlist).toContain('sudheercse510@gmail.com');
    // Verify all emails are lowercase and trimmed
    allowlist.forEach((email) => {
      expect(email).toBe(email.toLowerCase().trim());
      expect(email).toContain('@');
    });
  });

  it('2. Unauthenticated request to /api/v1/auth/me is strictly rejected with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3. Authenticated user can retrieve their verified database role and identity', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('x-test-user-id', allowlistedAdminUser.id);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('sudheercse510@gmail.com');
    expect(res.body.data.role).toBe(UserRole.ADMIN);
  });

  it('4. Non-allowlisted user attempting privilege escalation to ADMIN is strictly rejected with 403', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sync')
      .set('x-test-user-id', standardViewerUser.id)
      .send({ requestedRole: 'ADMIN' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');

    // Verify user role in database remains unchanged as VIEWER
    const dbUser = await prisma.user.findUnique({ where: { id: standardViewerUser.id } });
    expect(dbUser?.role).toBe(UserRole.VIEWER);
  });

  it('5. User selecting DOCUMENT_OWNER role during signup is safely assigned DOCUMENT_OWNER', async () => {
    // Provision a new signup user initially as VIEWER
    const newSignup = await prisma.user.create({
      data: {
        clerkId: `test_new_signup_${Date.now()}`,
        email: `signup.${Date.now()}@trustvault.test`,
        firstName: 'New',
        lastName: 'Registrant',
        role: UserRole.VIEWER,
        isActive: true,
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/sync')
      .set('x-test-user-id', newSignup.id)
      .send({ requestedRole: 'DOCUMENT_OWNER' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(UserRole.DOCUMENT_OWNER);

    // Verify in database
    const dbUser = await prisma.user.findUnique({ where: { id: newSignup.id } });
    expect(dbUser?.role).toBe(UserRole.DOCUMENT_OWNER);
  });

  it('6. User selecting default VIEWER role retains VIEWER role without elevation', async () => {
    const res = await request(app)
      .post('/api/v1/auth/sync')
      .set('x-test-user-id', standardViewerUser.id)
      .send({ requestedRole: 'VIEWER' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(UserRole.VIEWER);
  });

  it('7. Deactivated user cannot access authenticated profile or sync endpoints', async () => {
    const deactivatedUser = await prisma.user.create({
      data: {
        clerkId: `test_deactivated_${Date.now()}`,
        email: `deactivated.${Date.now()}@trustvault.test`,
        firstName: 'Inactive',
        lastName: 'User',
        role: UserRole.VIEWER,
        isActive: false, // Deactivated account
      },
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('x-test-user-id', deactivatedUser.id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('8. Document Owner cannot access Admin governance endpoints (Strict RBAC)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('x-test-user-id', documentOwnerUser.id);

    expect(res.status).toBe(403);
  });

  it('9. Standard Viewer cannot access Document Owner upload endpoints (Strict RBAC)', async () => {
    const res = await request(app)
      .post('/api/v1/documents')
      .set('x-test-user-id', standardViewerUser.id);

    expect(res.status).toBe(403);
  });

  it('10. Authorized administrator has full governance access to Admin endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('x-test-user-id', allowlistedAdminUser.id);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
  });
});
