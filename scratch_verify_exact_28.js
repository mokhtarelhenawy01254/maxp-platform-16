const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const targetNumbers = [
    'ORD-367157-894', 'ORD-582886-384', 'ORD-612266-706', 'ORD-739494-455',
    'ORD-075531-266', 'ORD-763267-366', 'ORD-125203-116', 'ORD-929374-833',
    'ORD-779028-857', 'ORD-244337-940', '13217', '27370', '27369', '27368',
    '27367', '27366', '27365', '27362', '27361', '27360', '27359', '27358',
    '27356', '27355', '27354', '27318', '27314', '27311'
  ];

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderNumber: { in: targetNumbers } },
        { id: { in: targetNumbers } }
      ]
    },
    select: {
      orderNumber: true,
      turboTrackingNumber: true,
      turboShipmentId: true,
      turboShipmentStatus: true,
      status: true
    }
  });

  console.log(`📌 Found ${orders.length} out of ${targetNumbers.length} requested 28 orders in DB.`);
  console.log(JSON.stringify(orders, null, 2));

  const missing = orders.filter(o => !o.turboTrackingNumber);
  console.log(`⚠️ Orders still missing Turbo Tracking Number: ${missing.length}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
