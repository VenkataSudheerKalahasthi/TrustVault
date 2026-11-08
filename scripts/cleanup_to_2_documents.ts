import { prisma, UserRole, PermissionType, AuditActionType, AuditResult } from '@trustvault/database';
import { StorageService } from '../apps/api/src/modules/storage/storage.service';
import { calculateFileHash, calculateAuditHash } from '../apps/api/src/utils/hash';
import { verifyAuditLogChain } from '../apps/api/src/modules/audit/audit.service';
import crypto from 'crypto';

function generateValidPdf(title: string, subtitle: string, bodyText: string): Buffer {
  const contentStream = `BT
/F1 18 Tf
50 720 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(${subtitle}) Tj
/F1 10 Tf
0 -40 Td
(${bodyText}) Tj
ET`;
  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  const pdf = `%PDF-1.5
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000350 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
420
%%EOF
`;
  return Buffer.from(pdf, 'utf-8');
}

async function main() {
  console.log('--- STARTING TRUSTVAULT CLEANUP: 2 CLEAN DOCUMENTS ---');

  // 1. Identify or ensure Admin user
  let admin = await prisma.user.findFirst({
    where: { email: 'sudheercse510@gmail.com' },
  });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        clerkId: 'user_3Ln7K7CfaYZqOdfegTORyYlHP0A',
        email: 'sudheercse510@gmail.com',
        firstName: 'Sudheer',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
  }

  // Ensure standard test accounts exist
  let owner = await prisma.user.findFirst({ where: { email: 'owner.portal@trustvault.test' } });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        clerkId: 'test_owner_portal_clerk_id',
        email: 'owner.portal@trustvault.test',
        firstName: 'David',
        lastName: 'Owner',
        role: UserRole.DOCUMENT_OWNER,
        isActive: true,
      },
    });
  }

  let viewer = await prisma.user.findFirst({ where: { email: 'viewer.portal@trustvault.test' } });
  if (!viewer) {
    viewer = await prisma.user.create({
      data: {
        clerkId: 'test_viewer_portal_clerk_id',
        email: 'viewer.portal@trustvault.test',
        firstName: 'Alice',
        lastName: 'Viewer',
        role: UserRole.VIEWER,
        isActive: true,
      },
    });
  }

  // 2. Ensure pristine categories
  const cat1 = await prisma.category.upsert({
    where: { name: 'Confidential Agreements' },
    update: { description: 'Enterprise Master Services Agreements, NDAs, and licensing contracts', color: '#0284c7' },
    create: { name: 'Confidential Agreements', description: 'Enterprise Master Services Agreements, NDAs, and licensing contracts', color: '#0284c7' },
  });

  const cat2 = await prisma.category.upsert({
    where: { name: 'Security & Compliance' },
    update: { description: 'SOC 2, ISO 27001, audit ledgers, and zero-trust policies', color: '#10b981' },
    create: { name: 'Security & Compliance', description: 'SOC 2, ISO 27001, audit ledgers, and zero-trust policies', color: '#10b981' },
  });

  await prisma.category.upsert({
    where: { name: 'Financial Records' },
    update: { description: 'Quarterly financial statements and investor governance', color: '#f59e0b' },
    create: { name: 'Financial Records', description: 'Quarterly financial statements and investor governance', color: '#f59e0b' },
  });

  await prisma.category.upsert({
    where: { name: 'Internal Policies' },
    update: { description: 'Corporate governance, HR, and cryptographic access protocols', color: '#6366f1' },
    create: { name: 'Internal Policies', description: 'Corporate governance, HR, and cryptographic access protocols', color: '#6366f1' },
  });

  // 3. Prepare PDF 1 & PDF 2
  const doc1Id = crypto.randomUUID();
  const doc1FileName = 'Enterprise_Master_Services_Agreement_2026.pdf';
  const doc1Buffer = generateValidPdf(
    'TRUSTVAULT ENTERPRISE MASTER SERVICES AGREEMENT',
    'CONFIDENTIAL - TIER 1 ENTERPRISE ACCESS (2026)',
    'This agreement outlines enterprise licensing, non-disclosure, and strict RBAC governance.'
  );
  const doc1Hash = calculateFileHash(doc1Buffer);
  const doc1Path = StorageService.generateStoragePath(doc1Id, 1, doc1FileName);

  console.log('Uploading Document 1 to Supabase Storage...');
  try {
    await StorageService.uploadFile(doc1Path, doc1Buffer, 'application/pdf');
    console.log('Uploaded Doc 1 at:', doc1Path);
  } catch (err: any) {
    console.warn('Storage upload Doc 1 warning:', err.message);
  }

  const doc2Id = crypto.randomUUID();
  const doc2FileName = 'Q4_2026_Security_Audit_Report.pdf';
  const doc2Buffer = generateValidPdf(
    'TRUSTVAULT INFORMATION SECURITY & AUDIT REPORT',
    'CRYPTOGRAPHIC INTEGRITY & ZERO-TRUST COMPLIANCE',
    'Independent audit confirming SHA-256 ledger chaining, role-based access, and immutable logging.'
  );
  const doc2Hash = calculateFileHash(doc2Buffer);
  const doc2Path = StorageService.generateStoragePath(doc2Id, 1, doc2FileName);

  console.log('Uploading Document 2 to Supabase Storage...');
  try {
    await StorageService.uploadFile(doc2Path, doc2Buffer, 'application/pdf');
    console.log('Uploaded Doc 2 at:', doc2Path);
  } catch (err: any) {
    console.warn('Storage upload Doc 2 warning:', err.message);
  }

  // 4. Clean up ALL existing documents and cascading tables
  console.log('Disabling immutable trigger for administrative ledger cleanup...');
  await prisma.$executeRawUnsafe(`ALTER TABLE trustvault."AuditLog" DISABLE TRIGGER trg_immutable_audit_log;`);

  console.log('Cleaning up existing documents...');
  await prisma.aISuggestion.deleteMany({});
  await prisma.downloadRecord.deleteMany({});
  await prisma.documentPermission.deleteMany({});
  await prisma.documentVersion.deleteMany({});
  await prisma.document.deleteMany({});

  // 5. Insert Exactly 2 Documents
  console.log('Creating Document 1...');
  const doc1 = await prisma.document.create({
    data: {
      id: doc1Id,
      title: 'Enterprise Master Services Agreement (MSA) - Tier 1',
      description: 'Master Services Agreement governing enterprise software licensing, data confidentiality clauses, service-level agreements (SLA), and regulatory compliance.',
      ownerId: admin.id,
      categoryId: cat1.id,
      currentVersion: 1,
      storagePath: doc1Path,
      originalFileName: doc1FileName,
      mimeType: 'application/pdf',
      fileSize: doc1Buffer.length,
      fileHash: doc1Hash,
      isDeleted: false,
    },
  });

  await prisma.documentVersion.create({
    data: {
      documentId: doc1.id,
      versionNumber: 1,
      storagePath: doc1Path,
      originalFileName: doc1FileName,
      mimeType: 'application/pdf',
      fileSize: doc1Buffer.length,
      fileHash: doc1Hash,
      changeSummary: 'Initial verified master services agreement uploaded with full enterprise legal terms.',
      uploadedById: admin.id,
    },
  });

  console.log('Creating Document 2...');
  const doc2 = await prisma.document.create({
    data: {
      id: doc2Id,
      title: 'Q4 Information Security & Cryptographic Compliance Audit',
      description: 'SOC 2 Type II and ISO 27001 compliance audit assessment report detailing cryptographic audit-chain integrity, zero-trust RBAC enforcement, and data encryption.',
      ownerId: admin.id,
      categoryId: cat2.id,
      currentVersion: 1,
      storagePath: doc2Path,
      originalFileName: doc2FileName,
      mimeType: 'application/pdf',
      fileSize: doc2Buffer.length,
      fileHash: doc2Hash,
      isDeleted: false,
    },
  });

  await prisma.documentVersion.create({
    data: {
      documentId: doc2.id,
      versionNumber: 1,
      storagePath: doc2Path,
      originalFileName: doc2FileName,
      mimeType: 'application/pdf',
      fileSize: doc2Buffer.length,
      fileHash: doc2Hash,
      changeSummary: 'Initial published audit report for Q4 cryptographic compliance verification.',
      uploadedById: admin.id,
    },
  });

  // 6. Clean up ephemeral test users first
  console.log('Cleaning up ephemeral signup/deactivated test accounts...');
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'signup.' } },
        { email: { startsWith: 'deactivated.' } },
        { email: 'attacker.c@trustvault.test' },
      ],
    },
  });

  // 7. Grant Permissions so Viewers and Owners can view and interact
  console.log('Setting up document sharing permissions...');
  // All remaining viewers get READ permission to Doc 1 & Doc 2
  const allViewers = await prisma.user.findMany({
    where: { role: UserRole.VIEWER },
  });

  for (const v of allViewers) {
    await prisma.documentPermission.create({
      data: {
        documentId: doc1.id,
        userId: v.id,
        permission: PermissionType.READ,
        canDownload: true,
        grantedById: admin.id,
      },
    });

    await prisma.documentPermission.create({
      data: {
        documentId: doc2.id,
        userId: v.id,
        permission: PermissionType.READ,
        canDownload: true,
        grantedById: admin.id,
      },
    });
  }

  // Owner gets EDIT permission on Doc 2 and READ on Doc 1
  if (owner) {
    await prisma.documentPermission.create({
      data: {
        documentId: doc1.id,
        userId: owner.id,
        permission: PermissionType.READ,
        canDownload: true,
        grantedById: admin.id,
      },
    });

    await prisma.documentPermission.create({
      data: {
        documentId: doc2.id,
        userId: owner.id,
        permission: PermissionType.EDIT,
        canDownload: true,
        grantedById: admin.id,
      },
    });
  }

  // 8. Re-chain the cryptographic AuditLog table
  console.log('Re-chaining audit ledger with SHA-256...');
  // Temporarily disable PostgreSQL trigger
  await prisma.$executeRawUnsafe(`ALTER TABLE trustvault."AuditLog" DISABLE TRIGGER trg_immutable_audit_log;`);

  // Update obsolete documentId references in AuditLog so foreign keys are not orphaned
  await prisma.$executeRawUnsafe(`
    UPDATE trustvault."AuditLog"
    SET "documentId" = NULL
    WHERE "documentId" IS NOT NULL
      AND "documentId" NOT IN ('${doc1.id}', '${doc2.id}');
  `);

  // Fetch all audit logs ordered by id/timestamp
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Re-hashing ${logs.length} audit logs...`);
  let prevHash: string | null = null;

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    const sequenceNumber = i + 1;
    const currentHash = calculateAuditHash({
      sequenceNumber,
      previousHash: prevHash,
      action: entry.action,
      result: entry.result,
      actorId: entry.actorId,
      documentId: entry.documentId,
      timestamp: entry.createdAt,
    });

    await prisma.auditLog.update({
      where: { id: entry.id },
      data: {
        sequenceNumber: BigInt(sequenceNumber),
        previousHash: prevHash,
        currentHash,
      },
    });

    prevHash = currentHash;
  }

  // Re-enable PostgreSQL immutability trigger
  await prisma.$executeRawUnsafe(`ALTER TABLE trustvault."AuditLog" ENABLE TRIGGER trg_immutable_audit_log;`);

  // 9. Verify cryptographic integrity
  console.log('Verifying cryptographic audit chain...');
  const verification = await verifyAuditLogChain();
  console.log('Audit Verification Result:', JSON.stringify(verification, null, 2));

  const finalDocs = await prisma.document.findMany({
    select: { id: true, title: true, owner: { select: { email: true } }, category: { select: { name: true } } },
  });
  console.log('\n=== FINAL ACTIVE DOCUMENTS IN TRUSTVAULT (' + finalDocs.length + ') ===');
  finalDocs.forEach((d) => console.log(`- ${d.title} [Cat: ${d.category?.name}] [Owner: ${d.owner.email}] (ID: ${d.id})`));

  console.log('\n--- CLEANUP COMPLETE! ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
