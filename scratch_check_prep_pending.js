const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function checkPendingPreparationOrders() {
  console.log('🔍 Fetching PENDING stage orders in Preparation Queue...');

  // Search for orders in preparation queue or pending stage
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { preparationStage: 'PENDING' },
        { status: 'CONFIRMED' },
        { status: 'confirmed' },
        { status: 'processing' },
        { status: 'PROCESSING' }
      ]
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
    take: 100
  });

  console.log(`📌 Found ${orders.length} total candidate orders in DB.`);

  // Filter orders that don't have turboShipmentId
  const withoutTurbo = orders.filter(o => !o.turboShipmentId && !o.turboTrackingNumber);
  const withTurbo = orders.filter(o => o.turboShipmentId || o.turboTrackingNumber);

  console.log(`✅ Orders ALREADY WITH Turbo Code: ${withTurbo.length}`);
  console.log(`⚠️ Orders WITHOUT Turbo Code: ${withoutTurbo.length}`);

  console.log('\n--- Details of Orders WITHOUT Turbo Code ---');
  withoutTurbo.forEach((o, i) => {
    console.log(`${i + 1}. Order #${o.orderNumber} (ID: ${o.id}) - Status: ${o.status} - Stage: ${o.preparationStage || 'N/A'}`);
  });

  console.log('\n🚀 Starting Bulk Turbo Code Creation for all orders without Turbo Code...');

  const results = {
    success: [],
    failed: []
  };

  for (const order of withoutTurbo) {
    console.log(`\n========================================`);
    console.log(`📦 Processing Order #${order.orderNumber} (ID: ${order.id})`);
    
    if (!order.company?.turboEnabled || !order.company?.turboApiKey) {
      console.log(`❌ Skipped: Turbo not enabled for company ${order.companyId}`);
      results.failed.push({ orderNumber: order.orderNumber, error: 'خدمة تربو غير مفعلة' });
      continue;
    }

    const turboService = new TurboService(order.company.turboApiKey, order.companyId);
    const formattedData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

    console.log('📋 Formatted Payload:', {
      orderNumber: formattedData.orderNumber,
      receiver: formattedData.customerName,
      phone: formattedData.customerPhone,
      governorate: formattedData.governorate,
      city: formattedData.city,
      address: formattedData.shippingAddress,
      totalValue: formattedData.totalValue,
      items: formattedData.items?.map(i => `${i.quantity}x ${i.productName}`)
    });

    try {
      const result = await turboService.createShipment(formattedData);
      console.log(`✅ SUCCESS! Created Turbo Shipment: ${result.trackingNumber}`);

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

      results.success.push({ orderNumber: order.orderNumber, trackingNumber: result.trackingNumber });
    } catch (err) {
      console.error(`❌ FAILED for Order #${order.orderNumber}:`, err.message);
      results.failed.push({ orderNumber: order.orderNumber, error: err.message });
    }
  }

  console.log('\n========================================');
  console.log('📊 FINAL BULK SUMMARY:');
  console.log(`✅ Successfully Created: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('Success List:', results.success);
  console.log('Failed List:', results.failed);
}

checkPendingPreparationOrders()
  .catch(console.error)
  .finally(() => process.exit(0));
