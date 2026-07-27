const { getSharedPrismaClient } = require('./services/sharedDatabase');
const preparationQueueService = require('./services/preparationQueueService');
const prisma = getSharedPrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true }
  });

  console.log(`🏢 Checking ${companies.length} companies for WAITING/PENDING preparation queue orders...`);

  for (const company of companies) {
    const mockUser = { companyId: company.id, role: 'ADMIN' };
    try {
      const queueAll = await preparationQueueService.getPreparationQueue({
        user: mockUser,
        query: { stage: 'ALL', limit: 500 }
      });

      const queueWaiting = await preparationQueueService.getPreparationQueue({
        user: mockUser,
        query: { stage: 'WAITING', limit: 500 }
      });

      const counts = queueAll.summary?.stageCounts || {};
      console.log(`\n🏢 Company: ${company.name} (ID: ${company.id})`);
      console.log(`📊 Summary Stage Counts:`, counts);
      console.log(`📌 WAITING Stage Orders Count: ${queueWaiting.orders?.length || 0}`);

      if (queueWaiting.orders?.length > 0) {
        const withoutTurbo = queueWaiting.orders.filter(o => !o.turboTrackingNumber && !o.turboShipmentId);
        console.log(`⚠️ WAITING Orders WITHOUT Turbo code: ${withoutTurbo.length}`);
        withoutTurbo.slice(0, 10).forEach(o => {
          console.log(`   - Order #${o.orderNumber} | Status: ${o.status}`);
        });
      }
    } catch (e) {
      console.log(`Error checking company ${company.name}: ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
