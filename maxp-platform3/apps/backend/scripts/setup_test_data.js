const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function setup() {
  try {
    const prisma = getSharedPrismaClient();
    
    console.log('Creating test company...');
    const company = await prisma.company.create({
      data: {
        name: 'Test Company ' + Date.now(),
        slug: 'test-company-' + Date.now(),
        email: `company-${Date.now()}@example.com`,
      },
    });

    console.log('Creating test user...');
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        companyId: company.id,
        role: 'SUPER_ADMIN',
      },
    });

    console.log('\n✅ Test data created successfully:');
    console.log(JSON.stringify({ companyId: company.id, userId: user.id }, null, 2));
  } catch (e) {
    console.error('❌ Setup failed:', e);
  }
}

setup();
