const { getSharedPrismaClient } = require('../backend/services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();

  console.log('[DB-FIX] Dropping _prisma_migrations...');
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "_prisma_migrations" CASCADE');
    console.log('[DB-FIX] _prisma_migrations dropped.');
  } catch (e) {
    console.warn('[DB-FIX] Could not drop _prisma_migrations:', e.message);
  }

  await prisma.$disconnect();
  console.log('[DB-FIX] Done. Run db push now.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
