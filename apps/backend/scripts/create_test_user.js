const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creating test company and user...');

    const hashedPassword = await bcrypt.hash('test123', 10);

    const company = await prisma.company.upsert({
      where: { email: 'test@company.com' },
      update: {},
      create: {
        name: 'Test Company',
        email: 'test@company.com',
        slug: 'test-company',
        currency: 'EGP',
        isActive: true,
      },
    });

    console.log('✅ Company created:', company.name);

    const user = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {
        password: hashedPassword,
      },
      create: {
        email: 'admin@test.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        companyId: company.id,
        isActive: true,
      },
    });

    console.log('✅ User created:', user.email);
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@test.com');
    console.log('   Password: test123');
    console.log('\n🚀 You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
