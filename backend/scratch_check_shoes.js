
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const category = await prisma.category.findFirst({
    where: { name: { contains: 'Shoes', mode: 'insensitive' } }
  });

  if (category) {
    console.log(`Found category Shoes: [${category.id}]`);
    const products = await prisma.product.findMany({
      where: { categoryId: category.id }
    });
    console.log(`Products in this category (${products.length}):`);
    products.forEach(p => console.log(`- [${p.id}] ${p.name}`));
  } else {
    console.log('Category Shoes not found.');
  }
}

main().catch(console.error);
