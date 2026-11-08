import { prisma } from '@trustvault/database';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, clerkId: true }
  });
  console.log('=== USERS ===');
  users.forEach(u => console.log(`${u.email} | Name: ${u.firstName} ${u.lastName} | Role: ${u.role} | Active: ${u.isActive} | Clerk: ${u.clerkId}`));

  const docs = await prisma.document.findMany({
    select: { id: true, title: true, isDeleted: true, originalFileName: true, owner: { select: { email: true } }, category: { select: { name: true } } }
  });
  console.log('\n=== DOCUMENTS (' + docs.length + ') ===');
  docs.forEach(d => console.log(`${d.id} | ${d.title} | ${d.originalFileName} | Owner: ${d.owner.email} | Cat: ${d.category?.name} | Deleted: ${d.isDeleted}`));

  const perms = await prisma.documentPermission.findMany({
    include: { user: { select: { email: true } }, document: { select: { title: true } } }
  });
  console.log('\n=== PERMISSIONS (' + perms.length + ') ===');
  perms.forEach(p => console.log(`Doc: ${p.document.title} -> User: ${p.user.email} | Perm: ${p.permission} | Revoked: ${p.isRevoked}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());

