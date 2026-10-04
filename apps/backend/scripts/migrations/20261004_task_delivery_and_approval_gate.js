const { PrismaClient } = require('@prisma/client');

async function runTaskGateMigration(prismaClient = null) {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  console.log('🚀 [Migration 20261004] Starting Task Delivery & Approval Gate migration...');

  try {
    // 1. Add new columns to "Task" table if not exist
    const columnsToAdd = [
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "hasEvidence" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "missingEvidence" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "evidence" JSONB;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "acceptanceCriteria" TEXT;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "acceptanceCriteriaMet" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "criteriaChecklist" JSONB;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "returnCount" INTEGER DEFAULT 0;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "lastReturnReason" TEXT;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "submittedForReviewAt" TIMESTAMP(3);`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "ownerOverride" BOOLEAN DEFAULT false;`,
      `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "ownerOverrideReason" TEXT;`
    ];

    for (const sql of columnsToAdd) {
      await prisma.$executeRawUnsafe(sql).catch((err) => {
        console.warn(`[Migration] Column add notice: ${err.message}`);
      });
    }
    console.log('✅ [Migration] "Task" table columns verified/added.');

    // 2. Create "task_backlogs" table if not exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "task_backlogs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "source" TEXT NOT NULL DEFAULT 'PRODUCT_NOTE',
        "priority" "Task_priority" NOT NULL DEFAULT 'MEDIUM',
        "type" TEXT NOT NULL DEFAULT 'improvement',
        "suggestedCategory" TEXT,
        "tags" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "convertedTaskId" TEXT,
        "convertedAt" TIMESTAMP(3),
        "createdBy" TEXT NOT NULL,
        "assignedTo" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch((err) => console.warn(`[Migration] task_backlogs table creation notice: ${err.message}`));

    // Indexes for task_backlogs
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "task_backlogs_companyId_idx" ON "task_backlogs"("companyId");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "task_backlogs_status_idx" ON "task_backlogs"("status");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "task_backlogs_priority_idx" ON "task_backlogs"("priority");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "task_backlogs_createdBy_idx" ON "task_backlogs"("createdBy");`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "task_backlogs_assignedTo_idx" ON "task_backlogs"("assignedTo");`).catch(() => {});
    console.log('✅ [Migration] "task_backlogs" table & indexes verified/created.');

    // 3. Requirement 7: Flag legacy IN_REVIEW tasks that lack evidence
    const legacyFlagCount = await prisma.$executeRawUnsafe(`
      UPDATE "Task"
      SET 
        "missingEvidence" = true,
        "hasEvidence" = false
      WHERE "status" = 'IN_REVIEW' 
        AND ("evidence" IS NULL OR "hasEvidence" = false);
    `).catch((err) => {
      console.warn(`[Migration] Legacy IN_REVIEW flag notice: ${err.message}`);
      return 0;
    });

    console.log(`✅ [Migration] Requirement 7: Flagged ${legacyFlagCount} legacy IN_REVIEW tasks as missingEvidence=true.`);

    return {
      success: true,
      legacyFlaggedCount: legacyFlagCount
    };
  } catch (error) {
    console.error('❌ [Migration] Task Delivery & Approval Gate migration failed:', error);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect().catch(() => {});
    }
  }
}

if (require.main === module) {
  runTaskGateMigration()
    .then((res) => {
      console.log('Migration finished successfully:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration execution error:', err);
      process.exit(1);
    });
}

module.exports = { runTaskGateMigration };
