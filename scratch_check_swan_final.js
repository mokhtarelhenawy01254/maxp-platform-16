const { getSharedPrismaClient } = require('./services/sharedDatabase');
const preparationQueueService = require('./services/preparationQueueService');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmleybpf70028juo2wwpmp8rt'; // Swan
  const company = await prisma.company.findUnique({ where: { id: companyId } });

  console.log(`🏢 Final Verification for Company: ${company.name}`);

  const mockUser = { companyId: company.id, role: 'ADMIN' };
  const queueData = await preparationQueueService.getPreparationQueue({
    user: mockUser,
    query: { stage: 'WAITING', limit: 500 }
  });

  const orders = queueData.orders || [];
  console.log(`📌 WAITING Stage Total Orders in Queue: ${orders.length}`);

  const missingTurbo = orders.filter(o => !o.turboTrackingNumber && !o.turboShipmentId);
  console.log(`⚠️ Orders WITHOUT Turbo Tracking Code in WAITING Stage: ${missingTurbo.length}`);

  const specificOrder = await prisma.guestOrder.findFirst({
    where: { orderNumber: 'ORD-338579-908' }
  });

  if (specificOrder) {
    console.log(`\n🎯 Specific Order #ORD-338579-908 Status:`);
    console.log(`- ID: ${specificOrder.id}`);
    console.log(`- Turbo Tracking Number: ${specificOrder.turboTrackingNumber}`);
    console.log(`- Turbo Shipment ID: ${specificOrder.turboShipmentId}`);
    console.log(`- Turbo Status: ${specificOrder.turboShipmentStatus}`);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
