const { getSharedPrismaClient } = require('./services/sharedDatabase');
const preparationQueueService = require('./services/preparationQueueService');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmlc7s6kh000iju40ei73ez36'; // Flora
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  console.log(`🏢 Checking WAITING stage orders for Company: ${company.name}`);

  const mockUser = { companyId: company.id, role: 'ADMIN' };
  const queueData = await preparationQueueService.getPreparationQueue({
    user: mockUser,
    query: { stage: 'WAITING', limit: 100 }
  });

  const orders = queueData.orders || [];
  console.log(`📌 Stage WAITING Orders Count in Queue Data: ${orders.length}`);

  const details = [];

  for (let i = 0; i < orders.length; i++) {
    const po = orders[i];
    const dbOrder = await prisma.order.findUnique({
      where: { id: po.id },
      include: { customer: true, orderItems: { include: { product: true } } }
    });

    if (!dbOrder) continue;

    details.push({
      idx: i + 1,
      id: dbOrder.id,
      orderNumber: dbOrder.orderNumber,
      status: dbOrder.status,
      customerName: dbOrder.customerName || po.customerName,
      customerPhone: dbOrder.customerPhone,
      city: dbOrder.city,
      turboTrackingNumber: dbOrder.turboTrackingNumber,
      turboShipmentId: dbOrder.turboShipmentId,
      turboShipmentStatus: dbOrder.turboShipmentStatus,
      createdAt: dbOrder.createdAt
    });
  }

  console.log('\n--- 📋 List of Orders in WAITING Stage ---');
  details.forEach(d => {
    console.log(`${d.idx}. Order #${d.orderNumber} (ID: ${d.id}) | Status: ${d.status} | TurboTracking: ${d.turboTrackingNumber || 'NONE'} | Customer: ${d.customerName} (${d.customerPhone})`);
  });

  const withoutTurbo = details.filter(d => !d.turboTrackingNumber && !d.turboShipmentId);
  const withTurbo = details.filter(d => d.turboTrackingNumber || d.turboShipmentId);

  console.log(`\n✅ Orders ALREADY WITH Turbo Code: ${withTurbo.length}`);
  console.log(`⚠️ Orders WITHOUT Turbo Code: ${withoutTurbo.length}`);

  if (withoutTurbo.length > 0) {
    console.log(`\n🚀 Sending ${withoutTurbo.length} orders without Turbo code to Turbo API...`);
    const turboService = new TurboService(company.turboApiKey, company.id);

    for (const item of withoutTurbo) {
      const dbOrder = await prisma.order.findUnique({
        where: { id: item.id },
        include: { customer: true, orderItems: { include: { product: true } } }
      });

      console.log(`\n----------------------------------------`);
      console.log(`📦 Processing Order #${dbOrder.orderNumber} (ID: ${dbOrder.id})`);
      const formattedData = turboService.formatOrderForTurbo(dbOrder, dbOrder.customer, dbOrder.orderItems);

      try {
        const result = await turboService.createShipment(formattedData);
        console.log(`✅ SUCCESS! Created Turbo Tracking Code: ${result.trackingNumber}`);

        await prisma.order.update({
          where: { id: dbOrder.id },
          data: {
            turboShipmentId: String(result.shipmentId || ''),
            turboTrackingNumber: String(result.trackingNumber || ''),
            turboShipmentStatus: result.status,
            turboLabelUrl: result.labelUrl,
            turboMetadata: JSON.stringify(result.data)
          }
        });
        console.log(`💾 Saved in DB for Order #${dbOrder.orderNumber}`);
      } catch (err) {
        console.error(`❌ FAILED for Order #${dbOrder.orderNumber}:`, err.message);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
