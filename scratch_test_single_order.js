const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function testSingleOrder() {
  const targetNumber = 'ORD-338579-908';
  console.log(`🔍 Searching for order matching: ${targetNumber}`);

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: targetNumber },
        { orderNumber: '338579-908' },
        { orderNumber: { contains: '338579-908' } },
        { id: targetNumber }
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
    }
  });

  if (!order) {
    console.log(`❌ Order ${targetNumber} not found in database.`);
    return;
  }

  console.log('✅ Found Order:', {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    city: order.city,
    shippingAddress: order.shippingAddress,
    turboShipmentId: order.turboShipmentId,
    companyId: order.companyId,
    turboEnabled: order.company?.turboEnabled
  });

  if (!order.company?.turboEnabled || !order.company?.turboApiKey) {
    console.log(`❌ Turbo is not enabled for company ${order.companyId}`);
    return;
  }

  const turboService = new TurboService(order.company.turboApiKey, order.companyId);
  const formattedData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

  console.log('\n📋 Formatted Payload for Turbo:');
  console.log(JSON.stringify(formattedData, null, 2));

  console.log('\n🚀 Sending Order to Turbo API...');
  try {
    const result = await turboService.createShipment(formattedData);
    console.log('✅ Success! Result:', result);

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
    console.log(`💾 Order ${order.orderNumber} updated in DB with tracking number: ${result.trackingNumber}`);
  } catch (err) {
    console.error(`❌ Failed to create shipment for order ${order.orderNumber}:`, err.message);
  }
}

testSingleOrder()
  .catch(console.error)
  .finally(() => process.exit(0));
