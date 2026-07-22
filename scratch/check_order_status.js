const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const prisma = getSharedPrismaClient();
const TurboService = require('/var/www/backend2/services/turboService');

async function checkOrder() {
  const orderNumber = 'ORD-170453-426';
  console.log(`🔍 Checking order ${orderNumber}...`);

  const order = await prisma.order.findFirst({
    where: { orderNumber: { contains: '170453-426', mode: 'insensitive' } },
    include: { company: true }
  });

  if (!order) {
    console.error(`❌ Order ${orderNumber} not found in DB`);
    process.exit(1);
  }

  console.log('\n--- 📊 بيانات الأوردر في داتابيز المنصة ---');
  console.log(`• Order ID: ${order.id}`);
  console.log(`• Order Number: ${order.orderNumber}`);
  console.log(`• Customer: ${order.customerName} (${order.customerPhone})`);
  console.log(`• Company: ${order.company?.name} (${order.companyId})`);
  console.log(`• Order Main Status (Order.status): ${order.status}`);
  console.log(`• Turbo Shipment ID: ${order.turboShipmentId || 'لا يوجد'}`);
  console.log(`• Turbo Tracking Number: ${order.turboTrackingNumber || 'لا يوجد'}`);
  console.log(`• Turbo Shipment Status (turboShipmentStatus): ${order.turboShipmentStatus || 'لا يوجد'}`);
  console.log(`• Turbo Metadata:`, JSON.stringify(order.turboMetadata || {}, null, 2));

  if (order.company?.turboApiKey && (order.turboShipmentId || order.turboTrackingNumber || order.orderNumber)) {
    console.log('\n--- 📡 استعلام حي من سيرفر تربو (Live Turbo API) ---');
    try {
      const turboService = new TurboService(order.company.turboApiKey, order.companyId);
      
      // Try tracking
      const trackingNum = order.turboTrackingNumber || order.turboShipmentId;
      if (trackingNum) {
        try {
          const trackRes = await turboService.trackShipment(trackingNum);
          console.log('• Turbo Track Response:', JSON.stringify(trackRes, null, 2));
        } catch (e) {
          console.log('• Turbo Track Error:', e.message);
        }
      }

      // Try fetching all statuses for the order period
      const today = new Date();
      const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(today.getDate() - 60);
      const fromDate = sixtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const allStatuses = await turboService.fetchAllStatuses(fromDate, toDate);
      if (allStatuses && allStatuses.shipments) {
        const found = allStatuses.shipments.find(s => 
          String(s.code) === String(order.turboTrackingNumber) ||
          String(s.code) === String(order.turboShipmentId) ||
          String(s.barCode) === String(order.turboTrackingNumber) ||
          String(s.invoiceNumber) === String(order.orderNumber) ||
          String(s.invoiceNumber) === String(order.orderNumber).replace('ORD-', '')
        );

        if (found) {
          console.log('✅ Found shipment in Turbo Live Statuses API:');
          console.log(JSON.stringify(found, null, 2));
        } else {
          console.log('ℹ️ Shipment not in recent Turbo fetchAllStatuses batch. Total in batch:', allStatuses.count);
        }
      }
    } catch (err) {
      console.error('❌ Error calling Turbo API:', err.message);
    }
  }

  process.exit(0);
}

checkOrder().catch(e => { console.error(e); process.exit(1); });
