
const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function test() {
  console.log('Starting local DB test...');
  try {
    await prisma.$connect();
    console.log('✅ Local DB connection successful');
    const userCount = await prisma.user.count();
    console.log('📊 User count:', userCount);
  } catch (err) {
    console.error('❌ Local DB connection failed:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
