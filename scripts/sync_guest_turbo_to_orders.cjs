const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting Turbo Tracking Synchronization from guest_orders to orders...');

  // 1. Fetch all guest orders that have a turboTrackingNumber
  const guestOrdersWithTurbo = await prisma.guestOrder.findMany({
    where: {
      turboTrackingNumber: { not: null }
    },
    select: {
      orderNumber: true,
      companyId: true,
      turboTrackingNumber: true,
      turboShipmentId: true,
      turboShipmentStatus: true,
      turboLabelUrl: true,
      turboBranchId: true,
      turboBranchName: true,
      turboBranchPhone: true,
      turboCaptainName: true,
      turboCaptainPhone: true,
      turboDelayReason: true,
      turboReturnReason: true,
      turboExpectedBranch: true,
      turboMetadata: true
    }
  });

  console.log(`📊 Found ${guestOrdersWithTurbo.length} guest orders with Turbo data.`);

  let updatedCount = 0;
  let alreadySyncedCount = 0;
  let notFoundCount = 0;

  for (const g of guestOrdersWithTurbo) {
    if (!g.turboTrackingNumber) continue;

    const existingOrder = await prisma.order.findFirst({
      where: {
        companyId: g.companyId,
        orderNumber: g.orderNumber
      },
      select: {
        id: true,
        orderNumber: true,
        turboTrackingNumber: true,
        turboShipmentStatus: true
      }
    });

    if (!existingOrder) {
      notFoundCount++;
      continue;
    }

    if (!existingOrder.turboTrackingNumber || existingOrder.turboTrackingNumber !== g.turboTrackingNumber) {
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          turboTrackingNumber: g.turboTrackingNumber,
          turboShipmentId: g.turboShipmentId || undefined,
          turboShipmentStatus: g.turboShipmentStatus || undefined,
          turboLabelUrl: g.turboLabelUrl || undefined,
          turboBranchId: g.turboBranchId || undefined,
          turboBranchName: g.turboBranchName || undefined,
          turboBranchPhone: g.turboBranchPhone || undefined,
          turboCaptainName: g.turboCaptainName || undefined,
          turboCaptainPhone: g.turboCaptainPhone || undefined,
          turboDelayReason: g.turboDelayReason || undefined,
          turboReturnReason: g.turboReturnReason || undefined,
          turboExpectedBranch: g.turboExpectedBranch || undefined,
          turboMetadata: g.turboMetadata || undefined
        }
      });
      updatedCount++;
      if (updatedCount % 20 === 0) {
        process.stdout.write(`Synchronized ${updatedCount} orders...\r`);
      }
    } else {
      alreadySyncedCount++;
    }
  }

  console.log(`\n✅ Synchronization Complete:`);
  console.log(`  - Newly Synced: ${updatedCount}`);
  console.log(`  - Already in Sync: ${alreadySyncedCount}`);
  console.log(`  - Twin Not Found: ${notFoundCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error syncing turbo tracking:', e);
  await prisma.$disconnect();
  process.exit(1);
});
