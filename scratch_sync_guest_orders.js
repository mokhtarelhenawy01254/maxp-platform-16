const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  console.log('🔄 Syncing all guest_orders records with their matching orders records...');

  const guestOrders = await prisma.guestOrder.findMany({
    take: 1000,
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📌 Found ${guestOrders.length} total guest orders.`);

  let syncedCount = 0;

  for (const go of guestOrders) {
    const regularOrder = await prisma.order.findFirst({
      where: {
        companyId: go.companyId,
        orderNumber: go.orderNumber
      },
      include: { customer: true }
    });

    if (regularOrder) {
      const realName = regularOrder.customerName || (regularOrder.customer ? `${regularOrder.customer.firstName || ''} ${regularOrder.customer.lastName || ''}`.trim() : null);
      const realPhone = regularOrder.customerPhone || regularOrder.customer?.phone || null;

      await prisma.guestOrder.update({
        where: { id: go.id },
        data: {
          guestName: realName || go.guestName,
          guestPhone: realPhone || go.guestPhone,
          status: regularOrder.status,
          turboShipmentId: regularOrder.turboShipmentId || go.turboShipmentId,
          turboTrackingNumber: regularOrder.turboTrackingNumber || go.turboTrackingNumber,
          turboShipmentStatus: regularOrder.turboShipmentStatus || go.turboShipmentStatus,
          turboLabelUrl: regularOrder.turboLabelUrl || go.turboLabelUrl,
          turboMetadata: regularOrder.turboMetadata || go.turboMetadata
        }
      });
      syncedCount++;
    }
  }

  console.log(`✅ Successfully synced ${syncedCount} guest_orders with their regular orders!`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
