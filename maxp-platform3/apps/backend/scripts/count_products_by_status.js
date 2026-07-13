require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { slug: { contains: 'swan' } },
    select: { id: true, name: true, slug: true }
  });

  console.log(`Found ${companies.length} companies matching 'swan':`);
  console.table(companies);

  if (companies.length === 0) {
    console.log('\nAll companies:');
    const all = await prisma.company.findMany({ select: { id: true, name: true, slug: true } });
    console.table(all);
    process.exit(1);
  }

  const company = companies[0];
  console.log(`\nUsing: ${company.name} (${company.slug}) — ${company.id}\n`);

  const rows = await prisma.$queryRaw`
    SELECT
      "isActive",
      "isHidden",
      COUNT(*)::int AS count
    FROM "products"
    WHERE "companyId" = ${company.id}
      AND "deletedAt" IS NULL
    GROUP BY "isActive", "isHidden"
    ORDER BY "isActive", "isHidden"
  `;

  console.table(rows);

  const total = rows.reduce((s, r) => s + Number(r.count), 0);
  console.log(`\nTotal active (non-deleted) products: ${total}`);

  const activeVisible = rows.find(r => r.isActive === true && r.isHidden === false);
  const activeHidden = rows.find(r => r.isActive === true && r.isHidden === true);
  const inactiveVisible = rows.find(r => r.isActive === false && r.isHidden === false);
  const inactiveHidden = rows.find(r => r.isActive === false && r.isHidden === true);

  console.log(`\n--- Breakdown ---`);
  console.log(`isActive=true  + isHidden=false: ${activeVisible?.count || 0}  ← يظهر في المتجر`);
  console.log(`isActive=true  + isHidden=true:  ${activeHidden?.count || 0}  ← مخفي من المتجر`);
  console.log(`isActive=false + isHidden=false: ${inactiveVisible?.count || 0}  ← غير نشط (مسودة/مرفوض/etc)`);
  console.log(`isActive=false + isHidden=true:  ${inactiveHidden?.count || 0}  ← غير نشط ومخفي`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
