const { getSharedPrismaClient } = require('../backend/services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();

  console.log('[DB-RESET] Dropping all tables in public schema...');

  // Drop all tables except _prisma_migrations
  await prisma.$executeRaw`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `;

  console.log('[DB-RESET] All tables dropped (except _prisma_migrations).');
  console.log('[DB-RESET] Now run: npx prisma db push --schema prisma/schema/main.prisma');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
