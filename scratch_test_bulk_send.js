const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function runBulkTest() {
  // Find orders without Turbo shipment ID
  const allOrdersWithoutTurbo = await prisma.order.findMany({
    where: {
      turboShipmentId: null
    },
    include: {
      customer: true,
      orderItems: {
        include: { product: true }
      },
      company: {
        select: {
          id: true,
          turboApiKey: true,
          turboEnabled: true,
          turboMainClientCode: true,
          turboSenderNumber: true
        }
      }
    },
    take: 50
  });

  // Filter confirmed or processing orders
  const orders = allOrdersWithoutTurbo.filter(o => {
    const st = String(o.status || '').toUpperCase();
    return st === 'CONFIRMED' || st === 'PROCESSING';
  });

  console.log(`📌 Total orders without Turbo code: ${allOrdersWithoutTurbo.length}`);
  console.log(`📌 Confirmed/Processing orders without Turbo code: ${orders.length}`);

  if (orders.length === 0) {
    console.log('No confirmed/processing orders found without Turbo shipment code.');
    return;
  }

  for (const order of orders) {
    console.log(`\n========================================`);
    console.log(`📦 Testing Order #${order.orderNumber} (ID: ${order.id}) - Status: ${order.status}`);
    console.log(`Company ID: ${order.companyId}`);
    console.log(`Company Turbo Enabled: ${order.company?.turboEnabled}`);
    console.log(`Company Turbo API Key Present: ${Boolean(order.company?.turboApiKey)}`);

    if (!order.company?.turboEnabled || !order.company?.turboApiKey) {
      console.log(`❌ Skipped: Turbo is not enabled or API key missing for company ${order.companyId}`);
      continue;
    }

    const turboService = new TurboService(order.company.turboApiKey, order.companyId);
    const formattedData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

    console.log('📋 Formatted payload for Turbo:');
    console.log(JSON.stringify({
      orderNumber: formattedData.orderNumber,
      customerName: formattedData.customerName,
      customerPhone: formattedData.customerPhone,
      governorate: formattedData.governorate,
      city: formattedData.city,
      address: formattedData.shippingAddress,
      totalValue: formattedData.totalValue,
      items: formattedData.items
    }, null, 2));

    try {
      console.log('🚀 Sending to Turbo API...');
      const result = await turboService.createShipment(formattedData);
      console.log('✅ Success! Turbo Response:', result);

      // Save to database
      await prisma.order.update({
        where: { id: order.id },
        data: {
          turboShipmentId: String(result.shipmentId || ''),
          turboTrackingNumber: String(result.trackingNumber || ''),
          turboShipmentStatus: result.status,
          turboLabelUrl: result.labelUrl,
          turboMetadata: JSON.stringify(result.data)
        }
      });
      console.log(`💾 Order #${order.orderNumber} successfully saved in DB with tracking number: ${result.trackingNumber}`);
    } catch (err) {
      console.error(`❌ Failed for Order #${order.orderNumber}:`, err.message);
    }
  }
}

runBulkTest()
  .catch(console.error)
  .finally(() => process.exit(0));
