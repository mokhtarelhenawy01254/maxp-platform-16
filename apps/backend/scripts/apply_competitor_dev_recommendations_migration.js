const { getSharedPrismaClient } = require('../services/sharedDatabase');
require('dotenv').config();

async function run() {
  console.log('Starting competitor dev recommendations migration...');
  const prisma = getSharedPrismaClient();

  try {
    console.log('Creating competitor_dev_recommendations table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "competitor_dev_recommendations" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "competitorId" TEXT NOT NULL,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "competitor_dev_recommendations_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('competitor_dev_recommendations table created.');

    console.log('Creating competitor_dev_tasks table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "competitor_dev_tasks" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "recommendationId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "status" TEXT NOT NULL DEFAULT 'not_started',
          "targetDate" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "competitor_dev_tasks_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('competitor_dev_tasks table created.');

    console.log('Creating indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "competitor_dev_recommendations_competitorId_idx" ON "competitor_dev_recommendations"("competitorId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "competitor_dev_tasks_recommendationId_idx" ON "competitor_dev_tasks"("recommendationId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "competitor_dev_tasks_recommendationId_status_idx" ON "competitor_dev_tasks"("recommendationId", "status");
    `);
    console.log('Indexes created.');

    console.log('Adding foreign keys...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'competitor_dev_recommendations_competitorId_fkey'
        ) THEN
          ALTER TABLE "competitor_dev_recommendations"
            ADD CONSTRAINT "competitor_dev_recommendations_competitorId_fkey"
            FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END
      $$;
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'competitor_dev_tasks_recommendationId_fkey'
        ) THEN
          ALTER TABLE "competitor_dev_tasks"
            ADD CONSTRAINT "competitor_dev_tasks_recommendationId_fkey"
            FOREIGN KEY ("recommendationId") REFERENCES "competitor_dev_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END
      $$;
    `);
    console.log('Foreign keys added.');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
