import { PrismaClient, UserRole } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../apps/api/.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial TrustVault categories and default data...');

  const categories = [
    { name: 'Confidential Agreements', description: 'NDAs, customer contracts, and vendor agreements', color: '#0284c7' },
    { name: 'Financial Records', description: 'Audit statements, cap tables, invoices, and budget forecasts', color: '#059669' },
    { name: 'Security & Compliance', description: 'SOC 2 reports, penetration testing, policies, and threat models', color: '#d97706' },
    { name: 'Engineering & Architecture', description: 'System designs, technical specifications, and API blueprints', color: '#4f46e5' },
    { name: 'Human Resources', description: 'Employee records, offer letters, compensation packages, and reviews', color: '#7c3aed' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description, color: cat.color },
      create: cat,
    });
  }

  console.log('Default categories verified.');

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (adminEmail) {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      await prisma.user.create({
        data: {
          clerkId: 'bootstrap_admin_clerk_id',
          email: adminEmail,
          firstName: 'Security',
          lastName: 'Administrator',
          role: UserRole.ADMIN,
          isActive: true,
        },
      });
      console.log(`Bootstrap admin user created for ${adminEmail}`);
    } else if (existing.role !== UserRole.ADMIN) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: UserRole.ADMIN },
      });
      console.log(`Promoted ${adminEmail} to ADMIN`);
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

