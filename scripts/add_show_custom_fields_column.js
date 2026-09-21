const { getSharedPrismaClient } = require('../apps/backend/services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "order_invoice_settings" ADD COLUMN IF NOT EXISTS "showCustomFields" BOOLEAN NOT NULL DEFAULT false;'
    );
    console.log('✅ Successfully added "showCustomFields" column to order_invoice_settings table');

    // Also update red-line company if it exists in DB using raw query
    const companies = await prisma.$queryRawUnsafe(
      `SELECT id, name, email FROM "companies" WHERE email = 'abdallahwaleed@gmail.com' OR name ILIKE '%red-line%' OR name ILIKE '%red line%'`
    );

    for (const company of companies) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "order_invoice_settings" ("id", "companyId", "showCustomFields", "updatedAt")
         VALUES (gen_random_uuid(), '${company.id}', true, NOW())
         ON CONFLICT ("companyId") DO UPDATE SET "showCustomFields" = true, "updatedAt" = NOW();`
      );
      console.log(`✅ Enabled showCustomFields for company: ${company.name} (${company.id})`);
    }

    // Also check users with email abdallahwaleed@gmail.com
    const users = await prisma.$queryRawUnsafe(
      `SELECT id, "companyId", email FROM "users" WHERE email = 'abdallahwaleed@gmail.com'`
    );
    for (const u of users) {
      if (u.companyId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "order_invoice_settings" ("id", "companyId", "showCustomFields", "updatedAt")
           VALUES (gen_random_uuid(), '${u.companyId}', true, NOW())
           ON CONFLICT ("companyId") DO UPDATE SET "showCustomFields" = true, "updatedAt" = NOW();`
        );
        console.log(`✅ Enabled showCustomFields for user company: ${u.companyId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
