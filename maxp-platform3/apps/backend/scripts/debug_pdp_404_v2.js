const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  try {
    const prisma = await getSharedPrismaClientAsync();
    
    const company = await prisma.company.findUnique({
      where: { slug: 'aura-chic-test' }
    });

    if (!company) {
      console.log('Company NOT FOUND: aura-chic-test');
      return;
    }

    console.log(`Found Company: ${company.name} (ID: ${company.id}, Slug: ${company.slug})`);

    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true, slug: true }
    });

    console.log('Products count:', products.length);
    console.log(JSON.stringify(products, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
