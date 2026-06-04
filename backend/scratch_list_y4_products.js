
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const companyId = 'cmmj9a5qz0000vbdwpnlkc94i';
  const products = await prisma.product.findMany({
    where: { companyId },
    select: { id: true, name: true, slug: true }
  });

  console.log(`Products in company y4 (${products.length}):`);
  products.forEach(p => {
    console.log(`- [${p.id}] ${p.name} (Slug: ${p.slug})`);
  });
}

main().catch(console.error);
