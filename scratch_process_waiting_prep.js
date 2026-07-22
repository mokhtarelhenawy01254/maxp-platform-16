const { getSharedPrismaClient } = require('./services/sharedDatabase');
const preparationQueueService = require('./services/preparationQueueService');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmlc7s6kh000iju40ei73ez36'; // Flora
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  console.log(`🏢 Processing Preparation Queue (WAITING / PREPARING) for: ${company.name}`);

  const mockUser = { companyId: company.id, role: 'ADMIN' };

  // Fetch WAITING and PREPARING stages
  const [waitingData, preparingData] = await Promise.all([
    preparationQueueService.getPreparationQueue({ user: mockUser, query: { stage: 'WAITING', limit: 100 } }),
    preparationQueueService.getPreparationQueue({ user: mockUser, query: { stage: 'PREPARING', limit: 100 } })
  ]);

  const allOrdersInQueue = [...(waitingData.orders || []), ...(preparingData.orders || [])];
  console.log(`📌 Total Orders in WAITING / PREPARING stages: ${allOrdersInQueue.length}`);

  const withoutTurbo = [];
  const withTurbo = [];

  for (const po of allOrdersInQueue) {
    const dbOrder = await prisma.order.findUnique({
      where: { id: po.id },
      include: { customer: true, orderItems: { include: { product: true } } }
    });

    if (!dbOrder) continue;

    if (!dbOrder.turboShipmentId && !dbOrder.turboTrackingNumber) {
      withoutTurbo.push({ dbOrder, po });
    } else {
      withTurbo.push({ dbOrder, po });
    }
  }

  console.log(`✅ Orders ALREADY WITH Turbo Code: ${withTurbo.length}`);
  console.log(`⚠️ Orders WITHOUT Turbo Code: ${withoutTurbo.length}`);

  withoutTurbo.forEach((item, idx) => {
    console.log(`${idx + 1}. Order #${item.dbOrder.orderNumber} (ID: ${item.dbOrder.id}) - Status: ${item.dbOrder.status} - Stage: ${item.po.stage}`);
  });

  if (withoutTurbo.length === 0) {
    console.log('🎉 All orders in preparation queue already have Turbo tracking codes!');
    return;
  }

  console.log(`\n🚀 Sending ${withoutTurbo.length} orders to Turbo API...`);
  const turboService = new TurboService(company.turboApiKey, company.id);

  const results = { success: [], failed: [] };

  for (const item of withoutTurbo) {
    const order = item.dbOrder;
    console.log(`\n----------------------------------------`);
    console.log(`📦 Processing Order #${order.orderNumber} (ID: ${order.id})`);
    const formattedData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

    console.log(`📋 Formatted Payload:`, {
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
      console.log(`✅ SUCCESS! Turbo Tracking Number: ${result.trackingNumber}`);

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
  console.log(`📊 FINAL SUMMARY FOR WAITING / PREPARING QUEUE:`);
  console.log(`✅ Successfully Assigned Turbo Codes: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  if (results.success.length > 0) console.log('Success List:', results.success);
  if (results.failed.length > 0) console.log('Failed List:', results.failed);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
