const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmlc7s6kh000iju40ei73ez36'; // Flora
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, turboApiKey: true, turboEnabled: true }
  });

  console.log(`🏢 Checking all active preparation orders for: ${company.name} (ID: ${company.id})`);

  const TERMINAL_STATUSES = [
    'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DUPLICATE_ORDER'
  ];

  // Fetch all orders for this company that are NOT in terminal status
  const orders = await prisma.order.findMany({
    where: {
      companyId: companyId,
      NOT: {
        status: { in: TERMINAL_STATUSES }
      }
    },
    include: {
      customer: true,
      orderItems: { include: { product: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📌 Total active orders found: ${orders.length}`);

  const withoutTurbo = orders.filter(o => !o.turboShipmentId && !o.turboTrackingNumber);
  const withTurbo = orders.filter(o => o.turboShipmentId || o.turboTrackingNumber);

  console.log(`✅ Orders WITH Turbo Code: ${withTurbo.length}`);
  console.log(`⚠️ Orders WITHOUT Turbo Code: ${withoutTurbo.length}`);

  console.log('\n--- Orders WITHOUT Turbo Code ---');
  withoutTurbo.forEach((o, i) => {
    console.log(`${i + 1}. Order #${o.orderNumber} (ID: ${o.id}) - Status: ${o.status}`);
  });

  if (withoutTurbo.length === 0) {
    console.log('🎉 All active preparation orders already have Turbo codes!');
    return;
  }

  console.log(`\n🚀 Creating Turbo Shipments for ${withoutTurbo.length} orders...`);
  const turboService = new TurboService(company.turboApiKey, company.id);

  const results = { success: [], failed: [] };

  for (const order of withoutTurbo) {
    console.log(`\n----------------------------------------`);
    console.log(`📦 Processing Order #${order.orderNumber} (ID: ${order.id})`);
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
      console.log(`✅ SUCCESS! Created Turbo Tracking Code: ${result.trackingNumber}`);

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

  console.log(`\n==================================================`);
  console.log(`📊 FINAL RESULTS:`);
  console.log(`✅ Successfully Assigned Turbo Codes: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  if (results.success.length > 0) console.log('Success List:', results.success);
  if (results.failed.length > 0) console.log('Failed List:', results.failed);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
