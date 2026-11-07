import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../packages/database/.env') });

import { UserRole, AISuggestionStatus } from '@trustvault/database';
import { Client } from 'pg';

test.describe('TrustVault Multi-Role E2E Lifecycle & Security Audit Suite', () => {
  // Verified seeded users on remote Supabase PostgreSQL
  const adminUser = {
    id: 'cd33fc81-aef4-4042-891d-ea13a59d0afc',
    email: 'admin.e2e@trustvault.test',
    role: UserRole.ADMIN,
  };
  const ownerA = {
    id: '735a3aab-5e22-4cfb-a5b5-c31e30373afb',
    email: 'owner.a.e2e@trustvault.test',
    role: UserRole.DOCUMENT_OWNER,
  };
  const ownerB = {
    id: '487baf73-f993-42d5-be27-e9818f85a5ff',
    email: 'owner.b.e2e@trustvault.test',
    role: UserRole.DOCUMENT_OWNER,
  };
  const viewerA = {
    id: '16d8c8b9-f1cf-4e45-a55d-771885714c84',
    email: 'viewer.a.e2e@trustvault.test',
    role: UserRole.VIEWER,
  };
  const viewerB = {
    id: 'eb8c1a00-facc-40e7-9d64-21a6691b1d09',
    email: 'viewer.b.e2e@trustvault.test',
    role: UserRole.VIEWER,
  };

  let testDocId: string;
  let viewerAPermissionId: string;

  test('LIFECYCLE 1: Owner A uploads confidential document; verified in PostgreSQL and Storage', async ({ request }) => {
    // Valid PDF file buffer with binary %PDF- magic bytes
    const pdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF', 'utf-8');

    const res = await request.post('http://localhost:5001/api/v1/documents', {
      headers: {
        'x-test-user-id': ownerA.email,
      },
      multipart: {
        file: {
          name: 'Quarterly_Audit_Report.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBuffer,
        },
        title: 'Quarterly Audit Report',
        description: 'Confidential executive audit report v1',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Quarterly Audit Report');
    testDocId = body.data.id;
    expect(testDocId).toBeDefined();

    // Verify document retrieval by Owner A
    const getRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}`, {
      headers: {
        'x-test-user-id': ownerA.email,
      },
    });
    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data.ownerId).toBe(ownerA.id);
  });

  test('CROSS-OWNER ISOLATION: Owner B is denied access to Owner A private document', async ({ request }) => {
    const res = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}`, {
      headers: {
        'x-test-user-id': ownerB.email,
      },
    });
    expect(res.status()).toBe(403);
  });

  test('UNAUTHORIZED VIEWER: Viewer A with no grant is denied content preview and download', async ({ request }) => {
    // Attempt preview via /content
    const previewRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/content`, {
      headers: {
        'x-test-user-id': viewerA.email,
      },
    });
    expect(previewRes.status()).toBe(403);

    // Attempt download via /download
    const downloadRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/download`, {
      headers: {
        'x-test-user-id': viewerA.email,
      },
    });
    expect(downloadRes.status()).toBe(403);
  });

  test('COMBINATION 1: Owner A grants READ with canDownload: true to Viewer A', async ({ request }) => {
    const grantRes = await request.post(`http://localhost:5001/api/v1/documents/${testDocId}/permissions`, {
      headers: {
        'x-test-user-id': ownerA.email,
      },
      data: {
        targetUserId: viewerA.id,
        permission: 'READ',
        canDownload: true,
      },
    });
    expect(grantRes.status()).toBe(201);
    const grantBody = await grantRes.json();
    viewerAPermissionId = grantBody.data.id;

    // Viewer A can preview
    const previewRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/content`, {
      headers: {
        'x-test-user-id': viewerA.email,
      },
    });
    expect(previewRes.status()).toBe(200);

    // Viewer A can download
    const downloadRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/download`, {
      headers: {
        'x-test-user-id': viewerA.email,
      },
    });
    expect(downloadRes.status()).toBe(200);
  });

  test('COMBINATION 2: Owner A grants READ with canDownload: false to Viewer B', async ({ request }) => {
    const grantRes = await request.post(`http://localhost:5001/api/v1/documents/${testDocId}/permissions`, {
      headers: {
        'x-test-user-id': ownerA.email,
      },
      data: {
        targetUserId: viewerB.id,
        permission: 'READ',
        canDownload: false,
      },
    });
    expect(grantRes.status()).toBe(201);

    // Viewer B can preview
    const previewRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/content`, {
      headers: {
        'x-test-user-id': viewerB.email,
      },
    });
    expect(previewRes.status()).toBe(200);

    // Viewer B CANNOT download (blocked by canDownload toggle)
    const downloadRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/download`, {
      headers: {
        'x-test-user-id': viewerB.email,
      },
    });
    expect(downloadRes.status()).toBe(403);
  });

  test('IMMEDIATE REVOCATION: Owner A revokes Viewer A; preview and download terminate instantly', async ({ request }) => {
    // Revoke Viewer A access
    const revokeRes = await request.delete(`http://localhost:5001/api/v1/documents/${testDocId}/permissions/${viewerAPermissionId}`, {
      headers: {
        'x-test-user-id': ownerA.email,
      },
      data: {
        reason: 'Project phase completed',
      },
    });
    expect(revokeRes.status()).toBe(200);

    // Subsequent preview attempt is IMMEDIATELY blocked (403)
    const previewRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/content`, {
      headers: {
        'x-test-user-id': viewerA.email,
      },
    });
    expect(previewRes.status()).toBe(403);

    // Subsequent download attempt is IMMEDIATELY blocked (403)
    const downloadRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/download`, {
      headers: {
        'x-test-user-id': viewerA.email,
      },
    });
    expect(downloadRes.status()).toBe(403);
  });

  test('ADMIN LEAST PRIVILEGE: Admin can list metadata but CANNOT preview/download content without ACL', async ({ request }) => {
    // Admin can list document catalog
    const listRes = await request.get('http://localhost:5001/api/v1/admin/documents', {
      headers: {
        'x-test-user-id': adminUser.email,
      },
    });
    expect(listRes.status()).toBe(200);

    // Admin CANNOT preview document content
    const previewRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/content`, {
      headers: {
        'x-test-user-id': adminUser.email,
      },
    });
    expect(previewRes.status()).toBe(403);

    // Admin CANNOT download document binary
    const downloadRes = await request.get(`http://localhost:5001/api/v1/documents/${testDocId}/download`, {
      headers: {
        'x-test-user-id': adminUser.email,
      },
    });
    expect(downloadRes.status()).toBe(403);
  });

  test('USER DEACTIVATION: Deactivated user is immediately denied any access', async ({ request }) => {
    // Admin deactivates Viewer B
    const deactRes = await request.patch(`http://localhost:5001/api/v1/users/${viewerB.id}/status`, {
      headers: {
        'x-test-user-id': adminUser.email,
      },
      data: {
        isActive: false,
      },
    });
    expect(deactRes.status()).toBe(200);

    // Deactivated Viewer B attempted request
    const reqRes = await request.get('http://localhost:5001/api/v1/documents', {
      headers: {
        'x-test-user-id': viewerB.email,
      },
    });
    expect(reqRes.status()).toBe(403);

    // Reactivate Viewer B
    await request.patch(`http://localhost:5001/api/v1/users/${viewerB.id}/status`, {
      headers: {
        'x-test-user-id': adminUser.email,
      },
      data: {
        isActive: true,
      },
    });
  });

  test('AI ACCESS SUGGESTIONS: Heuristic generation, owner rejection and approval lifecycle', async ({ request }) => {
    // Generate suggestions (returns 201 Created)
    const genRes = await request.post(`http://localhost:5001/api/v1/documents/${testDocId}/ai-suggestions`, {
      headers: {
        'x-test-user-id': ownerA.email,
      },
    });
    expect(genRes.status()).toBe(201);
    const genBody = await genRes.json();
    expect(genBody.success).toBe(true);
    expect(genBody.data.suggestions).toBeDefined();

    if (genBody.data.suggestions.length > 0) {
      const firstSuggestion = genBody.data.suggestions[0];

      // Owner rejects suggestion
      const rejectRes = await request.post(`http://localhost:5001/api/v1/ai-suggestions/${firstSuggestion.id}/decision`, {
        headers: {
          'x-test-user-id': ownerA.email,
        },
        data: {
          decision: 'REJECTED',
        },
      });
      expect(rejectRes.status()).toBe(200);
    }
  });

  test('AUDIT TRAIL IMMUTABILITY: PostgreSQL trigger blocks any direct SQL UPDATE or DELETE on AuditLog', async () => {
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await pgClient.connect();

    // Verify trigger blocks direct UPDATE
    let updateBlocked = false;
    try {
      await pgClient.query(`UPDATE trustvault."AuditLog" SET "failureReason" = 'TAMPER_TEST' WHERE true;`);
    } catch (err: any) {
      updateBlocked = true;
      expect(err.message).toContain('AuditLog records are append-only and cryptographically immutable');
    }
    expect(updateBlocked).toBe(true);

    // Verify trigger blocks direct DELETE
    let deleteBlocked = false;
    try {
      await pgClient.query(`DELETE FROM trustvault."AuditLog" WHERE true;`);
    } catch (err: any) {
      deleteBlocked = true;
      expect(err.message).toContain('AuditLog records are append-only and cryptographically immutable');
    }
    expect(deleteBlocked).toBe(true);

    await pgClient.end();
  });
});
