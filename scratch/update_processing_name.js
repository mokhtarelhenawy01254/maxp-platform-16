const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function updateProcessingName() {
  console.log('🔄 Updating PROCESSING status name to "قيد التنفيذ"...');

  const updated = await prisma.orderStatusConfig.updateMany({
    where: { code: 'PROCESSING', statusType: 'order' },
    data: { name: 'قيد التنفيذ' }
  });

  console.log(`✅ Updated ${updated.count} OrderStatusConfig rows in DB`);
  process.exit(0);
}

updateProcessingName().catch(e => { console.error(e); process.exit(1); });
