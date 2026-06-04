const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
  try {
    const prisma = await getSharedPrismaClientAsync();
    const companySlug = 'm22';
    
    const company = await prisma.company.findUnique({
      where: { slug: companySlug }
    });

    if (!company) {
      console.error('Company not found');
      return;
    }

    console.log(`Company found: ${company.name} (ID: ${company.id})`);

    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true, isActive: true, isHidden: true, stock: true }
    });

    console.log(`Found ${products.length} products:`);
    products.forEach(p => {
      console.log(`[${p.id}] ${p.name} | Active: ${p.isActive} | Hidden: ${p.isHidden} | Stock: ${p.stock}`);
    });

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    process.exit(0);
  }
}

main();
