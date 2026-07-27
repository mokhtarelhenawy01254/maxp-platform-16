const { getSharedPrismaClient } = require('./services/sharedDatabase');
const preparationQueueService = require('./services/preparationQueueService');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmleybpf70028juo2wwpmp8rt'; // Swan
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  console.log(`🏢 Processing Company Swan (ID: ${company.id}, Name: ${company.name})`);
  console.log(`Turbo Enabled: ${company.turboEnabled}`);
  console.log(`Turbo API Key Present: ${Boolean(company.turboApiKey)}`);

  const mockUser = { companyId: company.id, role: 'ADMIN' };

  // Fetch WAITING stage orders
  const queueData = await preparationQueueService.getPreparationQueue({
    user: mockUser,
    query: { stage: 'WAITING', limit: 100 }
  });

  const ordersInQueue = queueData.orders || [];
  console.log(`📌 Total Orders in WAITING Stage ("في انتظار التجهيز"): ${ordersInQueue.length}`);

  const details = [];

  for (let i = 0; i < ordersInQueue.length; i++) {
    const po = ordersInQueue[i];
    const dbOrder = await prisma.order.findUnique({
      where: { id: po.id },
      include: { customer: true, orderItems: { include: { product: true } } }
    });

    if (!dbOrder) continue;

    details.push({
      idx: i + 1,
      dbOrder,
      po
    });
  }

  const withoutTurbo = details.filter(d => !d.dbOrder.turboShipmentId && !d.dbOrder.turboTrackingNumber);
  const withTurbo = details.filter(d => d.dbOrder.turboShipmentId || d.dbOrder.turboTrackingNumber);

  console.log(`✅ Orders ALREADY WITH Turbo Code: ${withTurbo.length}`);
  console.log(`⚠️ Orders WITHOUT Turbo Code: ${withoutTurbo.length}`);

  console.log('\n--- List of 28 Orders in WAITING Stage ---');
  details.forEach(d => {
    console.log(`${d.idx}. Order #${d.dbOrder.orderNumber} (ID: ${d.dbOrder.id}) | Status: ${d.dbOrder.status} | TurboTracking: ${d.dbOrder.turboTrackingNumber || 'NONE'} | Customer: ${d.dbOrder.customerName} (${d.dbOrder.customerPhone})`);
  });

  if (withoutTurbo.length === 0) {
    console.log('🎉 All 28 orders in WAITING stage already have Turbo tracking codes!');
    return;
  }

  if (!company.turboApiKey) {
    console.log('❌ Turbo API Key is missing for company Swan!');
    return;
  }

  console.log(`\n🚀 Creating Turbo Shipments for ${withoutTurbo.length} orders...`);
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
  console.log(`📊 FINAL RESULTS FOR SWAN 28 ORDERS:`);
  console.log(`✅ Successfully Assigned Turbo Codes: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  if (results.success.length > 0) console.log('Success List:', results.success);
  if (results.failed.length > 0) console.log('Failed List:', results.failed);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
