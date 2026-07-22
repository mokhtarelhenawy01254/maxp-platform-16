const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmlc7s6kh000iju40ei73ez36'; // Flora
  const TERMINAL_STATUSES = [
    'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DUPLICATE_ORDER'
  ];

  const totalActive = await prisma.order.count({
    where: { companyId, NOT: { status: { in: TERMINAL_STATUSES } } }
  });

  const withTurbo = await prisma.order.count({
    where: {
      companyId,
      NOT: { status: { in: TERMINAL_STATUSES } },
      NOT: { turboTrackingNumber: null }
    }
  });

  const withoutTurbo = await prisma.order.count({
    where: {
      companyId,
      NOT: { status: { in: TERMINAL_STATUSES } },
      turboTrackingNumber: null
    }
  });

  console.log(`📊 Flora Active Orders Summary:`);
  console.log(`📌 Total Active Orders: ${totalActive}`);
  console.log(`✅ Orders WITH Turbo Tracking Code: ${withTurbo}`);
  console.log(`⚠️ Orders WITHOUT Turbo Tracking Code: ${withoutTurbo}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
