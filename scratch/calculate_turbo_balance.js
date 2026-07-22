const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function calculateTurboFinancials() {
  console.log('📊 Calculating Turbo Financial Totals...');

  // Get all orders with a Turbo link
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { turboShipmentId: { not: null } },
        { turboTrackingNumber: { not: null } },
        { turboShipmentStatus: { not: null } }
      ]
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      turboShipmentStatus: true,
      turboMetadata: true
    }
  });

  const guestOrders = await prisma.guestOrder.findMany({
    where: {
      OR: [
        { turboShipmentId: { not: null } },
        { turboTrackingNumber: { not: null } },
        { turboShipmentStatus: { not: null } }
      ]
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      turboShipmentStatus: true,
      metadata: true
    }
  });

  const allOrders = [...orders, ...guestOrders];

  console.log(`📦 Found ${allOrders.length} total linked Turbo orders.`);

  let pendingRemittanceAmount = 0; // Delivered but not remitted (كود 7)
  let pendingRemittanceCount = 0;

  let remittedAmount = 0; // Remitted (كود 8 / remitted)
  let remittedCount = 0;

  let activeInTransitAmount = 0; // Out for delivery / Branch processing (كود 3, 4, 13)
  let activeInTransitCount = 0;

  for (const o of allOrders) {
    const status = (o.turboShipmentStatus || '').toLowerCase().trim();
    const price = typeof o.total === 'number' ? o.total : parseFloat(o.total || 0) || 0;

    if (status === 'delivered' || status === '7') {
      pendingRemittanceAmount += price;
      pendingRemittanceCount++;
    } else if (status === 'remitted' || status === '8' || status === '19') {
      remittedAmount += price;
      remittedCount++;
    } else if (['out_for_delivery', 'processing', 'delayed', 'turbo_sent', '3', '4', '13', '2'].includes(status)) {
      activeInTransitAmount += price;
      activeInTransitCount++;
    }
  }

  console.log('--- 💰 TURBO FINANCIAL SUMMARY ---');
  console.log(`• 💵 مبالغ تم تسليمها وفي انتظار التوريد لك (Delivered): ${pendingRemittanceAmount.toFixed(2)} ج.م (عدد ${pendingRemittanceCount} أوردر)`);
  console.log(`• 🚚 مبالغ شحنات نشطة جاري تحصيلها مع المناديب (Active/In Transit): ${activeInTransitAmount.toFixed(2)} ج.م (عدد ${activeInTransitCount} أوردر)`);
  console.log(`• ✅ مبالغ تم توريدها وتحصيلها بالكامل لحسابك (Remitted): ${remittedAmount.toFixed(2)} ج.م (عدد ${remittedCount} أوردر)`);

  process.exit(0);
}

calculateTurboFinancials().catch(e => { console.error(e); process.exit(1); });
