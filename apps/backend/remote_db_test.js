const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Remote DB Connectivity Test (Custom Path)...');
  try {
    const settings = await prisma.storefrontSettings.findFirst({
      select: { clarityProjectId: true }
    });
    console.log('✅ Successfully connected to database!');
    console.log('📊 Current clarityProjectId:', settings?.clarityProjectId || 'Not set');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
