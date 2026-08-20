const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      turboShipmentId: null,
      OR: [
        { status: 'CONFIRMED' },
        { status: 'confirmed' },
        { status: 'processing' },
        { status: 'PROCESSING' }
      ]
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
      companyId: true
    },
    take: 10
  });

  console.log('Found orders count:', orders.length);
  console.log('Orders sample:', JSON.stringify(orders, null, 2));

  // Check company Turbo configuration for companyId
  if (orders.length > 0) {
    const company = await prisma.company.findUnique({
      where: { id: orders[0].companyId },
      select: { id: true, turboApiKey: true, turboEnabled: true, turboMainClientCode: true, turboSenderNumber: true }
    });
    console.log('Company Turbo config:', company);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
