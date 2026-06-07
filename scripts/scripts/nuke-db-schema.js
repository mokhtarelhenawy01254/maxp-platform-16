const { getSharedPrismaClient } = require('../backend/services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();

  console.log('[DB-NUKE] Dropping EVERYTHING in public schema...');

  // Drop the entire public schema and recreate it
  await prisma.$executeRawUnsafe(`DROP SCHEMA public CASCADE`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA public`);
  await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO postgres`);
  await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public`);

  console.log('[DB-NUKE] Public schema dropped and recreated. Now run db push.');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
