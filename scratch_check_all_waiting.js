const { getSharedPrismaClient } = require('./services/sharedDatabase');
const preparationQueueService = require('./services/preparationQueueService');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { turboEnabled: true, NOT: { turboApiKey: null } },
    select: { id: true, name: true, turboApiKey: true }
  });

  console.log(`🔍 Checking ${companies.length} Turbo-enabled companies for orders in WAITING stage...`);

  for (const company of companies) {
    console.log(`\n==================================================`);
    console.log(`🏢 Company: ${company.name} (ID: ${company.id})`);

    const mockUser = { companyId: company.id, role: 'ADMIN' };
    const queueData = await preparationQueueService.getPreparationQueue({
      user: mockUser,
      query: { stage: 'WAITING', limit: 100 }
    });

    const orders = queueData.orders || [];
    console.log(`📌 WAITING Stage Count: ${orders.length}`);

    const withoutTurbo = [];

    for (const po of orders) {
      const dbOrder = await prisma.order.findUnique({
        where: { id: po.id },
        include: { customer: true, orderItems: { include: { product: true } } }
      });

      if (dbOrder && !dbOrder.turboShipmentId && !dbOrder.turboTrackingNumber) {
        withoutTurbo.push(dbOrder);
      }
    }

    console.log(`⚠️ Orders WITHOUT Turbo Code in WAITING Stage: ${withoutTurbo.length}`);

    if (withoutTurbo.length > 0) {
      console.log(`🚀 Creating Turbo tracking codes for ${withoutTurbo.length} orders...`);
      const turboService = new TurboService(company.turboApiKey, company.id);

      for (const order of withoutTurbo) {
        const formattedData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);
        try {
          const result = await turboService.createShipment(formattedData);
          console.log(`✅ Success! Order #${order.orderNumber} -> Tracking Code: ${result.trackingNumber}`);

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
        } catch (err) {
          console.error(`❌ Error for Order #${order.orderNumber}:`, err.message);
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
