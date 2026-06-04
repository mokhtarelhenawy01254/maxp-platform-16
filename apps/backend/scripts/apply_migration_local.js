const { getSharedPrismaClient } = require('../services/sharedDatabase');
require('dotenv').config();

async function run() {
  console.log('🚀 [MIGRATION-RUNNER] Starting local migration...');
  const prisma = getSharedPrismaClient();

  try {
    console.log('🔹 Creating product_search_logs table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_search_logs" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "companyId" TEXT NOT NULL,
          "conversationId" TEXT,
          "queryText" TEXT NOT NULL,
          "expandedQuery" TEXT,
          "extractedFilters" JSONB DEFAULT '{}',
          "searchWeights" JSONB DEFAULT '{}',
          "resolvedProductIds" TEXT[] DEFAULT '{}',
          "resultCount" INTEGER NOT NULL DEFAULT 0,
          "topScore" DOUBLE PRECISION DEFAULT 0,
          "searchStrategy" TEXT DEFAULT 'hybrid',
          "recoveryUsed" BOOLEAN NOT NULL DEFAULT false,
          "recoveryStrategy" TEXT,
          "conversionType" TEXT,
          "latencyMs" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "product_search_logs_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Table created successfully.');

    console.log('🔹 Creating indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "product_search_logs_companyId_idx" ON "product_search_logs"("companyId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "product_search_logs_createdAt_idx" ON "product_search_logs"("createdAt");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "product_search_logs_conversionType_idx" ON "product_search_logs"("conversionType");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "product_search_logs_companyId_createdAt_idx" ON "product_search_logs"("companyId", "createdAt" DESC);
    `);
    console.log('✅ Indexes created successfully.');

    console.log('🎉 [MIGRATION-RUNNER] Migration applied successfully!');
  } catch (err) {
    console.error('❌ [MIGRATION-RUNNER] Migration failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
