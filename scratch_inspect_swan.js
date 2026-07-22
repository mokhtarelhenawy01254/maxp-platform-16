const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmleybpf70028juo2wwpmp8rt'; // Swan
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, turboApiKey: true, turboEnabled: true }
  });

  console.log(`🏢 Checking ALL orders for Company: ${company.name} (ID: ${company.id})`);

  const allOrders = await prisma.order.findMany({
    where: { companyId: companyId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerName: true,
      customerPhone: true,
      turboTrackingNumber: true,
      turboShipmentId: true,
      turboShipmentStatus: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📌 Total Orders for Swan in DB: ${allOrders.length}`);

  const withTurbo = allOrders.filter(o => o.turboTrackingNumber || o.turboShipmentId);
  const withoutTurbo = allOrders.filter(o => !o.turboTrackingNumber && !o.turboShipmentId);

  console.log(`✅ Orders WITH Turbo Code: ${withTurbo.length}`);
  console.log(`⚠️ Orders WITHOUT Turbo Code: ${withoutTurbo.length}`);

  console.log('\n--- Grouping Orders by Status ---');
  const byStatus = {};
  allOrders.forEach(o => {
    const st = o.status;
    if (!byStatus[st]) byStatus[st] = { total: 0, withTurbo: 0, withoutTurbo: 0, sample: [] };
    byStatus[st].total++;
    if (o.turboTrackingNumber || o.turboShipmentId) {
      byStatus[st].withTurbo++;
    } else {
      byStatus[st].withoutTurbo++;
      if (byStatus[st].sample.length < 5) {
        byStatus[st].sample.push(o.orderNumber);
      }
    }
  });

  console.log(JSON.stringify(byStatus, null, 2));

  console.log('\n--- Sample of Orders WITHOUT Turbo Code for Swan ---');
  withoutTurbo.slice(0, 30).forEach((o, i) => {
    console.log(`${i + 1}. Order #${o.orderNumber} (ID: ${o.id}) | Status: ${o.status} | Phone: ${o.customerPhone}`);
  });
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
