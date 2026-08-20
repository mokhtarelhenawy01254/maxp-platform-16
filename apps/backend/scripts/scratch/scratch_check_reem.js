const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'swan@h2m.com' } });
  console.log('User companyId:', user?.companyId);

  const customers = await prisma.customer.findMany({
    where: {
      companyId: user.companyId,
      OR: [
        { phone: { contains: '165676135' } },
        { firstName: { contains: 'Reem' } },
        { lastName: { contains: 'Elhefnawy' } }
      ]
    },
    include: {
      _count: { select: { orders: true } }
    }
  });

  console.log('Customers matched:', customers);

  // Also query orders count for this phone across the Order table
  if (customers.length > 0) {
    for (const c of customers) {
      const ordersByCustomerId = await prisma.order.count({
        where: { customerId: c.id }
      });
      const ordersByPhone = await prisma.order.count({
        where: {
          companyId: user.companyId,
          customerPhone: { contains: '165676135' }
        }
      });
      const ordersByCustomerPhoneExact = c.phone ? await prisma.order.count({
        where: {
          companyId: user.companyId,
          customerPhone: c.phone
        }
      }) : 0;

      console.log(`Customer ID: ${c.id}`);
      console.log(`Name: ${c.firstName} ${c.lastName}`);
      console.log(`Phone: ${c.phone}`);
      console.log(`Orders directly linked by customerId: ${ordersByCustomerId}`);
      console.log(`Orders linked by customerPhone (exact c.phone): ${ordersByCustomerPhoneExact}`);
      console.log(`Orders matching phone substring '165676135': ${ordersByPhone}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
