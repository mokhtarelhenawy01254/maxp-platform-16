const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      turboShipmentId: null
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerName: true,
      customerPhone: true,
      city: true,
      shippingAddress: true,
      total: true,
      companyId: true,
      company: {
        select: {
          id: true,
          turboApiKey: true,
          turboEnabled: true
        }
      }
    },
    take: 10
  });

  console.log('Found orders count:', orders.length);
  console.log(JSON.stringify(orders, null, 2));
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
