const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const trackingCode = '38124937';
  console.log(`🔍 Testing database search by Turbo tracking code: "${trackingCode}"...\n`);

  const regularMatch = await prisma.order.findMany({
    where: {
      OR: [
        { orderNumber: { contains: trackingCode, mode: 'insensitive' } },
        { turboTrackingNumber: { contains: trackingCode, mode: 'insensitive' } },
        { turboShipmentId: { contains: trackingCode, mode: 'insensitive' } }
      ]
    },
    select: { id: true, orderNumber: true, customerName: true, turboTrackingNumber: true }
  });

  console.log(`✅ Found ${regularMatch.length} matching regular order(s):`);
  console.log(regularMatch);

  const guestMatch = await prisma.guestOrder.findMany({
    where: {
      OR: [
        { orderNumber: { contains: trackingCode, mode: 'insensitive' } },
        { turboTrackingNumber: { contains: trackingCode, mode: 'insensitive' } },
        { turboShipmentId: { contains: trackingCode, mode: 'insensitive' } }
      ]
    },
    select: { id: true, orderNumber: true, guestName: true, turboTrackingNumber: true }
  });

  console.log(`\n✅ Found ${guestMatch.length} matching guest order(s):`);
  console.log(guestMatch);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
