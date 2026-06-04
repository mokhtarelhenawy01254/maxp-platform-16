
const { PrismaClient } = require('./prisma/generated/postgresql_v2');

async function main() {
  const url = 'postgresql://postgres:0165676135@localhost:5432/maxp';
  console.log(`Connecting to ${url}...`);
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const products = await prisma.product.findMany({
      take: 5
    });

    console.log('Total products in maxp:', products.length);
    products.forEach(p => {
      console.log(`- [${p.id}] ${p.name}`);
    });

    const specificId = 'd8709322-0949-41e9-bad5-2409c95a25e1';
    const product = await prisma.product.findUnique({
      where: { id: specificId }
    });
    console.log(`Specific product [${specificId}] found in maxp:`, !!product);
    
    if (product) {
        console.log('Product details:', JSON.stringify(product, null, 2));
    }

  } catch (err) {
    console.error('Error connecting to maxp:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
