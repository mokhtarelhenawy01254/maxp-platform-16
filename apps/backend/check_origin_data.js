const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function checkOrigin() {
  const prisma = await getSharedPrismaClientAsync();
  const companyId = 'cmm4b2hzm0000ufhg0h6wznup';

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    console.log(`❌ Company ${companyId} not found.`);
    return;
  }

  const products = await prisma.product.count({ where: { companyId } });
  const categories = await prisma.category.count({ where: { companyId } });

  console.log(`✅ Company ${company.name} (${companyId}) found.`);
  console.log(`✅ Products: ${products}`);
  console.log(`✅ Categories: ${categories}`);
}

checkOrigin().catch(console.error);
