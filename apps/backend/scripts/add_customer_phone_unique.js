/**
 * إضافة فهرس فريد (companyId, phone) على جدول customers — يمنع تكرار العملاء
 * لنفس الرقم في نفس الشركة (rac-free create).
 *
 * آمن: يفحص وجود duplicates الأول. لو فيه duplicates → يرفض ويعرضهم عشان تشغّل
 * scripts/merge_duplicate_customers.js الأول. لو مفيش → بيعمل الفهرس.
 *
 * الاستخدام: node scripts/add_customer_phone_unique.js [--dry-run]
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const prisma = getSharedPrismaClient();
  const isMysql = String(process.env.POSTGRES_URL || process.env.DATABASE_URL || '').toLowerCase().startsWith('mysql://');

  console.log(`🔍 Checking for duplicate (companyId, phone) pairs...`);

  const dupes = await prisma.$queryRawUnsafe(`
    SELECT ${isMysql ? '`companyId`' : '"companyId"'}, ${isMysql ? '`phone`' : '"phone"'}, COUNT(*) AS cnt
    FROM ${isMysql ? '`customers`' : '"customers"'}
    WHERE ${isMysql ? '`phone`' : '"phone"'} IS NOT NULL AND ${isMysql ? '`phone`' : '"phone"'} <> ''
    GROUP BY ${isMysql ? '`companyId`' : '"companyId"'}, ${isMysql ? '`phone`' : '"phone"'}
    HAVING COUNT(*) > 1
    LIMIT 50
  `);

  if (dupes.length > 0) {
    console.log(`❌ Found ${dupes.length}+ duplicate groups. Run scripts/merge_duplicate_customers.js first:`);
    for (const d of dupes.slice(0, 20)) {
      console.log(`   companyId=${d.companyId} phone=${d.phone} count=${d.cnt}`);
    }
    console.log(`\nThe unique index was NOT created.`);
    process.exit(1);
  }

  const indexName = isMysql ? 'customers_companyId_phone_key' : 'customers_companyId_phone_key';
  if (DRY_RUN) {
    console.log(`✅ No duplicates. Would create unique index ${indexName} (dry-run, nothing applied).`);
    return;
  }

  await prisma.$executeRawUnsafe(
    isMysql
      ? `ALTER TABLE \`customers\` ADD UNIQUE INDEX \`${indexName}\` (\`companyId\`, \`phone\`)`
      : `CREATE UNIQUE INDEX "${indexName}" ON "customers" ("companyId", "phone")`
  );

  console.log(`✅ Unique index ${indexName} created on customers(companyId, phone).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
