const { getSharedPrismaClient } = require('./services/sharedDatabase');
const preparationQueueService = require('./services/preparationQueueService');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  console.log('🔍 Fetching all companies...');
  const companies = await prisma.company.findMany({
    where: { turboEnabled: true, NOT: { turboApiKey: null } },
    select: { id: true, name: true, turboApiKey: true }
  });

  for (const company of companies) {
    console.log(`\n==================================================`);
    console.log(`🏢 Checking Preparation Queue for Company: ${company.name} (ID: ${company.id})`);

    const mockUser = { companyId: company.id, role: 'ADMIN' };
    const queueData = await preparationQueueService.getPreparationQueue({
      user: mockUser,
      query: { stage: 'PENDING', limit: 100 }
    });

    const pendingOrders = queueData.orders || [];
    console.log(`📌 Stage PENDING (في انتظار التجهيز) Orders Count: ${pendingOrders.length}`);

    if (pendingOrders.length === 0) continue;

    const withoutTurbo = [];
    const withTurbo = [];

    for (const po of pendingOrders) {
      // Find full order record from DB
      const dbOrder = await prisma.order.findUnique({
        where: { id: po.id },
        include: {
          customer: true,
          orderItems: { include: { product: true } }
        }
      });

      if (!dbOrder) continue;

      if (!dbOrder.turboShipmentId && !dbOrder.turboTrackingNumber) {
        withoutTurbo.push(dbOrder);
      } else {
        withTurbo.push(dbOrder);
      }
    }

    console.log(`✅ Already WITH Turbo Code: ${withTurbo.length}`);
    console.log(`⚠️ WITHOUT Turbo Code: ${withoutTurbo.length}`);

    if (withoutTurbo.length === 0) {
      console.log('🎉 All pending preparation orders already have Turbo codes!');
      continue;
    }

    console.log(`\n🚀 Creating Turbo Shipments for ${withoutTurbo.length} orders without Turbo code...`);
    const turboService = new TurboService(company.turboApiKey, company.id);

    const results = {
      success: [],
      failed: []
    };

    for (const order of withoutTurbo) {
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
        itemsCount: formattedData.items?.length
      });

      try {
        const result = await turboService.createShipment(formattedData);
        console.log(`✅ SUCCESS! Created Turbo Tracking Code: ${result.trackingNumber}`);

        // Update DB
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
    console.log(`📊 FINAL RESULTS FOR COMPANY ${company.name}:`);
    console.log(`✅ Successfully Assigned Turbo Codes: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    if (results.success.length > 0) console.log('Success List:', results.success);
    if (results.failed.length > 0) console.log('Failed List:', results.failed);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
