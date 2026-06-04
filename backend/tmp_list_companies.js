
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function listCompanies() {
  const prisma = getSharedPrismaClient();
  
  const companies = await prisma.company.findMany({
    select: { id: true, name: true }
  });
  
  console.log('Companies:');
  for (const company of companies) {
    const orderCount = await prisma.order.count({ where: { companyId: company.id } });
    const guestOrderCount = await prisma.guestOrder.count({ where: { companyId: company.id } });
    console.log(`${company.name} (${company.id}): ${orderCount} orders, ${guestOrderCount} guest orders`);
  }
}

listCompanies().catch(console.error);
