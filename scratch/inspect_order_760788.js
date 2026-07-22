const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function inspectOrder() {
  const orderNumber = 'ORD-760788-166';
  console.log(`🔍 Inspecting ${orderNumber}...`);

  const order = await prisma.order.findFirst({
    where: { orderNumber: { contains: '760788-166', mode: 'insensitive' } },
    include: {
      statusHistory: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!order) {
    console.error('❌ Order not found in Order table. Checking GuestOrder...');
    const guest = await prisma.guestOrder.findFirst({
      where: { orderNumber: { contains: '760788-166', mode: 'insensitive' } }
    });
    if (!guest) {
      console.error('❌ Not found in GuestOrder either.');
      process.exit(1);
    }
    console.log('--- 📊 GuestOrder Data ---');
    console.log(JSON.stringify(guest, null, 2));
    process.exit(0);
  }

  console.log('--- 📊 Order Data ---');
  console.log(`• ID: ${order.id}`);
  console.log(`• Order Number: ${order.orderNumber}`);
  console.log(`• Status (Order.status): ${order.status}`);
  console.log(`• Turbo Shipment ID: ${order.turboShipmentId}`);
  console.log(`• Turbo Tracking Number: ${order.turboTrackingNumber}`);
  console.log(`• Turbo Shipment Status (turboShipmentStatus): "${order.turboShipmentStatus}"`);
  console.log(`• Turbo Metadata:`, JSON.stringify(order.turboMetadata || {}, null, 2));

  console.log('\n--- 📜 Status History ---');
  (order.statusHistory || []).forEach(h => {
    console.log(`• [${h.createdAt?.toISOString()}] Status: ${h.status}, Note: ${h.note || h.reason || 'None'}`);
  });

  process.exit(0);
}

inspectOrder().catch(e => { console.error(e); process.exit(1); });
