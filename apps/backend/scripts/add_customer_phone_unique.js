/**
 * ╪Ñ╪╢╪º┘ü╪⌐ ┘ü┘ç╪▒╪│ ┘ü╪▒┘è╪» (companyId, phone) ╪╣┘ä┘ë ╪¼╪»┘ê┘ä customers ΓÇö ┘è┘à┘å╪╣ ╪¬┘â╪▒╪º╪▒ ╪º┘ä╪╣┘à┘ä╪º╪í
 * ┘ä┘å┘ü╪│ ╪º┘ä╪▒┘é┘à ┘ü┘è ┘å┘ü╪│ ╪º┘ä╪┤╪▒┘â╪⌐ (rac-free create).
 *
 * ╪ó┘à┘å: ┘è┘ü╪¡╪╡ ┘ê╪¼┘ê╪» duplicates ╪º┘ä╪ú┘ê┘ä. ┘ä┘ê ┘ü┘è┘ç duplicates ΓåÆ ┘è╪▒┘ü╪╢ ┘ê┘è╪╣╪▒╪╢┘ç┘à ╪╣╪┤╪º┘å ╪¬╪┤╪║┘æ┘ä
 * scripts/merge_duplicate_customers.js ╪º┘ä╪ú┘ê┘ä. ┘ä┘ê ┘à┘ü┘è╪┤ ΓåÆ ╪¿┘è╪╣┘à┘ä ╪º┘ä┘ü┘ç╪▒╪│.
 *
 * ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à: node scripts/add_customer_phone_unique.js [--dry-run]
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const prisma = getSharedPrismaClient();
  const isMysql = String(process.env.POSTGRES_URL || process.env.DATABASE_URL || '').toLowerCase().startsWith('mysql://');

  console.log(`≡ƒöì Checking for duplicate (companyId, phone) pairs...`);

  const dupes = await prisma.$queryRawUnsafe(`
    SELECT ${isMysql ? '`companyId`' : '"companyId"'}, ${isMysql ? '`phone`' : '"phone"'}, COUNT(*) AS cnt
    FROM ${isMysql ? '`customers`' : '"customers"'}
    WHERE ${isMysql ? '`phone`' : '"phone"'} IS NOT NULL AND ${isMysql ? '`phone`' : '"phone"'} <> ''
    GROUP BY ${isMysql ? '`companyId`' : '"companyId"'}, ${isMysql ? '`phone`' : '"phone"'}
    HAVING COUNT(*) > 1
    LIMIT 50
  `);

  if (dupes.length > 0) {
    console.log(`Γ¥î Found ${dupes.length}+ duplicate groups. Run scripts/merge_duplicate_customers.js first:`);
    for (const d of dupes.slice(0, 20)) {
      console.log(`   companyId=${d.companyId} phone=${d.phone} count=${d.cnt}`);
    }
    console.log(`\nThe unique index was NOT created.`);
    process.exit(1);
  }

  const indexName = isMysql ? 'customers_companyId_phone_key' : 'customers_companyId_phone_key';
  if (DRY_RUN) {
    console.log(`Γ£à No duplicates. Would create unique index ${indexName} (dry-run, nothing applied).`);
    return;
  }

  await prisma.$executeRawUnsafe(
    isMysql
      ? `ALTER TABLE \`customers\` ADD UNIQUE INDEX \`${indexName}\` (\`companyId\`, \`phone\`)`
      : `CREATE UNIQUE INDEX "${indexName}" ON "customers" ("companyId", "phone")`
  );

  console.log(`Γ£à Unique index ${indexName} created on customers(companyId, phone).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Γ¥î Failed:', e.message);
  process.exit(1);
});
