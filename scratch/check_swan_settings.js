const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function checkSwan() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'swan', mode: 'insensitive' } }
  });

  if (!company) {
    console.log('❌ Company Swan not found in DB');
    process.exit(1);
  }

  console.log('🏢 Swan Company Turbo Settings:');
  console.log({
    id: company.id,
    name: company.name,
    turboEnabled: company.turboEnabled,
    turboApiKey: company.turboApiKey ? `${company.turboApiKey.substring(0, 8)}...` : 'MISSING ❌',
    turboMainClientCode: company.turboMainClientCode || 'MISSING (Using default 37321)',
    turboSenderNumber: company.turboSenderNumber || 'MISSING',
    turboWebhookUrl: company.turboWebhookUrl || 'MISSING',
    turboWebhookToken: company.turboWebhookToken ? 'PRESENT ✅' : 'MISSING ❌'
  });

  // Check last 3 orders for Swan
  const orders = await prisma.order.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      turboShipmentId: true,
      turboTrackingNumber: true,
      turboShipmentStatus: true,
      shippingAddress: true,
      customer: { select: { phone: true, name: true } }
    }
  });

  console.log('\n📦 Last 3 Orders for Swan:');
  orders.forEach(o => {
    console.log(`- #${o.orderNumber} (ID: ${o.id}) | Status: ${o.status} | TurboShipmentId: ${o.turboShipmentId} | TurboTracking: ${o.turboTrackingNumber} | TurboStatus: ${o.turboShipmentStatus}`);
  });

  process.exit(0);
}

checkSwan().catch(e => { console.error(e); process.exit(1); });
