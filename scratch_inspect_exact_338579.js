const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const guestOrder = await prisma.guestOrder.findFirst({
    where: { orderNumber: 'ORD-338579-908' }
  });

  console.log('📌 GuestOrder ORD-338579-908 RAW DB Record:');
  console.log(JSON.stringify(guestOrder, null, 2));

  const regularOrder = await prisma.order.findFirst({
    where: { orderNumber: 'ORD-338579-908' },
    include: { customer: true, orderItems: true }
  });

  if (regularOrder) {
    console.log('\n📌 Regular Order ORD-338579-908 RAW DB Record:');
    console.log(JSON.stringify(regularOrder, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
