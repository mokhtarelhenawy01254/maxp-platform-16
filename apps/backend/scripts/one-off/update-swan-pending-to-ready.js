const { PrismaClient, OrderStatus } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── Configuration ───────────────────────────────────────────────────────────
const COMPANY_SLUG = process.env.COMPANY_SLUG || 'swan';
const CUTOFF_DATE_STR = process.env.CUTOFF_DATE || '2026-06-16T00:00:00.000Z';
const SOURCE_STATUS = process.env.SOURCE_STATUS || 'PENDING';        // قيد الانتظار
const TARGET_STATUS = process.env.TARGET_STATUS || 'READY_FOR_PROCESSING'; // جاهز
const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);

const cutoffDate = new Date(CUTOFF_DATE_STR);

async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('Swan orders status migration');
  console.log(`Company slug : ${COMPANY_SLUG}`);
  console.log(`Cutoff date  : ${cutoffDate.toISOString()}`);
  console.log(`Source status: ${SOURCE_STATUS}`);
  console.log(`Target status: ${TARGET_STATUS}`);
  console.log(`Dry run      : ${DRY_RUN}`);
  console.log('══════════════════════════════════════════════════════════════');

  const company = await prisma.company.findUnique({
    where: { slug: COMPANY_SLUG },
    select: { id: true, name: true, slug: true, isActive: true }
  });

  if (!company) {
    console.error(`❌ Company with slug "${COMPANY_SLUG}" not found.`);
    const suggestions = await prisma.company.findMany({
      where: { slug: { contains: COMPANY_SLUG, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true },
      take: 5
    });
    if (suggestions.length) {
      console.log('Did you mean one of these?');
      console.table(suggestions);
    }
    process.exit(1);
  }

  console.log(`✅ Found company: ${company.name} (${company.id})`);

  // ─── Count matching regular orders ─────────────────────────────────────────
  const orderWhere = {
    companyId: company.id,
    status: SOURCE_STATUS,
    createdAt: { lt: cutoffDate }
  };

  const orderCount = await prisma.order.count({ where: orderWhere });
  console.log(`\nRegular orders to update : ${orderCount}`);

  // ─── Count matching guest orders ───────────────────────────────────────────
  const guestOrderWhere = {
    companyId: company.id,
    status: { equals: SOURCE_STATUS, mode: 'insensitive' },
    createdAt: { lt: cutoffDate }
  };

  const guestOrderCount = await prisma.guestOrder.count({ where: guestOrderWhere });
  console.log(`Guest orders to update   : ${guestOrderCount}`);
  console.log(`Total orders to update   : ${orderCount + guestOrderCount}\n`);

  if (DRY_RUN) {
    console.log('🏃 DRY RUN — no changes were made.');
    // Show first few order numbers for verification
    const sampleOrders = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true, orderNumber: true, status: true, createdAt: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    const sampleGuests = await prisma.guestOrder.findMany({
      where: guestOrderWhere,
      select: { id: true, orderNumber: true, status: true, createdAt: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Sample regular orders:');
    console.table(sampleOrders);
    console.log('Sample guest orders:');
    console.table(sampleGuests);
    await prisma.$disconnect();
    return;
  }

  let updatedOrders = 0;
  let updatedGuestOrders = 0;

  // ─── Update regular orders in batches ──────────────────────────────────────
  while (true) {
    const batch = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true, orderNumber: true, status: true },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' }
    });

    if (batch.length === 0) break;

    const ids = batch.map(o => o.id);
    const result = await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status: TARGET_STATUS }
    });
    updatedOrders += result.count;
    console.log(`  → Updated ${result.count} regular orders (running total: ${updatedOrders})`);
  }

  // ─── Update guest orders in batches ────────────────────────────────────────
  while (true) {
    const batch = await prisma.guestOrder.findMany({
      where: guestOrderWhere,
      select: { id: true, orderNumber: true, status: true },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' }
    });

    if (batch.length === 0) break;

    const ids = batch.map(o => o.id);
    const result = await prisma.guestOrder.updateMany({
      where: { id: { in: ids } },
      data: { status: TARGET_STATUS }
    });
    updatedGuestOrders += result.count;
    console.log(`  → Updated ${result.count} guest orders (running total: ${updatedGuestOrders})`);
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`✅ Migration complete`);
  console.log(`   Regular orders updated: ${updatedOrders}`);
  console.log(`   Guest orders updated  : ${updatedGuestOrders}`);
  console.log(`   Total updated         : ${updatedOrders + updatedGuestOrders}`);
  console.log('══════════════════════════════════════════════════════════════');
}

main()
  .catch(async (err) => {
    console.error('❌ Migration failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
