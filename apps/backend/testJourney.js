const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function testJourney() {
  console.log('--- STARTING CONNECTION TEST ---');
  try {
    const company = await prisma.company.findFirst({
        where: { isActive: true }
    });
    if (!company) {
        console.log('No company found.');
        return;
    }
    console.log(`Database connection OK. Found company: ${company.id}`);
  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('--- TEST FINISHED ---');
  }
}

testJourney();
