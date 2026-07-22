const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmlc7s6kh000iju40ei73ez36'; // Flora
  const TERMINAL_STATUSES = [
    'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DUPLICATE_ORDER'
  ];

  const missingOrdersCount = await prisma.order.count({
    where: {
      companyId: companyId,
      NOT: { status: { in: TERMINAL_STATUSES } },
      turboTrackingNumber: null
    }
  });

  const totalWithTurbo = await prisma.order.count({
    where: {
      companyId: companyId,
      NOT: { status: { in: TERMINAL_STATUSES } },
      NOT: { turboTrackingNumber: null }
    }
  });

  console.log(`🎉 VERIFICATION RESULT:`);
  console.log(`✅ Active Orders WITH Turbo Tracking Code: ${totalWithTurbo}`);
  console.log(`⚠️ Active Orders WITHOUT Turbo Tracking Code: ${missingOrdersCount}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
