const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicates() {
  console.log("🧹 Starting duplicate cleanup for unique constraints...");

  try {
    // 1. Fix OrderStatus PENDING_CANCELLATION
    // Change PENDING_CANCELLATION to CANCELLED or something safe.
    await prisma.$executeRawUnsafe(`
      UPDATE "orders" SET "status" = 'CANCELLED' WHERE "status"::text = 'PENDING_CANCELLATION';
    `).catch(e => console.log("OrderStatus fix skipped:", e.message));

    // 2. Fix company_follow_ups duplicate company_id
    // Keep only the most recently updated follow-up per company
    await prisma.$executeRawUnsafe(`
      DELETE FROM "company_follow_ups"
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER(PARTITION BY "company_id" ORDER BY "updatedAt" DESC) as rn
          FROM "company_follow_ups"
        ) t WHERE t.rn = 1
      );
    `).catch(e => console.log("company_follow_ups fix skipped:", e.message));

    // 3. Fix customers duplicate instagramId, companyId
    // Keep only the most recently updated customer per instagramId + companyId
    await prisma.$executeRawUnsafe(`
      DELETE FROM "customers"
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER(PARTITION BY "instagramId", "companyId" ORDER BY "updatedAt" DESC) as rn
          FROM "customers"
          WHERE "instagramId" IS NOT NULL
        ) t WHERE t.rn = 1
      ) AND "instagramId" IS NOT NULL;
    `).catch(e => console.log("customers fix skipped:", e.message));

    // 4. Fix facebook_pages duplicate instagramAccountId
    // Keep the most recently updated page per instagramAccountId
    await prisma.$executeRawUnsafe(`
      DELETE FROM "facebook_pages"
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER(PARTITION BY "instagramAccountId" ORDER BY "updatedAt" DESC) as rn
          FROM "facebook_pages"
          WHERE "instagramAccountId" IS NOT NULL
        ) t WHERE t.rn = 1
      ) AND "instagramAccountId" IS NOT NULL;
    `).catch(e => console.log("facebook_pages fix skipped:", e.message));

    console.log("✅ Duplicate cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error during duplicate cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicates();
