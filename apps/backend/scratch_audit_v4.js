
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const fs = require('fs');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const products = await prisma.product.findMany({
    include: { company: true },
    take: 100
  });

  const report = products.map(p => ({
    name: p.name,
    company: p.company?.name || 'Unknown',
    companyId: p.companyId,
    mainImage: p.mainImage,
    images: p.images
  }));

  fs.writeFileSync('product_image_audit.json', JSON.stringify(report, null, 2));
  console.log(`Audited ${products.length} products. Results in product_image_audit.json`);
}

main().catch(console.error);
