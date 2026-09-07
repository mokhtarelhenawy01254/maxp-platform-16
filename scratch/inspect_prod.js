const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.product.findUnique({
    where: { id: 'cmt4hkvb0016bjuloqw08kjht' },
    include: { store: true }
  });
  console.log('SLUG:', p?.slug);
  console.log('STORE_SLUG:', p?.store?.slug);
  console.log('DOMAIN:', p?.store?.domain);
  console.log('SIZE_GUIDE:', p?.sizeGuide);
}

main().catch(console.error).finally(() => prisma.$disconnect());
